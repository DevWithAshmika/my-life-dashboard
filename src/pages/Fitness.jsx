import { useEffect, useMemo, useState } from "react";

import {
  Dumbbell,
  Plus,
  Trash2,
  TrendingUp,
  Activity,
  CalendarDays,
  X,
  Loader2,
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
} from "firebase/firestore";

export default function Fitness({ user }) {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // =========================================================
  // FIRESTORE LIVE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    const workoutsRef = collection(
      db,
      "users",
      user.uid,
      "fitness"
    );

    const workoutsQuery = query(
      workoutsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      workoutsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setWorkouts(data);
        setLoading(false);
      },
      (error) => {
        console.error("Fitness Firestore Error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const statistics = useMemo(() => {
    const totalWorkouts = workouts.length;

    const totalSets = workouts.reduce(
      (sum, workout) =>
        sum + Number(workout.sets || 0),
      0
    );

    const totalReps = workouts.reduce(
      (sum, workout) =>
        sum +
        Number(workout.sets || 0) *
          Number(workout.reps || 0),
      0
    );

    const exercises = new Set(
      workouts.map((workout) =>
        String(workout.exercise || "")
          .trim()
          .toLowerCase()
      )
    );

    return {
      totalWorkouts,
      totalSets,
      totalReps,
      exercises: exercises.size,
    };
  }, [workouts]);

  // =========================================================
  // ADD WORKOUT
  // =========================================================

  const addWorkout = async (event) => {
    event.preventDefault();

    if (!user?.uid) {
      alert("Please login first.");
      return;
    }

    const exerciseName = exercise.trim();
    const setsValue = Number(sets);
    const repsValue = Number(reps);

    if (!exerciseName) {
      alert("Please enter an exercise.");
      return;
    }

    if (
      !Number.isFinite(setsValue) ||
      setsValue <= 0
    ) {
      alert("Please enter valid sets.");
      return;
    }

    if (
      !Number.isFinite(repsValue) ||
      repsValue <= 0
    ) {
      alert("Please enter valid reps.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "fitness"
        ),
        {
          exercise: exerciseName,
          sets: setsValue,
          reps: repsValue,
          createdAt: serverTimestamp(),
        }
      );

      setExercise("");
      setSets("");
      setReps("");
    } catch (error) {
      console.error(
        "Saving workout failed:",
        error
      );

      alert("Could not save workout.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE WORKOUT
  // =========================================================

  const deleteWorkout = async (id) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      "Delete this workout?\n\nThis action cannot be undone."
    );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "fitness",
          id
        )
      );
    } catch (error) {
      console.error(
        "Delete workout failed:",
        error
      );

      alert("Could not delete workout.");
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading text="Loading fitness..." />
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

            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <Dumbbell size={18} />
            </div>

            <p className="text-sm text-blue-300/70">
              Fitness
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Fitness
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Track your workouts and build consistency.
          </p>

        </div>

      </div>

      {/* =====================================================
          STATISTICS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <StatCard
          icon={<Activity size={18} />}
          title="Workouts"
          value={statistics.totalWorkouts}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <StatCard
          icon={<Dumbbell size={18} />}
          title="Total Sets"
          value={statistics.totalSets}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <StatCard
          icon={<TrendingUp size={18} />}
          title="Total Reps"
          value={statistics.totalReps}
          iconClass="bg-green-500/10 text-green-300"
        />

        <StatCard
          icon={<CalendarDays size={18} />}
          title="Exercises"
          value={statistics.exercises}
          iconClass="bg-green-500/10 text-green-300"
        />

      </div>

      {/* =====================================================
          ADD WORKOUT
      ====================================================== */}

      <form
        onSubmit={addWorkout}
        className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl"
      >

        <div className="mb-5">

          <h2 className="font-semibold">
            Add Workout
          </h2>

          <p className="mt-1 text-xs text-white/30">
            Record your exercise, sets and reps.
          </p>

        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_140px_140px_auto]">

          {/* EXERCISE */}

          <div>

            <label className="mb-2 block text-xs text-white/40">
              Exercise
            </label>

            <input
              type="text"
              value={exercise}
              onChange={(event) =>
                setExercise(
                  event.target.value
                )
              }
              placeholder="e.g. Bench Press"
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.03] disabled:opacity-50"
            />

          </div>

          {/* SETS */}

          <div>

            <label className="mb-2 block text-xs text-white/40">
              Sets
            </label>

            <input
              type="number"
              min="1"
              value={sets}
              onChange={(event) =>
                setSets(
                  event.target.value
                )
              }
              placeholder="3"
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.03] disabled:opacity-50"
            />

          </div>

          {/* REPS */}

          <div>

            <label className="mb-2 block text-xs text-white/40">
              Reps
            </label>

            <input
              type="number"
              min="1"
              value={reps}
              onChange={(event) =>
                setReps(
                  event.target.value
                )
              }
              placeholder="12"
              disabled={saving}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.03] disabled:opacity-50"
            />

          </div>

          {/* ADD BUTTON */}

          <div className="flex items-end">

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98] disabled:opacity-50 md:w-auto"
            >

              {saving ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <Plus size={18} />
              )}

              <span>
                {saving
                  ? "Saving..."
                  : "Add"}
              </span>

            </button>

          </div>

        </div>

      </form>

      {/* =====================================================
          WORKOUT LIST
      ====================================================== */}

      <div>

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="font-semibold">
              Workout History
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Your recent training activity
            </p>

          </div>

          <span className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/40">
            {workouts.length} records
          </span>

        </div>

        {workouts.length === 0 ? (

          <EmptyFitness />

        ) : (

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

            {workouts.map(
              (workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onDelete={() =>
                    deleteWorkout(
                      workout.id
                    )
                  }
                  deleting={
                    deletingId ===
                    workout.id
                  }
                />
              )
            )}

          </div>

        )}

      </div>

    </div>
  );
}

