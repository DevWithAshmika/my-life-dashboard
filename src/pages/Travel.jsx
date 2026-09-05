import { useEffect, useMemo, useState } from "react";

import {
  Map,
  Plus,
  Trash2,
  Pencil,
  X,
  Search,
  CalendarDays,
  Wallet,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Navigation,
  Plane,
  ArrowRight,
  Timer,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Route,
} from "lucide-react";

import Loading from "../components/Loading";
import { db } from "../firebase/config";

import {
  collection,
  deleteDoc,
  doc,
  getDocsFromCache,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

// ===========================================================
// HELPERS
// ===========================================================

function getToday() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) return "No date";

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(
    "en-LK",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getDateObject(dateString) {
  if (!dateString) return null;

  const date = new Date(
    `${dateString}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function getDaysBetween(
  startDate,
  endDate
) {
  if (!startDate || !endDate) return 1;

  const start =
    getDateObject(startDate);

  const end =
    getDateObject(endDate);

  if (!start || !end) return 1;

  const difference =
    (end.getTime() -
      start.getTime()) /
    (1000 * 60 * 60 * 24);

  return Math.max(
    1,
    Math.floor(difference) + 1
  );
}

function getDaysUntil(dateString) {
  if (!dateString) return null;

  const target =
    getDateObject(dateString);

  if (!target) return null;

  const today =
    getDateObject(getToday());

  const difference =
    (target.getTime() -
      today.getTime()) /
    (1000 * 60 * 60 * 24);

  return Math.ceil(difference);
}

function getStatusStyle(status) {
  if (status === "ongoing") {
    return {
      label: "Ongoing",
      className:
        "border-green-400/20 bg-green-400/10 text-green-400",
      dot: "bg-green-400",
    };
  }

  if (status === "completed") {
    return {
      label: "Completed",
      className:
        "border-red-400/20 bg-red-400/10 text-red-400",
      dot: "bg-red-400",
    };
  }

  return {
    label: "Planned",
    className:
      "border-blue-400/20 bg-blue-400/10 text-blue-400",
    dot: "bg-blue-400",
  };
}

function getTripDuration(trip) {
  return getDaysBetween(
    trip.startDate || trip.date,
    trip.endDate
  );
}

function getTripProgress(trip) {
  if (trip.status === "completed") {
    return 100;
  }

  if (trip.status === "ongoing") {
    const start =
      getDateObject(
        trip.startDate || trip.date
      );

    const end =
      getDateObject(
        trip.endDate
      );

    if (!start || !end) {
      return 50;
    }

    const today =
      getDateObject(getToday());

    if (today <= start) return 0;

    if (today >= end) return 100;

    const total =
      end.getTime() -
      start.getTime();

    const current =
      today.getTime() -
      start.getTime();

    return Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (current / total) * 100
        )
      )
    );
  }

  return 0;
}

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString("en-LK");
}

// ===========================================================
// LOCAL STORAGE
// ===========================================================

function getTravelBackupKey(uid) {
  return `my-dashboard-${uid}-travel`;
}

function loadTravelBackup(uid) {
  if (!uid) return [];

  try {
    const raw =
      localStorage.getItem(
        getTravelBackupKey(uid)
      );

    if (!raw) return [];

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "Could not load travel backup:",
      error
    );

    return [];
  }
}

function saveTravelBackup(
  uid,
  trips
) {
  if (!uid) return;

  try {
    localStorage.setItem(
      getTravelBackupKey(uid),
      JSON.stringify(trips)
    );
  } catch (error) {
    console.warn(
      "Could not save travel backup:",
      error
    );
  }
}

function sortTrips(trips) {
  return [...trips].sort(
    (a, b) => {
      const dateA =
        a.startDate ||
        a.date ||
        "";

      const dateB =
        b.startDate ||
        b.date ||
        "";

      return dateA.localeCompare(
        dateB
      );
    }
  );
}

// ===========================================================
// TRAVEL COMPONENT
// ===========================================================

export default function Travel({
  user,
}) {
  const [trips, setTrips] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [expandedTrip, setExpandedTrip] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] =
    useState({
      place: "",
      startDate: getToday(),
      endDate: "",
      status: "planned",
      budget: "",
      travelers: "1",
      notes: "",
    });

  // =========================================================
  // FIRESTORE + OFFLINE CACHE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setTrips([]);
      setLoading(false);
      return;
    }

    let active = true;

    const uid = user.uid;

    const travelRef =
      collection(
        db,
        "users",
        uid,
        "travel"
      );

    const localBackup =
      loadTravelBackup(uid);

    // -------------------------------------------------------
    // SHOW LOCAL DATA IMMEDIATELY
    // -------------------------------------------------------

    if (
      localBackup.length > 0
    ) {
      setTrips(
        sortTrips(localBackup)
      );

      setLoading(false);
    }

    // -------------------------------------------------------
    // FIRESTORE CACHE
    // -------------------------------------------------------

    getDocsFromCache(
      travelRef
    )
      .then((snapshot) => {
        if (!active) return;

        const cacheData =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          );

        /*
         * Don't replace existing local
         * data with an empty cache.
         */
        if (
          cacheData.length > 0
        ) {
          const sorted =
            sortTrips(cacheData);

          setTrips(sorted);

          saveTravelBackup(
            uid,
            sorted
          );
        } else if (
          localBackup.length === 0
        ) {
          setTrips([]);
        }

        setLoading(false);
      })
      .catch((error) => {
        console.warn(
          "Travel cache unavailable:",
          error
        );

        if (!active) return;

        if (
          localBackup.length > 0
        ) {
          setTrips(
            sortTrips(
              localBackup
            )
          );
        }

        setLoading(false);
      });

    // -------------------------------------------------------
    // LIVE FIRESTORE LISTENER
    // -------------------------------------------------------

    const unsubscribe =
      onSnapshot(
        travelRef,
        {
          includeMetadataChanges: true,
        },
        (snapshot) => {
          if (!active) return;

          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          const sorted =
            sortTrips(data);

          /*
           * Important:
           * If Firestore gives an empty cached
           * snapshot while offline, don't erase
           * the local data already shown.
           */
          if (
            sorted.length === 0 &&
            snapshot.metadata
              .fromCache &&
            localBackup.length > 0
          ) {
            setLoading(false);
            return;
          }

          setTrips(sorted);

          /*
           * Keep local backup updated.
           */
          if (
            sorted.length > 0 ||
            !snapshot.metadata
              .fromCache
          ) {
            saveTravelBackup(
              uid,
              sorted
            );
          }

          setLoading(false);
        },
        (error) => {
          console.error(
            "Travel Firestore error:",
            error
          );

          if (!active) return;

          const backup =
            loadTravelBackup(uid);

          if (
            backup.length > 0
          ) {
            setTrips(
              sortTrips(
                backup
              )
            );
          }

          setLoading(false);
        }
      );

    // -------------------------------------------------------
    // LOADING FALLBACK
    // -------------------------------------------------------

    const loadingTimeout =
      setTimeout(() => {
        if (!active) return;

        setLoading(false);

        const backup =
          loadTravelBackup(uid);

        if (
          backup.length > 0
        ) {
          setTrips(
            sortTrips(
              backup
            )
          );
        }
      }, 4000);

    return () => {
      active = false;

      clearTimeout(
        loadingTimeout
      );

      unsubscribe();
    };
  }, [user?.uid]);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddForm = () => {
    setEditingId(null);

    setForm({
      place: "",
      startDate: getToday(),
      endDate: "",
      status: "planned",
      budget: "",
      travelers: "1",
      notes: "",
    });

    setShowForm(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditForm = (
    trip
  ) => {
    setEditingId(trip.id);

    setForm({
      place:
        trip.place || "",

      startDate:
        trip.startDate ||
        trip.date ||
        getToday(),

      endDate:
        trip.endDate || "",

      status:
        trip.status ||
        "planned",

      budget:
        trip.budget !==
        undefined
          ? String(
              trip.budget
            )
          : "",

      travelers:
        trip.travelers !==
        undefined
          ? String(
              trip.travelers
            )
          : "1",

      notes:
        trip.notes || "",
    });

    setShowForm(true);
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setEditingId(null);

    setForm({
      place: "",
      startDate: getToday(),
      endDate: "",
      status: "planned",
      budget: "",
      travelers: "1",
      notes: "",
    });

    setShowForm(false);
  };

  // =========================================================
  // SAVE
  // =========================================================

  const handleSubmit = (
    event
  ) => {
    event.preventDefault();

    if (!user?.uid) {
      alert(
        "You are not logged in."
      );
      return;
    }

    const place =
      form.place.trim();

    if (!place) {
      alert(
        "Please enter a destination."
      );
      return;
    }

    if (!form.startDate) {
      alert(
        "Please select a start date."
      );
      return;
    }

    if (
      form.endDate &&
      form.endDate <
        form.startDate
    ) {
      alert(
        "End date cannot be before start date."
      );
      return;
    }

    const tripData = {
      place,

      startDate:
        form.startDate,

      endDate:
        form.endDate || "",

      status:
        form.status ||
        "planned",

      budget:
        Number(form.budget) ||
        0,

      travelers:
        Number(
          form.travelers
        ) || 1,

      notes:
        form.notes.trim(),
    };

    const travelRef =
      collection(
        db,
        "users",
        user.uid,
        "travel"
      );

    // =======================================================
    // EDIT
    // =======================================================

    if (editingId) {
      const tripId =
        editingId;

      const updatedTrip = {
        ...tripData,
        id: tripId,
      };

      /*
       * OPTIMISTIC UPDATE
       */
      setTrips((current) => {
        const updated =
          sortTrips(
            current.map(
              (trip) =>
                trip.id ===
                tripId
                  ? {
                      ...trip,
                      ...updatedTrip,
                    }
                  : trip
            )
          );

        saveTravelBackup(
          user.uid,
          updated
        );

        return updated;
      });

      /*
       * Close modal immediately.
       */
      resetForm();

      /*
       * Don't await Firestore.
       * Firestore queues the update offline.
       */
      void updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "travel",
          tripId
        ),
        {
          ...tripData,
          updatedAt:
            serverTimestamp(),
        }
      ).catch((error) => {
        console.error(
          "Travel update error:",
          error
        );
      });

      return;
    }

    // =======================================================
    // ADD
    // =======================================================

    /*
     * Generate the document ID locally.
     * This makes offline creation possible.
     */
    const tripRef =
      doc(travelRef);

    const tripId =
      tripRef.id;

    const localTrip = {
      id: tripId,

      ...tripData,

      /*
       * Keep the old `date` field
       * for compatibility.
       */
      date:
        form.startDate,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

    /*
     * OPTIMISTIC ADD
     */
    setTrips((current) => {
      const updated =
        sortTrips([
          ...current,
          localTrip,
        ]);

      saveTravelBackup(
        user.uid,
        updated
      );

      return updated;
    });

    /*
     * Close modal immediately.
     */
    resetForm();

    /*
     * Firestore write.
     * No await.
     *
     * If offline, Firestore queues it
     * and syncs when internet returns.
     */
    void setDoc(
      tripRef,
      {
        ...tripData,

        date:
          form.startDate,

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.error(
        "Travel save error:",
        error
      );
    });
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteTrip = (
    id
  ) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this trip?"
      );

    if (!confirmed) return;

    setDeletingId(id);

    /*
     * OPTIMISTIC DELETE
     */
    setTrips((current) => {
      const updated =
        current.filter(
          (trip) =>
            trip.id !== id
        );

      saveTravelBackup(
        user.uid,
        updated
      );

      return updated;
    });

    if (
      expandedTrip === id
    ) {
      setExpandedTrip(null);
    }

    /*
     * Don't wait for network.
     */
    void deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "travel",
        id
      )
    ).catch((error) => {
      console.error(
        "Travel delete error:",
        error
      );
    });

    setDeletingId(null);
  };

  // =========================================================
  // STATUS COUNTS
  // =========================================================

  const plannedCount =
    trips.filter(
      (trip) =>
        (trip.status ||
          "planned") ===
        "planned"
    ).length;

  const ongoingCount =
    trips.filter(
      (trip) =>
        trip.status ===
        "ongoing"
    ).length;

  const completedCount =
    trips.filter(
      (trip) =>
        trip.status ===
        "completed"
    ).length;

  const totalBudget =
    trips.reduce(
      (total, trip) =>
        total +
        (Number(
          trip.budget
        ) || 0),
      0
    );

  const totalTravelers =
    trips.reduce(
      (total, trip) =>
        total +
        (Number(
          trip.travelers
        ) || 1),
      0
    );

  // =========================================================
  // UPCOMING TRIP
  // =========================================================

  const upcomingTrip =
    useMemo(() => {
      const upcoming =
        trips
          .filter(
            (trip) =>
              (trip.status ||
                "planned") ===
                "planned" &&
              (trip.startDate ||
                trip.date)
          )
          .sort((a, b) =>
            (
              a.startDate ||
              a.date ||
              ""
            ).localeCompare(
              b.startDate ||
                b.date ||
                ""
            )
          );

      return (
        upcoming[0] ||
        null
      );
    }, [trips]);

  // =========================================================
  // FILTERED
  // =========================================================

  const filteredTrips =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      return trips.filter(
        (trip) => {
          const matchesSearch =
            !value ||
            `${trip.place || ""} ${
              trip.notes || ""
            } ${
              trip.status || ""
            }`
              .toLowerCase()
              .includes(value);

          const matchesStatus =
            statusFilter ===
              "all" ||
            (trip.status ||
              "planned") ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      trips,
      search,
      statusFilter,
    ]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading
        text="Loading travel..."
      />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      <div className="mx-auto max-w-7xl">

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                <Plane size={18} />
              </div>

              <p className="text-sm text-white/40">
                Your Journey
              </p>

            </div>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Travel
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/30">
              Plan your adventures, track your trips,
              and keep everything in one place.
            </p>

          </div>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-400 active:scale-[0.98]"
          >
            <Plus size={18} />
            Add Trip
          </button>

        </div>

        {/* ===================================================
            NEXT TRIP
        ==================================================== */}

        {upcomingTrip && (
          <div className="relative mb-6 overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-blue-500/[0.12] via-white/[0.035] to-transparent p-5 backdrop-blur-2xl md:p-6">

            <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">

              <div className="mb-4 flex items-center justify-between gap-3">

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300/60">
                    NEXT ADVENTURE
                  </p>

                  <h2 className="mt-1 text-xl font-bold md:text-2xl">
                    {upcomingTrip.place}
                  </h2>
                </div>

                <div className="rounded-xl bg-blue-500/10 px-3 py-2 text-right">
                  <p className="text-[9px] uppercase tracking-wider text-blue-300/50">
                    Starts
                  </p>

                  <p className="mt-0.5 text-xs font-semibold text-blue-300">
                    {formatDate(
                      upcomingTrip.startDate ||
                        upcomingTrip.date
                    )}
                  </p>
                </div>

              </div>

              <div className="grid gap-3 sm:grid-cols-3">

                <MiniInfo
                  icon={
                    <Timer size={16} />
                  }
                  label="Days Away"
                  value={
                    getDaysUntil(
                      upcomingTrip.startDate ||
                        upcomingTrip.date
                    ) === 0
                      ? "Today"
                      : `${Math.max(
                          0,
                          getDaysUntil(
                            upcomingTrip.startDate ||
                              upcomingTrip.date
                          )
                        )} days`
                  }
                  className="text-blue-400"
                />

                <MiniInfo
                  icon={
                    <CalendarDays
                      size={16}
                    />
                  }
                  label="Duration"
                  value={`${getTripDuration(
                    upcomingTrip
                  )} days`}
                  className="text-green-400"
                />

                <MiniInfo
                  icon={
                    <Wallet
                      size={16}
                    />
                  }
                  label="Budget"
                  value={`Rs. ${formatMoney(
                    upcomingTrip.budget
                  )}`}
                  className="text-green-400"
                />

              </div>

            </div>
          </div>
        )}

        {/* ===================================================
            STATS
        ==================================================== */}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

          <TravelStat
            icon={<Map size={18} />}
            title="Total Trips"
            value={trips.length}
            iconClass="bg-blue-400/10 text-blue-400"
          />

          <TravelStat
            icon={
              <Navigation size={18} />
            }
            title="Planned"
            value={plannedCount}
            iconClass="bg-blue-400/10 text-blue-400"
          />

          <TravelStat
            icon={
              <Clock size={18} />
            }
            title="Ongoing"
            value={ongoingCount}
            iconClass="bg-green-400/10 text-green-400"
          />

          <TravelStat
            icon={
              <CheckCircle2
                size={18}
              />
            }
            title="Completed"
            value={completedCount}
            iconClass="bg-red-400/10 text-red-400"
          />

        </div>

        {/* ===================================================
            OVERVIEW
        ==================================================== */}

        <div className="mb-6 grid gap-4 lg:grid-cols-3">

          <div className="rounded-3xl border border-green-400/10 bg-green-500/[0.04] p-5 backdrop-blur-2xl">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-white/30">
                  Travel Budget
                </p>

                <p className="mt-2 text-2xl font-bold">
                  Rs.{" "}
                  {formatMoney(
                    totalBudget
                  )}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-400/10 text-green-400">
                <Wallet size={20} />
              </div>

            </div>

            <p className="mt-3 text-xs text-white/25">
              Combined planned budget
            </p>

          </div>

          <div className="rounded-3xl border border-blue-400/10 bg-blue-500/[0.04] p-5 backdrop-blur-2xl">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-white/30">
                  Travelers
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {totalTravelers}
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
                <Users size={20} />
              </div>

            </div>

            <p className="mt-3 text-xs text-white/25">
              Total traveler count
            </p>

          </div>

          <div className="rounded-3xl border border-red-400/10 bg-red-500/[0.04] p-5 backdrop-blur-2xl">

            <div className="flex items-center justify-between">

              <div>
                <p className="text-xs text-white/30">
                  Completed
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {trips.length ===
                  0
                    ? 0
                    : Math.round(
                        (completedCount /
                          trips.length) *
                          100
                      )}
                  %
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400/10 text-red-400">
                <TrendingUp
                  size={20}
                />
              </div>

            </div>

            <p className="mt-3 text-xs text-white/25">
              Trip completion rate
            </p>

          </div>

        </div>

        {/* ===================================================
            SEARCH + FILTER
        ==================================================== */}

        <div className="mb-6 flex flex-col gap-3 md:flex-row">

          <div className="relative flex-1">

            <Search
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search destinations or notes..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-blue-400/30"
            />

          </div>

          <div className="relative md:w-48">

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5 pr-10 text-sm text-white outline-none transition focus:border-blue-400/30"
            >
              <option
                value="all"
                className="bg-[#101010]"
              >
                All Trips
              </option>

              <option
                value="planned"
                className="bg-[#101010]"
              >
                Planned
              </option>

              <option
                value="ongoing"
                className="bg-[#101010]"
              >
                Ongoing
              </option>

              <option
                value="completed"
                className="bg-[#101010]"
              >
                Completed
              </option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
            />

          </div>

        </div>

        {/* ===================================================
            SECTION HEADER
        ==================================================== */}

        <div className="mb-4 flex items-center justify-between">

          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              YOUR JOURNEYS
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Trips
            </h2>
          </div>

          <span className="text-xs text-white/25">
            {filteredTrips.length}{" "}
            {filteredTrips.length ===
            1
              ? "trip"
              : "trips"}
          </span>

        </div>

        {/* ===================================================
            TRIPS
        ==================================================== */}

        {filteredTrips.length ===
        0 ? (

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-12 text-center backdrop-blur-2xl">

            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
              <Route size={27} />
            </div>

            <h2 className="mt-5 font-semibold">
              {search ||
              statusFilter !==
                "all"
                ? "No trips found"
                : "No trips yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-sm text-sm text-white/30">
              {search ||
              statusFilter !==
                "all"
                ? "Try changing your search or filter."
                : "Start planning your next adventure and it will appear here."}
            </p>

            {!search &&
              statusFilter ===
                "all" && (
                <button
                  type="button"
                  onClick={
                    openAddForm
                  }
                  className="mt-5 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold transition hover:bg-blue-400"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus size={16} />
                    Add First Trip
                  </span>
                </button>
              )}

          </div>

        ) : (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {filteredTrips.map(
              (trip) => {
                const status =
                  getStatusStyle(
                    trip.status ||
                      "planned"
                  );

                const duration =
                  getTripDuration(
                    trip
                  );

                const progress =
                  getTripProgress(
                    trip
                  );

                const isExpanded =
                  expandedTrip ===
                  trip.id;

                const daysAway =
                  getDaysUntil(
                    trip.startDate ||
                      trip.date
                  );

                return (
                  <div
                    key={trip.id}
                    className={`group overflow-hidden rounded-3xl border bg-white/[0.035] backdrop-blur-2xl transition ${
                      isExpanded
                        ? "border-blue-400/25"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >

                    {/* CARD */}

                    <div className="p-5">

                      {/* HEADER */}

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
                            <MapPin
                              size={21}
                            />
                          </div>

                          <div className="min-w-0">

                            <h2 className="truncate font-semibold">
                              {trip.place}
                            </h2>

                            <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
                              <CalendarDays
                                size={12}
                              />

                              <span>
                                {formatDate(
                                  trip.startDate ||
                                    trip.date
                                )}
                              </span>
                            </div>

                          </div>

                        </div>

                        {/* ACTIONS */}

                        <div className="flex shrink-0 gap-1">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                trip
                              )
                            }
                            className="rounded-xl p-2 text-white/30 transition hover:bg-blue-500/10 hover:text-blue-300"
                            title="Edit"
                          >
                            <Pencil
                              size={15}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteTrip(
                                trip.id
                              )
                            }
                            disabled={
                              deletingId ===
                              trip.id
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

                      {/* STATUS */}

                      <div className="mt-4 flex items-center justify-between gap-3">

                        <span
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium ${status.className}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                          />

                          {status.label}
                        </span>

                        {trip.status ===
                          "planned" &&
                          daysAway !==
                            null && (
                            <span className="text-[10px] text-blue-300">
                              {daysAway <
                              0
                                ? "Past date"
                                : daysAway ===
                                  0
                                ? "Today"
                                : `${daysAway} days away`}
                            </span>
                          )}

                      </div>

                      {/* DATES */}

                      <div className="mt-5 grid grid-cols-2 gap-3">

                        <InfoBox
                          icon={
                            <CalendarDays
                              size={14}
                            />
                          }
                          label="Start"
                          value={formatDate(
                            trip.startDate ||
                              trip.date
                          )}
                          iconClass="text-blue-400"
                        />

                        <InfoBox
                          icon={
                            <CalendarDays
                              size={14}
                            />
                          }
                          label="End"
                          value={
                            trip.endDate
                              ? formatDate(
                                  trip.endDate
                                )
                              : "Not set"
                          }
                          iconClass="text-green-400"
                        />

                      </div>

                      {/* INFO */}

                      <div className="mt-3 grid grid-cols-2 gap-3">

                        <InfoBox
                          icon={
                            <Users
                              size={14}
                            />
                          }
                          label="Travelers"
                          value={
                            trip.travelers ||
                            1
                          }
                          iconClass="text-blue-400"
                        />

                        <InfoBox
                          icon={
                            <Wallet
                              size={14}
                            />
                          }
                          label="Budget"
                          value={`Rs. ${formatMoney(
                            trip.budget
                          )}`}
                          iconClass="text-green-400"
                        />

                      </div>

                      {/* DURATION */}

                      <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">

                        <div className="mb-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <Timer
                              size={14}
                              className="text-blue-400"
                            />

                            <span className="text-xs text-white/45">
                              Trip Progress
                            </span>

                          </div>

                          <span className="text-xs font-semibold text-blue-300">
                            {progress}%
                          </span>

                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">

                          <div
                            className={`h-full rounded-full transition-all ${
                              trip.status ===
                              "completed"
                                ? "bg-green-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${progress}%`,
                            }}
                          />

                        </div>

                        <div className="mt-2 flex items-center justify-between">

                          <span className="text-[10px] text-white/25">
                            {duration}{" "}
                            {duration ===
                            1
                              ? "day"
                              : "days"}
                          </span>

                          {trip.status ===
                            "completed" && (
                            <span className="text-[10px] text-green-300">
                              Completed ✓
                            </span>
                          )}

                          {trip.status ===
                            "ongoing" && (
                            <span className="text-[10px] text-green-300">
                              Currently travelling
                            </span>
                          )}

                        </div>

                      </div>

                      {/* NOTES */}

                      {trip.notes && (
                        <div className="mt-4">

                          <p className="line-clamp-2 text-xs leading-5 text-white/35">
                            {trip.notes}
                          </p>

                        </div>
                      )}

                      {/* VIEW DETAILS */}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTrip(
                            isExpanded
                              ? null
                              : trip.id
                          )
                        }
                        className="mt-4 flex w-full items-center justify-center gap-2 border-t border-white/[0.06] pt-4 text-xs text-blue-300 transition hover:text-blue-200"
                      >
                        {isExpanded ? (
                          <>
                            Hide details
                            <ChevronUp
                              size={15}
                            />
                          </>
                        ) : (
                          <>
                            View trip details
                            <ChevronDown
                              size={15}
                            />
                          </>
                        )}
                      </button>

                    </div>

                    {/* EXPANDED */}

                    {isExpanded && (
                      <div className="border-t border-white/[0.06] bg-black/10 p-5">

                        <div className="grid grid-cols-2 gap-3">

                          <div className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] p-3">

                            <p className="text-[9px] uppercase tracking-wider text-white/25">
                              Destination
                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-blue-300">
                              <MapPin
                                size={13}
                              />
                              {trip.place}
                            </p>

                          </div>

                          <div className="rounded-2xl border border-green-400/10 bg-green-500/[0.04] p-3">

                            <p className="text-[9px] uppercase tracking-wider text-white/25">
                              Duration
                            </p>

                            <p className="mt-1 text-sm font-medium text-green-300">
                              {duration}{" "}
                              {duration ===
                              1
                                ? "day"
                                : "days"}
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">

                          <div className="flex items-center justify-between">

                            <div>
                              <p className="text-[9px] uppercase tracking-wider text-white/25">
                                Budget
                              </p>

                              <p className="mt-1 text-lg font-bold">
                                Rs.{" "}
                                {formatMoney(
                                  trip.budget
                                )}
                              </p>
                            </div>

                            <Wallet
                              size={20}
                              className="text-green-400"
                            />

                          </div>

                        </div>

                        {trip.notes && (
                          <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">

                            <p className="text-[9px] uppercase tracking-wider text-white/25">
                              Trip Notes
                            </p>

                            <p className="mt-2 text-sm leading-6 text-white/50">
                              {trip.notes}
                            </p>

                          </div>
                        )}

                        <div className="mt-4 flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                trip
                              )
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500/10 py-2.5 text-xs font-medium text-blue-300 transition hover:bg-blue-500/20"
                          >
                            <Pencil
                              size={14}
                            />
                            Edit Trip
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteTrip(
                                trip.id
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                          >
                            <Trash2
                              size={14}
                            />
                            Delete
                          </button>

                        </div>

                      </div>
                    )}

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* ===================================================
          MOBILE ADD
      ==================================================== */}

      <button
        type="button"
        onClick={openAddForm}
        aria-label="Add trip"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/30 transition active:scale-90 sm:hidden"
      >
        <Plus
          size={25}
          strokeWidth={2.5}
        />
      </button>

      {/* ===================================================
          MODAL
      ==================================================== */}

      {showForm && (
        <TravelModal
          form={form}
          editingId={editingId}
          saving={saving}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={resetForm}
        />
      )}

    </div>
  );
}

