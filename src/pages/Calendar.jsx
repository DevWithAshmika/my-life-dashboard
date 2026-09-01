import { useEffect, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Clock,
  FileText,
} from "lucide-react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";
import Loading from "../components/Loading";

export default function Calendar({ user }) {
  // =========================================================
  // STATE
  // =========================================================

  const [events, setEvents] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  // =========================================================
  // TODAY
  // =========================================================

  const getToday = () => {
    const date = new Date();

    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState({
    title: "",
    date: getToday(),
    time: "",
    description: "",
  });

  // =========================================================
  // FIRESTORE LIVE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const calendarRef =
      collection(
        db,
        "users",
        user.uid,
        "calendar"
      );

    const unsubscribe =
      onSnapshot(
        calendarRef,
        (snapshot) => {
          const eventData =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          eventData.sort(
            (a, b) => {
              const dateA =
                `${a.date || ""} ${
                  a.time || ""
                }`;

              const dateB =
                `${b.date || ""} ${
                  b.time || ""
                }`;

              return dateA.localeCompare(
                dateB
              );
            }
          );

          setEvents(eventData);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Calendar Firestore error:",
            error
          );

          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user]);

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
      title: "",
      date: getToday(),
      time: "",
      description: "",
    });

    setShowForm(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditForm = (
    event
  ) => {
    setEditingId(event.id);

    setForm({
      title: event.title || "",
      date:
        event.date || getToday(),
      time: event.time || "",
      description:
        event.description || "",
    });

    setShowForm(true);
  };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm = () => {
    setEditingId(null);

    setForm({
      title: "",
      date: getToday(),
      time: "",
      description: "",
    });

    setShowForm(false);
  };

  // =========================================================
  // SAVE EVENT
  // =========================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!user?.uid) {
      alert(
        "You are not logged in."
      );
      return;
    }

    const title =
      form.title.trim();

    if (!title) {
      alert(
        "Please enter an event title."
      );
      return;
    }

    if (!form.date) {
      alert(
        "Please select a date."
      );
      return;
    }

    setSaving(true);

    try {
      const calendarRef =
        collection(
          db,
          "users",
          user.uid,
          "calendar"
        );

      const eventData = {
        title,
        date: form.date,
        time: form.time || "",
        description:
          form.description.trim(),
        updatedAt:
          serverTimestamp(),
      };

      // =====================================================
      // EDIT
      // =====================================================

      if (editingId) {
        const eventRef = doc(
          db,
          "users",
          user.uid,
          "calendar",
          editingId
        );

        await updateDoc(
          eventRef,
          eventData
        );
      }

      // =====================================================
      // ADD
      // =====================================================

      else {
        await addDoc(
          calendarRef,
          {
            ...eventData,
            createdAt:
              serverTimestamp(),
          }
        );
      }

      resetForm();
    } catch (error) {
      console.error(
        "Calendar save error:",
        error
      );

      alert(
        "Could not save the event."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE EVENT
  // =========================================================

  const handleDelete = async (
    id
  ) => {
    if (!user?.uid) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this event?"
      );

    if (!confirmed) {
      return;
    }

    try {
      const eventRef = doc(
        db,
        "users",
        user.uid,
        "calendar",
        id
      );

      await deleteDoc(eventRef);
    } catch (error) {
      console.error(
        "Calendar delete error:",
        error
      );

      alert(
        "Could not delete the event."
      );
    }
  };

  // =========================================================
  // UPCOMING EVENTS
  // =========================================================

  const today = getToday();

  const upcomingEvents =
    events.filter(
      (event) =>
        event.date &&
        event.date >= today
    );

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading
        text="Loading calendar..."
      />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold tracking-tight">
            Calendar
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Manage your events and schedule.
          </p>

        </div>

        <button
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
        >
          <Plus size={18} />
          Add Event
        </button>

      </div>

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <CalendarDays
              size={20}
            />
          </div>

          <p className="text-sm text-white/40">
            Total Events
          </p>

          <p className="mt-2 text-3xl font-bold">
            {events.length}
          </p>

        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
            <Clock size={20} />
          </div>

          <p className="text-sm text-white/40">
            Upcoming Events
          </p>

          <p className="mt-2 text-3xl font-bold">
            {upcomingEvents.length}
          </p>

        </div>

      </div>

      {/* =====================================================
          EVENTS
      ====================================================== */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

        <div className="mb-5">

          <h2 className="text-lg font-semibold">
            Your Events
          </h2>

          <p className="mt-1 text-xs text-white/30">
            All your scheduled events
          </p>

        </div>

        {events.length === 0 ? (

          <div className="py-16 text-center">

            <CalendarDays
              size={34}
              className="mx-auto mb-4 text-white/20"
            />

            <p className="text-sm text-white/30">
              No events yet.
            </p>

            <button
              onClick={
                openAddForm
              }
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Add Your First Event
            </button>

          </div>

        ) : (

          <div className="space-y-3">

            {events.map(
              (event) => (

                <div
                  key={event.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
                >

                  {/* LEFT */}

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10">

                      <CalendarDays
                        size={17}
                      />

                    </div>

                    <div className="min-w-0">

                      <p className="truncate font-medium">
                        {event.title}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/30">

                        <span>
                          {event.date}
                        </span>

                        {event.time && (
                          <span>
                            {event.time}
                          </span>
                        )}

                      </div>

                      {event.description && (
                        <p className="mt-1 truncate text-xs text-white/20">
                          {
                            event.description
                          }
                        </p>
                      )}

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex gap-2">

                    <button
                      onClick={() =>
                        openEditForm(
                          event
                        )
                      }
                      className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20"
                      title="Edit"
                    >
                      <Pencil
                        size={15}
                      />
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(
                          event.id
                        )
                      }
                      className="rounded-xl bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                      title="Delete"
                    >
                      <Trash2
                        size={15}
                      />
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-6 shadow-2xl">

            {/* HEADER */}

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-semibold">
                  {editingId
                    ? "Edit Event"
                    : "Add Event"}
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Add an event to your calendar.
                </p>

              </div>

              <button
                onClick={resetForm}
                className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20"
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-4"
            >

              {/* TITLE */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Event Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={
                    handleChange
                  }
                  placeholder="Gym workout"
                  maxLength={100}
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                />

              </div>

              {/* DATE */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={
                    handleChange
                  }
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />

              </div>

              {/* TIME */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Time
                </label>

                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={
                    handleChange
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Description
                </label>

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Add some details..."
                  rows={4}
                  maxLength={500}
                  className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                />

              </div>

              {/* SAVE */}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-white py-3 font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Event"
                  : "Save Event"}
              </button>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}