/* ===========================================================
   STAT CARD
=========================================================== */

function StatCard({
  icon,
  title,
  value,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-lg shadow-black/5 backdrop-blur-2xl transition hover:bg-white/[0.055]">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">

          <p className="text-[11px] text-white/30">
            {title}
          </p>

          <p className="mt-1 text-xl font-bold">
            {Number(value).toLocaleString()}
          </p>

        </div>

      </div>

    </div>
  );
}

/* ===========================================================
   WORKOUT CARD
=========================================================== */

function WorkoutCard({
  workout,
  onDelete,
  deleting,
}) {
  const totalReps =
    Number(workout.sets || 0) *
    Number(workout.reps || 0);

  const createdDate =
    formatTimestamp(workout.createdAt);

  return (
    <div className="group rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-lg shadow-black/5 backdrop-blur-2xl transition hover:border-blue-400/20 hover:bg-white/[0.055]">

      {/* TOP */}

      <div className="flex items-start justify-between gap-4">

        <div className="flex min-w-0 items-center gap-3">

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-500/10 text-blue-300">
            <Dumbbell size={20} />
          </div>

          <div className="min-w-0">

            <h3 className="truncate font-semibold">
              {workout.exercise}
            </h3>

            {createdDate && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/25">
                <CalendarDays size={11} />
                {createdDate}
              </p>
            )}

          </div>

        </div>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete workout"
          className="rounded-xl p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
        >

          {deleting ? (
            <Loader2
              size={16}
              className="animate-spin"
            />
          ) : (
            <Trash2 size={16} />
          )}

        </button>

      </div>

      {/* WORKOUT DATA */}

      <div className="mt-5 grid grid-cols-3 gap-2">

        <WorkoutValue
          label="Sets"
          value={workout.sets || 0}
        />

        <WorkoutValue
          label="Reps"
          value={workout.reps || 0}
        />

        <WorkoutValue
          label="Total"
          value={totalReps}
          green
        />

      </div>

      {/* STATUS */}

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-400/10 bg-green-500/[0.06] px-3 py-2">

        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-green-500/10 text-green-300">
          <Activity size={13} />
        </div>

        <span className="text-xs text-green-300/70">
          Workout recorded
        </span>

      </div>

    </div>
  );
}

/* ===========================================================
   WORKOUT VALUE
=========================================================== */

function WorkoutValue({
  label,
  value,
  green = false,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center">

      <p className="text-[10px] uppercase tracking-wider text-white/25">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-bold ${
          green
            ? "text-green-300"
            : "text-white"
        }`}
      >
        {Number(value).toLocaleString()}
      </p>

    </div>
  );
}

/* ===========================================================
   EMPTY
=========================================================== */

function EmptyFitness() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.025] px-6 py-16 text-center backdrop-blur-2xl">

      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-500/10 text-blue-300/70">
        <Dumbbell size={25} />
      </div>

      <h3 className="mt-4 font-semibold">
        No workouts yet
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm text-white/30">
        Add your first workout above to start tracking your fitness progress.
      </p>

    </div>
  );
}

/* ===========================================================
   DATE FORMAT
=========================================================== */

function formatTimestamp(timestamp) {
  if (!timestamp) return "";

  try {
    let date;

    if (
      typeof timestamp.toDate ===
      "function"
    ) {
      date = timestamp.toDate();
    } else {
      date = new Date(timestamp);
    }

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-LK",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  } catch {
    return "";
  }
}