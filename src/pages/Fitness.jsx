import { useEffect, useState } from "react";
import {
  Dumbbell,
  Plus,
  Trash2,
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

  useEffect(() => {
    if (!user?.uid) {
      setWorkouts([]);
      setLoading(false);
      return;
    }

    const ref = collection(
      db,
      "users",
      user.uid,
      "fitness"
    );

    const q = query(ref, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setWorkouts(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );

        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const addWorkout = async (e) => {
    e.preventDefault();

    if (!exercise.trim()) return;

    try {
      await addDoc(
        collection(db, "users", user.uid, "fitness"),
        {
          exercise: exercise.trim(),
          sets: Number(sets) || 0,
          reps: Number(reps) || 0,
          createdAt: serverTimestamp(),
        }
      );

      setExercise("");
      setSets("");
      setReps("");
    } catch (error) {
      console.error(error);
      alert("Could not save workout.");
    }
  };

  const deleteWorkout = async (id) => {
    await deleteDoc(
      doc(db, "users", user.uid, "fitness", id)
    );
  };

  if (loading) {
    return <Loading text="Loading fitness..." />;
  }

  return (
    <div className="min-h-screen text-white">

      <div className="mb-6 flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Dumbbell size={23} />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Fitness
          </h1>

          <p className="text-sm text-white/40">
            Track your workouts
          </p>
        </div>

      </div>

      <form
        onSubmit={addWorkout}
        className="mb-6 grid gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-[1fr_120px_120px_auto]"
      >

        <input
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          placeholder="Exercise"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <input
          type="number"
          min="0"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
          placeholder="Sets"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <input
          type="number"
          min="0"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          placeholder="Reps"
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black"
        >
          <Plus size={18} />
          Add
        </button>

      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {workouts.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40">
            No workouts recorded.
          </div>
        ) : (
          workouts.map((workout) => (
            <div
              key={workout.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >

              <div className="flex items-start justify-between">

                <div>
                  <h2 className="font-semibold">
                    {workout.exercise}
                  </h2>

                  <p className="mt-2 text-sm text-white/40">
                    {workout.sets} sets × {workout.reps} reps
                  </p>
                </div>

                <button
                  onClick={() =>
                    deleteWorkout(workout.id)
                  }
                  className="text-white/30 hover:text-red-400"
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </div>
          ))
        )}

      </div>

    </div>
  );
}