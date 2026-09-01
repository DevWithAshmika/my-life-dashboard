import { useEffect, useState } from "react";
import {
  Map,
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

export default function Travel({ user }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      setTrips([]);
      setLoading(false);
      return;
    }

    const ref = collection(
      db,
      "users",
      user.uid,
      "travel"
    );

    const q = query(ref, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setTrips(
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

  const addTrip = async (e) => {
    e.preventDefault();

    if (!place.trim()) return;

    try {
      await addDoc(
        collection(db, "users", user.uid, "travel"),
        {
          place: place.trim(),
          date,
          notes: notes.trim(),
          createdAt: serverTimestamp(),
        }
      );

      setPlace("");
      setDate("");
      setNotes("");
    } catch (error) {
      console.error(error);
      alert("Could not save trip.");
    }
  };

  const deleteTrip = async (id) => {
    await deleteDoc(
      doc(db, "users", user.uid, "travel", id)
    );
  };

  if (loading) {
    return <Loading text="Loading travel..." />;
  }

  return (
    <div className="min-h-screen text-white">

      <div className="mb-6 flex items-center gap-3">

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Map size={23} />
        </div>

        <div>
          <h1 className="text-2xl font-bold">
            Travel
          </h1>

          <p className="text-sm text-white/40">
            Plan and remember your journeys
          </p>
        </div>

      </div>

      <form
        onSubmit={addTrip}
        className="mb-6 space-y-3 rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >

        <input
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Destination"
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Trip notes..."
          rows={4}
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
        />

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 font-semibold text-black"
        >
          <Plus size={18} />
          Add Trip
        </button>

      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

        {trips.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/40">
            No trips yet.
          </div>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"
            >

              <div className="flex items-start justify-between">

                <div>
                  <h2 className="text-lg font-semibold">
                    {trip.place}
                  </h2>

                  <p className="mt-1 text-sm text-white/40">
                    {trip.date || "No date"}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-white/50">
                    {trip.notes || "No notes"}
                  </p>
                </div>

                <button
                  onClick={() => deleteTrip(trip.id)}
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