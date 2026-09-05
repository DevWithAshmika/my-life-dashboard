import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDocsFromCache,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  Plus,
  Search,
  Check,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  Flag,
  Tag,
  Clock,
  AlertCircle,
  ListTodo,
  CheckCircle2,
  Circle,
  ArrowUpDown,
  Filter,
  Loader2,
  CheckCheck,
  Bell,
  BellOff,
} from "lucide-react";

import { db } from "../firebase/config";

import {
  scheduleNotification,
  cancelNotification,
  requestNotificationPermission,
  createNotificationChannel,
} from "../utils/notifications";

const priorities = ["low", "medium", "high"];

/* =========================================================
   LOCAL BACKUP HELPERS
========================================================= */

function getTasksBackupKey(uid) {
  return `my-dashboard-${uid}-tasks`;
}

function loadTasksBackup(uid) {
  if (!uid) return [];

  try {
    const raw = localStorage.getItem(
      getTasksBackupKey(uid)
    );

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.warn(
      "Tasks local backup read error:",
      error
    );

    return [];
  }
}

function saveTasksBackup(uid, tasks) {
  if (!uid || !Array.isArray(tasks)) {
    return;
  }

  try {
    localStorage.setItem(
      getTasksBackupKey(uid),
      JSON.stringify(tasks)
    );
  } catch (error) {
    console.warn(
      "Tasks local backup save error:",
      error
    );
  }
}

/* =========================================================
   PRIORITY CONFIG
========================================================= */

const priorityConfig = {
  low: {
    label: "Low",
    className:
      "border-blue-400/20 bg-blue-500/10 text-blue-300",
  },

  medium: {
    label: "Medium",
    className:
      "border-blue-400/20 bg-blue-500/15 text-blue-200",
  },

  high: {
    label: "High",
    className:
      "border-red-400/20 bg-red-500/10 text-red-300",
  },
};

/* =========================================================
   DATE HELPERS
========================================================= */

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();

  const localDate = new Date(
    date.getTime() - offset * 60000
  );

  return localDate
    .toISOString()
    .split("T")[0];
}

function isOverdue(task) {
  if (!task.dueDate || task.completed) {
    return false;
  }

  return task.dueDate < getToday();
}

function isDueToday(task) {
  if (!task.dueDate || task.completed) {
    return false;
  }

  return task.dueDate === getToday();
}

function formatDate(dateString) {
  if (!dateString) return "";

  try {
    return new Intl.DateTimeFormat(
      "en-LK",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    ).format(
      new Date(
        `${dateString}T00:00:00`
      )
    );
  } catch {
    return dateString;
  }
}

function createTaskReminderDate(
  dueDate,
  reminderTime
) {
  if (!dueDate) return null;

  const time =
    reminderTime || "09:00";

  const date = new Date(
    `${dueDate}T${time}:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
}

function getTaskNotificationId(taskId) {
  return `task-${taskId}`;
}

/* =========================================================
   SAFE NOTIFICATION SCHEDULING
========================================================= */

async function scheduleTaskReminderSafely({
  taskId,
  title,
  description,
  dueDate,
  reminderTime,
  reminderEnabled,
}) {
  if (
    !reminderEnabled ||
    !dueDate ||
    !reminderTime
  ) {
    return;
  }

  const reminderDate =
    createTaskReminderDate(
      dueDate,
      reminderTime
    );

  if (
    !reminderDate ||
    reminderDate.getTime() <= Date.now()
  ) {
    return;
  }

  try {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      return;
    }

    await createNotificationChannel();

    await scheduleNotification({
      id:
        getTaskNotificationId(
          taskId
        ),

      title:
        `📋 ${title}`,

      body:
        description ||
        `Don't forget to complete: ${title}`,

      date: reminderDate,

      extra: {
        type: "task",

        taskId:
          String(taskId),

        dueDate:
          String(dueDate),

        reminderTime:
          String(reminderTime),
      },
    });

    console.log(
      "Task reminder scheduled:",
      taskId
    );
  } catch (error) {
    console.warn(
      "Task reminder scheduling skipped:",
      error
    );
  }
}

/* =========================================================
   TASK PAGE
========================================================= */

