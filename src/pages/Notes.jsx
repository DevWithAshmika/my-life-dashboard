import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  FileText,
} from "lucide-react";

import Loading from "../components/Loading";
import { db } from "../firebase/config";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export default function Notes({ user }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      setNotes([]);
      setLoading(false);
      return;
    }

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

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        setNotes(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        setLoading(false);
      },
      (error) => {
        console.error("Notes error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const openAddModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setShowModal(true);
  };

  const openEditModal = (note) => {
    setEditingNote(note);
    setTitle(note.title || "");
    setContent(note.content || "");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!user?.uid) {
      alert("Please login first.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a title.");
      return;
    }

    setSaving(true);

    try {
      if (editingNote) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "notes",
            editingNote.id
          ),
          {
            title: title.trim(),
            content: content.trim(),
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(db, "users", user.uid, "notes"),
          {
            title: title.trim(),
            content: content.trim(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }

      closeModal();
    } catch (error) {
      console.error(error);
      alert("Could not save note.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this note?")) return;

    try {
      await deleteDoc(
        doc(db, "users", user.uid, "notes", id)
      );
    } catch (error) {
      console.error(error);
      alert("Could not delete note.");
    }
  };

  const filteredNotes = notes.filter((note) => {
    const text = search.toLowerCase();

    return (
      note.title?.toLowerCase().includes(text) ||
      note.content?.toLowerCase().includes(text)
    );
  });

  const formatDate = (timestamp) => {
    if (!timestamp) return "Just now";

    try {
      return timestamp
        .toDate()
        .toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
    } catch {
      return "Just now";
    }
  };

  if (loading) {
    return <Loading text="Loading notes..." />;
  }

  return (
    <div className="min-h-screen text-white">

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <FileText size={22} />
          </div>

          <div>
            <h1 className="text-2xl font-bold">
              Notes
            </h1>

            <p className="text-sm text-white/40">
              Your personal notes
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black"
        >
          <Plus size={18} />
          New Note
        </button>
      </div>

      <div className="mb-6 relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
        />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes..."
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 outline-none placeholder:text-white/30"
        />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center">

          <FileText
            size={40}
            className="mx-auto mb-4 text-white/30"
          />

          <h2 className="font-semibold">
            {search ? "No notes found" : "No notes yet"}
          </h2>

          <p className="mt-2 text-sm text-white/40">
            {search
              ? "Try another search."
              : "Create your first note."}
          </p>

        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >

              <div className="mb-4 flex items-start justify-between gap-3">

                <div>
                  <h2 className="font-semibold">
                    {note.title}
                  </h2>

                  <p className="mt-1 text-xs text-white/30">
                    {formatDate(
                      note.updatedAt || note.createdAt
                    )}
                  </p>
                </div>

                <div className="flex gap-1">

                  <button
                    onClick={() => openEditModal(note)}
                    className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"
                  >
                    <Edit3 size={16} />
                  </button>

                  <button
                    onClick={() => handleDelete(note.id)}
                    className="rounded-xl p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>

                </div>
              </div>

              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/50">
                {note.content || "No content"}
              </p>

            </div>
          ))}

        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <form
            onSubmit={handleSave}
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#111] p-6"
          >

            <div className="mb-6 flex items-center justify-between">

              <h2 className="text-xl font-semibold">
                {editingNote ? "Edit Note" : "New Note"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
              >
                <X />
              </button>

            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={8}
              className="mb-5 w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
            />

            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold text-black"
            >
              <Save size={17} />

              {saving ? "Saving..." : "Save Note"}
            </button>

          </form>

        </div>
      )}

    </div>
  );
}