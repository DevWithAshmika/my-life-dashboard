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
} from "lucide-react";

import { db } from "../firebase/config";

const priorities = [
  "low",
  "medium",
  "high",
];

export default function Tasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  useEffect(() => {
    if (!user?.uid) {
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
        const data = snapshot.docs.map(
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

    return unsubscribe;
  }, [user]);

  async function toggleTask(task) {
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
          completedAt: !task.completed
            ? serverTimestamp()
            : null,
        }
      );
    } catch (error) {
      console.error(error);
      alert("Could not update task.");
    }
  }

  async function deleteTask(taskId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

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
      alert("Could not delete task.");
    }
  }

  function openAddModal() {
    setEditingTask(null);
    setShowModal(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setShowModal(true);
  }

  async function saveTask(data) {
    try {
      const tasksRef = collection(
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
            description: data.description,
            priority: data.priority,
            dueDate: data.dueDate,
          }
        );
      } else {
        await addDoc(tasksRef, {
          title: data.title,
          description: data.description,
          priority: data.priority,
          dueDate: data.dueDate,
          completed: false,
          createdAt: serverTimestamp(),
        });
      }

      setShowModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error(error);
      alert("Could not save task.");
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const text =
        `${task.title || ""} ${
          task.description || ""
        }`.toLowerCase();

      const matchesSearch =
        text.includes(
          search.toLowerCase()
        );

      if (filter === "active") {
        return (
          matchesSearch &&
          !task.completed
        );
      }

      if (filter === "completed") {
        return (
          matchesSearch &&
          task.completed
        );
      }

      if (filter === "high") {
        return (
          matchesSearch &&
          task.priority === "high" &&
          !task.completed
        );
      }

      return matchesSearch;
    });
  }, [tasks, search, filter]);

  const completedCount =
    tasks.filter(
      (task) => task.completed
    ).length;

  const activeCount =
    tasks.filter(
      (task) => !task.completed
    ).length;

  const progress =
    tasks.length === 0
      ? 0
      : Math.round(
          (completedCount /
            tasks.length) *
            100
        );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">

          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="mt-4 text-sm text-white/40">
            Loading tasks...
          </p>

        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

        <div>
          <p className="text-sm text-white/40">
            Productivity
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Tasks
          </h1>

          <p className="mt-2 text-sm text-white/30">
            Organize your day and get things done.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black"
        >
          <Plus size={18} />
          Add Task
        </button>

      </div>

      {/* Stats */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <Stat
          title="Total"
          value={tasks.length}
        />

        <Stat
          title="Active"
          value={activeCount}
        />

        <Stat
          title="Completed"
          value={completedCount}
        />

        <Stat
          title="Progress"
          value={`${progress}%`}
        />

      </div>

      {/* Progress */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">

        <div className="flex items-center justify-between">

          <div>
            <p className="font-medium">
              Task Progress
            </p>

            <p className="mt-1 text-xs text-white/30">
              {completedCount} of{" "}
              {tasks.length} completed
            </p>
          </div>

          <span className="font-semibold">
            {progress}%
          </span>

        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">

          <div
            className="h-full rounded-full bg-white transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      </div>

      {/* Search + Filter */}

      <div className="flex flex-col gap-3 sm:flex-row">

        <div className="relative flex-1">

          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search tasks..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-white/25"
          />

        </div>

        <select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value)
          }
          className="rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm outline-none"
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
        </select>

      </div>

      {/* Task List */}

      <div className="space-y-3">

        {filteredTasks.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-16 text-center">

            <p className="text-sm text-white/30">
              No tasks found.
            </p>

            <button
              type="button"
              onClick={openAddModal}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black"
            >
              Add your first task
            </button>

          </div>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() =>
                toggleTask(task)
              }
              onEdit={() =>
                openEditModal(task)
              }
              onDelete={() =>
                deleteTask(task.id)
              }
            />
          ))
        )}

      </div>

      {/* Modal */}

      {showModal && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setShowModal(false);
            setEditingTask(null);
          }}
          onSave={saveTask}
        />
      )}

    </div>
  );
}