export default function Tasks({ user }) {
  const [tasks, setTasks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("created");

  const [deletingId, setDeletingId] =
    useState(null);

  /* =======================================================
     FIRESTORE + OFFLINE CACHE
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setTasks([]);
      setLoading(false);
      return;
    }

    let mounted = true;

    const tasksRef =
      collection(
        db,
        "users",
        user.uid,
        "tasks"
      );

    const tasksQuery =
      query(
        tasksRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );

    /* -----------------------------------------------------
       LOAD FIRESTORE CACHE
    ----------------------------------------------------- */

    const loadCache = async () => {
      try {
        const cacheSnapshot =
          await getDocsFromCache(
            tasksQuery
          );

        if (!mounted) return;

        const cachedTasks =
          cacheSnapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          );

        if (
          cachedTasks.length > 0
        ) {
          setTasks(
            cachedTasks
          );

          saveTasksBackup(
            user.uid,
            cachedTasks
          );
        } else {
          const localBackup =
            loadTasksBackup(
              user.uid
            );

          if (
            localBackup.length > 0
          ) {
            setTasks(
              localBackup
            );
          }
        }

        setLoading(false);
      } catch (error) {
        console.warn(
          "Tasks cache load error:",
          error
        );

        if (!mounted) return;

        const localBackup =
          loadTasksBackup(
            user.uid
          );

        if (
          localBackup.length > 0
        ) {
          setTasks(
            localBackup
          );
        }

        setLoading(false);
      }
    };

    loadCache();

    /* -----------------------------------------------------
       FIRESTORE LIVE LISTENER
    ----------------------------------------------------- */

    const unsubscribe =
      onSnapshot(
        tasksQuery,
        {
          includeMetadataChanges: true,
        },
        (snapshot) => {
          if (!mounted) return;

          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          /*
            Do not destroy existing local data with
            an empty offline cached snapshot.
          */

          if (
            data.length > 0 ||
            !snapshot.metadata.fromCache
          ) {
            setTasks(data);

            saveTasksBackup(
              user.uid,
              data
            );
          }

          setLoading(false);
        },
        (error) => {
          console.error(
            "Tasks Firestore Error:",
            error
          );

          if (!mounted) return;

          const localBackup =
            loadTasksBackup(
              user.uid
            );

          if (
            localBackup.length > 0
          ) {
            setTasks(
              localBackup
            );
          }

          setLoading(false);
        }
      );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  /* =======================================================
     KEEP LOCAL BACKUP UPDATED
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) return;

    if (tasks.length > 0) {
      saveTasksBackup(
        user.uid,
        tasks
      );
    }
  }, [
    user?.uid,
    tasks,
  ]);

  /* =======================================================
     TOGGLE TASK
  ======================================================= */

  function toggleTask(task) {
    if (!user?.uid) return;

    const newCompleted =
      !task.completed;

    const previousTasks =
      tasks;

    /*
      Optimistic update.
      UI changes immediately.
    */

    const updatedTasks =
      tasks.map(
        (item) =>
          item.id === task.id
            ? {
                ...item,
                completed:
                  newCompleted,
                completedAt:
                  newCompleted
                    ? new Date().toISOString()
                    : null,
              }
            : item
      );

    setTasks(
      updatedTasks
    );

    saveTasksBackup(
      user.uid,
      updatedTasks
    );

    /*
      Firestore runs in background.
    */

    void updateDoc(
      doc(
        db,
        "users",
        user.uid,
        "tasks",
        task.id
      ),
      {
        completed:
          newCompleted,

        completedAt:
          newCompleted
            ? serverTimestamp()
            : null,
      }
    ).catch((error) => {
      console.error(
        "Toggle task Firestore error:",
        error
      );

      /*
        Restore only if Firestore genuinely
        rejects the operation.
      */

      setTasks(
        previousTasks
      );

      saveTasksBackup(
        user.uid,
        previousTasks
      );
    });

    /*
      Notification handling is completely separate.
    */

    if (newCompleted) {
      void cancelNotification(
        getTaskNotificationId(
          task.id
        )
      ).catch((error) => {
        console.warn(
          "Task notification cancellation skipped:",
          error
        );
      });

      return;
    }

    if (
      task.reminderEnabled &&
      task.dueDate &&
      task.reminderTime
    ) {
      void scheduleTaskReminderSafely({
        taskId:
          task.id,

        title:
          task.title,

        description:
          task.description,

        dueDate:
          task.dueDate,

        reminderTime:
          task.reminderTime,

        reminderEnabled:
          task.reminderEnabled,
      });
    }
  }

  /* =======================================================
     DELETE TASK
  ======================================================= */

  function deleteTask(taskId) {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Delete this task?\n\nThis action cannot be undone."
      );

    if (!confirmed) return;

    const previousTasks =
      tasks;

    /*
      Optimistic delete.
      Remove immediately.
    */

    const updatedTasks =
      tasks.filter(
        (task) =>
          task.id !== taskId
      );

    setDeletingId(taskId);

    setTasks(
      updatedTasks
    );

    saveTasksBackup(
      user.uid,
      updatedTasks
    );

    /*
      Cancel notification in background.
    */

    void cancelNotification(
      getTaskNotificationId(
        taskId
      )
    ).catch((error) => {
      console.warn(
        "Task notification cancellation skipped:",
        error
      );
    });

    /*
      Firestore delete in background.
    */

    void deleteDoc(
      doc(
        db,
        "users",
        user.uid,
        "tasks",
        taskId
      )
    ).catch((error) => {
      console.error(
        "Delete task Firestore error:",
        error
      );

      /*
        Restore task if Firestore genuinely fails.
      */

      setTasks(
        previousTasks
      );

      saveTasksBackup(
        user.uid,
        previousTasks
      );
    }).finally(() => {
      setDeletingId(null);
    });
  }

  /* =======================================================
     OPEN ADD MODAL
  ======================================================= */

  function openAddModal() {
    setEditingTask(null);
    setShowModal(true);
  }

  /* =======================================================
     OPEN EDIT MODAL
  ======================================================= */

  function openEditModal(task) {
    setEditingTask(task);
    setShowModal(true);
  }

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
  }

  /* =======================================================
     SAVE TASK
  ======================================================= */

  async function saveTask(data) {
    if (!user?.uid) {
      alert(
        "You are not logged in."
      );

      return;
    }

    const tasksRef =
      collection(
        db,
        "users",
        user.uid,
        "tasks"
      );

    /* ===================================================
       EDIT TASK
    =================================================== */

    if (editingTask) {
      const taskId =
        editingTask.id;

      const taskRef =
        doc(
          db,
          "users",
          user.uid,
          "tasks",
          taskId
        );

      const previousTask =
        editingTask;

      /*
        Create optimistic task.
      */

      const updatedTask = {
        ...previousTask,

        title:
          data.title,

        description:
          data.description,

        priority:
          data.priority,

        dueDate:
          data.dueDate,

        tags:
          data.tags,

        reminderEnabled:
          data.reminderEnabled,

        reminderTime:
          data.reminderTime,

        updatedAt:
          new Date().toISOString(),
      };

      /*
        Update UI immediately.
      */

      setTasks(
        (currentTasks) => {
          const nextTasks =
            currentTasks.map(
              (item) =>
                item.id === taskId
                  ? updatedTask
                  : item
            );

          saveTasksBackup(
            user.uid,
            nextTasks
          );

          return nextTasks;
        }
      );

      /*
        CLOSE MODAL IMMEDIATELY.

        This is the important offline fix.
      */

      closeModal();

      /*
        Firestore update runs in background.
        NO await.
      */

      void setDoc(
        taskRef,
        {
          title:
            data.title,

          description:
            data.description,

          priority:
            data.priority,

          dueDate:
            data.dueDate,

          tags:
            data.tags,

          reminderEnabled:
            data.reminderEnabled,

          reminderTime:
            data.reminderTime,

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      ).catch((error) => {
        console.error(
          "Background task update error:",
          error
        );

        /*
          Restore previous task if the
          Firestore operation genuinely fails.
        */

        setTasks(
          (currentTasks) => {
            const nextTasks =
              currentTasks.map(
                (item) =>
                  item.id === taskId
                    ? previousTask
                    : item
              );

            saveTasksBackup(
              user.uid,
              nextTasks
            );

            return nextTasks;
          }
        );
      });

      /*
        Cancel old notification in background.
      */

      void cancelNotification(
        getTaskNotificationId(
          taskId
        )
      ).catch((error) => {
        console.warn(
          "Old task notification cancellation skipped:",
          error
        );
      });

      /*
        Schedule new notification in background.
      */

      if (
        data.reminderEnabled &&
        data.dueDate &&
        data.reminderTime &&
        !editingTask.completed
      ) {
        void scheduleTaskReminderSafely({
          taskId,

          title:
            data.title,

          description:
            data.description,

          dueDate:
            data.dueDate,

          reminderTime:
            data.reminderTime,

          reminderEnabled:
            data.reminderEnabled,
        });
      }

      return;
    }

    /* ===================================================
       CREATE TASK
    =================================================== */

    /*
      Generate Firestore ID locally.
      No addDoc() wait required.
    */

    const newTaskRef =
      doc(tasksRef);

    const taskId =
      newTaskRef.id;

    /*
      Optimistic local task.
    */

    const newTask = {
      id:
        taskId,

      title:
        data.title,

      description:
        data.description,

      priority:
        data.priority,

      dueDate:
        data.dueDate,

      tags:
        data.tags,

      completed:
        false,

      completedAt:
        null,

      reminderEnabled:
        data.reminderEnabled,

      reminderTime:
        data.reminderTime,

      createdAt:
        new Date().toISOString(),
    };

    /*
      Add immediately to UI.
    */

    setTasks(
      (currentTasks) => {
        const nextTasks = [
          newTask,
          ...currentTasks,
        ];

        saveTasksBackup(
          user.uid,
          nextTasks
        );

        return nextTasks;
      }
    );

    /*
      CLOSE MODAL IMMEDIATELY.

      No Firestore await.
    */

    closeModal();

    /*
      Save to Firestore in background.

      Offline:
      Firestore local persistence keeps the write
      and syncs when connection returns.
    */

    void setDoc(
      newTaskRef,
      {
        title:
          data.title,

        description:
          data.description,

        priority:
          data.priority,

        dueDate:
          data.dueDate,

        tags:
          data.tags,

        completed:
          false,

        completedAt:
          null,

        reminderEnabled:
          data.reminderEnabled,

        reminderTime:
          data.reminderTime,

        createdAt:
          serverTimestamp(),
      }
    ).catch((error) => {
      console.error(
        "Background task create error:",
        error
      );

      /*
        Remove optimistic task only if
        Firestore genuinely rejects it.
      */

      setTasks(
        (currentTasks) => {
          const nextTasks =
            currentTasks.filter(
              (item) =>
                item.id !== taskId
            );

          saveTasksBackup(
            user.uid,
            nextTasks
          );

          return nextTasks;
        }
      );
    });

    /*
      Notification completely independent.
    */

    if (
      data.reminderEnabled &&
      data.dueDate &&
      data.reminderTime
    ) {
      void scheduleTaskReminderSafely({
        taskId,

        title:
          data.title,

        description:
          data.description,

        dueDate:
          data.dueDate,

        reminderTime:
          data.reminderTime,

        reminderEnabled:
          data.reminderEnabled,
      });
    }
  }

  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const filteredTasks =
    useMemo(() => {
      let result =
        tasks.filter(
          (task) => {
            const text = `
              ${task.title || ""}
              ${task.description || ""}
              ${
                Array.isArray(
                  task.tags
                )
                  ? task.tags.join(
                      " "
                    )
                  : ""
              }
            `.toLowerCase();

            const matchesSearch =
              text.includes(
                search.toLowerCase()
              );

            if (
              !matchesSearch
            ) {
              return false;
            }

            if (
              filter ===
              "active"
            ) {
              return !task.completed;
            }

            if (
              filter ===
              "completed"
            ) {
              return task.completed;
            }

            if (
              filter ===
              "high"
            ) {
              return (
                task.priority ===
                  "high" &&
                !task.completed
              );
            }

            if (
              filter ===
              "today"
            ) {
              return isDueToday(
                task
              );
            }

            if (
              filter ===
              "overdue"
            ) {
              return isOverdue(
                task
              );
            }

            return true;
          }
        );

      result =
        [...result].sort(
          (a, b) => {
            if (
              sortBy === "due"
            ) {
              if (
                !a.dueDate &&
                !b.dueDate
              ) {
                return 0;
              }

              if (
                !a.dueDate
              ) {
                return 1;
              }

              if (
                !b.dueDate
              ) {
                return -1;
              }

              return a.dueDate.localeCompare(
                b.dueDate
              );
            }

            if (
              sortBy ===
              "priority"
            ) {
              const values = {
                high: 3,
                medium: 2,
                low: 1,
              };

              return (
                (values[
                  b.priority
                ] || 0) -
                (values[
                  a.priority
                ] || 0)
              );
            }

            if (
              sortBy === "title"
            ) {
              return String(
                a.title || ""
              ).localeCompare(
                String(
                  b.title || ""
                )
              );
            }

            /*
              Newest.
              Firestore timestamps and local ISO strings
              can both be converted to milliseconds.
            */

            const getTime =
              (value) => {
                if (!value) return 0;

                if (
                  typeof value.toMillis ===
                  "function"
                ) {
                  return value.toMillis();
                }

                if (
                  value.seconds
                ) {
                  return (
                    value.seconds *
                    1000
                  );
                }

                const time =
                  new Date(
                    value
                  ).getTime();

                return Number.isNaN(
                  time
                )
                  ? 0
                  : time;
              };

            return (
              getTime(
                b.createdAt
              ) -
              getTime(
                a.createdAt
              )
            );
          }
        );

      return result;
    }, [
      tasks,
      search,
      filter,
      sortBy,
    ]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalCount =
    tasks.length;

  const completedCount =
    tasks.filter(
      (task) =>
        task.completed
    ).length;

  const activeCount =
    tasks.filter(
      (task) =>
        !task.completed
    ).length;

  const highCount =
    tasks.filter(
      (task) =>
        task.priority ===
          "high" &&
        !task.completed
    ).length;

  const overdueCount =
    tasks.filter((task) =>
      isOverdue(task)
    ).length;

  const todayCount =
    tasks.filter((task) =>
      isDueToday(task)
    ).length;

  const progress =
    totalCount === 0
      ? 0
      : Math.round(
          (completedCount /
            totalCount) *
            100
        );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 backdrop-blur-xl">
            <Loader2
              size={22}
              className="animate-spin text-blue-300"
            />
          </div>

          <p className="mt-4 text-sm text-white/40">
            Loading tasks...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-300">
              <ListTodo size={18} />
            </div>

            <p className="text-sm text-blue-300/70">
              Productivity
            </p>
          </div>

          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Tasks
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Organize your day and get things done.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openAddModal
          }
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* STATS */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat
          icon={
            <ListTodo size={18} />
          }
          title="Total"
          value={totalCount}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <Stat
          icon={
            <Circle size={18} />
          }
          title="Active"
          value={activeCount}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <Stat
          icon={
            <CheckCircle2
              size={18}
            />
          }
          title="Completed"
          value={completedCount}
          iconClass="bg-green-500/10 text-green-300"
        />

        <Stat
          icon={
            <Flag size={18} />
          }
          title="High Priority"
          value={highCount}
          iconClass="bg-red-500/10 text-red-300"
        />

        <Stat
          icon={
            <AlertCircle
              size={18}
            />
          }
          title="Overdue"
          value={overdueCount}
          iconClass="bg-red-500/10 text-red-300"
        />
      </div>

      {/* PROGRESS */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10 text-green-300">
              <CheckCheck
                size={19}
              />
            </div>

            <div>
              <p className="font-medium">
                Task Progress
              </p>

              <p className="mt-1 text-xs text-white/30">
                {completedCount} of{" "}
                {totalCount}{" "}
                completed
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-xl font-bold text-green-300">
              {progress}%
            </p>

            <p className="text-[10px] text-white/25">
              completed
            </p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-green-400 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* SEARCH + FILTER + SORT */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-2xl">
        <div className="flex flex-col gap-3 lg:flex-row">

          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/40"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search tasks, descriptions or tags..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.04]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter
              size={16}
              className="hidden text-blue-300/40 sm:block"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target
                    .value
                )
              }
              className="flex-1 rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none focus:border-blue-400/30 sm:flex-none"
            >
              <option value="all">
                All Tasks
              </option>

              <option value="active">
                Active
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="high">
                High Priority
              </option>

              <option value="today">
                Due Today
              </option>

              <option value="overdue">
                Overdue
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown
              size={16}
              className="hidden text-blue-300/40 sm:block"
            />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target
                    .value
                )
              }
              className="flex-1 rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none focus:border-blue-400/30 sm:flex-none"
            >
              <option value="created">
                Newest
              </option>

              <option value="due">
                Due Date
              </option>

              <option value="priority">
                Priority
              </option>

              <option value="title">
                A-Z
              </option>
            </select>
          </div>

        </div>
      </div>

      {/* QUICK FILTERS */}

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <QuickFilter
          active={
            filter === "all"
          }
          onClick={() =>
            setFilter("all")
          }
          label={`All ${totalCount}`}
          color="blue"
        />

        <QuickFilter
          active={
            filter === "active"
          }
          onClick={() =>
            setFilter("active")
          }
          label={`Active ${activeCount}`}
          color="blue"
        />

        <QuickFilter
          active={
            filter === "today"
          }
          onClick={() =>
            setFilter("today")
          }
          label={`Today ${todayCount}`}
          color="blue"
        />

        <QuickFilter
          active={
            filter === "completed"
          }
          onClick={() =>
            setFilter(
              "completed"
            )
          }
          label={`Completed ${completedCount}`}
          color="green"
        />

        <QuickFilter
          active={
            filter === "overdue"
          }
          onClick={() =>
            setFilter(
              "overdue"
            )
          }
          label={`Overdue ${overdueCount}`}
          color="red"
        />
      </div>

      {/* TASK LIST */}

      <div className="space-y-3">
        {filteredTasks.length ===
        0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] px-5 py-16 text-center backdrop-blur-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/10 bg-blue-500/10 text-blue-300/60">
              <ListTodo
                size={25}
              />
            </div>

            <p className="mt-4 font-medium">
              No tasks found
            </p>

            <p className="mt-1 text-sm text-white/30">
              Try another filter or create a new task.
            </p>

            <button
              type="button"
              onClick={
                openAddModal
              }
              className="mt-5 rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20"
            >
              Add Task
            </button>
          </div>
        ) : (
          filteredTasks.map(
            (task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() =>
                  toggleTask(
                    task
                  )
                }
                onEdit={() =>
                  openEditModal(
                    task
                  )
                }
                onDelete={() =>
                  deleteTask(
                    task.id
                  )
                }
                deleting={
                  deletingId ===
                  task.id
                }
              />
            )
          )
        )}
      </div>

      {/* MOBILE ADD BUTTON */}

      <button
        type="button"
        onClick={
          openAddModal
        }
        aria-label="Add task"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-2xl shadow-blue-500/30 transition hover:bg-blue-400 active:scale-90 sm:hidden"
      >
        <Plus
          size={25}
          strokeWidth={2.5}
        />
      </button>

      {/* MODAL */}

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={
            closeModal
          }
          onSave={saveTask}
        />
      )}
    </div>
  );
}

