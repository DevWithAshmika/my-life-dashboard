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
  if (!dateString) return "";

  const date = new Date(
    `${dateString}T00:00:00`
  );

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

function formatTime(time) {
  if (!time) return "";

  const [hours, minutes] =
    time.split(":").map(Number);

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

function getColorClasses(color) {
  const colors = {
    blue: {
      dot: "bg-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-400/30",
      text: "text-blue-300",
      ring: "ring-blue-400/30",
    },

    green: {
      dot: "bg-green-400",
      bg: "bg-green-500/10",
      border: "border-green-400/30",
      text: "text-green-300",
      ring: "ring-green-400/30",
    },

    purple: {
      dot: "bg-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-400/30",
      text: "text-purple-300",
      ring: "ring-purple-400/30",
    },
  };

  return colors[color] || colors.blue;
}

function getCategoryColor(category) {
  const colors = {
    Work: "blue",
    Personal: "green",
    Fitness: "purple",
    Travel: "blue",
    Important: "purple",
    Other: "green",
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

  start.setDate(
    current.getDate() - day
  );

  return Array.from(
    { length: 7 },
    (_, index) => {
      const item = new Date(start);

      item.setDate(
        start.getDate() + index
      );

      return item;
    }
  );
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
// CALENDAR
// ===========================================================

export default function Calendar({ user }) {
  const [events, setEvents] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [showAnalytics, setShowAnalytics] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [view, setView] =
    useState("month");

  const today = getToday();

  const todayDate = new Date();

  const [currentDate, setCurrentDate] =
    useState(todayDate);

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
    color: "blue",
    repeat: "none",
    reminder: "none",
    status: "upcoming",
  });

  // =========================================================
  // FIRESTORE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const calendarRef = collection(
      db,
      "users",
      user.uid,
      "calendar"
    );

    const unsubscribe = onSnapshot(
      calendarRef,
      (snapshot) => {
        const data =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        data.sort((a, b) => {
          const dateA =
            `${a.date || ""} ${
              a.time || ""
            }`;

          const dateB =
            `${b.date || ""} ${
              b.time || ""
            }`;

          return dateA.localeCompare(dateB);
        });

        setEvents(data);
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
  }, [user?.uid]);

  // =========================================================
  // MONTH DAYS
  // =========================================================

  const calendarDays = useMemo(() => {
    const year =
      currentDate.getFullYear();

    const month =
      currentDate.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const daysInMonth =
      new Date(
        year,
        month + 1,
        0
      ).getDate();

    const previousMonthDays =
      new Date(
        year,
        month,
        0
      ).getDate();

    const days = [];

    for (
      let i = firstDay - 1;
      i >= 0;
      i--
    ) {
      const day =
        previousMonthDays - i;

      const previousDate =
        new Date(
          year,
          month - 1,
          day
        );

      days.push({
        day,
        date: dateToKey(
          previousDate
        ),
        currentMonth: false,
      });
    }

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const current =
        new Date(
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
      const nextDate =
        new Date(
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
        getEventStatus(event) === statusFilter;

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
        const dateA =
          `${a.date} ${a.time || ""}`;

        const dateB =
          `${b.date} ${b.time || ""}`;

        return dateA.localeCompare(dateB);
      })
      .slice(0, 6);
  }, [
    filteredEvents,
    today,
  ]);

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
    (event) =>
      event.date === today
  );

  const upcomingCount =
    events.filter(
      (event) =>
        event.date &&
        event.date >= today &&
        getEventStatus(event) !==
          "cancelled"
    ).length;

  const completedCount =
    events.filter(
      (event) =>
        getEventStatus(event) ===
        "completed"
    ).length;

  const monthEventCount =
    events.filter((event) => {
      if (!event.date) return false;

      const [
        year,
        month,
      ] =
        event.date
          .split("-")
          .map(Number);

      return (
        year ===
          currentDate.getFullYear() &&
        month ===
          currentDate.getMonth() + 1
      );
    }).length;

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
      date:
        selected || getToday(),
      time: "",
      description: "",
      location: "",
      category: "Personal",
      color: "blue",
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
      color: "blue",
      repeat: "none",
      reminder: "none",
      status: "upcoming",
    });

    setShowForm(false);
  };

  // =========================================================
  // SAVE
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
        location:
          form.location.trim(),
        category:
          form.category,
        color:
          form.color,
        repeat:
          form.repeat,
        reminder:
          form.reminder,
        status:
          form.status,
        updatedAt:
          serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "calendar",
            editingId
          ),
          eventData
        );
      } else {
        await addDoc(
          calendarRef,
          {
            ...eventData,
            createdAt:
              serverTimestamp(),
          }
        );
      }

      setSelectedDate(
        form.date
      );

      const selected =
        new Date(
          `${form.date}T00:00:00`
        );

      setCurrentDate(
        selected
      );

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
  // DELETE
  // =========================================================

  const handleDelete = async (
    id
  ) => {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this event?"
      );

    if (!confirmed) return;

    setDeletingId(id);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "calendar",
          id
        )
      );
    } catch (error) {
      console.error(
        "Calendar delete error:",
        error
      );

      alert(
        "Could not delete the event."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // STATUS UPDATE
  // =========================================================

  const updateStatus = async (
    event,
    status
  ) => {
    try {
      await updateDoc(
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
      );
    } catch (error) {
      console.error(
        "Status update error:",
        error
      );

      alert(
        "Could not update status."
      );
    }
  };

  // =========================================================
  // MAPS
  // =========================================================

  const openMaps = (
    location
  ) => {
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
  // REMINDER
  // =========================================================

  const requestNotificationPermission =
    async () => {
      if (
        !("Notification" in window)
      ) {
        alert(
          "Your browser does not support notifications."
        );
        return;
      }

      if (
        Notification.permission ===
        "granted"
      ) {
        alert(
          "Notifications are already enabled."
        );
        return;
      }

      const permission =
        await Notification.requestPermission();

      if (permission === "granted") {
        alert(
          "Calendar notifications enabled."
        );
      }
    };

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
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="flex items-center gap-2">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
              <CalendarDays
                size={18}
              />
            </div>

            <p className="text-sm text-white/40">
              Schedule
            </p>

          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Calendar
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Plan your days and manage your events.
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              setShowAnalytics(
                !showAnalytics
              )
            }
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <BarChart3
              size={17}
            />
            Analytics
          </button>

          <button
            type="button"
            onClick={
              requestNotificationPermission
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

      {/* ANALYTICS */}

      {showAnalytics && (
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <AnalyticsCard
            title="Total Events"
            value={events.length}
            icon={
              <CalendarDays
                size={18}
              />
            }
          />

          <AnalyticsCard
            title="Completed"
            value={completedCount}
            icon={
              <CheckCircle2
                size={18}
              />
            }
          />

          <AnalyticsCard
            title="Upcoming"
            value={upcomingCount}
            icon={
              <Clock size={18} />
            }
          />

          <AnalyticsCard
            title="This Month"
            value={monthEventCount}
            icon={
              <BarChart3
                size={18}
              />
            }
          />

        </div>
      )}

      {/* STATS */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <CalendarStat
          icon={
            <CalendarDays
              size={18}
            />
          }
          title="Total Events"
          value={events.length}
        />

        <CalendarStat
          icon={
            <CheckCircle2
              size={18}
            />
          }
          title="Today"
          value={todayEvents.length}
        />

        <CalendarStat
          icon={
            <Clock size={18} />
          }
          title="Upcoming"
          value={upcomingCount}
        />

        <CalendarStat
          icon={
            <List size={18}
            />
          }
          title="This Month"
          value={monthEventCount}
        />

      </div>

      {/* SEARCH + FILTERS */}

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto_auto]">

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
          value={categoryFilter}
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
          value={statusFilter}
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

      {/* VIEW SWITCHER */}

      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 sm:flex-row sm:items-center sm:justify-between">

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
                className={`rounded-lg px-4 py-2 text-xs font-medium transition ${
                  view === value
                    ? "bg-white text-black"
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
            <ChevronLeft
              size={17}
            />
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
            onClick={nextPeriod}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronRight
              size={17}
            />
          </button>

        </div>

      </div>

      {/* =====================================================
          MONTH VIEW
      ====================================================== */}

      {view === "month" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl sm:p-6">

          <div className="mb-6">

            <h2 className="text-lg font-semibold">
              {getMonthName(
                currentDate
              )}
            </h2>

            <p className="mt-1 text-xs text-white/30">
              {monthEventCount} event
              {monthEventCount !== 1
                ? "s"
                : ""}{" "}
              this month
            </p>

          </div>

          <div className="mb-2 grid grid-cols-7">

            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div
                key={day}
                className="py-2 text-center text-[10px] font-medium uppercase tracking-wider text-white/25 sm:text-xs"
              >
                {day}
              </div>
            ))}

          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-2">

            {calendarDays.map(
              (calendarDay) => {
                const dayEvents =
                  events.filter(
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

                return (
                  <button
                    key={
                      calendarDay.date
                    }
                    type="button"
                    onClick={() => {
                      setSelectedDate(
                        calendarDay.date
                      );

                      if (
                        !calendarDay.currentMonth
                      ) {
                        const selectedObj =
                          new Date(
                            `${calendarDay.date}T00:00:00`
                          );

                        setCurrentDate(
                          selectedObj
                        );
                      }
                    }}
                    className={`relative flex min-h-[72px] flex-col items-center rounded-xl border p-1.5 transition sm:min-h-[90px] sm:rounded-2xl sm:p-2 ${
                      selected
                        ? "border-white/30 bg-white/[0.10]"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.05]"
                    } ${
                      calendarDay.currentMonth
                        ? "text-white"
                        : "text-white/15"
                    }`}
                  >

                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs sm:h-8 sm:w-8 sm:text-sm ${
                        isToday
                          ? "bg-white font-bold text-black"
                          : ""
                      }`}
                    >
                      {
                        calendarDay.day
                      }
                    </span>

                    <div className="mt-1 flex max-w-full flex-wrap justify-center gap-1">

                      {dayEvents
                        .slice(
                          0,
                          3
                        )
                        .map(
                          (event) => {
                            const color =
                              getColorClasses(
                                event.color
                              );

                            return (
                              <span
                                key={
                                  event.id
                                }
                                className={`h-1.5 w-1.5 rounded-full ${color.dot}`}
                              />
                            );
                          }
                        )}

                      {dayEvents.length >
                        3 && (
                        <span className="text-[8px] text-white/40">
                          +
                          {dayEvents.length -
                            3}
                        </span>
                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </div>
      )}

      {/* =====================================================
          WEEK VIEW
      ====================================================== */}

      {view === "week" && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl">

          <h2 className="mb-5 text-lg font-semibold">
            Week Schedule
          </h2>

          <div className="grid gap-3 md:grid-cols-7">

            {weekDays.map(
              (day) => {
                const key =
                  dateToKey(day);

                const dayEvents =
                  filteredEvents.filter(
                    (event) =>
                      event.date === key
                  );

                const isToday =
                  key === today;

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
                      selectedDate === key
                        ? "border-white/30 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >

                    <div className="mb-3">

                      <p className="text-[10px] uppercase text-white/25">
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
                            ? "text-white"
                            : "text-white/70"
                        }`}
                      >
                        {day.getDate()}
                      </p>

                    </div>

                    <div className="space-y-2">

                      {dayEvents
                        .slice(0, 4)
                        .map(
                          (event) => {
                            const color =
                              getColorClasses(
                                event.color
                              );

                            return (
                              <div
                                key={
                                  event.id
                                }
                                className={`rounded-xl border p-2 ${color.bg} ${color.border}`}
                              >
                                <p className="truncate text-[11px] font-medium">
                                  {
                                    event.title
                                  }
                                </p>

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

      {/* =====================================================
          DAY VIEW
      ====================================================== */}

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

      {/* =====================================================
          SELECTED DAY
      ====================================================== */}

      {view !== "day" && (
        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

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

      {/* =====================================================
          UPCOMING
      ====================================================== */}

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

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
                    event.color
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
                    className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition ${color.border} ${color.bg}`}
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

      {/* MODAL */}

      {showForm && (
        <EventModal
          form={form}
          editingId={editingId}
          saving={saving}
          onChange={
            handleChange
          }
          onSubmit={
            handleSubmit
          }
          onClose={
            resetForm
          }
        />
      )}

      {/* MOBILE ADD */}

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
// EMPTY
// ===========================================================

function EmptyEvents({
  onAdd,
}) {
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
      event.color
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
                className={color.text}
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
                    <Clock
                      size={12}
                    />
                    {formatTime(
                      event.time
                    )}
                  </span>
                )}

                {event.repeat &&
                  event.repeat !==
                    "none" && (
                    <span className="flex items-center gap-1.5">
                      <Repeat
                        size={12}
                      />
                      {
                        event.repeat
                      }
                    </span>
                  )}

                {event.reminder &&
                  event.reminder !==
                    "none" && (
                    <span className="flex items-center gap-1.5">
                      <Bell
                        size={12}
                      />
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
              <MapPin
                size={12}
              />

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
            <Pencil
              size={15}
            />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-xl p-2 text-white/30 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
            title="Delete"
          >
            <Trash2
              size={15}
            />
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
      onMouseDown={(
        event
      ) => {
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

            {/* DATE TIME */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={
                    onChange
                  }
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
                  onChange={
                    onChange
                  }
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
                onChange={
                  onChange
                }
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

              <div className="flex gap-3">

                {[
                  [
                    "blue",
                    "Blue",
                    "bg-blue-400",
                  ],
                  [
                    "green",
                    "Green",
                    "bg-green-400",
                  ],
                  [
                    "purple",
                    "Purple",
                    "bg-purple-400",
                  ],
                ].map(
                  ([
                    value,
                    label,
                    dot,
                  ]) => (
                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        onChange({
                          target: {
                            name: "color",
                            value,
                          },
                        })
                      }
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs transition ${
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
                value={form.repeat}
                onChange={
                  onChange
                }
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
                onChange={
                  onChange
                }
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

            </div>

            {/* STATUS */}

            <div>

              <label className="mb-2 block text-xs text-white/40">
                Status
              </label>

              <select
                name="status"
                value={form.status}
                onChange={
                  onChange
                }
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
                  onChange={
                    onChange
                  }
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
                onChange={
                  onChange
                }
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