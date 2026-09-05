import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  List,
  MapPin,
  CheckCircle2,
  Repeat,
  Bell,
  BarChart3,
  CircleCheck,
  CircleX,
  ExternalLink,
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
import Loading from "../components/Loading";

import {
  requestNotificationPermission,
  scheduleCalendarNotification,
  cancelCalendarNotification,
} from "../utils/notifications";

// ===========================================================
// HELPERS
// ===========================================================

function getToday() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-LK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes);

  return date.toLocaleTimeString("en-LK", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(
    2,
    "0"
  )}-${String(day).padStart(2, "0")}`;
}

function dateToKey(date) {
  return dateKey(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function getEventStatus(event) {
  return event.status || "upcoming";
}

// ===========================================================
// OFFLINE BACKUP
// ===========================================================

function getCalendarStorageKey(uid) {
  return `my-dashboard-${uid}-calendar`;
}

function loadCalendarBackup(uid) {
  if (!uid) return [];

  try {
    const raw = localStorage.getItem(
      getCalendarStorageKey(uid)
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "Calendar local backup read error:",
      error
    );

    return [];
  }
}

function saveCalendarBackup(uid, events) {
  if (!uid) return;

  try {
    localStorage.setItem(
      getCalendarStorageKey(uid),
      JSON.stringify(events)
    );
  } catch (error) {
    console.warn(
      "Calendar local backup write error:",
      error
    );
  }
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const dateA = `${a.date || ""} ${
      a.time || ""
    }`;

    const dateB = `${b.date || ""} ${
      b.time || ""
    }`;

    return dateA.localeCompare(dateB);
  });
}

// ===========================================================
// COLOURS
// ===========================================================

function getColorClasses(color) {
  const colors = {
    blue: {
      dot: "bg-blue-500",
      bg: "bg-blue-500/10",
      border: "border-blue-400/25",
      text: "text-blue-300",
      strong: "bg-blue-500",
      glow: "shadow-blue-500/20",
    },

    green: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/25",
      text: "text-emerald-300",
      strong: "bg-emerald-500",
      glow: "shadow-emerald-500/20",
    },

    purple: {
      dot: "bg-purple-500",
      bg: "bg-purple-500/10",
      border: "border-purple-400/25",
      text: "text-purple-300",
      strong: "bg-purple-500",
      glow: "shadow-purple-500/20",
    },

    orange: {
      dot: "bg-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-400/25",
      text: "text-orange-300",
      strong: "bg-orange-500",
      glow: "shadow-orange-500/20",
    },

    pink: {
      dot: "bg-pink-500",
      bg: "bg-pink-500/10",
      border: "border-pink-400/25",
      text: "text-pink-300",
      strong: "bg-pink-500",
      glow: "shadow-pink-500/20",
    },

    red: {
      dot: "bg-red-500",
      bg: "bg-red-500/10",
      border: "border-red-400/25",
      text: "text-red-300",
      strong: "bg-red-500",
      glow: "shadow-red-500/20",
    },
  };

  return colors[color] || colors.blue;
}

function getCategoryColor(category) {
  const colors = {
    Work: "blue",
    Personal: "green",
    Fitness: "purple",
    Travel: "orange",
    Important: "red",
    Other: "pink",
  };

  return colors[category] || "blue";
}

function getMonthName(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getWeekDays(date) {
  const current = new Date(date);
  const day = current.getDay();

  const start = new Date(current);

  start.setDate(current.getDate() - day);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const item = new Date(start);

      item.setDate(start.getDate() + index);

      return item;
    }
  );
}

// ===========================================================
// CALENDAR
// ===========================================================

export default function Calendar({ user }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [showAnalytics, setShowAnalytics] =
    useState(false);

  const [editingId, setEditingId] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [view, setView] = useState("month");

  const today = getToday();

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedDate, setSelectedDate] =
    useState(today);

  // =========================================================
  // FORM
  // =========================================================

  const [form, setForm] = useState({
    title: "",
    date: today,
    time: "",
    description: "",
    location: "",
    category: "Personal",
    color: "green",
    repeat: "none",
    reminder: "none",
    status: "upcoming",
  });

  // =========================================================
  // FIRESTORE + OFFLINE CACHE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const calendarRef = collection(
      db,
      "users",
      user.uid,
      "calendar"
    );

    const loadOfflineData = async () => {
      try {
        const cacheSnapshot =
          await getDocsFromCache(
            calendarRef
          );

        if (!mounted) return;

        const cachedData =
          cacheSnapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        const localBackup =
          loadCalendarBackup(user.uid);

        if (cachedData.length > 0) {
          const sorted = sortEvents(
            cachedData
          );

          setEvents(sorted);
          saveCalendarBackup(
            user.uid,
            sorted
          );
        } else if (
          localBackup.length > 0
        ) {
          setEvents(
            sortEvents(localBackup)
          );
        }
      } catch (error) {
        console.warn(
          "Calendar cache read error:",
          error
        );

        const localBackup =
          loadCalendarBackup(user.uid);

        if (
          mounted &&
          localBackup.length > 0
        ) {
          setEvents(
            sortEvents(localBackup)
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOfflineData();

    const unsubscribe = onSnapshot(
      calendarRef,
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        if (!mounted) return;

        const data =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        const localBackup =
          loadCalendarBackup(user.uid);

        /*
         * If Firestore gives an empty cached snapshot
         * while we already have local backup data,
         * do not destroy the local calendar.
         */
        if (
          data.length === 0 &&
          snapshot.metadata.fromCache &&
          localBackup.length > 0
        ) {
          setEvents(
            sortEvents(localBackup)
          );
          setLoading(false);
          return;
        }

        const sorted =
          sortEvents(data);

        setEvents(sorted);

        /*
         * Save every useful Firestore snapshot
         * to localStorage as a second offline layer.
         */
        if (
          sorted.length > 0 ||
          !snapshot.metadata.fromCache
        ) {
          saveCalendarBackup(
            user.uid,
            sorted
          );
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Calendar Firestore error:",
          error
        );

        const localBackup =
          loadCalendarBackup(user.uid);

        if (
          mounted &&
          localBackup.length > 0
        ) {
          setEvents(
            sortEvents(localBackup)
          );
        }

        if (mounted) {
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // =========================================================
  // MONTH DAYS
  // =========================================================

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const previousMonthDays = new Date(
      year,
      month,
      0
    ).getDate();

    const days = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const day = previousMonthDays - i;

      const previousDate = new Date(
        year,
        month - 1,
        day
      );

      days.push({
        day,
        date: dateToKey(previousDate),
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const current = new Date(
        year,
        month,
        day
      );

      days.push({
        day,
        date: dateToKey(current),
        currentMonth: true,
      });
    }

    let nextDay = 1;

    while (days.length < 42) {
      const nextDate = new Date(
        year,
        month + 1,
        nextDay
      );

      days.push({
        day: nextDay,
        date: dateToKey(nextDate),
        currentMonth: false,
      });

      nextDay++;
    }

    return days;
  }, [currentDate]);

  // =========================================================
  // FILTER EVENTS
  // =========================================================

  const filteredEvents = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !value ||
        `${event.title || ""} ${
          event.description || ""
        } ${event.location || ""} ${
          event.category || ""
        }`
          .toLowerCase()
          .includes(value);

      const matchesCategory =
        categoryFilter === "all" ||
        event.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        getEventStatus(event) ===
          statusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    events,
    search,
    categoryFilter,
    statusFilter,
  ]);

  // =========================================================
  // SELECTED DAY
  // =========================================================

  const selectedDayEvents = useMemo(() => {
    return filteredEvents
      .filter(
        (event) =>
          event.date === selectedDate
      )
      .sort((a, b) =>
        String(
          a.time || ""
        ).localeCompare(
          String(b.time || "")
        )
      );
  }, [
    filteredEvents,
    selectedDate,
  ]);

  // =========================================================
  // UPCOMING
  // =========================================================

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(
        (event) =>
          event.date &&
          event.date >= today &&
          getEventStatus(event) !==
            "cancelled"
      )
      .sort((a, b) => {
        const dateA = `${a.date} ${
          a.time || ""
        }`;

        const dateB = `${b.date} ${
          b.time || ""
        }`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 6);
  }, [filteredEvents, today]);

  // =========================================================
  // WEEK
  // =========================================================

  const weekDays = useMemo(
    () => getWeekDays(currentDate),
    [currentDate]
  );

  // =========================================================
  // STATISTICS
  // =========================================================

  const todayEvents = events.filter(
    (event) => event.date === today
  );

  const upcomingCount = events.filter(
    (event) =>
      event.date &&
      event.date >= today &&
      getEventStatus(event) !==
        "cancelled"
  ).length;

  const completedCount = events.filter(
    (event) =>
      getEventStatus(event) ===
      "completed"
  ).length;

  const monthEventCount = events.filter(
    (event) => {
      if (!event.date) return false;

      const [year, month] =
        event.date.split("-").map(Number);

      return (
        year === currentDate.getFullYear() &&
        month ===
          currentDate.getMonth() + 1
      );
    }
  ).length;

  // =========================================================
  // NAVIGATION
  // =========================================================

  const previousPeriod = () => {
    if (view === "month") {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - 1,
          1
        )
      );

      return;
    }

    if (view === "day") {
      const date = new Date(
        currentDate
      );

      date.setDate(
        date.getDate() - 1
      );

      setCurrentDate(date);
      setSelectedDate(
        dateToKey(date)
      );

      return;
    }

    const date = new Date(
      currentDate
    );

    date.setDate(
      date.getDate() - 7
    );

    setCurrentDate(date);
  };

  const nextPeriod = () => {
    if (view === "month") {
      setCurrentDate(
        new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          1
        )
      );

      return;
    }

    if (view === "day") {
      const date = new Date(
        currentDate
      );

      date.setDate(
        date.getDate() + 1
      );

      setCurrentDate(date);
      setSelectedDate(
        dateToKey(date)
      );

      return;
    }

    const date = new Date(
      currentDate
    );

    date.setDate(
      date.getDate() + 7
    );

    setCurrentDate(date);
  };

  const goToday = () => {
    const date = new Date();

    setCurrentDate(date);
    setSelectedDate(getToday());
  };

  // =========================================================
  // FORM
  // =========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    if (name === "category") {
      setForm((previous) => ({
        ...previous,
        category: value,
        color: getCategoryColor(value),
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddForm = (
    selected = selectedDate
  ) => {
    setEditingId(null);

    setForm({
      title: "",
      date: selected || getToday(),
      time: "",
      description: "",
      location: "",
      category: "Personal",
      color: "green",
      repeat: "none",
      reminder: "none",
      status: "upcoming",
    });

    setShowForm(true);
  };

  const openEditForm = (event) => {
    setEditingId(event.id);

    setForm({
      title: event.title || "",
      date:
        event.date || getToday(),
      time: event.time || "",
      description:
        event.description || "",
      location:
        event.location || "",
      category:
        event.category || "Personal",
      color:
        event.color ||
        getCategoryColor(
          event.category
        ),
      repeat:
        event.repeat || "none",
      reminder:
        event.reminder || "none",
      status:
        event.status || "upcoming",
    });

    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);

    setForm({
      title: "",
      date:
        selectedDate || getToday(),
      time: "",
      description: "",
      location: "",
      category: "Personal",
      color: "green",
      repeat: "none",
      reminder: "none",
      status: "upcoming",
    });

    setShowForm(false);
    setSaving(false);
  };

  // =========================================================
  // NOTIFICATION HELPERS
  // =========================================================

  const scheduleEventReminder = async (
    eventId,
    eventData
  ) => {
    if (!eventId) return;

    try {
      /*
       * Notifications are intentionally handled
       * separately from Firestore saving.
       */
      await cancelCalendarNotification(
        eventId
      );

      if (
        !eventData.reminder ||
        eventData.reminder === "none"
      ) {
        return;
      }

      if (
        !eventData.date ||
        !eventData.time
      ) {
        return;
      }

      if (
        eventData.status &&
        eventData.status !== "upcoming"
      ) {
        return;
      }

      await scheduleCalendarNotification(
        eventId,
        {
          ...eventData,
          id: eventId,
        }
      );
    } catch (error) {
      console.error(
        "Calendar notification error:",
        error
      );
    }
  };

  // =========================================================
  // SAVE EVENT - OFFLINE FIRST
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.uid) {
      alert("You are not logged in.");
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

    if (
      form.reminder !== "none" &&
      !form.time
    ) {
      alert(
        "Please select event time for reminders."
      );
      return;
    }

    /*
     * We no longer wait for Firestore.
     * This prevents "Saving..." from getting stuck
     * when the phone is offline.
     */
    setSaving(true);

    const calendarRef = collection(
      db,
      "users",
      user.uid,
      "calendar"
    );

    const now = new Date().toISOString();

    const localEventData = {
      title,
      date: form.date,
      time: form.time || "",
      description:
        form.description.trim(),
      location:
        form.location.trim(),
      category: form.category,
      color: form.color,
      repeat: form.repeat,
      reminder: form.reminder,
      status: form.status,
      updatedAt: now,
    };

    // =======================================================
    // EDIT
    // =======================================================

    if (editingId) {
      const eventId = editingId;

      const updatedEvents =
        sortEvents(
          events.map((item) =>
            item.id === eventId
              ? {
                  ...item,
                  ...localEventData,
                }
              : item
          )
        );

      /*
       * 1. Update UI immediately
       * 2. Save local backup immediately
       * 3. Close modal immediately
       */
      setEvents(updatedEvents);

      saveCalendarBackup(
        user.uid,
        updatedEvents
      );

      setSelectedDate(form.date);

      setCurrentDate(
        new Date(
          `${form.date}T00:00:00`
        )
      );

      resetForm();

      /*
       * Firestore update runs in background.
       * It will be queued by Firestore when offline.
       */
      void updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "calendar",
          eventId
        ),
        {
          ...localEventData,
          updatedAt:
            serverTimestamp(),
        }
      ).catch((error) => {
        console.error(
          "Calendar background update error:",
          error
        );
      });

      /*
       * Notification is also non-blocking.
       */
      void scheduleEventReminder(
        eventId,
        localEventData
      );

      return;
    }

    // =======================================================
    // CREATE
    // =======================================================

    /*
     * Generate the document ID locally.
     * This means the event does not need to wait
     * for Firestore before appearing in the app.
     */
    const eventRef = doc(
      calendarRef
    );

    const eventId = eventRef.id;

    const newEvent = {
      id: eventId,
      ...localEventData,
      createdAt: now,
    };

    const updatedEvents =
      sortEvents([
        ...events,
        newEvent,
      ]);

    /*
     * 1. Add to UI immediately
     * 2. Save local backup
     * 3. Close modal immediately
     */
    setEvents(updatedEvents);

    saveCalendarBackup(
      user.uid,
      updatedEvents
    );

    setSelectedDate(form.date);

    setCurrentDate(
      new Date(
        `${form.date}T00:00:00`
      )
    );

    resetForm();

    /*
     * Firestore write happens in background.
     *
     * If online -> sends normally.
     * If offline -> Firestore queues it.
     */
    void setDoc(eventRef, {
      ...localEventData,
      createdAt:
        serverTimestamp(),
    }).catch((error) => {
      console.error(
        "Calendar background create error:",
        error
      );
    });

    /*
     * Notification scheduling does not block
     * the event save.
     */
    void scheduleEventReminder(
      eventId,
      localEventData
    );
  };

  // =========================================================
  // DELETE - OFFLINE FIRST
  // =========================================================

  const handleDelete = async (id) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this event?"
      );

    if (!confirmed) return;

    setDeletingId(id);

    /*
     * Remove from UI immediately.
     */
    const updatedEvents =
      events.filter(
        (event) => event.id !== id
      );

    setEvents(updatedEvents);

    /*
     * Save local backup immediately.
     */
    saveCalendarBackup(
      user.uid,
      updatedEvents
    );

    /*
     * Clear deleting state immediately.
     */
    setDeletingId(null);

    /*
     * Notification cancellation is non-blocking.
     */
    void cancelCalendarNotification(
      id
    ).catch((error) => {
      console.error(
        "Calendar notification cancel error:",
        error
      );
    });

    /*
     * Firestore delete happens in background.
     * Offline Firestore will queue this delete.
     */
    void deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "calendar",
        id
      )
    ).catch((error) => {
      console.error(
        "Calendar background delete error:",
        error
      );
    });
  };

  // =========================================================
  // STATUS - OFFLINE FIRST
  // =========================================================

  const updateStatus = async (
    event,
    status
  ) => {
    if (!user?.uid) return;

    /*
     * Update UI immediately.
     */
    const updatedEvents =
      sortEvents(
        events.map((item) =>
          item.id === event.id
            ? {
                ...item,
                status,
                updatedAt:
                  new Date().toISOString(),
              }
            : item
        )
      );

    setEvents(updatedEvents);

    /*
     * Save local backup.
     */
    saveCalendarBackup(
      user.uid,
      updatedEvents
    );

    /*
     * Firestore update is background-only.
     */
    void updateDoc(
      doc(
        db,
        "users",
        user.uid,
        "calendar",
        event.id
      ),
      {
        status,
        updatedAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.error(
        "Status background update error:",
        error
      );
    });

    /*
     * Notifications never block status update.
     */
    if (
      status === "completed" ||
      status === "cancelled"
    ) {
      void cancelCalendarNotification(
        event.id
      ).catch((error) => {
        console.error(
          "Calendar notification cancel error:",
          error
        );
      });

      return;
    }

    if (status === "upcoming") {
      void scheduleEventReminder(
        event.id,
        {
          ...event,
          status: "upcoming",
        }
      );
    }
  };

  // =========================================================
  // MAPS
  // =========================================================

  const openMaps = (location) => {
    if (!location) return;

    const url =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  // =========================================================
  // NOTIFICATION PERMISSION
  // =========================================================

  const handleNotificationPermission =
    async () => {
      try {
        const granted =
          await requestNotificationPermission();

        if (granted) {
          alert(
            "Calendar notifications enabled."
          );
        } else {
          alert(
            "Please allow notifications from your phone settings."
          );
        }
      } catch (error) {
        console.error(
          "Notification permission error:",
          error
        );

        alert(
          "Could not enable notifications."
        );
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading text="Loading calendar..." />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* HEADER */}

      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-6">

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <CalendarDays size={18} />
            </div>

            <div className="min-w-0">

              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
                Schedule
              </p>

              <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
                Calendar
              </h1>

            </div>

          </div>

        </div>

        <div className="hidden flex-wrap gap-2 sm:flex">

          <button
            type="button"
            onClick={() =>
              setShowAnalytics(
                !showAnalytics
              )
            }
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <BarChart3 size={17} />
            Analytics
          </button>

          <button
            type="button"
            onClick={
              handleNotificationPermission
            }
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <Bell size={17} />
            Reminders
          </button>

          <button
            type="button"
            onClick={() =>
              openAddForm()
            }
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
          >
            <Plus size={18} />
            Add Event
          </button>

        </div>

      </div>

      {/* MONTH VIEW */}

      {view === "month" && (
        <div className="mb-4 overflow-hidden rounded-[28px] border border-white/[0.10] bg-gradient-to-br from-white/[0.075] via-white/[0.04] to-white/[0.025] shadow-2xl shadow-black/30 backdrop-blur-3xl sm:mb-6 sm:rounded-[32px]">

          <div className="border-b border-white/[0.07] px-4 py-4 sm:px-6 sm:py-6">

            <div className="flex items-center justify-between gap-3">

              <div className="min-w-0">

                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30 sm:text-[10px]">
                  My Calendar
                </p>

                <h2 className="mt-1 truncate text-[22px] font-bold tracking-tight sm:text-3xl">
                  {getMonthName(
                    currentDate
                  )}
                </h2>

                <p className="mt-1 text-[10px] text-white/30 sm:text-xs">
                  {monthEventCount} event
                  {monthEventCount !==
                  1
                    ? "s"
                    : ""}{" "}
                  this month
                </p>

              </div>

              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">

                <button
                  type="button"
                  onClick={goToday}
                  className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[10px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white sm:px-4 sm:py-2.5 sm:text-xs"
                >
                  Today
                </button>

                <button
                  type="button"
                  onClick={
                    previousPeriod
                  }
                  aria-label="Previous month"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10"
                >
                  <ChevronLeft size={17} />
                </button>

                <button
                  type="button"
                  onClick={
                    nextPeriod
                  }
                  aria-label="Next month"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white/55 transition hover:bg-white/10 hover:text-white sm:h-10 sm:w-10"
                >
                  <ChevronRight size={17} />
                </button>

              </div>

            </div>

          </div>

          <div className="grid grid-cols-7 border-b border-white/[0.07] bg-white/[0.018]">

            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map(
              (day, index) => (
                <div
                  key={day}
                  className={`flex h-9 items-center justify-center text-[9px] font-semibold uppercase tracking-wider sm:h-11 sm:text-[10px] ${
                    index === 0
                      ? "text-red-400"
                      : index === 6
                      ? "text-blue-300/60"
                      : "text-white/35"
                  }`}
                >
                  <span className="sm:hidden">
                    {day.slice(0, 1)}
                  </span>

                  <span className="hidden sm:inline">
                    {day}
                  </span>
                </div>
              )
            )}

          </div>

          <div className="grid grid-cols-7">

            {calendarDays.map(
              (
                calendarDay,
                index
              ) => {
                const dayEvents =
                  filteredEvents.filter(
                    (event) =>
                      event.date ===
                      calendarDay.date
                  );

                const selected =
                  calendarDay.date ===
                  selectedDate;

                const isToday =
                  calendarDay.date ===
                  today;

                const column =
                  index % 7;

                const isSunday =
                  column === 0;

                const isSaturday =
                  column === 6;

                return (
                  <button
                    key={`${calendarDay.date}-${index}`}
                    type="button"
                    onClick={() => {
                      setSelectedDate(
                        calendarDay.date
                      );

                      if (
                        !calendarDay.currentMonth
                      ) {
                        setCurrentDate(
                          new Date(
                            `${calendarDay.date}T00:00:00`
                          )
                        );
                      }
                    }}
                    className={`group relative flex min-h-[82px] flex-col items-center border-b border-r border-white/[0.055] px-1 py-2 transition-all duration-200 sm:min-h-[112px] sm:p-2.5 lg:min-h-[122px] ${
                      selected
                        ? "bg-white/[0.075]"
                        : "hover:bg-white/[0.035]"
                    } ${
                      !calendarDay.currentMonth
                        ? "opacity-25"
                        : ""
                    }`}
                  >

                    {selected && (
                      <span className="absolute left-1/2 top-0 h-[2px] w-7 -translate-x-1/2 rounded-full bg-white/80 sm:w-9" />
                    )}

                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium leading-none transition-all sm:h-9 sm:w-9 sm:text-sm ${
                        isToday
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30"
                          : selected
                          ? "bg-white/[0.10] text-white"
                          : isSunday
                          ? "text-red-400"
                          : isSaturday
                          ? "text-blue-300/70"
                          : "text-white/75"
                      }`}
                    >
                      {calendarDay.day}
                    </span>

                    <div className="mt-2 flex min-h-[10px] max-w-full flex-wrap items-center justify-center gap-1">

                      {dayEvents
                        .slice(0, 4)
                        .map(
                          (event) => {
                            const color =
                              getColorClasses(
                                event.color ||
                                  getCategoryColor(
                                    event.category
                                  )
                              );

                            return (
                              <span
                                key={
                                  event.id
                                }
                                className={`h-1.5 w-1.5 rounded-full ${color.dot} shadow-sm sm:h-2 sm:w-2`}
                              />
                            );
                          }
                        )}

                      {dayEvents.length >
                        4 && (
                        <span className="text-[8px] font-semibold text-white/35">
                          +
                          {dayEvents.length -
                            4}
                        </span>
                      )}

                    </div>

                    <div className="mt-1.5 hidden w-full space-y-1 sm:block">

                      {dayEvents
                        .slice(0, 2)
                        .map(
                          (event) => {
                            const color =
                              getColorClasses(
                                event.color ||
                                  getCategoryColor(
                                    event.category
                                  )
                              );

                            return (
                              <div
                                key={
                                  event.id
                                }
                                className={`flex items-center gap-1.5 truncate rounded-md border px-1.5 py-1 text-left text-[9px] font-medium ${color.bg} ${color.border} ${color.text}`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${color.dot}`}
                                />

                                <span className="truncate">
                                  {
                                    event.title
                                  }
                                </span>
                              </div>
                            );
                          }
                        )}

                      {dayEvents.length >
                        2 && (
                        <p className="px-1 text-[8px] font-medium text-white/30">
                          +
                          {dayEvents.length -
                            2}{" "}
                          more
                        </p>
                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4">

            {[
              ["Work", "blue"],
              ["Personal", "green"],
              ["Fitness", "purple"],
              ["Travel", "orange"],
              ["Important", "red"],
              ["Other", "pink"],
            ].map(
              ([label, color]) => {
                const styles =
                  getColorClasses(
                    color
                  );

                return (
                  <div
                    key={label}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${styles.dot}`}
                    />

                    <span className="text-[9px] text-white/30">
                      {label}
                    </span>
                  </div>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* MOBILE ACTIONS */}

      <div className="mb-5 grid grid-cols-3 gap-2 sm:hidden">

        <button
          type="button"
          onClick={() =>
            setShowAnalytics(
              !showAnalytics
            )
          }
          className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl border text-[10px] font-medium transition ${
            showAnalytics
              ? "border-white/20 bg-white/10 text-white"
              : "border-white/10 bg-white/[0.045] text-white/55"
          }`}
        >
          <BarChart3 size={17} />
          Analytics
        </button>

        <button
          type="button"
          onClick={
            handleNotificationPermission
          }
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.045] text-[10px] font-medium text-white/55 transition hover:bg-white/10 hover:text-white"
        >
          <Bell size={17} />
          Reminders
        </button>

        <button
          type="button"
          onClick={() =>
            openAddForm()
          }
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl bg-white text-[10px] font-semibold text-black transition active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Event
        </button>

      </div>

      {/* VIEW SWITCHER */}

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-2.5 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex rounded-xl bg-white/[0.04] p-1">

          {[
            ["month", "Month"],
            ["week", "Week"],
            ["day", "Day"],
          ].map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setView(value)
                }
                className={`flex-1 rounded-lg px-4 py-2 text-xs font-medium transition sm:flex-none ${
                  view === value
                    ? "bg-white text-black shadow-sm"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {label}
              </button>
            )
          )}

        </div>

        <div className="flex items-center justify-between gap-2">

          <button
            type="button"
            onClick={
              previousPeriod
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={17} />
          </button>

          <button
            type="button"
            onClick={goToday}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            Today
          </button>

          <button
            type="button"
            onClick={
              nextPeriod
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight size={17} />
          </button>

        </div>

      </div>

      {/* ANALYTICS */}

      {showAnalytics && (
        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <AnalyticsCard
            title="Total Events"
            value={events.length}
            icon={
              <CalendarDays size={18} />
            }
          />

          <AnalyticsCard
            title="Completed"
            value={
              completedCount
            }
            icon={
              <CheckCircle2 size={18} />
            }
          />

          <AnalyticsCard
            title="Upcoming"
            value={
              upcomingCount
            }
            icon={
              <Clock size={18} />
            }
          />

          <AnalyticsCard
            title="This Month"
            value={
              monthEventCount
            }
            icon={
              <BarChart3 size={18} />
            }
          />

        </div>
      )}

      {/* STATS */}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <CalendarStat
          icon={
            <CalendarDays size={18} />
          }
          title="Total Events"
          value={events.length}
        />

        <CalendarStat
          icon={
            <CheckCircle2 size={18} />
          }
          title="Today"
          value={
            todayEvents.length
          }
        />

        <CalendarStat
          icon={<Clock size={18} />}
          title="Upcoming"
          value={
            upcomingCount
          }
        />

        <CalendarStat
          icon={<List size={18} />}
          title="This Month"
          value={
            monthEventCount
          }
        />

      </div>

      {/* SEARCH */}

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">

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
            placeholder="Search events..."
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20"
          />

        </div>

        <select
          value={
            categoryFilter
          }
          onChange={(event) =>
            setCategoryFilter(
              event.target.value
            )
          }
          className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/60 outline-none"
        >
          <option value="all">
            All Categories
          </option>

          <option value="Work">
            Work
          </option>

          <option value="Personal">
            Personal
          </option>

          <option value="Fitness">
            Fitness
          </option>

          <option value="Travel">
            Travel
          </option>

          <option value="Important">
            Important
          </option>

          <option value="Other">
            Other
          </option>
        </select>

        <select
          value={
            statusFilter
          }
          onChange={(event) =>
            setStatusFilter(
              event.target.value
            )
          }
          className="rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white/60 outline-none"
        >
          <option value="all">
            All Status
          </option>

          <option value="upcoming">
            Upcoming
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>
        </select>

      </div>

      {/* WEEK VIEW */}

      {view === "week" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl">

          <div className="mb-5 flex items-center justify-between">

            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25">
                Weekly Schedule
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                Week Schedule
              </h2>
            </div>

            <CalendarDays
              size={18}
              className="text-white/25"
            />

          </div>

          <div className="grid gap-3 md:grid-cols-7">

            {weekDays.map(
              (day) => {
                const key =
                  dateToKey(day);

                const dayEvents =
                  filteredEvents.filter(
                    (event) =>
                      event.date ===
                      key
                  );

                const isToday =
                  key === today;

                const isSunday =
                  day.getDay() === 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setSelectedDate(
                        key
                      )
                    }
                    className={`min-h-[180px] rounded-2xl border p-3 text-left transition ${
                      selectedDate ===
                      key
                        ? "border-white/30 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >

                    <div className="mb-3 flex items-center justify-between">

                      <div>

                        <p
                          className={`text-[10px] uppercase ${
                            isSunday
                              ? "text-red-400"
                              : "text-white/25"
                          }`}
                        >
                          {day.toLocaleDateString(
                            "en-US",
                            {
                              weekday:
                                "short",
                            }
                          )}
                        </p>

                        <p
                          className={`mt-1 text-xl font-bold ${
                            isToday
                              ? "text-red-400"
                              : "text-white/70"
                          }`}
                        >
                          {day.getDate()}
                        </p>

                      </div>

                      {isToday && (
                        <span className="rounded-full bg-red-500 px-2 py-1 text-[8px] font-bold text-white">
                          TODAY
                        </span>
                      )}

                    </div>

                    <div className="space-y-2">

                      {dayEvents
                        .slice(0, 4)
                        .map(
                          (event) => {
                            const color =
                              getColorClasses(
                                event.color ||
                                  getCategoryColor(
                                    event.category
                                  )
                              );

                            return (
                              <div
                                key={
                                  event.id
                                }
                                className={`rounded-xl border p-2 ${color.bg} ${color.border}`}
                              >
                                <div className="flex items-center gap-1.5">

                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${color.dot}`}
                                  />

                                  <p className="truncate text-[11px] font-medium">
                                    {
                                      event.title
                                    }
                                  </p>

                                </div>

                                {event.time && (
                                  <p className="mt-1 text-[9px] text-white/30">
                                    {formatTime(
                                      event.time
                                    )}
                                  </p>
                                )}

                              </div>
                            );
                          }
                        )}

                      {dayEvents.length >
                        4 && (
                        <p className="text-[10px] text-white/25">
                          +
                          {dayEvents.length -
                            4}{" "}
                          more
                        </p>
                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* DAY VIEW */}

      {view === "day" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

          <div className="mb-6 flex items-center justify-between">

            <div>

              <p className="text-xs text-white/30">
                Selected Day
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                {formatDate(
                  selectedDate
                )}
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                openAddForm(
                  selectedDate
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black"
            >
              <Plus size={18} />
            </button>

          </div>

          {selectedDayEvents.length ===
          0 ? (
            <EmptyEvents
              onAdd={() =>
                openAddForm(
                  selectedDate
                )
              }
            />
          ) : (
            <div className="space-y-3">

              {selectedDayEvents.map(
                (event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() =>
                      openEditForm(
                        event
                      )
                    }
                    onDelete={() =>
                      handleDelete(
                        event.id
                      )
                    }
                    onStatusChange={(
                      status
                    ) =>
                      updateStatus(
                        event,
                        status
                      )
                    }
                    onMaps={() =>
                      openMaps(
                        event.location
                      )
                    }
                    deleting={
                      deletingId ===
                      event.id
                    }
                  />
                )
              )}

            </div>
          )}

        </div>
      )}

      {/* SELECTED DAY */}

      {view !== "day" && (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

          <div className="mb-5 flex items-start justify-between gap-3">

            <div>

              <p className="text-xs text-white/30">
                Selected Day
              </p>

              <h2 className="mt-1 text-lg font-semibold">
                {formatDate(
                  selectedDate
                )}
              </h2>

            </div>

            <button
              type="button"
              onClick={() =>
                openAddForm(
                  selectedDate
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-black"
            >
              <Plus size={17} />
            </button>

          </div>

          {selectedDayEvents.length ===
          0 ? (
            <EmptyEvents
              onAdd={() =>
                openAddForm(
                  selectedDate
                )
              }
            />
          ) : (
            <div className="space-y-3">

              {selectedDayEvents.map(
                (event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() =>
                      openEditForm(
                        event
                      )
                    }
                    onDelete={() =>
                      handleDelete(
                        event.id
                      )
                    }
                    onStatusChange={(
                      status
                    ) =>
                      updateStatus(
                        event,
                        status
                      )
                    }
                    onMaps={() =>
                      openMaps(
                        event.location
                      )
                    }
                    deleting={
                      deletingId ===
                      event.id
                    }
                  />
                )
              )}

            </div>
          )}

        </div>
      )}

      {/* UPCOMING */}

      <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

        <div className="mb-5 flex items-center justify-between">

          <div>

            <h2 className="font-semibold">
              Upcoming Events
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Your next scheduled events
            </p>

          </div>

          <Clock
            size={18}
            className="text-white/25"
          />

        </div>

        {upcomingEvents.length ===
        0 ? (
          <div className="rounded-2xl bg-white/[0.02] px-4 py-8 text-center text-sm text-white/25">
            No upcoming events.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">

            {upcomingEvents.map(
              (event) => {
                const color =
                  getColorClasses(
                    event.color ||
                      getCategoryColor(
                        event.category
                      )
                  );

                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setSelectedDate(
                        event.date
                      );

                      setCurrentDate(
                        new Date(
                          `${event.date}T00:00:00`
                        )
                      );
                    }}
                    className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${color.border} ${color.bg}`}
                  >

                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10">

                      <span className="text-[9px] uppercase text-white/30">
                        {new Date(
                          `${event.date}T00:00:00`
                        ).toLocaleDateString(
                          "en-US",
                          {
                            month:
                              "short",
                          }
                        )}
                      </span>

                      <span className="text-sm font-bold">
                        {new Date(
                          `${event.date}T00:00:00`
                        ).getDate()}
                      </span>

                    </div>

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">

                        <span
                          className={`h-2 w-2 rounded-full ${color.dot}`}
                        />

                        <p className="truncate text-sm font-medium">
                          {
                            event.title
                          }
                        </p>

                      </div>

                      <div className="mt-1 flex items-center gap-2 text-[10px] text-white/30">

                        <span>
                          {formatShortDate(
                            event.date
                          )}
                        </span>

                        {event.time && (
                          <>
                            <span>
                              •
                            </span>

                            <span>
                              {formatTime(
                                event.time
                              )}
                            </span>
                          </>
                        )}

                      </div>

                      {event.repeat &&
                        event.repeat !==
                          "none" && (
                          <div className="mt-1 flex items-center gap-1 text-[9px] text-white/25">
                            <Repeat
                              size={10}
                            />
                            {
                              event.repeat
                            }
                          </div>
                        )}

                    </div>

                  </button>
                );
              }
            )}

          </div>
        )}

      </div>

      {/* EVENT MODAL */}

      {showForm && (
        <EventModal
          form={form}
          editingId={editingId}
          saving={saving}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={resetForm}
        />
      )}

      {/* MOBILE FLOATING ADD */}

      <button
        type="button"
        onClick={() =>
          openAddForm(
            selectedDate
          )
        }
        aria-label="Add event"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl transition active:scale-90 sm:hidden"
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
// STAT
// ===========================================================

function CalendarStat({
  icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">

      <div className="flex items-center gap-3">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60">
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

// ===========================================================
// ANALYTICS CARD
// ===========================================================

function AnalyticsCard({
  icon,
  title,
  value,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-xl">

      <div className="flex items-center justify-between">

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white/60">
          {icon}
        </div>

        <BarChart3
          size={15}
          className="text-white/15"
        />

      </div>

      <p className="mt-4 text-xs text-white/30">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}

// ===========================================================
// EMPTY EVENTS
// ===========================================================

function EmptyEvents({ onAdd }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">

      <CalendarDays
        size={28}
        className="mx-auto mb-3 text-white/20"
      />

      <p className="text-sm font-medium text-white/50">
        No events
      </p>

      <p className="mt-1 text-xs text-white/25">
        Nothing scheduled for this day.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black"
      >
        Add Event
      </button>

    </div>
  );
}

// ===========================================================
// EVENT CARD
// ===========================================================

function EventCard({
  event,
  onEdit,
  onDelete,
  onStatusChange,
  onMaps,
  deleting,
}) {
  const color =
    getColorClasses(
      event.color ||
        getCategoryColor(
          event.category
        )
    );

  const status =
    getEventStatus(event);

  return (
    <div
      className={`rounded-2xl border p-4 transition hover:bg-white/[0.05] ${color.border} ${color.bg}`}
    >

      <div className="flex items-start justify-between gap-3">

        <div className="min-w-0 flex-1">

          <div className="flex items-start gap-3">

            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.bg}`}
            >
              <CalendarDays
                size={17}
                className={
                  color.text
                }
              />
            </div>

            <div className="min-w-0">

              <div className="flex flex-wrap items-center gap-2">

                <p
                  className={`truncate text-sm font-semibold ${
                    status ===
                    "completed"
                      ? "text-white/40 line-through"
                      : ""
                  }`}
                >
                  {event.title}
                </p>

                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] ${color.bg} ${color.text}`}
                >
                  {event.category ||
                    "Other"}
                </span>

              </div>

              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/30">

                {event.time && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={12} />
                    {formatTime(
                      event.time
                    )}
                  </span>
                )}

                {event.repeat &&
                  event.repeat !==
                    "none" && (
                    <span className="flex items-center gap-1.5">
                      <Repeat size={12} />
                      {
                        event.repeat
                      }
                    </span>
                  )}

                {event.reminder &&
                  event.reminder !==
                    "none" && (
                    <span className="flex items-center gap-1.5">
                      <Bell size={12} />
                      {
                        event.reminder
                      }
                    </span>
                  )}

              </div>

            </div>

          </div>

          {event.description && (
            <p className="mt-3 text-xs leading-5 text-white/30">
              {
                event.description
              }
            </p>
          )}

          {event.location && (
            <button
              type="button"
              onClick={onMaps}
              className="mt-3 flex items-center gap-1.5 text-xs text-white/30 transition hover:text-white"
            >
              <MapPin size={12} />

              <span>
                {event.location}
              </span>

              <ExternalLink
                size={10}
              />
            </button>
          )}

          <div className="mt-4 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                onStatusChange(
                  "completed"
                )
              }
              disabled={
                status ===
                "completed"
              }
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-[10px] text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <CircleCheck
                size={13}
              />
              Complete
            </button>

            <button
              type="button"
              onClick={() =>
                onStatusChange(
                  "cancelled"
                )
              }
              disabled={
                status ===
                "cancelled"
              }
              className="flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-[10px] text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <CircleX
                size={13}
              />
              Cancel
            </button>

            {status !==
              "upcoming" && (
              <button
                type="button"
                onClick={() =>
                  onStatusChange(
                    "upcoming"
                  )
                }
                className="rounded-xl bg-white/5 px-3 py-2 text-[10px] text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                Reset
              </button>
            )}

          </div>

        </div>

        <div className="flex shrink-0 gap-1">

          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-2 text-white/30 transition hover:bg-white/10 hover:text-white"
            title="Edit"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>

        </div>

      </div>

    </div>
  );
}

// ===========================================================
// EVENT MODAL
// ===========================================================

function EventModal({
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

      <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-w-lg sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div>

            <div className="flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                <CalendarDays
                  size={15}
                />
              </div>

              <p className="text-xs text-white/40">
                Calendar
              </p>

            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {editingId
                ? "Edit Event"
                : "New Event"}
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

            {/* TITLE */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Event Title
              </label>

              <input
                type="text"
                name="title"
                value={form.title}
                onChange={onChange}
                placeholder="e.g. Gym workout"
                maxLength={100}
                required
                disabled={saving}
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
              />

            </div>

            {/* DATE + TIME */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={onChange}
                  required
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />

              </div>

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Time
                </label>

                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={onChange}
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none focus:border-white/20 disabled:opacity-50"
                />

              </div>

            </div>

            {/* CATEGORY */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Category
              </label>

              <select
                name="category"
                value={
                  form.category
                }
                onChange={onChange}
                disabled={saving}
                className="w-full rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="Work">
                  Work
                </option>

                <option value="Personal">
                  Personal
                </option>

                <option value="Fitness">
                  Fitness
                </option>

                <option value="Travel">
                  Travel
                </option>

                <option value="Important">
                  Important
                </option>

                <option value="Other">
                  Other
                </option>
              </select>

            </div>

            {/* COLORS */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Event Color
              </label>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">

                {[
                  [
                    "blue",
                    "Blue",
                    "bg-blue-500",
                  ],
                  [
                    "green",
                    "Green",
                    "bg-emerald-500",
                  ],
                  [
                    "purple",
                    "Purple",
                    "bg-purple-500",
                  ],
                  [
                    "orange",
                    "Orange",
                    "bg-orange-500",
                  ],
                  [
                    "pink",
                    "Pink",
                    "bg-pink-500",
                  ],
                  [
                    "red",
                    "Red",
                    "bg-red-500",
                  ],
                ].map(
                  ([
                    value,
                    label,
                    dot,
                  ]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        onChange({
                          target: {
                            name: "color",
                            value,
                          },
                        })
                      }
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[9px] transition ${
                        form.color ===
                        value
                          ? "border-white/30 bg-white/10 text-white"
                          : "border-white/10 bg-white/[0.03] text-white/40"
                      }`}
                    >
                      <span
                        className={`h-3 w-3 rounded-full ${dot}`}
                      />

                      {label}
                    </button>
                  )
                )}

              </div>

            </div>

            {/* REPEAT */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Repeat
              </label>

              <select
                name="repeat"
                value={
                  form.repeat
                }
                onChange={onChange}
                disabled={saving}
                className="w-full rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="none">
                  Does not repeat
                </option>

                <option value="daily">
                  Every Day
                </option>

                <option value="weekdays">
                  Weekdays
                </option>

                <option value="weekly">
                  Every Week
                </option>

                <option value="monthly">
                  Every Month
                </option>
              </select>

            </div>

            {/* REMINDER */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Reminder
              </label>

              <select
                name="reminder"
                value={
                  form.reminder
                }
                onChange={onChange}
                disabled={saving}
                className="w-full rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="none">
                  No Reminder
                </option>

                <option value="5 minutes">
                  5 minutes before
                </option>

                <option value="15 minutes">
                  15 minutes before
                </option>

                <option value="30 minutes">
                  30 minutes before
                </option>

                <option value="1 hour">
                  1 hour before
                </option>

                <option value="1 day">
                  1 day before
                </option>
              </select>

              {form.reminder !==
                "none" &&
                !form.time && (
                  <p className="mt-2 text-[10px] text-orange-300/70">
                    Select an event time to enable this reminder.
                  </p>
                )}

            </div>

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Status
              </label>

              <select
                name="status"
                value={
                  form.status
                }
                onChange={onChange}
                disabled={saving}
                className="w-full rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-sm text-white outline-none"
              >
                <option value="upcoming">
                  Upcoming
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>

            </div>

            {/* LOCATION */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Location
              </label>

              <div className="relative">

                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  type="text"
                  name="location"
                  value={
                    form.location
                  }
                  onChange={onChange}
                  placeholder="e.g. Kandy Gym"
                  maxLength={150}
                  disabled={saving}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
                />

              </div>

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
                onChange={onChange}
                placeholder="Add some details..."
                rows={4}
                maxLength={500}
                disabled={saving}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/20 disabled:opacity-50"
              />

              <p className="mt-1 text-right text-[10px] text-white/20">
                {
                  form.description
                    .length
                }
                /500
              </p>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
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

    </div>
  );
}