/* =========================================================
   STAT
========================================================= */

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

/* =========================================================
   QUICK FILTER
========================================================= */

function QuickFilter({
  active,
  onClick,
  label,
  color,
}) {
  const activeClasses = {
    blue:
      "bg-blue-500 text-white shadow-lg shadow-blue-500/20",

    green:
      "bg-green-500 text-white shadow-lg shadow-green-500/20",

    red:
      "bg-red-500 text-white shadow-lg shadow-red-500/20",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-xl px-4 py-2 text-xs font-medium transition ${
        active
          ? activeClasses[color]
          : "border border-white/10 bg-white/[0.035] text-white/45 hover:bg-white/[0.07]"
      }`}
    >
      {label}
    </button>
  );
}

/* =========================================================
   TASK CARD
========================================================= */

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  deleting,
}) {
  const overdue =
    isOverdue(task);

  const today =
    isDueToday(task);

  const priority =
    priorityConfig[
      task.priority
    ] ||
    priorityConfig.medium;

  return (
    <div
      className={`group rounded-3xl border bg-white/[0.035] p-4 shadow-lg shadow-black/5 backdrop-blur-2xl transition hover:bg-white/[0.055] ${
        overdue
          ? "border-red-400/20"
          : task.completed
          ? "border-green-400/10"
          : "border-blue-400/10"
      } ${
        task.completed
          ? "opacity-55"
          : ""
      }`}
    >
      <div className="flex gap-3">

        {/* CHECKBOX */}

        <button
          type="button"
          onClick={onToggle}
          aria-label={
            task.completed
              ? "Mark task active"
              : "Complete task"
          }
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
            task.completed
              ? "border-green-400 bg-green-500 text-white shadow-lg shadow-green-500/20"
              : "border-blue-300/20 hover:border-blue-300/50 hover:bg-blue-500/10"
          }`}
        >
          {task.completed && (
            <Check size={14} />
          )}
        </button>

        {/* CONTENT */}

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h3
              className={`font-medium ${
                task.completed
                  ? "line-through text-white/40"
                  : ""
              }`}
            >
              {task.title}
            </h3>

            <span
              className={`rounded-full border px-2 py-1 text-[10px] capitalize ${priority.className}`}
            >
              {priority.label}
            </span>

            {overdue && (
              <span className="flex items-center gap-1 rounded-full border border-red-400/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
                <AlertCircle
                  size={11}
                />
                Overdue
              </span>
            )}

            {today && (
              <span className="flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
                <Clock
                  size={11}
                />
                Today
              </span>
            )}

            {task.completed && (
              <span className="flex items-center gap-1 rounded-full border border-green-400/20 bg-green-500/10 px-2 py-1 text-[10px] text-green-300">
                <Check size={11} />
                Completed
              </span>
            )}

            {task.reminderEnabled &&
              !task.completed && (
                <span className="flex items-center gap-1 rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-1 text-[10px] text-blue-300">
                  <Bell
                    size={11}
                  />
                  Reminder
                </span>
              )}
          </div>

          {/* DESCRIPTION */}

          {task.description && (
            <p className="mt-2 text-sm leading-relaxed text-white/35">
              {task.description}
            </p>
          )}

          {/* TAGS */}

          {Array.isArray(
            task.tags
          ) &&
            task.tags.length >
              0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {task.tags.map(
                  (
                    tag,
                    index
                  ) => (
                    <span
                      key={`${tag}-${index}`}
                      className="flex items-center gap-1 rounded-lg border border-blue-400/10 bg-blue-500/[0.05] px-2 py-1 text-[10px] text-blue-200/50"
                    >
                      <Tag
                        size={10}
                      />
                      {tag}
                    </span>
                  )
                )}
              </div>
            )}

          {/* DATE */}

          {task.dueDate && (
            <div
              className={`mt-3 flex items-center gap-1.5 text-xs ${
                overdue
                  ? "text-red-300/70"
                  : today
                  ? "text-blue-300/70"
                  : task.completed
                  ? "text-green-300/50"
                  : "text-white/30"
              }`}
            >
              <CalendarDays
                size={13}
              />

              <span>
                {overdue
                  ? "Overdue:"
                  : "Due:"}{" "}
                {formatDate(
                  task.dueDate
                )}

                {task.reminderEnabled &&
                  !task.completed &&
                  task.reminderTime && (
                    <span className="ml-2 text-blue-300/50">
                      •{" "}
                      {task.reminderTime}
                    </span>
                  )}
              </span>
            </div>
          )}
        </div>

        {/* ACTIONS */}

        <div className="flex shrink-0 gap-1">

          <button
            type="button"
            onClick={onEdit}
            aria-label="Edit task"
            className="rounded-xl p-2 text-white/25 transition hover:bg-blue-500/10 hover:text-blue-300"
          >
            <Pencil
              size={15}
            />
          </button>

          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            aria-label="Delete task"
            className="rounded-xl p-2 text-white/25 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
          >
            {deleting ? (
              <Loader2
                size={15}
                className="animate-spin"
              />
            ) : (
              <Trash2
                size={15}
              />
            )}
          </button>

        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TASK MODAL
