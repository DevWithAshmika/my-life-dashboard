import { useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
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
} from "lucide-react";

import { db } from "../firebase/config";

const priorities = ["low", "medium", "high"];

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
      new Date(`${dateString}T00:00:00`)
    );
  } catch {
    return dateString;
  }
}

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);

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

  // =========================================================
  // FIRESTORE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setTasks([]);
      setLoading(false);
      return;
    }

    const tasksRef = collection(
      db,
      "users",
      user.uid,
      "tasks"
    );

    const q = query(
      tasksRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data =
          snapshot.docs.map(
            (item) => ({
              id: item.id,
              ...item.data(),
            })
          );

        setTasks(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Tasks Firestore Error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // TOGGLE TASK
  // =========================================================

  async function toggleTask(task) {
    if (!user?.uid) return;

    try {
      await updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "tasks",
          task.id
        ),
        {
          completed: !task.completed,

          completedAt:
            !task.completed
              ? serverTimestamp()
              : null,
        }
      );
    } catch (error) {
      console.error(error);

      alert(
        "Could not update task."
      );
    }
  }

  // =========================================================
  // DELETE
  // =========================================================

  async function deleteTask(taskId) {
    if (!user?.uid) return;

    const confirmed =
      window.confirm(
        "Delete this task?\n\nThis action cannot be undone."
      );

    if (!confirmed) return;

    setDeletingId(taskId);

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "tasks",
          taskId
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Could not delete task."
      );
    } finally {
      setDeletingId(null);
    }
  }

  // =========================================================
  // MODALS
  // =========================================================

  function openAddModal() {
    setEditingTask(null);
    setShowModal(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setShowModal(true);
  }

  // =========================================================
  // SAVE TASK
  // =========================================================

  async function saveTask(data) {
    if (!user?.uid) {
      alert(
        "You are not logged in."
      );

      return;
    }

    try {
      const tasksRef =
        collection(
          db,
          "users",
          user.uid,
          "tasks"
        );

      if (editingTask) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "tasks",
            editingTask.id
          ),
          {
            title: data.title,
            description:
              data.description,
            priority:
              data.priority,
            dueDate:
              data.dueDate,
            tags: data.tags,
          }
        );
      } else {
        await addDoc(
          tasksRef,
          {
            title: data.title,

            description:
              data.description,

            priority:
              data.priority,

            dueDate:
              data.dueDate,

            tags: data.tags,

            completed: false,

            createdAt:
              serverTimestamp(),
          }
        );
      }

      setShowModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error(error);

      alert(
        "Could not save task."
      );
    }
  }

  // =========================================================
  // FILTER + SORT
  // =========================================================

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
                  ? task.tags.join(" ")
                  : ""
              }
            `.toLowerCase();

            const matchesSearch =
              text.includes(
                search.toLowerCase()
              );

            if (!matchesSearch) {
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
              filter === "high"
            ) {
              return (
                task.priority ===
                  "high" &&
                !task.completed
              );
            }

            if (
              filter === "today"
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

      result = [...result].sort(
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

            if (!a.dueDate) {
              return 1;
            }

            if (!b.dueDate) {
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

          return 0;
        }
      );

      return result;
    }, [
      tasks,
      search,
      filter,
      sortBy,
    ]);

  // =========================================================
  // STATISTICS
  // =========================================================

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
    tasks.filter(
      (task) =>
        isOverdue(task)
    ).length;

  const todayCount =
    tasks.filter(
      (task) =>
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

  // =========================================================
  // LOADING
  // =========================================================

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

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-24 text-white sm:pb-0">

      {/* =====================================================
          HEADER
      ====================================================== */}

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
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Task
        </button>

      </div>

      {/* =====================================================
          STATS
      ====================================================== */}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">

        <Stat
          icon={
            <ListTodo
              size={18}
            />
          }
          title="Total"
          value={totalCount}
          iconClass="bg-blue-500/10 text-blue-300"
        />

        <Stat
          icon={
            <Circle
              size={18}
            />
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
            <Flag
              size={18}
            />
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

      {/* =====================================================
          PROGRESS
      ====================================================== */}

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
                {totalCount} completed
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

      {/* =====================================================
          SEARCH
      ====================================================== */}

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
                  event.target.value
                )
              }
              placeholder="Search tasks, descriptions or tags..."
              className="w-full rounded-2xl border border-white/10 bg-white/[0.045] py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-white/20 focus:border-blue-400/30 focus:bg-blue-500/[0.04]"
            />

          </div>

          {/* FILTER */}

          <div className="flex items-center gap-2">

            <Filter
              size={16}
              className="hidden text-blue-300/40 sm:block"
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value
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

          {/* SORT */}

          <div className="flex items-center gap-2">

            <ArrowUpDown
              size={16}
              className="hidden text-blue-300/40 sm:block"
            />

            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(
                  event.target.value
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

      {/* =====================================================
          QUICK FILTERS
      ====================================================== */}

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

      {/* =====================================================
          TASK LIST
      ====================================================== */}

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

      {/* =====================================================
          MOBILE ADD BUTTON
      ====================================================== */}

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

      {/* =====================================================
          MODAL
      ====================================================== */}

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(
              null
            );
          }}
          onSave={saveTask}
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
   QUICK FILTER
=========================================================== */

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


/* ===========================================================
   TASK CARD
=========================================================== */

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
            <Check
              size={14}
            />
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
                <Check
                  size={11}
                />
                Completed
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


/* ===========================================================
   TASK MODAL
=========================================================== */

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
      task?.description ||
        ""
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

  const [saving, setSaving] =
    useState(false);

  async function submit(
    event
  ) {
    event.preventDefault();

    if (!title.trim()) {
      alert(
        "Please enter a task title."
      );

      return;
    }

    const tags =
      tagsText
        .split(",")
        .map((tag) =>
          tag.trim()
        )
        .filter(Boolean)
        .slice(0, 10);

    setSaving(true);

    try {
      await onSave({
        title:
          title.trim(),

        description:
          description.trim(),

        priority,

        dueDate,

        tags,
      });
    } finally {
      setSaving(false);
    }
  }

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

      <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-blue-400/10 bg-[#101010]/95 shadow-2xl backdrop-blur-2xl sm:max-w-lg sm:rounded-3xl">

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
            <X
              size={18}
            />
          </button>

        </div>

        {/* FORM */}

        <div className="overflow-y-auto p-5 sm:p-6">

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
                onChange={(
                  event
                ) =>
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
                      disabled={saving}
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
                  disabled={saving}
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
                disabled={saving}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm outline-none focus:border-blue-400/30 disabled:opacity-50"
              />

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={saving}
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