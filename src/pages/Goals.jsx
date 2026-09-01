import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Target,
  Pencil,
  Trash2,
  Search,
  X,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Wallet,
  ArrowUpRight,
} from "lucide-react";

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

import { db } from "../firebase/config";
import Loading from "../components/Loading";

const CATEGORIES = [
  "Savings",
  "Travel",
  "Education",
  "Vehicle",
  "Technology",
  "Home",
  "Fitness",
  "Other",
];

export default function Goals({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    targetAmount: "",
    currentAmount: "",
    deadline: "",
    category: "Savings",
  });

  // =========================================================
  // FIRESTORE LIVE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setGoals([]);
      setLoading(false);
      return;
    }

    const goalsRef = collection(
      db,
      "users",
      user.uid,
      "goals"
    );

    const goalsQuery = query(
      goalsRef,
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      goalsQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setGoals(data);
        setLoading(false);
      },
      (error) => {
        console.error("Goals Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredGoals = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return goals;
    }

    return goals.filter((goal) =>
      `${goal.title || ""} ${goal.category || ""} ${
        goal.description || ""
      }`
        .toLowerCase()
        .includes(value)
    );
  }, [goals, search]);

  // =========================================================
  // STATISTICS
  // =========================================================

  const statistics = useMemo(() => {
    const total = goals.length;

    const completed = goals.filter(
      (goal) => getProgress(goal) >= 100
    ).length;

    const active = goals.filter(
      (goal) => getProgress(goal) < 100
    ).length;

    const target = goals.reduce(
      (sum, goal) =>
        sum + Number(goal.targetAmount || 0),
      0
    );

    const saved = goals.reduce(
      (sum, goal) =>
        sum + Number(goal.currentAmount || 0),
      0
    );

    return {
      total,
      completed,
      active,
      target,
      saved,
    };
  }, [goals]);

  // =========================================================
  // FORM
  // =========================================================

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      targetAmount: "",
      currentAmount: "",
      deadline: "",
      category: "Savings",
    });

    setEditingGoal(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);

    setForm({
      title: goal.title || "",
      description: goal.description || "",
      targetAmount: goal.targetAmount ?? "",
      currentAmount: goal.currentAmount ?? "",
      deadline: goal.deadline || "",
      category: goal.category || "Savings",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =========================================================
  // SAVE
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!user?.uid) {
      alert("Please login first.");
      return;
    }

    const title = form.title.trim();

    const targetAmount = Number(
      form.targetAmount
    );

    const currentAmount = Number(
      form.currentAmount || 0
    );

    if (!title) {
      alert("Please enter a goal name.");
      return;
    }

    if (
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      alert("Please enter a valid target amount.");
      return;
    }

    if (
      !Number.isFinite(currentAmount) ||
      currentAmount < 0
    ) {
      alert("Please enter a valid current amount.");
      return;
    }

    try {
      const goalData = {
        title,
        description: form.description.trim(),
        targetAmount,
        currentAmount,
        deadline: form.deadline || "",
        category: form.category || "Other",
        updatedAt: serverTimestamp(),
      };

      if (editingGoal) {
        const goalRef = doc(
          db,
          "users",
          user.uid,
          "goals",
          editingGoal.id
        );

        await updateDoc(goalRef, goalData);
      } else {
        await addDoc(
          collection(
            db,
            "users",
            user.uid,
            "goals"
          ),
          {
            ...goalData,
            createdAt: serverTimestamp(),
          }
        );
      }

      closeModal();
    } catch (error) {
      console.error("Saving goal failed:", error);

      alert(
        "Could not save the goal. Check Firebase."
      );
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (goal) => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      `Delete "${goal.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "goals",
          goal.id
        )
      );
    } catch (error) {
      console.error(
        "Delete goal failed:",
        error
      );

      alert("Could not delete the goal.");
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading text="Loading goals..." />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

        <div>
          <p className="mb-1 text-sm text-blue-400/70">
            Personal targets
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Goals
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Set targets and track your progress.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
        >
          <Plus size={18} />
          Add Goal
        </button>

      </div>

      {/* STATISTICS */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={<Target size={20} />}
          title="Total Goals"
          value={statistics.total}
          color="blue"
        />

        <StatCard
          icon={<Clock3 size={20} />}
          title="Active Goals"
          value={statistics.active}
          color="blue"
        />

        <StatCard
          icon={<CheckCircle2 size={20} />}
          title="Completed"
          value={statistics.completed}
          color="green"
        />

        <StatCard
          icon={<Wallet size={20} />}
          title="Total Saved"
          value={`Rs. ${statistics.saved.toLocaleString()}`}
          color="green"
        />

      </div>

      {/* SEARCH */}

      <div className="mb-6">

        <div className="relative">

          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/40"
          />

          <input
            type="text"
            placeholder="Search goals..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 transition focus:border-blue-400/40 focus:bg-blue-500/[0.03]"
          />

        </div>

      </div>

      {/* GOALS */}

      {filteredGoals.length === 0 ? (

        <EmptyGoals
          search={search}
          onAdd={openAddModal}
        />

      ) : (

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() =>
                openEditModal(goal)
              }
              onDelete={() =>
                handleDelete(goal)
              }
            />
          ))}

        </div>

      )}

      {/* MODAL */}

      {showModal && (
        <GoalModal
          form={form}
          editingGoal={editingGoal}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}

    </div>
  );
}

// ===========================================================
// GOAL CARD
// ===========================================================

function GoalCard({
  goal,
  onEdit,
  onDelete,
}) {
  const progress = getProgress(goal);
  const completed = progress >= 100;

  const target = Number(
    goal.targetAmount || 0
  );

  const current = Number(
    goal.currentAmount || 0
  );

  const remaining = Math.max(
    target - current,
    0
  );

  const deadlineInfo =
    getDeadlineInfo(goal.deadline);

  const isOverdue =
    !completed &&
    deadlineInfo?.overdue;

  const theme = completed
    ? {
        border:
          "border-green-400/20 hover:border-green-400/40",
        icon:
          "bg-green-500/10 text-green-400",
        progress:
          "bg-green-400",
        amount:
          "text-green-400",
      }
    : isOverdue
    ? {
        border:
          "border-red-400/20 hover:border-red-400/40",
        icon:
          "bg-red-500/10 text-red-400",
        progress:
          "bg-red-400",
        amount:
          "text-red-400",
      }
    : {
        border:
          "border-blue-400/20 hover:border-blue-400/40",
        icon:
          "bg-blue-500/10 text-blue-400",
        progress:
          "bg-blue-400",
        amount:
          "text-blue-400",
      };

  return (
    <div
      className={`group rounded-3xl border bg-white/[0.04] p-5 backdrop-blur-xl transition ${theme.border}`}
    >

      {/* TOP */}

      <div className="mb-5 flex items-start justify-between gap-4">

        <div className="flex min-w-0 items-start gap-3">

          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${theme.icon}`}
          >
            <Target size={20} />
          </div>

          <div className="min-w-0">

            <h3 className="truncate font-semibold">
              {goal.title}
            </h3>

            <p className="mt-1 text-xs text-white/30">
              {goal.category || "Other"}
            </p>

          </div>

        </div>

        <div className="flex shrink-0 gap-1">

          <button
            onClick={onEdit}
            className="rounded-xl p-2 text-white/40 transition hover:bg-blue-500/10 hover:text-blue-400"
            title="Edit"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={onDelete}
            className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>

        </div>

      </div>

      {/* DESCRIPTION */}

      {goal.description && (
        <p className="mb-5 line-clamp-2 text-sm leading-6 text-white/40">
          {goal.description}
        </p>
      )}

      {/* AMOUNT */}

      <div className="mb-3 flex items-end justify-between">

        <div>
          <p className="text-xs text-white/30">
            Progress
          </p>

          <p
            className={`mt-1 text-lg font-bold ${theme.amount}`}
          >
            Rs. {current.toLocaleString()}
          </p>

        </div>

        <div className="text-right">

          <p className="text-xs text-white/30">
            Target
          </p>

          <p className="mt-1 text-sm font-medium">
            Rs. {target.toLocaleString()}
          </p>

        </div>

      </div>

      {/* PROGRESS */}

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">

        <div
          className={`h-full rounded-full transition-all duration-500 ${theme.progress}`}
          style={{
            width: `${Math.min(
              progress,
              100
            )}%`,
          }}
        />

      </div>

      <div className="mb-5 flex items-center justify-between text-xs">

        <span
          className={theme.amount}
        >
          {progress}%
        </span>

        <span className="text-white/30">
          Rs. {remaining.toLocaleString()} remaining
        </span>

      </div>

      {/* STATUS */}

      <div className="flex items-center justify-between border-t border-white/10 pt-4">

        <StatusBadge
          progress={progress}
          deadlineInfo={deadlineInfo}
        />

        {goal.deadline && (
          <div className="text-right">

            <p className="text-[10px] uppercase tracking-wider text-white/20">
              Deadline
            </p>

            <p
              className={`mt-1 text-xs ${
                isOverdue
                  ? "text-red-400"
                  : "text-white/50"
              }`}
            >
              {formatDate(goal.deadline)}
            </p>

          </div>
        )}

      </div>

    </div>
  );
}