========================================================= */

function TaskModal({
  task,
  onClose,
  onSave,
}) {
  const [title, setTitle] =
    useState(
      task?.title || ""
    );

  const [description, setDescription] =
    useState(
      task?.description || ""
    );

  const [priority, setPriority] =
    useState(
      task?.priority ||
        "medium"
    );

  const [dueDate, setDueDate] =
    useState(
      task?.dueDate || ""
    );

  const [tagsText, setTagsText] =
    useState(
      Array.isArray(
        task?.tags
      )
        ? task.tags.join(
            ", "
          )
        : ""
    );

  const [reminderEnabled, setReminderEnabled] =
    useState(
      task?.reminderEnabled ===
        true
    );

  const [reminderTime, setReminderTime] =
    useState(
      task?.reminderTime ||
        "09:00"
    );

  const [saving, setSaving] =
    useState(false);

  /* =======================================================
     SUBMIT
  ======================================================= */

  async function submit(event) {
    event.preventDefault();

    if (!title.trim()) {
      alert(
        "Please enter a task title."
      );

      return;
    }

    if (
      reminderEnabled &&
      !dueDate
    ) {
      alert(
        "Please select a Due Date before enabling the reminder."
      );

      return;
    }

    if (
      reminderEnabled &&
      !reminderTime
    ) {
      alert(
        "Please select a reminder time."
      );

      return;
    }

    if (saving) {
      return;
    }

    const tags =
      tagsText
        .split(",")
        .map(
          (tag) =>
            tag.trim()
        )
        .filter(Boolean)
        .slice(0, 10);

    setSaving(true);

    try {
      /*
        onSave updates local UI immediately and
        closes the modal without waiting for
        Firestore/network.
      */

      await onSave({
        title:
          title.trim(),

        description:
          description.trim(),

        priority,

        dueDate,

        tags,

        reminderEnabled,

        reminderTime,
      });

      /*
        If the modal is still mounted for any reason,
        release saving state.
      */

      setSaving(false);
    } catch (error) {
      console.error(
        "Task modal save error:",
        error
      );

      setSaving(false);

      alert(
        "Could not save task."
      );
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center overflow-hidden bg-black/75 p-0 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:items-center sm:p-4"
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
      <div className="flex max-h-[calc(100dvh-20px)] w-full flex-col overflow-hidden rounded-t-3xl border border-blue-400/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">

        {/* HEADER */}

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                <ListTodo
                  size={15}
                />
              </div>

              <p className="text-xs text-blue-300/60">
                Productivity
              </p>
            </div>

            <h2 className="mt-2 text-xl font-semibold">
              {task
                ? "Edit Task"
                : "New Task"}
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

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-8 sm:p-6">

          <form
            onSubmit={submit}
            className="space-y-4"
          >

            {/* TITLE */}

            <div>
              <label className="mb-2 block text-xs text-white/40">
                Task
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target
                      .value
                  )
                }
                placeholder="e.g. Finish website"
                disabled={saving}
                autoFocus
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.03] disabled:opacity-50"
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
                onChange={(
                  event
                ) =>
                  setDescription(
                    event.target
                      .value
                  )
                }
                placeholder="Optional description"
                rows={3}
                disabled={saving}
                className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 disabled:opacity-50"
              />
            </div>

            {/* PRIORITY */}

            <div>
              <label className="mb-2 block text-xs text-white/40">
                Priority
              </label>

              <div className="grid grid-cols-3 gap-2">
                {priorities.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        setPriority(
                          item
                        )
                      }
                      disabled={
                        saving
                      }
                      className={`flex items-center justify-center gap-1.5 rounded-2xl border py-3 text-xs capitalize transition ${
                        priority ===
                        item
                          ? item ===
                            "high"
                            ? "border-red-400/30 bg-red-500 text-white"
                            : "border-blue-400/30 bg-blue-500 text-white"
                          : "border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/[0.07]"
                      }`}
                    >
                      <Flag
                        size={13}
                      />

                      {item}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* TAGS */}

            <div>
              <label className="mb-2 block text-xs text-white/40">
                Tags
              </label>

              <div className="relative">
                <Tag
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/30"
                />

                <input
                  type="text"
                  value={
                    tagsText
                  }
                  onChange={(
                    event
                  ) =>
                    setTagsText(
                      event.target
                        .value
                    )
                  }
                  placeholder="work, personal, urgent"
                  disabled={
                    saving
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 disabled:opacity-50"
                />
              </div>

              <p className="mt-1.5 text-[10px] text-white/20">
                Separate tags with commas.
              </p>
            </div>

            {/* DATE */}

            <div>
              <label className="mb-2 block text-xs text-white/40">
                Due Date
              </label>

              <input
                type="date"
                value={
                  dueDate
                }
                onChange={(
                  event
                ) =>
                  setDueDate(
                    event.target
                      .value
                  )
                }
                disabled={
                  saving
                }
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-blue-400/30 disabled:opacity-50"
              />
            </div>

            {/* REMINDER */}

            <div className="rounded-2xl border border-blue-400/10 bg-blue-500/[0.035] p-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                    {reminderEnabled ? (
                      <Bell
                        size={18}
                      />
                    ) : (
                      <BellOff
                        size={18}
                      />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Task Reminder
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Get a phone notification
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    setReminderEnabled(
                      (
                        value
                      ) =>
                        !value
                    )
                  }
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    reminderEnabled
                      ? "bg-blue-500"
                      : "bg-white/10"
                  }`}
                  aria-label="Toggle task reminder"
                >
                  <span
                    className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                      reminderEnabled
                        ? "translate-x-5"
                        : ""
                    }`}
                  />
                </button>

              </div>

              {reminderEnabled && (
                <div className="mt-4">

                  <label className="mb-2 block text-xs text-white/40">
                    Reminder Time
                  </label>

                  <input
                    type="time"
                    value={
                      reminderTime
                    }
                    onChange={(
                      event
                    ) =>
                      setReminderTime(
                        event
                          .target
                          .value
                      )
                    }
                    disabled={
                      saving
                    }
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-blue-400/30 disabled:opacity-50"
                  />

                  <p className="mt-2 text-[10px] text-white/20">
                    Notification will be sent on the due date at this time.
                  </p>

                </div>
              )}

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                saving
              }
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:opacity-50"
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
                  {task
                    ? "Update Task"
                    : "Create Task"}
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}