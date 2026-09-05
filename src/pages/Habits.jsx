import { useEffect, useMemo, useState } from "react";

import {
  Check,
  Flame,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Trophy,
  X,
  CalendarDays,
  BarChart3,
  Clock3,
  TrendingUp,
} from "lucide-react";

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

import { db } from "../firebase/config";

/* =========================================================
   DATE HELPERS
========================================================= */

const pad = (value) => String(value).padStart(2, "0");

const getDateKey = (date = new Date()) => {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
};

const parseDateKey = (key) => {
  if (!key) return new Date();

  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
};

const getStartOfWeek = (date = new Date()) => {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);

  return result;
};

const getCompletionHistory = (habit) => {
  if (
    habit?.completionHistory &&
    typeof habit.completionHistory === "object"
  ) {
    return habit.completionHistory;
  }

  return {};
};

const isCompletedOn = (habit, dateKey) => {
  const history = getCompletionHistory(habit);

  return Boolean(history[dateKey]);
};

/* =========================================================
   STREAK CALCULATIONS
========================================================= */

const calculateCurrentStreak = (habit) => {
  const history = getCompletionHistory(habit);

  let date = new Date();
  let streak = 0;

  const todayKey = getDateKey(date);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayKey = getDateKey(yesterday);

  if (!history[todayKey] && !history[yesterdayKey]) {
    return 0;
  }

  if (!history[todayKey]) {
    date = yesterday;
  }

  while (true) {
    const key = getDateKey(date);

    if (!history[key]) {
      break;
    }

    streak += 1;

    date = new Date(date);
    date.setDate(date.getDate() - 1);
  }

  return streak;
};

