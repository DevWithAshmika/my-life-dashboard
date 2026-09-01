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
} from "lucide-react";

import Loading from "../components/Loading";
import { db } from "../firebase/config";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
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

  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

// ===========================================================
// TRAVEL COMPONENT
// ===========================================================

export default function Travel({ user }) {
  const [trips, setTrips] = useState([]);

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

  const [search, setSearch] =
    useState("");

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState({
    place: "",
    startDate: getToday(),
    endDate: "",
    status: "planned",
    budget: "",
    travelers: "1",
    notes: "",
  });

  // =========================================================
  // FIRESTORE LIVE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const travelRef = collection(
      db,
      "users",
      user.uid,
      "travel"
    );

    const unsubscribe = onSnapshot(
      travelRef,
      (snapshot) => {
        const data =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        data.sort((a, b) => {
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
        });

        setTrips(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Travel Firestore error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
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

  const openEditForm = (trip) => {
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
        trip.status || "planned",
      budget:
        trip.budget !== undefined
          ? String(trip.budget)
          : "",
      travelers:
        trip.travelers !== undefined
          ? String(trip.travelers)
          : "1",
      notes:
        trip.notes || "",
    });

    setShowForm(true);
  };

  // =========================================================
  // RESET FORM
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
  // SAVE TRIP
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.uid) {
      alert("You are not logged in.");
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
      form.endDate < form.startDate
    ) {
      alert(
        "End date cannot be before start date."
      );
      return;
    }

    setSaving(true);

    try {
      const travelRef =
        collection(
          db,
          "users",
          user.uid,
          "travel"
        );

      const tripData = {
        place,
        startDate:
          form.startDate,
        endDate:
          form.endDate || "",
        status:
          form.status || "planned",
        budget:
          Number(form.budget) || 0,
        travelers:
          Number(form.travelers) || 1,
        notes:
          form.notes.trim(),
        updatedAt:
          serverTimestamp(),
      };

      // =====================================================
      // EDIT
      // =====================================================

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "travel",
            editingId
          ),
          tripData
        );
      }

      // =====================================================
      // ADD
      // =====================================================

      else {
        await addDoc(
          travelRef,
          {
            ...tripData,

            // Keep old date field for compatibility
            date:
              form.startDate,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Travel save error:",
        error
      );

      alert(
        "Could not save trip."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const deleteTrip = async (id) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this trip?"
      );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "travel",
          id
        )
      );
    } catch (error) {
      console.error(
        "Travel delete error:",
        error
      );

      alert(
        "Could not delete trip."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // FILTER
  // =========================================================

  const filteredTrips = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return trips;
    }

    return trips.filter((trip) =>
      `${trip.place || ""} ${
        trip.notes || ""
      } ${
        trip.status || ""
      }`
        .toLowerCase()
        .includes(value)
    );
  }, [trips, search]);

  // =========================================================
  // STATS
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
        trip.status === "ongoing"
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
        (Number(trip.budget) ||
          0),
      0
    );

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

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
              <Map size={18} />
            </div>

            <p className="text-sm text-white/40">
              Journey
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Travel
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Plan your journeys and keep your travel memories organized.
          </p>

        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Trip
        </button>

      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

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
            <CheckCircle2 size={18} />
          }
          title="Completed"
          value={completedCount}
          iconClass="bg-red-400/10 text-red-400"
        />

      </div>

      {/* =====================================================
          BUDGET SUMMARY
      ====================================================== */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-2xl">

        <div className="flex items-center gap-4">

          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-green-400/10 text-green-400">
            <Wallet size={20} />
          </div>

          <div>

            <p className="text-xs text-white/30">
              Total Planned Budget
            </p>

            <p className="mt-1 text-2xl font-bold">
              Rs.{" "}
              {totalBudget.toLocaleString(
                "en-LK"
              )}
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div className="mb-6">

        <div className="relative">

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
            placeholder="Search trips..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30"
          />

        </div>

      </div>

      {/* =====================================================
          TRIPS
      ====================================================== */}

      {filteredTrips.length === 0 ? (

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-12 text-center backdrop-blur-2xl">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">

            <Map size={25} />

          </div>

          <h2 className="mt-5 font-semibold">
            No trips found
          </h2>

          <p className="mt-2 text-sm text-white/30">
            Start planning your next adventure.
          </p>

          <button
            type="button"
            onClick={openAddForm}
            className="mt-5 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Add Trip
          </button>

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

              return (
                <div
                  key={trip.id}
                  className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition hover:border-white/20 hover:bg-white/[0.05]"
                >

                  {/* CARD HEADER */}

                  <div className="flex items-start justify-between gap-3">

                    <div className="flex min-w-0 items-center gap-3">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 text-blue-400">
                        <MapPin
                          size={20}
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
                        className="rounded-xl p-2 text-white/30 transition hover:bg-white/10 hover:text-white"
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

                  <div className="mt-4">

                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-medium ${status.className}`}
                    >

                      <span
                        className={`h-1.5 w-1.5 rounded-full ${status.dot}`}
                      />

                      {status.label}

                    </span>

                  </div>

                  {/* DATES */}

                  <div className="mt-5 grid grid-cols-2 gap-3">

                    <div className="rounded-2xl bg-white/[0.03] p-3">

                      <p className="text-[10px] uppercase tracking-wide text-white/20">
                        Start
                      </p>

                      <p className="mt-1 text-xs text-white/60">
                        {formatDate(
                          trip.startDate ||
                            trip.date
                        )}
                      </p>

                    </div>

                    <div className="rounded-2xl bg-white/[0.03] p-3">

                      <p className="text-[10px] uppercase tracking-wide text-white/20">
                        End
                      </p>

                      <p className="mt-1 text-xs text-white/60">
                        {trip.endDate
                          ? formatDate(
                              trip.endDate
                            )
                          : "Not set"}
                      </p>

                    </div>

                  </div>

                  {/* DETAILS */}

                  <div className="mt-3 grid grid-cols-2 gap-3">

                    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-3">

                      <Users
                        size={15}
                        className="text-blue-400"
                      />

                      <div>

                        <p className="text-[10px] text-white/20">
                          Travelers
                        </p>

                        <p className="text-xs text-white/60">
                          {trip.travelers ||
                            1}
                        </p>

                      </div>

                    </div>

                    <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] p-3">

                      <Wallet
                        size={15}
                        className="text-green-400"
                      />

                      <div>

                        <p className="text-[10px] text-white/20">
                          Budget
                        </p>

                        <p className="text-xs text-white/60">
                          Rs.{" "}
                          {Number(
                            trip.budget ||
                              0
                          ).toLocaleString(
                            "en-LK"
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                  {/* NOTES */}

                  {trip.notes && (
                    <div className="mt-4 border-t border-white/[0.06] pt-4">

                      <p className="text-xs leading-5 text-white/35">
                        {trip.notes}
                      </p>

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>

      )}

      {/* =====================================================
          MODAL
      ====================================================== */}

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

      {/* =====================================================
          MOBILE ADD BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={openAddForm}
        aria-label="Add trip"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/20 transition active:scale-90 sm:hidden"
      >
        <Plus
          size={25}
          strokeWidth={2.5}
        />
      </button>

    </div>
  );
}

// ===========================================================
// STAT COMPONENT
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
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
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
// TRAVEL MODAL
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

      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-w-lg sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/10 text-blue-400">
                <Map size={15} />
              </div>

              <p className="text-xs text-white/40">
                Travel Planner
              </p>

            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {editingId
                ? "Edit Trip"
                : "New Trip"}
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

        {/* FORM */}

        <div className="overflow-y-auto p-5 sm:p-6">

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
                  placeholder="e.g. Ella"
                  maxLength={100}
                  required
                  disabled={saving}
                  autoFocus
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-blue-400/30 disabled:opacity-50"
                />

              </div>

            </div>

            {/* START + END */}

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

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Trip Status
              </label>

              <div className="grid grid-cols-3 gap-2">

                <StatusButton
                  value="planned"
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
                  value="ongoing"
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
                  value="completed"
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

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Trip"
                : "Save Trip"}
            </button>

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