// ===========================================================
// STAT
// ===========================================================

function TravelStat({
  icon,
  title,
  value,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="truncate text-[10px] text-white/30 sm:text-[11px]">
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

// ===========================================================
// MINI INFO
// ===========================================================

function MiniInfo({
  icon,
  label,
  value,
  className,
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3">

      <div className={className}>
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[9px] uppercase tracking-wider text-white/25">
          {label}
        </p>

        <p className="mt-0.5 truncate text-xs font-semibold text-white/70">
          {value}
        </p>

      </div>

    </div>
  );
}

// ===========================================================
// INFO BOX
// ===========================================================

function InfoBox({
  icon,
  label,
  value,
  iconClass,
}) {
  return (
    <div className="rounded-2xl bg-white/[0.025] p-3">

      <div className="flex items-center gap-2">

        <span className={iconClass}>
          {icon}
        </span>

        <p className="text-[10px] text-white/25">
          {label}
        </p>

      </div>

      <p className="mt-1 truncate text-xs text-white/60">
        {value}
      </p>

    </div>
  );
}

// ===========================================================
// MODAL
// ===========================================================

function TravelModal({
  form,
  editingId,
  saving,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
            event.currentTarget &&
          !saving
        ) {
          onClose();
        }
      }}
    >

      <div className="flex max-h-[calc(100vh-24px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400">
                <Plane size={15} />
              </div>

              <p className="text-xs text-white/40">
                Travel Planner
              </p>

            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {editingId
                ? "Edit Trip"
                : "Plan New Trip"}
            </h2>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl bg-white/[0.06] p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X size={18} />
          </button>

        </div>

        {/* FORM SCROLL AREA */}

        <div className="overflow-y-auto overscroll-contain p-5 pb-8 sm:p-6 sm:pb-6">

          <form
            onSubmit={onSubmit}
            className="space-y-4"
          >

            {/* DESTINATION */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Destination
              </label>

              <div className="relative">

                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/50"
                />

                <input
                  type="text"
                  name="place"
                  value={form.place}
                  onChange={onChange}
                  placeholder="e.g. Ella, Kandy, Nuwara Eliya"
                  maxLength={100}
                  required
                  disabled={saving}
                  autoFocus
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:opacity-50"
                />

              </div>

            </div>

            {/* DATES */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Start Date
                </label>

                <input
                  type="date"
                  name="startDate"
                  value={
                    form.startDate
                  }
                  onChange={onChange}
                  required
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/30 disabled:opacity-50"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  End Date
                </label>

                <input
                  type="date"
                  name="endDate"
                  value={form.endDate}
                  min={
                    form.startDate
                  }
                  onChange={onChange}
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/30 disabled:opacity-50"
                />

              </div>

            </div>

            {/* QUICK DURATION */}

            {form.startDate &&
              form.endDate && (
                <div className="flex items-center gap-2 rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] px-4 py-3">

                  <CalendarDays
                    size={15}
                    className="text-blue-400"
                  />

                  <p className="text-xs text-blue-300">
                    Trip duration:{" "}
                    <span className="font-semibold">
                      {getDaysBetween(
                        form.startDate,
                        form.endDate
                      )}{" "}
                      {getDaysBetween(
                        form.startDate,
                        form.endDate
                      ) === 1
                        ? "day"
                        : "days"}
                    </span>
                  </p>

                </div>
              )}

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Trip Status
              </label>

              <div className="grid grid-cols-3 gap-2">

                <StatusButton
                  label="Planned"
                  active={
                    form.status ===
                    "planned"
                  }
                  onClick={() =>
                    onChange({
                      target: {
                        name: "status",
                        value:
                          "planned",
                      },
                    })
                  }
                  className="border-blue-400/30 bg-blue-400/10 text-blue-400"
                />

                <StatusButton
                  label="Ongoing"
                  active={
                    form.status ===
                    "ongoing"
                  }
                  onClick={() =>
                    onChange({
                      target: {
                        name: "status",
                        value:
                          "ongoing",
                      },
                    })
                  }
                  className="border-green-400/30 bg-green-400/10 text-green-400"
                />

                <StatusButton
                  label="Completed"
                  active={
                    form.status ===
                    "completed"
                  }
                  onClick={() =>
                    onChange({
                      target: {
                        name: "status",
                        value:
                          "completed",
                      },
                    })
                  }
                  className="border-red-400/30 bg-red-400/10 text-red-400"
                />

              </div>

            </div>

            {/* BUDGET + TRAVELERS */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Estimated Budget
                </label>

                <div className="relative">

                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-green-400/60">
                    Rs.
                  </span>

                  <input
                    type="number"
                    name="budget"
                    value={
                      form.budget
                    }
                    onChange={
                      onChange
                    }
                    min="0"
                    placeholder="50000"
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-green-400/30 disabled:opacity-50"
                  />

                </div>

              </div>

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Travelers
                </label>

                <div className="relative">

                  <Users
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400/50"
                  />

                  <input
                    type="number"
                    name="travelers"
                    value={
                      form.travelers
                    }
                    onChange={
                      onChange
                    }
                    min="1"
                    max="100"
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-blue-400/30 disabled:opacity-50"
                  />

                </div>

              </div>

            </div>

            {/* NOTES */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Trip Notes
              </label>

              <textarea
                name="notes"
                value={form.notes}
                onChange={onChange}
                placeholder="Places to visit, things to pack, plans..."
                rows={4}
                maxLength={1000}
                disabled={saving}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:opacity-50"
              />

              <p className="mt-1 text-right text-[10px] text-white/20">
                {form.notes.length}
                /1000
              </p>

            </div>

            {/* BUTTONS */}

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.03] py-3.5 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    {editingId
                      ? "Update Trip"
                      : "Save Trip"}

                    <ArrowRight
                      size={16}
                    />
                  </>
                )}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

// ===========================================================
// STATUS BUTTON
// ===========================================================

function StatusButton({
  label,
  active,
  onClick,
  className,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
        active
          ? className
          : "border-white/10 bg-white/[0.03] text-white/30 hover:bg-white/[0.06] hover:text-white/60"
      }`}
    >
      {label}
    </button>
  );
}