const calculateBestStreak = (habit) => {
  const history = getCompletionHistory(habit);

  const completedDates = Object.keys(history)
    .filter((date) => history[date])
    .sort();

  if (completedDates.length === 0) {
    return 0;
  }

  let best = 1;
  let current = 1;

  for (let i = 1; i < completedDates.length; i++) {
    const previous = parseDateKey(completedDates[i - 1]);
    const currentDate = parseDateKey(completedDates[i]);

    const difference =
      (currentDate.getTime() - previous.getTime()) /
      (1000 * 60 * 60 * 24);

    if (difference === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
};

const getLastCompletedDate = (habit) => {
  const history = getCompletionHistory(habit);

  const dates = Object.keys(history)
    .filter((date) => history[date])
    .sort();

  return dates.length ? dates[dates.length - 1] : "";
};

/* =========================================================
   LOCAL BACKUP
========================================================= */

const getHabitsBackupKey = (uid) => {
  return `my-dashboard-${uid}-habits`;
};

const loadHabitsBackup = (uid) => {
  if (!uid) return [];

  try {
    const raw = localStorage.getItem(
      getHabitsBackupKey(uid)
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(
      "Could not load habits backup:",
      error
    );

    return [];
  }
};

const saveHabitsBackup = (uid, habits) => {
  if (!uid) return;

  try {
    localStorage.setItem(
      getHabitsBackupKey(uid),
      JSON.stringify(habits)
    );
  } catch (error) {
    console.warn(
      "Could not save habits backup:",
      error
    );
  }
};

const sortHabits = (data) => {
  return [...data].sort((a, b) => {
    const aCreated = String(
      a.createdAt || ""
    );

    const bCreated = String(
      b.createdAt || ""
    );

    return bCreated.localeCompare(aCreated);
  });
};

/* =========================================================
   ICONS
========================================================= */

const HABIT_ICONS = [
  "🏋️",
  "🏃",
  "🚶",
  "📖",
  "💧",
  "🧘",
  "🧠",
  "💻",
  "📚",
  "🎯",
  "😴",
  "🥗",
  "🍎",
  "🎨",
  "🎸",
  "✍️",
];

/* =========================================================
   COLORS
========================================================= */

const HABIT_COLORS = {
  blue: {
    name: "Blue",
    border: "border-blue-400/40",
    bg: "bg-blue-500/10",
    text: "text-blue-300",
    solid: "bg-blue-500",
    ring: "ring-blue-400/30",
  },

  green: {
    name: "Green",
    border: "border-green-400/40",
    bg: "bg-green-500/10",
    text: "text-green-300",
    solid: "bg-green-500",
    ring: "ring-green-400/30",
  },

  red: {
    name: "Red",
    border: "border-red-400/40",
    bg: "bg-red-500/10",
    text: "text-red-300",
    solid: "bg-red-500",
    ring: "ring-red-400/30",
  },
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Habits({ user }) {
  const today = getDateKey();

  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);

  const [selectedHabit, setSelectedHabit] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    goalDaysPerWeek: 7,
    icon: "🎯",
    color: "blue",
    reminderTime: "",
  });

  const [message, setMessage] = useState("");

  /* =======================================================
     FIRESTORE LISTENER
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setHabits([]);
      setLoading(false);
      return;
    }

    let active = true;

    const habitsRef = collection(
      db,
      "users",
      user.uid,
      "habits"
    );

    const loadHabits = async () => {
      try {
        const cacheSnapshot =
          await getDocsFromCache(habitsRef);

        if (!active) return;

        const cachedData =
          cacheSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        if (cachedData.length > 0) {
          const sorted = sortHabits(cachedData);

          setHabits(sorted);
          saveHabitsBackup(
            user.uid,
            sorted
          );
        } else {
          const localBackup =
            loadHabitsBackup(user.uid);

          if (localBackup.length > 0) {
            setHabits(
              sortHabits(localBackup)
            );
          }
        }
      } catch (error) {
        console.warn(
          "Habits cache read failed:",
          error
        );

        const localBackup =
          loadHabitsBackup(user.uid);

        if (
          active &&
          localBackup.length > 0
        ) {
          setHabits(
            sortHabits(localBackup)
          );
        }
      }
    };

    loadHabits();

    const unsubscribe = onSnapshot(
      habitsRef,
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        if (!active) return;

        const data = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        const localBackup =
          loadHabitsBackup(user.uid);

        const shouldPreserveLocal =
          snapshot.metadata.fromCache &&
          data.length === 0 &&
          localBackup.length > 0;

        if (shouldPreserveLocal) {
          setHabits(
            sortHabits(localBackup)
          );
          setLoading(false);
          return;
        }

        const sorted = sortHabits(data);

        setHabits(sorted);

        if (
          data.length > 0 ||
          !snapshot.metadata.fromCache
        ) {
          saveHabitsBackup(
            user.uid,
            sorted
          );
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Habits listener error:",
          error
        );

        const localBackup =
          loadHabitsBackup(user.uid);

        if (
          active &&
          localBackup.length > 0
        ) {
          setHabits(
            sortHabits(localBackup)
          );
        }

        setLoading(false);
      }
    );

    const timeout = setTimeout(() => {
      if (!active) return;

      setLoading(false);

      const localBackup =
        loadHabitsBackup(user.uid);

      if (
        localBackup.length > 0 &&
        habits.length === 0
      ) {
        setHabits(
          sortHabits(localBackup)
        );
      }
    }, 4000);

    return () => {
      active = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [user?.uid]);

  /* =======================================================
     NORMALIZED HABITS
  ======================================================= */

  const normalizedHabits = useMemo(() => {
    return habits.map((habit) => {
      const currentStreak =
        calculateCurrentStreak(habit);

      const calculatedBest =
        calculateBestStreak(habit);

      return {
        ...habit,

        completionHistory:
          getCompletionHistory(habit),

        completedToday:
          isCompletedOn(
            habit,
            today
          ),

        currentStreak,

        bestStreak: Math.max(
          Number(habit.bestStreak || 0),
          calculatedBest
        ),

        goalDaysPerWeek:
          Number(
            habit.goalDaysPerWeek || 7
          ),

        icon:
          habit.icon || "🎯",

        color:
          habit.color || "blue",

        reminderTime:
          habit.reminderTime || "",
      };
    });
  }, [habits, today]);

  /* =======================================================
     KEEP SELECTED HABIT UPDATED
  ======================================================= */

  useEffect(() => {
    if (!selectedHabit) return;

    const updated =
      normalizedHabits.find(
        (habit) =>
          habit.id === selectedHabit.id
      );

    if (updated) {
      setSelectedHabit(updated);
    } else {
      setSelectedHabit(null);
    }
  }, [normalizedHabits, selectedHabit]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredHabits = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return normalizedHabits;
    }

    return normalizedHabits.filter(
      (habit) =>
        habit.name
          ?.toLowerCase()
          .includes(query) ||
        habit.description
          ?.toLowerCase()
          .includes(query)
    );
  }, [
    normalizedHabits,
    search,
  ]);

  /* =======================================================
     TODAY STATS
  ======================================================= */

  const completedToday =
    normalizedHabits.filter(
      (habit) =>
        habit.completedToday
    ).length;

  const totalHabits =
    normalizedHabits.length;

  const remainingToday =
    Math.max(
      totalHabits -
        completedToday,
      0
    );

  const dailyProgress =
    totalHabits === 0
      ? 0
      : Math.round(
          (completedToday /
            totalHabits) *
            100
        );

  /* =======================================================
     WEEK DATA
  ======================================================= */

  const weekDays = useMemo(() => {
    const start =
      getStartOfWeek();

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date =
          new Date(start);

        date.setDate(
          start.getDate() +
            index
        );

        return {
          date,
          key:
            getDateKey(date),

          label:
            new Intl.DateTimeFormat(
              "en-US",
              {
                weekday:
                  "short",
              }
            ).format(date),

          shortDate:
            date.getDate(),
        };
      }
    );
  }, []);

  const weeklyTotal =
    useMemo(() => {
      let total = 0;

      normalizedHabits.forEach(
        (habit) => {
          weekDays.forEach(
            (day) => {
              if (
                isCompletedOn(
                  habit,
                  day.key
                )
              ) {
                total += 1;
              }
            }
          );
        }
      );

      return total;
    }, [
      normalizedHabits,
      weekDays,
    ]);

  const weeklyPossible =
    totalHabits * 7;

  const weeklyProgress =
    weeklyPossible === 0
      ? 0
      : Math.round(
          (weeklyTotal /
            weeklyPossible) *
            100
        );

  /* =======================================================
     MONTH DATA
  ======================================================= */

  const currentMonth =
    new Date();

  const monthYear =
    currentMonth.getFullYear();

  const monthIndex =
    currentMonth.getMonth();

  const monthName =
    new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "long",
        year:
          "numeric",
      }
    ).format(
      currentMonth
    );

  const monthDays =
    useMemo(() => {
      const firstDay =
        new Date(
          monthYear,
          monthIndex,
          1
        );

      const lastDay =
        new Date(
          monthYear,
          monthIndex + 1,
          0
        );

      const firstWeekday =
        firstDay.getDay();

      const days = [];

      for (
        let i = 0;
        i < firstWeekday;
        i++
      ) {
        days.push(null);
      }

      for (
        let day = 1;
        day <=
        lastDay.getDate();
        day++
      ) {
        days.push(
          new Date(
            monthYear,
            monthIndex,
            day
          )
        );
      }

      return days;
    }, [
      monthYear,
      monthIndex,
    ]);

  const monthlyCompleted =
    useMemo(() => {
      let total = 0;

      normalizedHabits.forEach(
        (habit) => {
          Object.keys(
            getCompletionHistory(
              habit
            )
          ).forEach(
            (date) => {
              const parsed =
                parseDateKey(
                  date
                );

              if (
                parsed.getFullYear() ===
                  monthYear &&
                parsed.getMonth() ===
                  monthIndex &&
                getCompletionHistory(
                  habit
                )[date]
              ) {
                total += 1;
              }
            }
          );
        }
      );

      return total;
    }, [
      normalizedHabits,
      monthYear,
      monthIndex,
    ]);

  const monthlyPossible =
    totalHabits *
    new Date(
      monthYear,
      monthIndex + 1,
      0
    ).getDate();

  const monthlyProgress =
    monthlyPossible === 0
      ? 0
      : Math.round(
          (monthlyCompleted /
            monthlyPossible) *
            100
        );

  /* =======================================================
     ACHIEVEMENTS
  ======================================================= */

  const totalCompletionCount =
    useMemo(() => {
      let total = 0;

      normalizedHabits.forEach(
        (habit) => {
          total += Object.values(
            getCompletionHistory(
              habit
            )
          ).filter(
            Boolean
          ).length;
        }
      );

      return total;
    }, [
      normalizedHabits,
    ]);

  const highestCurrentStreak =
    useMemo(() => {
      return normalizedHabits.reduce(
        (
          highest,
          habit
        ) =>
          Math.max(
            highest,
            Number(
              habit.currentStreak ||
                0
            )
          ),
        0
      );
    }, [
      normalizedHabits,
    ]);

  const highestBestStreak =
    useMemo(() => {
      return normalizedHabits.reduce(
        (
          highest,
          habit
        ) =>
          Math.max(
            highest,
            Number(
              habit.bestStreak ||
                0
            )
          ),
        0
      );
    }, [
      normalizedHabits,
    ]);

  const achievements = [
    {
      title:
        "First Step",
      description:
        "Complete your first habit",
      icon: "🌱",
      unlocked:
        totalCompletionCount >=
        1,
    },

    {
      title:
        "3 Day Streak",
      description:
        "Reach a 3 day streak",
      icon: "🔥",
      unlocked:
        highestBestStreak >=
        3,
    },

    {
      title:
        "7 Day Streak",
      description:
        "Reach a 7 day streak",
      icon: "🏆",
      unlocked:
        highestBestStreak >=
        7,
    },

    {
      title:
        "30 Completions",
      description:
        "Complete habits 30 times",
      icon: "💯",
      unlocked:
        totalCompletionCount >=
        30,
    },

    {
      title:
        "100 Completions",
      description:
        "Complete habits 100 times",
      icon: "⭐",
      unlocked:
        totalCompletionCount >=
        100,
    },
  ];

  /* =======================================================
     MESSAGE
  ======================================================= */

  const showMessage = (
    text,
    duration = 2500
  ) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, duration);
  };

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  const openAddModal = () => {
    setEditingHabit(null);

    setForm({
      name: "",
      description: "",
      goalDaysPerWeek: 7,
      icon: "🎯",
      color: "blue",
      reminderTime: "",
    });

    setShowModal(true);
  };

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  const openEditModal = (
    habit
  ) => {
    setSelectedHabit(null);

    setEditingHabit(habit);

    setForm({
      name:
        habit.name || "",

      description:
        habit.description ||
        "",

      goalDaysPerWeek:
        Number(
          habit.goalDaysPerWeek ||
            7
        ),

      icon:
        habit.icon || "🎯",

      color:
        habit.color || "blue",

      reminderTime:
        habit.reminderTime ||
        "",
    });

    setShowModal(true);
  };

  /* =======================================================
     OPEN DETAILS
  ======================================================= */

  const openDetails = (
    habit
  ) => {
    setSelectedHabit(habit);
  };

  /* =======================================================
     SAVE HABIT
  ======================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const name =
      form.name.trim();

    if (!name || !user?.uid) {
      return;
    }

    const habitsRef =
      collection(
        db,
        "users",
        user.uid,
        "habits"
      );

    const now =
      new Date().toISOString();

    const habitData = {
      name,

      description:
        form.description.trim(),

      goalDaysPerWeek:
        Number(
          form.goalDaysPerWeek
        ),

      icon:
        form.icon,

      color:
        form.color,

      reminderTime:
        form.reminderTime || "",

      updatedAt:
        now,
    };

    /* =====================================================
       EDIT
    ===================================================== */

    if (editingHabit) {
      const updatedHabit = {
        ...editingHabit,
        ...habitData,
      };

      const updatedList =
        habits.map(
          (habit) =>
            habit.id ===
            editingHabit.id
              ? updatedHabit
              : habit
        );

      const sorted =
        sortHabits(
          updatedList
        );

      setHabits(sorted);

      saveHabitsBackup(
        user.uid,
        sorted
      );

      setShowModal(false);
      setEditingHabit(null);

      showMessage(
        "Habit updated successfully"
      );

      void updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "habits",
          editingHabit.id
        ),
        {
          ...habitData,
          updatedAt:
            serverTimestamp(),
        }
      ).catch((error) => {
        console.error(
          "Background habit update failed:",
          error
        );
      });

      return;
    }

    /* =====================================================
       CREATE
    ===================================================== */

    const habitRef =
      doc(habitsRef);

    const newHabit = {
      id: habitRef.id,

      name,

      description:
        form.description.trim(),

      completedToday:
        false,

      currentStreak:
        0,

      bestStreak:
        0,

      lastCompletedDate:
        "",

      completionHistory:
        {},

      goalDaysPerWeek:
        Number(
          form.goalDaysPerWeek
        ),

      icon:
        form.icon,

      color:
        form.color,

      reminderTime:
        form.reminderTime || "",

      createdAt:
        now,

      updatedAt:
        now,
    };

    const updatedList =
      sortHabits([
        ...habits,
        newHabit,
      ]);

    setHabits(
      updatedList
    );

    saveHabitsBackup(
      user.uid,
      updatedList
    );

    setShowModal(false);
    setEditingHabit(null);

    showMessage(
      "New habit added"
    );

    void setDoc(
      habitRef,
      {
        ...newHabit,
        createdAt:
          serverTimestamp(),
        updatedAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.error(
        "Background habit create failed:",
        error
      );
    });
  };

  /* =======================================================
     TOGGLE HABIT
  ======================================================= */

  const toggleHabit = (
    habit
  ) => {
    if (!user?.uid) return;

    const history = {
      ...getCompletionHistory(
        habit
      ),
    };

    const currentlyCompleted =
      Boolean(
        history[today]
      );

    if (
      currentlyCompleted
    ) {
      delete history[today];
    } else {
      history[today] =
        true;
    }

    const updatedHabit = {
      ...habit,

      completionHistory:
        history,
    };

    const newCurrentStreak =
      calculateCurrentStreak(
        updatedHabit
      );

    const calculatedBest =
      calculateBestStreak(
        updatedHabit
      );

    const oldBest =
      Number(
        habit.bestStreak || 0
      );

    const newBest =
      Math.max(
        oldBest,
        calculatedBest
      );

    const lastCompleted =
      getLastCompletedDate(
        updatedHabit
      );

    const firestoreData = {
      completedToday:
        Boolean(
          history[today]
        ),

      completionHistory:
        history,

      currentStreak:
        newCurrentStreak,

      bestStreak:
        newBest,

      lastCompletedDate:
        lastCompleted,

      updatedAt:
        serverTimestamp(),
    };

    const localUpdatedHabit = {
      ...habit,

      completedToday:
        Boolean(
          history[today]
        ),

      completionHistory:
        history,

      currentStreak:
        newCurrentStreak,

      bestStreak:
        newBest,

      lastCompletedDate:
        lastCompleted,

      updatedAt:
        new Date().toISOString(),
    };

    const updatedList =
      habits.map(
        (item) =>
          item.id ===
          habit.id
            ? localUpdatedHabit
            : item
      );

    setHabits(
      sortHabits(
        updatedList
      )
    );

    saveHabitsBackup(
      user.uid,
      updatedList
    );

    if (
      selectedHabit?.id ===
      habit.id
    ) {
      setSelectedHabit(
        localUpdatedHabit
      );
    }

    if (
      !currentlyCompleted
    ) {
      showMessage(
        newCurrentStreak > 1
          ? `🔥 ${newCurrentStreak} day streak!`
          : "✓ Habit completed!"
      );
    }

    void updateDoc(
      doc(
        db,
        "users",
        user.uid,
        "habits",
        habit.id
      ),
      firestoreData
    ).catch((error) => {
      console.error(
        "Background habit toggle failed:",
        error
      );
    });
  };

  /* =======================================================
     DELETE HABIT
  ======================================================= */

  const deleteHabit = (
    habit
  ) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        `Delete "${habit.name}"?\n\nThis cannot be undone.`
      );

    if (!confirmed) return;

    const updatedList =
      habits.filter(
        (item) =>
          item.id !==
          habit.id
      );

    setHabits(
      sortHabits(
        updatedList
      )
    );

    saveHabitsBackup(
      user.uid,
      updatedList
    );

    if (
      selectedHabit?.id ===
      habit.id
    ) {
      setSelectedHabit(null);
    }

    showMessage(
      "Habit deleted",
      2000
    );

    void deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "habits",
        habit.id
      )
    ).catch((error) => {
      console.error(
        "Background habit delete failed:",
        error
      );
    });
  };

  /* =======================================================
     HABIT WEEK DAYS
  ======================================================= */

  const getHabitWeek = (
    habit
  ) => {
    return weekDays.map(
      (day) => ({
        ...day,

        completed:
          isCompletedOn(
            habit,
            day.key
          ),

        isToday:
          day.key ===
          today,
      })
    );
  };

  /* =======================================================
     MOTIVATION
  ======================================================= */

  const motivation =
    useMemo(() => {
      if (
        totalHabits === 0
      ) {
        return "Start with one small habit today.";
      }

      if (
        dailyProgress ===
        100
      ) {
        return "Amazing. You completed everything today! 🎉";
      }

      if (
        dailyProgress >=
        75
      ) {
        return "You're almost there. Finish strong!";
      }

      if (
        dailyProgress >=
        50
      ) {
        return "Good progress. Keep going!";
      }

      if (
        dailyProgress > 0
      ) {
        return "Every completed habit counts.";
      }

      return "Let's get your first habit done today.";
    }, [
      dailyProgress,
      totalHabits,
    ]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08090d] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-2 border-blue-400/20 border-t-blue-400 animate-spin mx-auto mb-4" />

          <p className="text-white/50 text-sm">
            Loading habits...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen bg-[#08090d] text-white pb-28 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">

        {/* HEADER */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-7">
          <div>
            <p className="text-blue-400 text-sm font-medium mb-1">
              Daily Routine
            </p>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Habits
            </h1>

            <p className="text-white/45 mt-2 text-sm md:text-base">
              Build better routines, one day at a time.
            </p>
          </div>

          <button
            onClick={
              openAddModal
            }
            className="hidden md:flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-500 hover:bg-blue-400 transition font-semibold shadow-lg shadow-blue-500/20"
          >
            <Plus size={19} />
            Add Habit
          </button>
        </div>

        {/* MOTIVATION */}

        <div className="mb-6 p-4 rounded-2xl border border-blue-400/15 bg-blue-500/[0.05]">
          <p className="text-sm text-blue-200">
            {motivation}
          </p>
        </div>

        {/* TODAY PROGRESS */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] backdrop-blur-xl p-5 md:p-7 mb-7 shadow-2xl shadow-black/20">
          <div className="flex flex-col md:flex-row md:items-center gap-6">

            <div className="relative w-32 h-32 flex-shrink-0 mx-auto md:mx-0">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#3b82f6 ${dailyProgress}%, rgba(255,255,255,0.07) ${dailyProgress}% 100%)`,
                }}
              />

              <div className="absolute inset-[8px] rounded-full bg-[#0b0d12] flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">
                  {dailyProgress}%
                </span>

                <span className="text-[11px] text-white/40">
                  today
                </span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/35 mb-2">
                    TODAY
                  </p>

                  <h2 className="text-2xl md:text-3xl font-bold">
                    {completedToday}{" "}
                    <span className="text-white/30">
                      / {totalHabits}
                    </span>{" "}
                    completed
                  </h2>
                </div>

                <div className="text-sm">
                  {remainingToday ===
                    0 &&
                  totalHabits >
                    0 ? (
                    <span className="text-green-400 font-semibold">
                      All done ✓
                    </span>
                  ) : (
                    <span className="text-red-300">
                      {
                        remainingToday
                      }{" "}
                      remaining
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 h-3 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{
                    width: `${dailyProgress}%`,
                  }}
                />
              </div>

              <div className="flex flex-wrap gap-4 mt-5 text-xs text-white/45">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Completed
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Remaining
                </span>

                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Progress
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK STATS */}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">

          <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.05] p-4">
            <div className="flex items-center justify-between mb-3">
              <Target
                size={19}
                className="text-blue-400"
              />

              <span className="text-xs text-white/30">
                TOTAL
              </span>
            </div>

            <p className="text-2xl font-bold">
              {totalHabits}
            </p>

            <p className="text-xs text-white/40 mt-1">
              Active habits
            </p>
          </div>

          <div className="rounded-2xl border border-green-400/15 bg-green-500/[0.05] p-4">
            <div className="flex items-center justify-between mb-3">
              <Check
                size={19}
                className="text-green-400"
              />

              <span className="text-xs text-white/30">
                TODAY
              </span>
            </div>

            <p className="text-2xl font-bold">
              {completedToday}
            </p>

            <p className="text-xs text-white/40 mt-1">
              Completed
            </p>
          </div>

          <div className="rounded-2xl border border-red-400/15 bg-red-500/[0.05] p-4">
            <div className="flex items-center justify-between mb-3">
              <Clock3
                size={19}
                className="text-red-400"
              />

              <span className="text-xs text-white/30">
                LEFT
              </span>
            </div>

            <p className="text-2xl font-bold">
              {remainingToday}
            </p>

            <p className="text-xs text-white/40 mt-1">
              Remaining
            </p>
          </div>

          <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.05] p-4">
            <div className="flex items-center justify-between mb-3">
              <Flame
                size={19}
                className="text-blue-400"
              />

              <span className="text-xs text-white/30">
                STREAK
              </span>
            </div>

            <p className="text-2xl font-bold">
              {highestCurrentStreak}
            </p>

            <p className="text-xs text-white/40 mt-1">
              Current best
            </p>
          </div>
        </div>

        {/* SEARCH */}

        <div className="relative mb-6">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search habits..."
            className="w-full bg-white/[0.035] border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 outline-none focus:border-blue-400/40 transition text-sm"
          />
        </div>

        {/* HABITS */}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30 mb-1">
                TODAY'S ROUTINE
              </p>

              <h2 className="text-xl font-bold">
                Your Habits
              </h2>
            </div>

            <span className="text-xs text-white/30">
              {
                filteredHabits.length
              }{" "}
              habits
            </span>
          </div>

          {filteredHabits.length ===
          0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Target
                  className="text-blue-400"
                  size={26}
                />
              </div>

              <h3 className="font-semibold mb-2">
                {search
                  ? "No habits found"
                  : "No habits yet"}
              </h3>

              <p className="text-sm text-white/40 mb-5">
                {search
                  ? "Try another search."
                  : "Create your first habit and start building your routine."}
              </p>

              {!search && (
                <button
                  onClick={
                    openAddModal
                  }
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 transition text-sm font-semibold"
                >
                  <Plus size={17} />
                  Create Habit
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredHabits.map(
                (habit) => {
                  const theme =
                    HABIT_COLORS[
                      habit.color
                    ] ||
                    HABIT_COLORS.blue;

                  const totalCompleted =
                    Object.values(
                      habit.completionHistory
                    ).filter(
                      Boolean
                    ).length;

                  const lastCompleted =
                    getLastCompletedDate(
                      habit
                    );

                  return (
                    <div
                      key={
                        habit.id
                      }
                      onClick={() =>
                        openDetails(
                          habit
                        )
                      }
                      className={`rounded-3xl border ${
                        habit.completedToday
                          ? "border-green-400/30 bg-green-500/[0.055]"
                          : `${theme.border} bg-white/[0.025]`
                      } backdrop-blur-xl overflow-hidden transition cursor-pointer hover:bg-white/[0.045] active:scale-[0.995]`}
                    >
                      <div className="p-4 md:p-5">

                        <div className="flex items-start gap-3 md:gap-4">

                          {/* ICON */}

                          <div
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-2xl md:text-3xl flex-shrink-0 ${
                              habit.completedToday
                                ? "bg-green-500/15"
                                : theme.bg
                            }`}
                          >
                            {
                              habit.icon
                            }
                          </div>

                          {/* INFO */}

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-base md:text-lg truncate">
                                {
                                  habit.name
                                }
                              </h3>

                              {habit.completedToday && (
                                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-green-500/15 text-green-300">
                                  Done
                                </span>
                              )}
                            </div>

                            {habit.description && (
                              <p className="text-xs md:text-sm text-white/40 mt-1 line-clamp-2">
                                {
                                  habit.description
                                }
                              </p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 mt-3">

                              <span
                                className={`flex items-center gap-1.5 text-xs font-medium ${
                                  habit.currentStreak >
                                  0
                                    ? "text-blue-300"
                                    : "text-white/35"
                                }`}
                              >
                                <Flame
                                  size={
                                    14
                                  }
                                />

                                {
                                  habit.currentStreak
                                }{" "}
                                day streak
                              </span>

                              <span className="text-xs text-white/30">
                                Best{" "}
                                {
                                  habit.bestStreak
                                }
                              </span>

                              <span className="text-xs text-white/30">
                                {
                                  totalCompleted
                                }{" "}
                                completed
                              </span>
                            </div>

                            {lastCompleted && (
                              <p className="text-[10px] text-white/25 mt-2">
                                Last completed{" "}
                                {new Intl.DateTimeFormat(
                                  "en-US",
                                  {
                                    month:
                                      "short",
                                    day:
                                      "numeric",
                                    year:
                                      "numeric",
                                  }
                                ).format(
                                  parseDateKey(
                                    lastCompleted
                                  )
                                )}
                              </p>
                            )}
                          </div>

                          {/* COMPLETE BUTTON */}

                          <button
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();
                              toggleHabit(
                                habit
                              );
                            }}
                            className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 transition ${
                              habit.completedToday
                                ? "bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20"
                                : "border-red-400/30 bg-red-500/[0.07] text-red-300 hover:bg-red-500/15"
                            }`}
                            title={
                              habit.completedToday
                                ? "Mark incomplete"
                                : "Complete habit"
                            }
                          >
                            <Check
                              size={24}
                              strokeWidth={
                                3
                              }
                            />
                          </button>
                        </div>

                        {/* VIEW DETAILS */}

                        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                          <span className="text-xs text-blue-300">
                            View details →
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();
                                openEditModal(
                                  habit
                                );
                              }}
                              className="p-2 rounded-xl text-white/35 hover:text-blue-300 hover:bg-blue-500/10 transition"
                              title="Edit"
                            >
                              <Pencil
                                size={
                                  16
                                }
                              />
                            </button>

                            <button
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();
                                deleteHabit(
                                  habit
                                );
                              }}
                              className="p-2 rounded-xl text-white/35 hover:text-red-300 hover:bg-red-500/10 transition"
                              title="Delete"
                            >
                              <Trash2
                                size={
                                  16
                                }
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* WEEKLY PROGRESS */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/30 mb-1">
                PERFORMANCE
              </p>

              <h2 className="text-xl font-bold">
                Weekly Progress
              </h2>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-2xl font-bold text-blue-300">
                {weeklyProgress}%
              </p>

              <p className="text-xs text-white/30">
                {
                  weeklyTotal
                }{" "}
                completed
              </p>
            </div>
          </div>

          <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden mb-5">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{
                width: `${weeklyProgress}%`,
              }}
            />
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(
              (day) => {
                const dayCompleted =
                  normalizedHabits.filter(
                    (habit) =>
                      isCompletedOn(
                        habit,
                        day.key
                      )
                  ).length;

                const dayProgress =
                  totalHabits === 0
                    ? 0
                    : Math.round(
                        (dayCompleted /
                          totalHabits) *
                          100
                      );

                return (
                  <div
                    key={
                      day.key
                    }
                    className="text-center"
                  >
                    <p className="text-[10px] text-white/30 mb-2">
                      {
                        day.label
                      }
                    </p>

                    <div className="h-20 rounded-xl bg-white/[0.025] border border-white/[0.06] flex flex-col items-center justify-end p-2">
                      <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                        <div
                          className={`h-full rounded-full ${
                            dayProgress ===
                            100
                              ? "bg-green-500"
                              : dayProgress >
                                0
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${dayProgress}%`,
                          }}
                        />
                      </div>

                      <span className="text-xs font-semibold">
                        {
                          dayCompleted
                        }
                      </span>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* MONTH CALENDAR */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={19}
                  className="text-blue-400"
                />

                <h2 className="text-xl font-bold">
                  {
                    monthName
                  }
                </h2>
              </div>

              <p className="text-xs text-white/35 mt-1">
                Monthly habit activity
              </p>
            </div>

            <div className="text-right">
              <p className="text-xl font-bold text-blue-300">
                {
                  monthlyProgress
                }
                %
              </p>

              <p className="text-[10px] text-white/30">
                consistency
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day) => (
                <div
                  key={day}
                  className="text-center text-[9px] text-white/25 py-1"
                >
                  {day}
                </div>
              )
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {monthDays.map(
              (
                date,
                index
              ) => {
                if (!date) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square"
                    />
                  );
                }

                const key =
                  getDateKey(
                    date
                  );

                const completedCount =
                  normalizedHabits.filter(
                    (habit) =>
                      isCompletedOn(
                        habit,
                        key
                      )
                  ).length;

                const isToday =
                  key ===
                  today;

                let intensity =
                  "bg-red-500/[0.05]";

                if (
                  completedCount >
                  0
                ) {
                  intensity =
                    completedCount ===
                    totalHabits
                      ? "bg-green-500"
                      : completedCount >=
                        Math.ceil(
                          totalHabits /
                            2
                        )
                      ? "bg-green-500/60"
                      : "bg-blue-500/50";
                }

                return (
                  <div
                    key={key}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center ${intensity} ${
                      isToday
                        ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-[#08090d]"
                        : ""
                    }`}
                  >
                    <span
                      className={`text-[10px] ${
                        completedCount >
                        0
                          ? "text-white"
                          : "text-white/35"
                      }`}
                    >
                      {
                        date.getDate()
                      }
                    </span>

                    {completedCount >
                      0 && (
                      <span className="text-[7px] text-white/70">
                        {
                          completedCount
                        }
                        /
                        {
                          totalHabits
                        }
                      </span>
                    )}
                  </div>
                );
              }
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-5 text-[10px] text-white/35">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-green-500" />
              Complete
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-blue-500/50" />
              Partial
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-red-500/20" />
              Missed
            </span>

            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded ring-2 ring-blue-400" />
              Today
            </span>
          </div>
        </div>

        {/* ACHIEVEMENTS */}

        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Trophy
                size={19}
                className="text-blue-400"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Achievements
              </h2>

              <p className="text-xs text-white/35">
                Keep going and unlock more
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {achievements.map(
              (
                achievement
              ) => (
                <div
                  key={
                    achievement.title
                  }
                  className={`rounded-2xl border p-4 transition ${
                    achievement.unlocked
                      ? "border-green-400/25 bg-green-500/[0.06]"
                      : "border-white/[0.07] bg-white/[0.02] opacity-50"
                  }`}
                >
                  <div className="text-2xl mb-3">
                    {
                      achievement.icon
                    }
                  </div>

                  <p className="text-sm font-semibold">
                    {
                      achievement.title
                    }
                  </p>

                  <p className="text-[10px] text-white/35 mt-1">
                    {
                      achievement.description
                    }
                  </p>

                  <div
                    className={`mt-3 text-[9px] uppercase tracking-wider font-bold ${
                      achievement.unlocked
                        ? "text-green-300"
                        : "text-white/25"
                    }`}
                  >
                    {
                      achievement.unlocked
                        ? "Unlocked"
                        : "Locked"
                    }
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* OVERALL STATS */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-5 md:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <BarChart3
                size={19}
                className="text-blue-400"
              />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Statistics
              </h2>

              <p className="text-xs text-white/35">
                Your overall habit performance
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] p-4">
              <p className="text-xs text-white/35">
                Total Habits
              </p>

              <p className="text-2xl font-bold mt-2">
                {
                  totalHabits
                }
              </p>
            </div>

            <div className="rounded-2xl border border-green-400/10 bg-green-500/[0.04] p-4">
              <p className="text-xs text-white/35">
                Total Completions
              </p>

              <p className="text-2xl font-bold mt-2 text-green-300">
                {
                  totalCompletionCount
                }
              </p>
            </div>

            <div className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.04] p-4">
              <p className="text-xs text-white/35">
                Best Streak
              </p>

              <p className="text-2xl font-bold mt-2 text-blue-300">
                {
                  highestBestStreak
                }
              </p>
            </div>

            <div className="rounded-2xl border border-red-400/10 bg-red-500/[0.04] p-4">
              <p className="text-xs text-white/35">
                This Month
              </p>

              <p className="text-2xl font-bold mt-2 text-red-300">
                {
                  monthlyCompleted
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE ADD BUTTON */}

      <button
        onClick={
          openAddModal
        }
        className="
          md:hidden
          fixed
          bottom-[88px]
          right-5
          z-40
          w-14
          h-14
          rounded-full
          bg-blue-500
          hover:bg-blue-400
          text-white
          flex
          items-center
          justify-center
          shadow-2xl
          shadow-blue-500/30
          transition-all
          duration-200
          active:scale-95
        "
        aria-label="Add Habit"
      >
        <Plus size={25} />
      </button>

      {/* TOAST */}

      {message && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 z-[110] max-w-[calc(100vw-32px)]">
          <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#12151c]/95 border border-white/10 backdrop-blur-xl shadow-2xl whitespace-nowrap">
            <Check
              size={17}
              className="text-green-400 flex-shrink-0"
            />

            <span className="text-sm font-medium">
              {message}
            </span>
          </div>
        </div>
      )}

      {/* ===================================================
          VIEW DETAILS MODAL
      =================================================== */}

      {selectedHabit && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
          onClick={() =>
            setSelectedHabit(null)
          }
        >
          <div
            className="relative w-full max-w-lg max-h-[calc(100vh-24px)] sm:max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1016] shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="sticky top-0 z-10 bg-[#0d1016]/95 backdrop-blur-xl border-b border-white/[0.06] p-5 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-2xl flex-shrink-0">
                  {
                    selectedHabit.icon
                  }
                </div>

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-blue-400 mb-1">
                    HABIT DETAILS
                  </p>

                  <h2 className="text-xl font-bold truncate">
                    {
                      selectedHabit.name
                    }
                  </h2>
                </div>
              </div>

              <button
                onClick={() =>
                  setSelectedHabit(
                    null
                  )
                }
                className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white transition flex-shrink-0"
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 pb-8 space-y-5">

              {/* DESCRIPTION */}

              {selectedHabit.description && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                  <p className="text-xs uppercase tracking-widest text-white/30 mb-2">
                    DESCRIPTION
                  </p>

                  <p className="text-sm text-white/60 leading-6">
                    {
                      selectedHabit.description
                    }
                  </p>
                </div>
              )}

              {/* STATS */}

              <div className="grid grid-cols-2 gap-3">

                <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-blue-300 mb-2">
                    <Flame
                      size={17}
                    />

                    <span className="text-xs">
                      Current Streak
                    </span>
                  </div>

                  <p className="text-2xl font-bold">
                    {
                      selectedHabit.currentStreak
                    }
                  </p>

                  <p className="text-[10px] text-white/30 mt-1">
                    days
                  </p>
                </div>

                <div className="rounded-2xl border border-green-400/15 bg-green-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-green-300 mb-2">
                    <Trophy
                      size={17}
                    />

                    <span className="text-xs">
                      Best Streak
                    </span>
                  </div>

                  <p className="text-2xl font-bold">
                    {
                      selectedHabit.bestStreak
                    }
                  </p>

                  <p className="text-[10px] text-white/30 mt-1">
                    days
                  </p>
                </div>

                <div className="rounded-2xl border border-blue-400/15 bg-blue-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-blue-300 mb-2">
                    <Target
                      size={17}
                    />

                    <span className="text-xs">
                      Weekly Goal
                    </span>
                  </div>

                  <p className="text-2xl font-bold">
                    {
                      selectedHabit.goalDaysPerWeek
                    }
                  </p>

                  <p className="text-[10px] text-white/30 mt-1">
                    days / week
                  </p>
                </div>

                <div className="rounded-2xl border border-green-400/15 bg-green-500/[0.05] p-4">
                  <div className="flex items-center gap-2 text-green-300 mb-2">
                    <Check
                      size={17}
                    />

                    <span className="text-xs">
                      Completions
                    </span>
                  </div>

                  <p className="text-2xl font-bold">
                    {
                      Object.values(
                        selectedHabit.completionHistory
                      ).filter(
                        Boolean
                      ).length
                    }
                  </p>

                  <p className="text-[10px] text-white/30 mt-1">
                    total days
                  </p>
                </div>
              </div>

              {/* COMPLETION RATE */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp
                      size={17}
                      className="text-blue-400"
                    />

                    <div>
                      <h3 className="text-sm font-semibold">
                        Completion Rate
                      </h3>

                      <p className="text-[10px] text-white/30 mt-0.5">
                        Based on all recorded days
                      </p>
                    </div>
                  </div>

                  <span className="text-lg font-bold text-blue-300">
                    {(() => {
                      const completed =
                        Object.values(
                          selectedHabit.completionHistory
                        ).filter(
                          Boolean
                        ).length;

                      const firstDate =
                        Object.keys(
                          selectedHabit.completionHistory
                        ).sort()[0];

                      if (
                        !firstDate
                      ) {
                        return 0;
                      }

                      const first =
                        parseDateKey(
                          firstDate
                        );

                      const now =
                        new Date();

                      const days =
                        Math.floor(
                          (
                            new Date(
                              now.getFullYear(),
                              now.getMonth(),
                              now.getDate()
                            ).getTime() -
                            new Date(
                              first.getFullYear(),
                              first.getMonth(),
                              first.getDate()
                            ).getTime()
                          ) /
                            (
                              1000 *
                              60 *
                              60 *
                              24
                            )
                        ) + 1;

                      return Math.min(
                        100,
                        Math.round(
                          (completed /
                            Math.max(
                              days,
                              1
                            )) *
                            100
                        )
                      );
                    })()}
                    %
                  </span>
                </div>

                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{
                      width: `${(() => {
                        const completed =
                          Object.values(
                            selectedHabit.completionHistory
                          ).filter(
                            Boolean
                          ).length;

                        const firstDate =
                          Object.keys(
                            selectedHabit.completionHistory
                          ).sort()[0];

                        if (
                          !firstDate
                        ) {
                          return 0;
                        }

                        const first =
                          parseDateKey(
                            firstDate
                          );

                        const now =
                          new Date();

                        const days =
                          Math.floor(
                            (
                              new Date(
                                now.getFullYear(),
                                now.getMonth(),
                                now.getDate()
                              ).getTime() -
                              new Date(
                                first.getFullYear(),
                                first.getMonth(),
                                first.getDate()
                              ).getTime()
                            ) /
                              (
                                1000 *
                                60 *
                                60 *
                                24
                              )
                          ) + 1;

                        return Math.min(
                          100,
                          Math.round(
                            (completed /
                              Math.max(
                                days,
                                1
                              )) *
                              100
                          )
                        );
                      })()}%`,
                    }}
                  />
                </div>
              </div>

              {/* RECENT HISTORY */}

              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays
                    size={17}
                    className="text-blue-400"
                  />

                  <div>
                    <h3 className="text-sm font-semibold">
                      Recent Activity
                    </h3>

                    <p className="text-[10px] text-white/30 mt-0.5">
                      Latest completed days
                    </p>
                  </div>
                </div>

                {Object.keys(
                  selectedHabit.completionHistory
                ).filter(
                  (date) =>
                    selectedHabit
                      .completionHistory[
                      date
                    ]
                ).length ===
                0 ? (
                  <div className="py-5 text-center">
                    <p className="text-sm text-white/35">
                      No completed days yet.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.keys(
                      selectedHabit.completionHistory
                    )
                      .filter(
                        (date) =>
                          selectedHabit
                            .completionHistory[
                            date
                          ]
                      )
                      .sort(
                        (
                          a,
                          b
                        ) =>
                          b.localeCompare(
                            a
                          )
                      )
                      .slice(
                        0,
                        12
                      )
                      .map(
                        (date) => (
                          <div
                            key={
                              date
                            }
                            className="rounded-xl border border-green-400/15 bg-green-500/[0.05] px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <Check
                                size={
                                  14
                                }
                                className="text-green-400"
                              />

                              <span className="text-xs text-white/65">
                                {new Intl.DateTimeFormat(
                                  "en-US",
                                  {
                                    month:
                                      "short",
                                    day:
                                      "numeric",
                                    year:
                                      "numeric",
                                  }
                                ).format(
                                  parseDateKey(
                                    date
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>

              {/* REMINDER */}

              {selectedHabit.reminderTime && (
                <div className="flex items-center gap-3 rounded-2xl border border-blue-400/15 bg-blue-500/[0.05] p-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Clock3
                      size={16}
                      className="text-blue-400"
                    />
                  </div>

                  <div>
                    <p className="text-xs text-white/35">
                      Reminder
                    </p>

                    <p className="text-sm text-blue-300 font-medium mt-0.5">
                      {
                        selectedHabit.reminderTime
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* ACTIONS */}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => {
                    const habit =
                      normalizedHabits.find(
                        (
                          item
                        ) =>
                          item.id ===
                          selectedHabit.id
                      );

                    if (
                      habit
                    ) {
                      openEditModal(
                        habit
                      );
                    }
                  }}
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-blue-400/20 bg-blue-500/10 text-blue-300 hover:bg-blue-500/15 transition font-medium"
                >
                  <Pencil
                    size={17}
                  />
                  Edit Habit
                </button>

                <button
                  onClick={() =>
                    deleteHabit(
                      selectedHabit
                    )
                  }
                  className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15 transition font-medium"
                >
                  <Trash2
                    size={17}
                  />
                  Delete
                </button>
              </div>

              {/* COMPLETE */}

              <button
                onClick={() =>
                  toggleHabit(
                    selectedHabit
                  )
                }
                className={`w-full py-3.5 rounded-2xl font-semibold transition ${
                  selectedHabit.completedToday
                    ? "bg-green-500 hover:bg-green-400 text-white"
                    : "bg-blue-500 hover:bg-blue-400 text-white"
                }`}
              >
                {selectedHabit.completedToday
                  ? "✓ Completed Today"
                  : "Mark Complete Today"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          ADD / EDIT MODAL
      =================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-lg max-h-[calc(100vh-24px)] sm:max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0d1016] shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 z-10 bg-[#0d1016]/95 backdrop-blur-xl border-b border-white/[0.06] p-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-blue-400 mb-1">
                  {editingHabit
                    ? "EDIT"
                    : "NEW"}
                </p>

                <h2 className="text-xl font-bold">
                  {editingHabit
                    ? "Edit Habit"
                    : "Create Habit"}
                </h2>
              </div>

              <button
                onClick={() =>
                  setShowModal(
                    false
                  )
                }
                className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/40 hover:text-white transition"
              >
                <X size={19} />
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="p-5 pb-8 space-y-5"
            >

              {/* NAME */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Habit Name
                </label>

                <input
                  autoFocus
                  value={
                    form.name
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      name:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="e.g. Morning Workout"
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3.5 outline-none focus:border-blue-400/40 transition"
                  required
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Description
                </label>

                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      description:
                        event
                          .target
                          .value,
                    })
                  }
                  placeholder="Optional"
                  rows={
                    3
                  }
                  className="w-full resize-none rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3.5 outline-none focus:border-blue-400/40 transition"
                />
              </div>

              {/* GOAL */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Weekly Goal
                </label>

                <div className="grid grid-cols-7 gap-2">
                  {[
                    1,
                    2,
                    3,
                    4,
                    5,
                    6,
                    7,
                  ].map(
                    (
                      number
                    ) => (
                      <button
                        type="button"
                        key={
                          number
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            goalDaysPerWeek:
                              number,
                          })
                        }
                        className={`py-3 rounded-xl border text-sm font-semibold transition ${
                          Number(
                            form.goalDaysPerWeek
                          ) ===
                          number
                            ? "bg-blue-500 border-blue-400 text-white"
                            : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white"
                        }`}
                      >
                        {
                          number
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* ICON */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Icon
                </label>

                <div className="grid grid-cols-8 gap-2">
                  {HABIT_ICONS.map(
                    (
                      icon
                    ) => (
                      <button
                        type="button"
                        key={
                          icon
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            icon,
                          })
                        }
                        className={`h-11 rounded-xl text-xl border transition ${
                          form.icon ===
                          icon
                            ? "bg-blue-500/15 border-blue-400"
                            : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                        }`}
                      >
                        {
                          icon
                        }
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* COLOR */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Color
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(
                    HABIT_COLORS
                  ).map(
                    ([
                      key,
                      value,
                    ]) => (
                      <button
                        type="button"
                        key={
                          key
                        }
                        onClick={() =>
                          setForm({
                            ...form,
                            color:
                              key,
                          })
                        }
                        className={`py-3 rounded-xl border transition ${
                          form.color ===
                          key
                            ? `${value.bg} ${value.border}`
                            : "bg-white/[0.03] border-white/10"
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${value.text}`}
                        >
                          {
                            value.name
                          }
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* REMINDER */}

              <div>
                <label className="block text-xs font-medium text-white/50 mb-2">
                  Reminder Time
                  <span className="text-white/25 ml-1">
                    optional
                  </span>
                </label>

                <input
                  type="time"
                  value={
                    form.reminderTime
                  }
                  onChange={(
                    event
                  ) =>
                    setForm({
                      ...form,
                      reminderTime:
                        event
                          .target
                          .value,
                    })
                  }
                  className="w-full rounded-2xl bg-white/[0.04] border border-white/10 px-4 py-3.5 outline-none focus:border-blue-400/40 transition"
                />

                <p className="text-[10px] text-white/25 mt-2">
                  Reminder time is saved with the habit. Native Android notification scheduling can be connected separately.
                </p>
              </div>

              {/* BUTTONS */}

              <div className="flex gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(
                      false
                    )
                  }
                  className="flex-1 py-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-2xl bg-blue-500 hover:bg-blue-400 transition font-semibold shadow-lg shadow-blue-500/20"
                >
                  {editingHabit
                    ? "Save Changes"
                    : "Create Habit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}