/* STAT */

function Stat({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">

      <p className="text-xs text-white/35">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold">
        {value}
      </p>

    </div>
  );
}


/* TASK CARD */

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}) {
  const priorityClass = {
    low: "bg-white/5 text-white/40",
    medium: "bg-white/10 text-white/60",
    high: "bg-white/15 text-white",
  };

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-4 ${
        task.completed
          ? "opacity-50"
          : ""
      }`}
    >

      <div className="flex gap-3">

        {/* Checkbox */}

        <button
          type="button"
          onClick={onToggle}
          className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            task.completed
              ? "border-white bg-white text-black"
              : "border-white/20"
          }`}
        >
          {task.completed && (
            <Check size={14} />
          )}
        </button>

        {/* Content */}

        <div className="min-w-0 flex-1">

          <div className="flex flex-wrap items-center gap-2">

            <h3
              className={`font-medium ${
                task.completed
                  ? "line-through"
                  : ""
              }`}
            >
              {task.title}
            </h3>

            <span
              className={`rounded-full px-2 py-1 text-[10px] capitalize ${
                priorityClass[
                  task.priority
                ]
              }`}
            >
              {task.priority}
            </span>

          </div>

          {task.description && (
            <p className="mt-2 text-sm text-white/35">
              {task.description}
            </p>
          )}

          {task.dueDate && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-white/30">

              <CalendarDays size={13} />

              Due: {task.dueDate}

            </div>
          )}

        </div>

        {/* Buttons */}

        <div className="flex shrink-0 gap-1">

          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-white/30 hover:bg-white/10 hover:text-white"
          >
            <Pencil size={15} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg p-2 text-white/30 hover:bg-white/10 hover:text-white"
          >
            <Trash2 size={15} />
          </button>

        </div>

      </div>

    </div>
  );
}


/* MODAL */

function TaskModal({
  task,
  onClose,
  onSave,
}) {
  const [title, setTitle] =
    useState(task?.title || "");

  const [description, setDescription] =
    useState(
      task?.description || ""
    );

  const [priority, setPriority] =
    useState(
      task?.priority || "medium"
    );

  const [dueDate, setDueDate] =
    useState(task?.dueDate || "");

  function submit(event) {
    event.preventDefault();

    if (!title.trim()) {
      alert("Please enter a task title.");
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      priority,
      dueDate,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#111] p-6 shadow-2xl">

        {/* Header */}

        <div className="mb-6 flex items-center justify-between">

          <div>
            <h2 className="text-xl font-semibold">
              {task
                ? "Edit Task"
                : "New Task"}
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Add your task details.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 hover:bg-white/10"
          >
            <X size={19} />
          </button>

        </div>

        <form
          onSubmit={submit}
          className="space-y-4"
        >

          {/* Title */}

          <div>
            <label className="mb-2 block text-xs text-white/40">
              Task
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Finish website"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20"
            />
          </div>

          {/* Description */}

          <div>
            <label className="mb-2 block text-xs text-white/40">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Optional description"
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/20"
            />
          </div>

          {/* Priority */}

          <div>
            <label className="mb-2 block text-xs text-white/40">
              Priority
            </label>

            <div className="grid grid-cols-3 gap-2">

              {priorities.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    setPriority(item)
                  }
                  className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs capitalize ${
                    priority === item
                      ? "bg-white text-black"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  <Flag size={13} />
                  {item}
                </button>
              ))}

            </div>
          </div>

          {/* Date */}

          <div>
            <label className="mb-2 block text-xs text-white/40">
              Due Date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(event) =>
                setDueDate(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none"
            />
          </div>

          {/* Submit */}

          <button
            type="submit"
            className="w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-black"
          >
            {task
              ? "Update Task"
              : "Create Task"}
          </button>

        </form>

      </div>

    </div>
  );
}