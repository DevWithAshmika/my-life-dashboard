import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/config";

import NotificationBell from "./NotificationBell";
import NotificationSystem from "./NotificationSystem";

export default function AppNotifications({
  user,
}) {
  const [data, setData] = useState({
    finance: [],
    tasks: [],
    goals: [],
    habits: [],
    calendar: [],
  });

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const collectionNames = [
      "finance",
      "tasks",
      "goals",
      "habits",
      "calendar",
    ];

    const unsubscribers =
      collectionNames.map(
        (collectionName) => {
          const reference =
            collection(
              db,
              "users",
              user.uid,
              collectionName
            );

          return onSnapshot(
            reference,
            (snapshot) => {
              const items =
                snapshot.docs.map(
                  (item) => ({
                    id: item.id,
                    ...item.data(),
                  })
                );

              setData((previous) => ({
                ...previous,
                [collectionName]:
                  items,
              }));
            },
            (error) => {
              console.error(
                `${collectionName} notification error:`,
                error
              );
            }
          );
        }
      );

    return () => {
      unsubscribers.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [user?.uid]);

  const notifications =
    NotificationSystem({
      data,
    });

  return (
    <NotificationBell
      notifications={notifications}
    />
  );
}