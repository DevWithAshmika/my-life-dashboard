import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  FileText,
  Pin,
  Star,
  Tag,
  Palette,
  Check,
  Filter,
} from "lucide-react";

import Loading from "../components/Loading";
import { db } from "../firebase/config";

import {
  collection,
  deleteDoc,
  doc,
  getDocsFromCache,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// ===========================================================
// CONSTANTS
// ===========================================================

const CATEGORIES = [
  "Personal",
  "Work",
  "Ideas",
  "Travel",
  "Finance",
  "Other",
];

const COLORS = [
  {
    name: "Default",
    value: "default",
    card: "bg-white/[0.04]",
    border: "border-white/10",
    dot: "bg-white/50",
    active: "ring-white/30",
  },
  {
    name: "Red",
    value: "red",
    card: "bg-red-500/[0.08]",
    border: "border-red-500/20",
    dot: "bg-red-400",
    active: "ring-red-400/50",
  },
  {
    name: "Green",
    value: "green",
    card: "bg-green-500/[0.08]",
    border: "border-green-500/20",
    dot: "bg-green-400",
    active: "ring-green-400/50",
  },
  {
    name: "Blue",
    value: "blue",
    card: "bg-blue-500/[0.08]",
    border: "border-blue-500/20",
    dot: "bg-blue-400",
    active: "ring-blue-400/50",
  },
];

// ===========================================================
// HELPERS
// ===========================================================

function getColorStyle(color) {
  return (
    COLORS.find(
      (item) => item.value === color
    ) || COLORS[0]
  );
}

function getNotesBackupKey(uid) {
  return `my-dashboard-${uid}-notes`;
}

function loadNotesBackup(uid) {
  if (!uid) return [];

  try {
    const raw = localStorage.getItem(
      getNotesBackupKey(uid)
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "Notes local backup load failed:",
      error
    );

    return [];
  }
}

function saveNotesBackup(uid, notes) {
  if (!uid) return;

  try {
    localStorage.setItem(
      getNotesBackupKey(uid),
      JSON.stringify(notes)
    );
  } catch (error) {
    console.warn(
      "Notes local backup save failed:",
      error
    );
  }
}

function getTimestampValue(timestamp) {
  if (!timestamp) return 0;

  try {
    if (
      typeof timestamp?.toMillis ===
      "function"
    ) {
      return timestamp.toMillis();
    }

    if (
      typeof timestamp?.toDate ===
      "function"
    ) {
      return timestamp.toDate().getTime();
    }

    if (
      typeof timestamp === "object" &&
      typeof timestamp.seconds ===
        "number"
    ) {
      return (
        timestamp.seconds * 1000 +
        Math.floor(
          (timestamp.nanoseconds || 0) /
            1000000
        )
      );
    }

    if (
      typeof timestamp === "object" &&
      typeof timestamp._seconds ===
        "number"
    ) {
      return (
        timestamp._seconds * 1000 +
        Math.floor(
          (timestamp._nanoseconds || 0) /
            1000000
        )
      );
    }

    if (
      timestamp instanceof Date
    ) {
      return timestamp.getTime();
    }

    if (
      typeof timestamp === "string" ||
      typeof timestamp === "number"
    ) {
      const value = new Date(
        timestamp
      ).getTime();

      return Number.isNaN(value)
        ? 0
        : value;
    }
  } catch {
    return 0;
  }

  return 0;
}

function sortNotes(data) {
  return [...data].sort((a, b) => {
    const timeA =
      getTimestampValue(
        a.createdAt ||
          a.updatedAt
      );

    const timeB =
      getTimestampValue(
        b.createdAt ||
          b.updatedAt
      );

    return timeB - timeA;
  });
}

function formatDate(timestamp) {
  if (!timestamp) return "Just now";

  try {
    let date = null;

    if (
      typeof timestamp?.toDate ===
      "function"
    ) {
      date = timestamp.toDate();
    } else if (
      typeof timestamp === "object" &&
      typeof timestamp.seconds ===
        "number"
    ) {
      date = new Date(
        timestamp.seconds * 1000
      );
    } else if (
      typeof timestamp === "object" &&
      typeof timestamp._seconds ===
        "number"
    ) {
      date = new Date(
        timestamp._seconds * 1000
      );
    } else if (
      timestamp instanceof Date
    ) {
      date = timestamp;
    } else if (
      typeof timestamp === "string" ||
      typeof timestamp === "number"
    ) {
      date = new Date(timestamp);
    }

    if (
      !date ||
      Number.isNaN(date.getTime())
    ) {
      return "Just now";
    }

    return date.toLocaleDateString(
      "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "Just now";
  }
}

// ===========================================================
// NOTES COMPONENT
// ===========================================================

export default function Notes({ user }) {
  // =========================================================
  // STATE
  // =========================================================

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [showModal, setShowModal] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState(null);

  const [title, setTitle] =
    useState("");

  const [content, setContent] =
    useState("");

  const [category, setCategory] =
    useState("Personal");

  const [color, setColor] =
    useState("default");

  const [pinned, setPinned] =
    useState(false);

  const [favorite, setFavorite] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  // =========================================================
  // FIREBASE + LOCAL OFFLINE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const notesRef = collection(
      db,
      "users",
      user.uid,
      "notes"
    );

    const notesQuery = query(
      notesRef,
      orderBy("createdAt", "desc")
    );

    // -------------------------------------------------------
    // LOCAL STORAGE FIRST
    // -------------------------------------------------------

    const localBackup =
      loadNotesBackup(user.uid);

    if (localBackup.length > 0) {
      setNotes(
        sortNotes(localBackup)
      );
    }

    setLoading(true);

    // -------------------------------------------------------
    // FIRESTORE CACHE
    // -------------------------------------------------------

    getDocsFromCache(notesQuery)
      .then((snapshot) => {
        if (cancelled) return;

        const cachedData =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          );

        if (cachedData.length > 0) {
          const sorted =
            sortNotes(cachedData);

          setNotes(sorted);
          saveNotesBackup(
            user.uid,
            sorted
          );
        }

        setLoading(false);
      })
      .catch((error) => {
        console.warn(
          "Notes cache unavailable:",
          error
        );

        if (!cancelled) {
          setLoading(false);
        }
      });

    // -------------------------------------------------------
    // LIVE FIRESTORE LISTENER
    // -------------------------------------------------------

    const unsubscribe =
      onSnapshot(
        notesQuery,
        {
          includeMetadataChanges: true,
        },
        (snapshot) => {
          if (cancelled) return;

          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          const sorted =
            sortNotes(data);

          const currentBackup =
            loadNotesBackup(
              user.uid
            );

          // -------------------------------------------------
          // IMPORTANT
          //
          // When offline, Firestore can return an empty
          // fromCache snapshot before local data is available.
          // Do not destroy our local backup in that case.
          // -------------------------------------------------

          if (
            sorted.length === 0 &&
            snapshot.metadata
              .fromCache &&
            currentBackup.length > 0
          ) {
            setNotes(
              sortNotes(
                currentBackup
              )
            );

            setLoading(false);
            return;
          }

          setNotes(sorted);
          setLoading(false);

          // Save real Firestore data to local backup.
          //
          // Also save empty data only when it is confirmed
          // server data. This prevents accidental deletion
          // of offline local data.
          if (
            sorted.length > 0 ||
            !snapshot.metadata.fromCache
          ) {
            saveNotesBackup(
              user.uid,
              sorted
            );
          }
        },
        (error) => {
          console.error(
            "Notes Firestore error:",
            error
          );

          // Keep local data if Firebase fails.
          const backup =
            loadNotesBackup(
              user.uid
            );

          if (
            !cancelled &&
            backup.length > 0
          ) {
            setNotes(
              sortNotes(backup)
            );
          }

          if (!cancelled) {
            setLoading(false);
          }
        }
      );

    // -------------------------------------------------------
    // LOADING FALLBACK
    // -------------------------------------------------------

    const loadingTimeout =
      setTimeout(() => {
        if (!cancelled) {
          setLoading(false);
        }
      }, 4000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(
        loadingTimeout
      );
    };
  }, [user?.uid]);

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddModal = () => {
    setEditingNote(null);

    setTitle("");
    setContent("");
    setCategory("Personal");
    setColor("default");
    setPinned(false);
    setFavorite(false);

    setShowModal(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditModal = (note) => {
    setEditingNote(note);

    setTitle(note.title || "");
    setContent(note.content || "");

    setCategory(
      note.category || "Personal"
    );

    setColor(
      note.color || "default"
    );

    setPinned(
      note.pinned === true
    );

    setFavorite(
      note.favorite === true
    );

    setShowModal(true);
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingNote(null);

    setTitle("");
    setContent("");
    setCategory("Personal");
    setColor("default");
    setPinned(false);
    setFavorite(false);
  };

  // =========================================================
  // SAVE
  // OFFLINE-FIRST / OPTIMISTIC
  // =========================================================

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user?.uid) {
      alert("Please login first.");
      return;
    }

    const cleanTitle =
      title.trim();

    const cleanContent =
      content.trim();

    if (!cleanTitle) {
      alert("Please enter a title.");
      return;
    }

    // -------------------------------------------------------
    // Create the local data first.
    // Do NOT wait for Firebase.
    // -------------------------------------------------------

    const now =
      new Date().toISOString();

    const noteData = {
      title: cleanTitle,
      content: cleanContent,
      category,
      color,
      pinned,
      favorite,
      updatedAt: now,
    };

    const notesRef = collection(
      db,
      "users",
      user.uid,
      "notes"
    );

    // -------------------------------------------------------
    // EDIT
    // -------------------------------------------------------

    if (editingNote) {
      const updatedNotes =
        notes.map((note) =>
          note.id === editingNote.id
            ? {
                ...note,
                ...noteData,
                id: editingNote.id,
              }
            : note
        );

      const sorted =
        sortNotes(updatedNotes);

      // Update UI immediately
      setNotes(sorted);

      // Save local backup immediately
      saveNotesBackup(
        user.uid,
        sorted
      );

      // Close modal immediately
      setSaving(false);
      setShowModal(false);
      setEditingNote(null);

      setTitle("");
      setContent("");
      setCategory("Personal");
      setColor("default");
      setPinned(false);
      setFavorite(false);

      // Firebase sync in background
      void updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "notes",
          editingNote.id
        ),
        {
          ...noteData,
          updatedAt:
            serverTimestamp(),
        }
      ).catch((error) => {
        console.warn(
          "Notes offline edit sync pending:",
          error
        );
      });

      return;
    }

    // -------------------------------------------------------
    // ADD
    // -------------------------------------------------------

    const newNoteRef =
      doc(notesRef);

    const newNote = {
      id: newNoteRef.id,
      ...noteData,
      createdAt: now,
      updatedAt: now,
    };

    const updatedNotes =
      sortNotes([
        ...notes,
        newNote,
      ]);

    // Update UI immediately
    setNotes(updatedNotes);

    // Save local backup immediately
    saveNotesBackup(
      user.uid,
      updatedNotes
    );

    // Close modal immediately
    setSaving(false);
    setShowModal(false);
    setEditingNote(null);

    setTitle("");
    setContent("");
    setCategory("Personal");
    setColor("default");
    setPinned(false);
    setFavorite(false);

    // Firebase sync in background
    void setDoc(newNoteRef, {
      title: cleanTitle,
      content: cleanContent,
      category,
      color,
      pinned,
      favorite,
      createdAt:
        serverTimestamp(),
      updatedAt:
        serverTimestamp(),
    }).catch((error) => {
      console.warn(
        "Notes offline add sync pending:",
        error
      );
    });
  };

  // =========================================================
  // DELETE
  // OFFLINE-FIRST / OPTIMISTIC
  // =========================================================

  const handleDelete = async (id) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this note?"
      );

    if (!confirmed) return;

    setDeletingId(id);

    // -------------------------------------------------------
    // Remove locally first
    // -------------------------------------------------------

    const updatedNotes =
      notes.filter(
        (note) => note.id !== id
      );

    setNotes(updatedNotes);

    saveNotesBackup(
      user.uid,
      updatedNotes
    );

    // UI should not wait for Firebase
    setDeletingId(null);

    // -------------------------------------------------------
    // Delete from Firebase in background
    // -------------------------------------------------------

    void deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "notes",
        id
      )
    ).catch((error) => {
      console.warn(
        "Notes offline delete sync pending:",
        error
      );
    });
  };

  // =========================================================
  // QUICK PIN
  // OFFLINE-FIRST
  // =========================================================

  const togglePin = async (note) => {
    if (!user?.uid) return;

    const newPinned =
      !note.pinned;

    const updatedNotes =
      notes.map((item) =>
        item.id === note.id
          ? {
              ...item,
              pinned: newPinned,
              updatedAt:
                new Date().toISOString(),
            }
          : item
      );

    const sorted =
      sortNotes(updatedNotes);

    // Immediate UI update
    setNotes(sorted);

    // Immediate local backup
    saveNotesBackup(
      user.uid,
      sorted
    );

    // Background Firebase sync
    void updateDoc(
      doc(
        db,
        "users",
        user.uid,
        "notes",
        note.id
      ),
      {
        pinned: newPinned,
        updatedAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.warn(
        "Pin offline sync pending:",
        error
      );
    });
  };

  // =========================================================
  // QUICK FAVORITE
  // OFFLINE-FIRST
  // =========================================================

  const toggleFavorite = async (
    note
  ) => {
    if (!user?.uid) return;

    const newFavorite =
      !note.favorite;

    const updatedNotes =
      notes.map((item) =>
        item.id === note.id
          ? {
              ...item,
              favorite: newFavorite,
              updatedAt:
                new Date().toISOString(),
            }
          : item
      );

    const sorted =
      sortNotes(updatedNotes);

    // Immediate UI update
    setNotes(sorted);

    // Immediate local backup
    saveNotesBackup(
      user.uid,
      sorted
    );

    // Background Firebase sync
    void updateDoc(
      doc(
        db,
        "users",
        user.uid,
        "notes",
        note.id
      ),
      {
        favorite: newFavorite,
        updatedAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.warn(
        "Favorite offline sync pending:",
        error
      );
    });
  };

  // =========================================================
  // FILTER
  // =========================================================

  const filteredNotes = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    const filtered = notes.filter(
      (note) => {
        const matchesSearch =
          !value ||
          note.title
            ?.toLowerCase()
            .includes(value) ||
          note.content
            ?.toLowerCase()
            .includes(value) ||
          note.category
            ?.toLowerCase()
            .includes(value);

        const matchesCategory =
          categoryFilter === "All" ||
          (note.category ||
            "Personal") ===
            categoryFilter;

        return (
          matchesSearch &&
          matchesCategory
        );
      }
    );

    return filtered.sort((a, b) => {
      if (
        Boolean(a.pinned) !==
        Boolean(b.pinned)
      ) {
        return a.pinned ? -1 : 1;
      }

      if (
        Boolean(a.favorite) !==
        Boolean(b.favorite)
      ) {
        return a.favorite ? -1 : 1;
      }

      return (
        getTimestampValue(
          b.updatedAt ||
            b.createdAt
        ) -
        getTimestampValue(
          a.updatedAt ||
            a.createdAt
        )
      );
    });
  }, [
    notes,
    search,
    categoryFilter,
  ]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const totalNotes =
    notes.length;

  const pinnedNotes =
    notes.filter(
      (note) => note.pinned
    ).length;

  const favoriteNotes =
    notes.filter(
      (note) => note.favorite
    ).length;

  const categoryCount =
    new Set(
      notes.map(
        (note) =>
          note.category ||
          "Personal"
      )
    ).size;

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading text="Loading notes..." />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <FileText size={18} />
            </div>

            <p className="text-sm text-white/40">
              Personal Space
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Notes
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Capture ideas, plans and important thoughts.
          </p>

        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
        >
          <Plus size={18} />
          New Note
        </button>

      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <NoteStat
          icon={<FileText size={17} />}
          title="Total Notes"
          value={totalNotes}
        />

        <NoteStat
          icon={<Pin size={17} />}
          title="Pinned"
          value={pinnedNotes}
        />

        <NoteStat
          icon={<Star size={17} />}
          title="Favorites"
          value={favoriteNotes}
        />

        <NoteStat
          icon={<Tag size={17} />}
          title="Categories"
          value={categoryCount}
        />

      </div>

      {/* =====================================================
          SEARCH + FILTER
      ====================================================== */}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row">

        <div className="relative flex-1">

          <Search
            size={17}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search notes..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20"
          />

        </div>

        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] p-1.5">

          <Filter
            size={15}
            className="ml-2 shrink-0 text-white/30"
          />

          {[
            "All",
            ...CATEGORIES,
          ].map((item) => (

            <button
              key={item}
              type="button"
              onClick={() =>
                setCategoryFilter(
                  item
                )
              }
              className={`shrink-0 rounded-xl px-3 py-2 text-xs font-medium transition ${
                categoryFilter ===
                item
                  ? "bg-white text-black"
                  : "text-white/40 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item}
            </button>

          ))}

        </div>

      </div>

      {/* =====================================================
          NOTES
      ====================================================== */}

      {filteredNotes.length ===
      0 ? (

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center backdrop-blur-2xl">

          <FileText
            size={40}
            className="mx-auto mb-4 text-white/20"
          />

          <h2 className="font-semibold">
            {search ||
            categoryFilter !==
              "All"
              ? "No notes found"
              : "No notes yet"}
          </h2>

          <p className="mt-2 text-sm text-white/30">
            {search ||
            categoryFilter !==
              "All"
              ? "Try another search or category."
              : "Create your first note."}
          </p>

          {!search &&
            categoryFilter ===
              "All" && (
              <button
                type="button"
                onClick={
                  openAddModal
                }
                className="mt-5 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                Create Note
              </button>
            )}

        </div>

      ) : (

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {filteredNotes.map(
            (note) => {

              const style =
                getColorStyle(
                  note.color
                );

              return (
                <div
                  key={note.id}
                  className={`group relative rounded-3xl border p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition hover:-translate-y-0.5 ${style.card} ${style.border}`}
                >

                  {/* TOP */}

                  <div className="mb-4 flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                        <FileText
                          size={17}
                        />
                      </div>

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <h2 className="truncate text-sm font-semibold">
                            {note.title}
                          </h2>

                          {note.pinned && (
                            <Pin
                              size={13}
                              className="shrink-0"
                            />
                          )}

                        </div>

                        <p className="mt-1 text-[10px] text-white/30">
                          {formatDate(
                            note.updatedAt ||
                              note.createdAt
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="flex shrink-0 gap-1">

                      <button
                        type="button"
                        onClick={() =>
                          toggleFavorite(
                            note
                          )
                        }
                        className={`rounded-xl p-2 transition ${
                          note.favorite
                            ? "bg-yellow-400/10 text-yellow-300"
                            : "text-white/30 hover:bg-white/10 hover:text-white"
                        }`}
                        title="Favorite"
                      >
                        <Star
                          size={15}
                          fill={
                            note.favorite
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          togglePin(
                            note
                          )
                        }
                        className={`rounded-xl p-2 transition ${
                          note.pinned
                            ? "bg-white/10 text-white"
                            : "text-white/30 hover:bg-white/10 hover:text-white"
                        }`}
                        title="Pin"
                      >
                        <Pin
                          size={15}
                        />
                      </button>

                    </div>

                  </div>

                  {/* CONTENT */}

                  <p className="min-h-[72px] whitespace-pre-wrap break-words text-sm leading-6 text-white/50">
                    {note.content ||
                      "No content"}
                  </p>

                  {/* FOOTER */}

                  <div className="mt-5 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-4">

                    <div className="flex items-center gap-2">

                      <span className="rounded-lg bg-white/10 px-2.5 py-1 text-[10px] text-white/40">
                        {note.category ||
                          "Personal"}
                      </span>

                      <span
                        className={`h-2 w-2 rounded-full ${style.dot}`}
                        title={
                          note.color ||
                          "default"
                        }
                      />

                    </div>

                    <div className="flex gap-1">

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            note
                          )
                        }
                        className="rounded-xl p-2 text-white/30 transition hover:bg-white/10 hover:text-white"
                        title="Edit"
                      >
                        <Edit3
                          size={15}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            note.id
                          )
                        }
                        disabled={
                          deletingId ===
                          note.id
                        }
                        className="rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                        title="Delete"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>

      )}

      {/* =====================================================
          MOBILE ADD
      ====================================================== */}

      <button
        type="button"
        onClick={openAddModal}
        aria-label="New note"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl transition active:scale-90 sm:hidden"
      >
        <Plus
          size={25}
          strokeWidth={2.5}
        />
      </button>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {showModal && (

        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeModal();
            }
          }}
        >

          <form
            onSubmit={handleSave}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#101010]/95 p-5 pb-8 shadow-2xl backdrop-blur-2xl sm:max-w-xl sm:rounded-3xl sm:p-6"
          >

            {/* HEADER */}

            <div className="mb-6 flex items-center justify-between">

              <div>

                <div className="flex items-center gap-2">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <FileText
                      size={15}
                    />
                  </div>

                  <span className="text-xs text-white/40">
                    Notes
                  </span>

                </div>

                <h2 className="mt-2 text-xl font-semibold">
                  {editingNote
                    ? "Edit Note"
                    : "New Note"}
                </h2>

              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl bg-white/[0.06] p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              >
                <X size={18} />
              </button>

            </div>

            {/* TITLE */}

            <div className="mb-4">

              <label className="mb-2 block text-xs text-white/40">
                Title
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="Note title"
                maxLength={100}
                required
                disabled={saving}
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
              />

            </div>

            {/* CATEGORY */}

            <div className="mb-4">

              <label className="mb-2 block text-xs text-white/40">
                Category
              </label>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">

                {CATEGORIES.map(
                  (item) => (

                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setCategory(
                          item
                        )
                      }
                      disabled={saving}
                      className={`rounded-xl border px-2 py-2 text-[10px] transition ${
                        category ===
                        item
                          ? "border-white/30 bg-white text-black"
                          : "border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>

                  )
                )}

              </div>

            </div>

            {/* COLOR */}

            <div className="mb-4">

              <div className="mb-2 flex items-center gap-2">

                <Palette
                  size={14}
                  className="text-white/30"
                />

                <label className="text-xs text-white/40">
                  Note Color
                </label>

              </div>

              <div className="flex gap-3">

                {COLORS.map(
                  (item) => (

                    <button
                      key={
                        item.value
                      }
                      type="button"
                      onClick={() =>
                        setColor(
                          item.value
                        )
                      }
                      disabled={saving}
                      title={
                        item.name
                      }
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] transition ${
                        color ===
                        item.value
                          ? `ring-2 ${item.active}`
                          : "hover:bg-white/10"
                      }`}
                    >

                      <span
                        className={`h-4 w-4 rounded-full ${item.dot}`}
                      />

                      {color ===
                        item.value && (
                        <Check
                          size={12}
                          className="absolute"
                        />
                      )}

                    </button>

                  )
                )}

              </div>

            </div>

            {/* CONTENT */}

            <div className="mb-4">

              <label className="mb-2 block text-xs text-white/40">
                Content
              </label>

              <textarea
                value={content}
                onChange={(e) =>
                  setContent(
                    e.target.value
                  )
                }
                placeholder="Write your note..."
                rows={8}
                maxLength={5000}
                disabled={saving}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
              />

              <p className="mt-1 text-right text-[10px] text-white/20">
                {content.length}/5000
              </p>

            </div>

            {/* OPTIONS */}

            <div className="mb-5 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setPinned(
                    !pinned
                  )
                }
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-medium transition ${
                  pinned
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Pin
                  size={15}
                />
                {pinned
                  ? "Pinned"
                  : "Pin Note"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setFavorite(
                    !favorite
                  )
                }
                disabled={saving}
                className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-medium transition ${
                  favorite
                    ? "border-yellow-400/20 bg-yellow-400/10 text-yellow-300"
                    : "border-white/10 bg-white/[0.03] text-white/40 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Star
                  size={15}
                  fill={
                    favorite
                      ? "currentColor"
                      : "none"
                  }
                />
                {favorite
                  ? "Favorite"
                  : "Add Favorite"}
              </button>

            </div>

            {/* SAVE */}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={17} />

              {saving
                ? "Saving..."
                : editingNote
                ? "Update Note"
                : "Save Note"}
            </button>

          </form>

        </div>

      )}

    </div>
  );
}

// ===========================================================
// STAT COMPONENT
// ===========================================================

function NoteStat({
  icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60">
          {icon}
        </div>

        <div>

          <p className="text-[11px] text-white/30">
            {title}
          </p>

          <p className="mt-1 text-xl font-bold">
            {value}
          </p>

        </div>

      </div>

    </div>
  );
}