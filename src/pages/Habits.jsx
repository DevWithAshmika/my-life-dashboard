import { useEffect, useState } from "react";
import {
  Plus,
  Check,
  Trash2,
  Repeat,
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

export default function Habits({ user }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setHabits([]);
      setLoading(false);
      return;
    }

    const ref = collection(
      db,
      "users",
      user.uid,
      "habits"
    );

    const q = query(ref, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setHabits(
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

  const addHabit = async () => {
    if (!name.trim()) return;

    await addDoc(
      collection(db, "users", user.uid, "habits"),
      {
        name: name.trim(),
        completedToday: false,
        createdAt: serverTimestamp(),
      }
    );

    setName("");
  };

  const toggleHabit = async (habit) => {
    await updateDoc(
      doc(db, "users", user.uid, "habits", habit.id),
      {
        completedToday: !habit.completedToday,
      }
    );
  };

  const deleteHabit = async (id) => {
    if (!confirm("Delete this habit?")) return;

    await deleteDoc(
      doc(db, "users", user.uid, "habits", id)
    );
  };

  if (loading) {
    return <Loading text="Loading habits..." />;
  }

  return (
    <div className="min-h-screen text-white">

      <div className="mb-6 flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Repeat size={23} />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Habits
          </h1>

          <p className="text-sm text-white/40">
            Build daily consistency
          </p>
        </div>

      </div>

      <div className="mb-6 flex gap-2">

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addHabit();
          }}
          placeholder="Add a habit..."
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <button
          onClick={addHabit}
          className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-black"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">
            Add
          </span>
        </button>

      </div>

      <div className="space-y-3">

        {habits.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40">
            No habits yet.
          </div>
        ) : (
          habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4"
            >

              <div className="flex items-center gap-3">

                <button
                  onClick={() => toggleHabit(habit)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    habit.completedToday
                      ? "bg-white text-black"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  <Check size={18} />
                </button>

                <span
                  className={
                    habit.completedToday
                      ? "text-white/40 line-through"
                      : ""
                  }
                >
                  {habit.name}
                </span>

              </div>

              <button
                onClick={() => deleteHabit(habit.id)}
                className="text-white/30 hover:text-red-400"
              >
                <Trash2 size={18} />
              </button>

            </div>
          ))
        )}

      </div>

    </div>
  );
}