// ===========================================================
// STATUS
// ===========================================================

function StatusBadge({
  progress,
  deadlineInfo,
}) {
  if (progress >= 100) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-green-500/10 px-3 py-2 text-xs text-green-400">
        <CheckCircle2 size={14} />
        Completed
      </div>
    );
  }

  if (
    deadlineInfo &&
    deadlineInfo.overdue
  ) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400">
        <AlertCircle size={14} />
        Overdue
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-3 py-2 text-xs text-blue-400">
      <Clock3 size={14} />
      In Progress
    </div>
  );
}

// ===========================================================
// MODAL
// ===========================================================

function GoalModal({
  form,
  editingGoal,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-blue-400/10 bg-[#111] p-6 shadow-2xl">

        {/* MODAL HEADER */}

        <div className="mb-6 flex items-center justify-between">

          <div>

            <h2 className="text-xl font-bold">
              {editingGoal
                ? "Edit Goal"
                : "Create Goal"}
            </h2>

            <p className="mt-1 text-xs text-white/30">
              {editingGoal
                ? "Update your goal."
                : "Set a new personal target."}
            </p>

          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <X size={20} />
          </button>

        </div>

        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="space-y-4"
        >

          <Input
            label="Goal Name"
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="e.g. New Camera"
            required
          />

          <div>

            <label className="mb-2 block text-xs text-white/50">
              Description
            </label>

            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              placeholder="What is this goal for?"
              rows={3}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-blue-400/40"
            />

          </div>

          <div className="grid gap-4 sm:grid-cols-2">

            <Input
              label="Target Amount"
              name="targetAmount"
              type="number"
              min="0"
              value={form.targetAmount}
              onChange={onChange}
              placeholder="100000"
              required
            />

            <Input
              label="Current Amount"
              name="currentAmount"
              type="number"
              min="0"
              value={form.currentAmount}
              onChange={onChange}
              placeholder="0"
            />

          </div>

          <div>

            <label className="mb-2 block text-xs text-white/50">
              Category
            </label>

            <select
              name="category"
              value={form.category}
              onChange={onChange}
              className="w-full rounded-2xl border border-white/10 bg-[#171717] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/40"
            >

              {CATEGORIES.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}

            </select>

          </div>

          <div>

            <label className="mb-2 block text-xs text-white/50">
              Deadline
            </label>

            <input
              type="date"
              name="deadline"
              value={form.deadline}
              onChange={onChange}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-blue-400/40"
            />

          </div>

          <div className="flex gap-3 pt-3">

            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
            >
              {editingGoal
                ? "Save Changes"
                : "Create Goal"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

// ===========================================================
// INPUT
// ===========================================================

function Input({
  label,
  ...props
}) {
  return (
    <div>

      <label className="mb-2 block text-xs text-white/50">
        {label}
      </label>

      <input
        {...props}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 transition focus:border-blue-400/40"
      />

    </div>
  );
}

// ===========================================================
// STAT CARD
// ===========================================================

function StatCard({
  icon,
  title,
  value,
  color = "blue",
}) {
  const colors = {
    blue: {
      icon: "bg-blue-500/10 text-blue-400",
      border:
        "border-blue-400/10 hover:border-blue-400/30",
      value: "text-blue-400",
    },

    green: {
      icon: "bg-green-500/10 text-green-400",
      border:
        "border-green-400/10 hover:border-green-400/30",
      value: "text-green-400",
    },

    red: {
      icon: "bg-red-500/10 text-red-400",
      border:
        "border-red-400/10 hover:border-red-400/30",
      value: "text-red-400",
    },
  };

  const theme =
    colors[color] || colors.blue;

  return (
    <div
      className={`rounded-3xl border bg-white/[0.04] p-5 backdrop-blur-xl transition ${theme.border}`}
    >

      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${theme.icon}`}
      >
        {icon}
      </div>

      <p className="text-sm text-white/40">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${theme.value}`}
      >
        {value}
      </p>

    </div>
  );
}

// ===========================================================
// EMPTY
// ===========================================================

function EmptyGoals({
  search,
  onAdd,
}) {
  return (
    <div className="rounded-3xl border border-dashed border-blue-400/10 bg-white/[0.02] px-6 py-16 text-center">

      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
        <Target size={24} />
      </div>

      <h3 className="font-semibold">
        {search
          ? "No goals found"
          : "No goals yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm text-white/30">
        {search
          ? "Try a different search."
          : "Create your first goal and start tracking your progress."}
      </p>

      {!search && (
        <button
          onClick={onAdd}
          className="mt-5 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400"
        >
          Create Goal
        </button>
      )}

    </div>
  );
}

// ===========================================================
// HELPERS
// ===========================================================

function getProgress(goal) {
  const target = Number(
    goal.targetAmount || 0
  );

  const current = Number(
    goal.currentAmount || 0
  );

  if (target <= 0) {
    return 0;
  }

  return Math.round(
    (current / target) * 100
  );
}

function formatDate(date) {
  if (!date) return "";

  const value = new Date(
    `${date}T00:00:00`
  );

  if (Number.isNaN(value.getTime())) {
    return date;
  }

  return value.toLocaleDateString(
    "en-US",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getDeadlineInfo(deadline) {
  if (!deadline) return null;

  const deadlineDate = new Date(
    `${deadline}T23:59:59`
  );

  if (Number.isNaN(deadlineDate.getTime())) {
    return null;
  }

  return {
    overdue:
      deadlineDate.getTime() <
      Date.now(),
  };
}