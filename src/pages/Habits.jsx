import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Check,
  Trash2,
  Pencil,
  X,
  Repeat,
  Search,
  Flame,
  CheckCircle2,
  Circle,
  Target,
  Loader2,
  CalendarDays,
} from "lucide-react";

import Loading from "../components/Loading";
import { db } from "../firebase/config";

import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

/* =========================================================
   HELPERS
========================================================= */

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60000
  );

  return localDate.toISOString().split("T")[0];
}

function formatDate(dateString) {
  if (!dateString) return "";

  try {
    return new Intl.DateTimeFormat("en-LK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(`${dateString}T00:00:00`));
  } catch {
    return dateString;
  }
}

/* =========================================================
   MAIN
========================================================= */

export default function Habits({ user }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [search, setSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  /* =========================================================
     FIRESTORE LIVE DATA
  ========================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const habitsRef = collection(
      db,
      "users",
      user.uid,
      "habits"
    );

    const habitsQuery = query(
      habitsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      habitsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setHabits(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Habits Firestore Error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const filteredHabits = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return habits;

    return habits.filter((habit) =>
      `${habit.name || ""} ${habit.description || ""}`
        .toLowerCase()
        .includes(value)
    );
  }, [habits, search]);

  /* =========================================================
     STATISTICS
  ========================================================= */

  const totalCount = habits.length;

  const completedCount = habits.filter(
    (habit) => habit.completedToday
  ).length;

  const remainingCount =
    totalCount - completedCount;

  const completionPercentage =
    totalCount === 0
      ? 0
      : Math.round(
          (completedCount / totalCount) * 100
        );

  /* =========================================================
     MODAL
  ========================================================= */

  const openAddModal = () => {
    setEditingHabit(null);
    setName("");
    setDescription("");
    setShowModal(true);
  };

  const openEditModal = (habit) => {
    setEditingHabit(habit);
    setName(habit.name || "");
    setDescription(habit.description || "");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingHabit(null);
    setName("");
    setDescription("");
  };

  /* =========================================================
     SAVE HABIT
  ========================================================= */

  const saveHabit = async (event) => {
    event.preventDefault();

    if (!user?.uid) {
      alert("Please login first.");
      return;
    }

    const cleanName = name.trim();
    const cleanDescription = description.trim();

    if (!cleanName) {
      alert("Please enter a habit name.");
      return;
    }

    setSaving(true);

    try {
      if (editingHabit) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "habits",
            editingHabit.id
          ),
          {
            name: cleanName,
            description: cleanDescription,
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "users",
            user.uid,
            "habits"
          ),
          {
            name: cleanName,
            description: cleanDescription,

            completedToday: false,

            currentStreak: 0,
            bestStreak: 0,

            lastCompletedDate: "",

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }

      closeModal();
    } catch (error) {
      console.error(
        "Saving habit failed:",
        error
      );

      alert(
        "Could not save habit. Check Firebase."
      );
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     TOGGLE HABIT
  ========================================================= */

  const toggleHabit = async (habit) => {
    if (!user?.uid) return;

    const today = getToday();
    const completed = Boolean(
      habit.completedToday
    );

    try {
      if (!completed) {
        const currentStreak = Number(
          habit.currentStreak || 0
        );

        const bestStreak = Number(
          habit.bestStreak || 0
        );

        const newStreak =
          currentStreak + 1;

        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "habits",
            habit.id
          ),
          {
            completedToday: true,
            lastCompletedDate: today,
            currentStreak: newStreak,
            bestStreak: Math.max(
              bestStreak,
              newStreak
            ),
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        const currentStreak = Number(
          habit.currentStreak || 0
        );

        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "habits",
            habit.id
          ),
          {
            completedToday: false,
            currentStreak: Math.max(
              currentStreak - 1,
              0
            ),
            updatedAt: serverTimestamp(),
          }
        );
      }
    } catch (error) {
      console.error(
        "Updating habit failed:",
        error
      );

      alert(
        "Could not update habit."
      );
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const deleteHabit = async (habit) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      `Delete "${habit.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(habit.id);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "habits",
          habit.id
        )
      );
    } catch (error) {
      console.error(
        "Delete habit failed:",
        error
      );

      alert(
        "Could not delete habit."
      );
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <Loading text="Loading habits..." />
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-400/20 bg-purple-500/10 text-purple-300">
              <Repeat size={18} />
            </div>

            <p className="text-sm text-purple-300/70">
              Daily consistency
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Habits
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Build better routines, one day at a time.
          </p>

        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-purple-500/20 transition hover:bg-purple-400 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Habit
        </button>

      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <Stat
          icon={<Repeat size={18} />}
          title="Total Habits"
          value={totalCount}
          iconClass="bg-purple-500/10 text-purple-300"
        />

        <Stat
          icon={<CheckCircle2 size={18} />}
          title="Completed Today"
          value={completedCount}
          iconClass="bg-green-500/10 text-green-300"
        />

        <Stat
          icon={<Circle size={18} />}
          title="Remaining"
          value={remainingCount}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <Stat
          icon={<Target size={18} />}
          title="Daily Progress"
          value={`${completionPercentage}%`}
          iconClass="bg-purple-500/10 text-purple-300"
        />

      </div>

      {/* =====================================================
          DAILY PROGRESS
      ====================================================== */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

        <div className="flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300">
              <CalendarDays size={19} />
            </div>

            <div>

              <p className="font-medium">
                Today's Progress
              </p>

              <p className="mt-1 text-xs text-white/30">
                {completedCount} of {totalCount} habits completed
              </p>

            </div>

          </div>

          <div className="text-right">

            <p className="text-xl font-bold text-purple-300">
              {completionPercentage}%
            </p>

            <p className="text-[10px] text-white/25">
              complete
            </p>

          </div>

        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-400 to-green-400 transition-all duration-500"
            style={{
              width: `${completionPercentage}%`,
            }}
          />

        </div>

      </div>

      {/* =====================================================
          SEARCH
      ====================================================== */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">

        <div className="relative">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-300/40"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search habits..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-purple-400/30 focus:bg-purple-500/[0.03]"
          />

        </div>

      </div>

      {/* =====================================================
          HABITS
      ====================================================== */}

      {filteredHabits.length === 0 ? (

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] px-5 py-16 text-center backdrop-blur-2xl">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-400/10 bg-purple-500/10 text-purple-300/60">
            <Repeat size={25} />
          </div>

          <p className="mt-4 font-medium">
            {search
              ? "No habits found"
              : "No habits yet"}
          </p>

          <p className="mt-1 text-sm text-white/30">
            {search
              ? "Try another search."
              : "Create your first habit and start building consistency."}
          </p>

          {!search && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-5 rounded-xl bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
            >
              Add Habit
            </button>
          )}

        </div>

      ) : (

        <div className="space-y-3">

          {filteredHabits.map(
            (habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={() =>
                  toggleHabit(
                    habit
                  )
                }
                onEdit={() =>
                  openEditModal(
                    habit
                  )
                }
                onDelete={() =>
                  deleteHabit(
                    habit
                  )
                }
                deleting={
                  deletingId ===
                  habit.id
                }
              />
            )
          )}

        </div>

      )}

      {/* =====================================================
          MOBILE ADD BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={openAddModal}
        aria-label="Add habit"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-purple-500 text-white shadow-2xl shadow-purple-500/30 transition hover:bg-purple-400 active:scale-90 sm:hidden"
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
        <HabitModal
          editingHabit={
            editingHabit
          }
          name={name}
          description={
            description
          }
          setName={setName}
          setDescription={
            setDescription
          }
          saving={saving}
          onClose={closeModal}
          onSubmit={saveHabit}
        />
      )}

    </div>
  );
}

/* ===========================================================
   STAT
=========================================================== */

function Stat({
  icon,
  title,
  value,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl transition hover:bg-white/[0.055]">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
        >
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

/* ===========================================================
   HABIT CARD
=========================================================== */

function HabitCard({
  habit,
  onToggle,
  onEdit,
  onDelete,
  deleting,
}) {
  const completed =
    Boolean(habit.completedToday);

  const streak = Number(
    habit.currentStreak || 0
  );

  const bestStreak = Number(
    habit.bestStreak || 0
  );

  return (
    <div
      className={`group rounded-3xl border bg-white/[0.035] p-4 shadow-lg shadow-black/5 backdrop-blur-2xl transition hover:bg-white/[0.055] ${
        completed
          ? "border-green-400/15"
          : "border-purple-400/10"
      }`}
    >

      <div className="flex items-center gap-3">

        {/* CHECK */}

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            completed
              ? "Mark habit incomplete"
              : "Complete habit"
          }
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition ${
            completed
              ? "border-green-400 bg-green-500 text-white shadow-lg shadow-green-500/20"
              : "border-purple-400/10 bg-purple-500/10 text-purple-300 hover:border-purple-400/30 hover:bg-purple-500/20"
          }`}
        >

          {completed ? (
            <Check
              size={21}
              strokeWidth={2.5}
            />
          ) : (
            <Circle size={21} />
          )}

        </button>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h3
              className={`font-medium ${
                completed
                  ? "text-white/40 line-through"
                  : ""
              }`}
            >
              {habit.name}
            </h3>

            {completed && (
              <span className="flex items-center gap-1 rounded-full border border-green-400/20 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">
                <Check size={10} />
                Done
              </span>
            )}

          </div>

          {habit.description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/30">
              {habit.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-3">

            <div className="flex items-center gap-1.5 text-xs text-orange-300/70">

              <Flame size={13} />

              <span>
                {streak} day streak
              </span>

            </div>

            {bestStreak > 0 && (
              <div className="text-xs text-white/25">
                Best: {bestStreak} days
              </div>
            )}

            {habit.lastCompletedDate && (
              <div className="hidden items-center gap-1 text-xs text-white/20 sm:flex">

                <CalendarDays
                  size={12}
                />

                {formatDate(
                  habit.lastCompletedDate
                )}

              </div>
            )}

          </div>

        </div>

        {/* ACTIONS */}

        <div className="flex shrink-0 gap-1">

          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit habit"
            className="rounded-xl p-2 text-white/25 transition hover:bg-purple-500/10 hover:text-purple-300"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete habit"
            className="rounded-xl p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
          >
            {deleting ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Trash2 size={15} />
            )}
          </button>

        </div>

      </div>

    </div>
  );
}

/* ===========================================================
   HABIT MODAL
=========================================================== */

function HabitModal({
  editingHabit,
  name,
  description,
  setName,
  setDescription,
  saving,
  onClose,
  onSubmit,
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

      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-purple-400/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-w-lg sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-300">
                <Repeat size={15} />
              </div>

              <p className="text-xs text-purple-300/60">
                Daily routine
              </p>

            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {editingHabit
                ? "Edit Habit"
                : "New Habit"}
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

            {/* NAME */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Habit Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value
                  )
                }
                placeholder="e.g. Morning workout"
                disabled={saving}
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-purple-400/30 focus:bg-purple-500/[0.03] disabled:opacity-50"
              />

            </div>

            {/* DESCRIPTION */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Optional description"
                rows={3}
                disabled={saving}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-purple-400/30 disabled:opacity-50"
              />

            </div>

            {/* INFO */}

            <div className="rounded-2xl border border-purple-400/10 bg-purple-500/[0.05] p-4">

              <div className="flex gap-3">

                <div className="mt-0.5 text-purple-300">
                  <Repeat size={16} />
                </div>

                <div>

                  <p className="text-xs font-medium text-purple-200">
                    Daily habit
                  </p>

                  <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                    Mark this habit complete each day to build your streak.
                  </p>

                </div>

              </div>

            </div>

            {/* BUTTONS */}

            <div className="flex gap-3 pt-2">

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-3.5 text-sm font-medium text-white/50 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-purple-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:bg-purple-400 disabled:opacity-50"
              >

                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    {editingHabit
                      ? "Update Habit"
                      : "Create Habit"}
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