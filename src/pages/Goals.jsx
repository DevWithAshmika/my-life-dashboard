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
  ChevronDown,
  Bell,
  BellOff,
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

import {
  scheduleGoalNotification,
  cancelGoalNotification,
} from "../utils/notifications";

// ===========================================================
// CURRENCIES
// ===========================================================

const CURRENCIES = {
  LKR: {
    symbol: "Rs.",
    code: "LKR",
    locale: "en-LK",
  },

  USD: {
    symbol: "$",
    code: "USD",
    locale: "en-US",
  },

  EUR: {
    symbol: "€",
    code: "EUR",
    locale: "de-DE",
  },

  GBP: {
    symbol: "£",
    code: "GBP",
    locale: "en-GB",
  },
};

// ===========================================================
// CATEGORIES
// ===========================================================

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

// ===========================================================
// DEFAULT FORM
// ===========================================================

const getDefaultForm = () => ({
  title: "",
  description: "",
  targetAmount: "",
  currentAmount: "",
  deadline: "",
  category: "Savings",
  reminderEnabled: false,
  reminderTime: "09:00",
});

// ===========================================================
// GOALS
// ===========================================================

export default function Goals({ user }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currency, setCurrency] = useState("LKR");

  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [form, setForm] = useState(
    getDefaultForm()
  );

  // =========================================================
  // CURRENT CURRENCY
  // =========================================================

  const currentCurrency =
    CURRENCIES[currency] || CURRENCIES.LKR;

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  const formatMoney = (amount) => {
    const value = Number(amount || 0);

    try {
      return new Intl.NumberFormat(
        currentCurrency.locale,
        {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }
      ).format(value);
    } catch {
      return value.toLocaleString();
    }
  };

  const money = (amount) => {
    return `${currentCurrency.symbol} ${formatMoney(
      amount
    )}`;
  };

  // =========================================================
  // FIRESTORE GOALS
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

    const unsubscribe = onSnapshot(
      goalsRef,
      (snapshot) => {
        const data = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        data.sort((a, b) => {
          return (
            getTimestampValue(b.createdAt) -
            getTimestampValue(a.createdAt)
          );
        });

        setGoals(data);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Goals Firestore error:",
          error
        );

        setGoals([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // LOAD CURRENCY
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setCurrency("LKR");
      return;
    }

    const settingsRef = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCurrency("LKR");
          return;
        }

        const data = snapshot.data();

        if (
          data.currency &&
          CURRENCIES[data.currency]
        ) {
          setCurrency(data.currency);
        } else {
          setCurrency("LKR");
        }
      },
      (error) => {
        console.error(
          "Goals currency settings error:",
          error
        );

        setCurrency("LKR");
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // FILTER
  // =========================================================

  const filteredGoals = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return goals;
    }

    return goals.filter((goal) => {
      const searchableText = [
        goal.title,
        goal.category,
        goal.description,
        goal.deadline,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(value);
    });
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
  // RESET
  // =========================================================

  const resetForm = () => {
    setForm(getDefaultForm());
    setEditingGoal(null);
  };

  // =========================================================
  // ADD
  // =========================================================

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // =========================================================
  // EDIT
  // =========================================================

  const openEditModal = (goal) => {
    setEditingGoal(goal);

    setForm({
      title: goal.title || "",
      description: goal.description || "",
      targetAmount: goal.targetAmount ?? "",
      currentAmount: goal.currentAmount ?? "",
      deadline: goal.deadline || "",
      category: goal.category || "Savings",
      reminderEnabled:
        goal.reminderEnabled === true,
      reminderTime:
        goal.reminderTime || "09:00",
    });

    setShowModal(true);
  };

  // =========================================================
  // CLOSE
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  // =========================================================
  // CHANGE
  // =========================================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
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

    const targetAmount =
      Number(form.targetAmount);

    const currentAmount =
      Number(form.currentAmount || 0);

    if (!title) {
      alert("Please enter a goal name.");
      return;
    }

    if (
      !Number.isFinite(targetAmount) ||
      targetAmount <= 0
    ) {
      alert(
        "Please enter a valid target amount."
      );
      return;
    }

    if (
      !Number.isFinite(currentAmount) ||
      currentAmount < 0
    ) {
      alert(
        "Please enter a valid current amount."
      );
      return;
    }

    if (
      form.reminderEnabled &&
      !form.deadline
    ) {
      alert(
        "Please select a deadline before enabling the reminder."
      );
      return;
    }

    if (
      form.reminderEnabled &&
      !form.reminderTime
    ) {
      alert(
        "Please select a reminder time."
      );
      return;
    }

    setSaving(true);

    try {
      const completed =
        currentAmount >= targetAmount;

      const goalData = {
        title,
        description:
          form.description.trim(),
        targetAmount,
        currentAmount,
        deadline:
          form.deadline || "",
        category:
          form.category || "Other",

        reminderEnabled:
          form.reminderEnabled && !completed,

        reminderTime:
          form.reminderTime || "09:00",

        updatedAt:
          serverTimestamp(),
      };

      // =====================================================
      // UPDATE
      // =====================================================

      if (editingGoal) {
        const goalRef = doc(
          db,
          "users",
          user.uid,
          "goals",
          editingGoal.id
        );

        await updateDoc(
          goalRef,
          goalData
        );

        await cancelGoalNotification(
          editingGoal.id
        );

        if (
          goalData.reminderEnabled &&
          goalData.deadline
        ) {
          await scheduleGoalNotification({
            id: editingGoal.id,
            title: goalData.title,
            deadline: goalData.deadline,
            reminderTime:
              goalData.reminderTime,
          });
        }
      }

      // =====================================================
      // CREATE
      // =====================================================

      else {
        const newGoal = await addDoc(
          collection(
            db,
            "users",
            user.uid,
            "goals"
          ),
          {
            ...goalData,
            createdAt:
              serverTimestamp(),
          }
        );

        if (
          goalData.reminderEnabled &&
          goalData.deadline
        ) {
          await scheduleGoalNotification({
            id: newGoal.id,
            title: goalData.title,
            deadline: goalData.deadline,
            reminderTime:
              goalData.reminderTime,
          });
        }
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error(
        "Saving goal failed:",
        error
      );

      alert(
        "Could not save the goal."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete = async (goal) => {
    if (!user?.uid) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${goal.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await cancelGoalNotification(
        goal.id
      );

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

      alert(
        "Could not delete the goal."
      );
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading
        text="Loading goals..."
      />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-28 text-white sm:pb-0">

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
          type="button"
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.98]"
        >
          <Plus size={18} />
          Add Goal
        </button>

      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 backdrop-blur-xl">

        <div>
          <p className="text-xs text-white/30">
            Current Currency
          </p>

          <p className="mt-1 text-sm font-semibold text-white">
            {currentCurrency.code}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07] text-sm font-semibold text-white/70">
          {currentCurrency.symbol}
        </div>

      </div>

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
          value={money(statistics.saved)}
          color="green"
        />

      </div>

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
              money={money}
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

      {showModal && (
        <GoalModal
          form={form}
          editingGoal={editingGoal}
          saving={saving}
          currency={currentCurrency}
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
  money,
  onEdit,
  onDelete,
}) {
  const progress = getProgress(goal);

  const completed =
    progress >= 100;

  const target =
    Number(goal.targetAmount || 0);

  const current =
    Number(goal.currentAmount || 0);

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
            type="button"
            onClick={onEdit}
            className="rounded-xl p-2 text-white/40 transition hover:bg-blue-500/10 hover:text-blue-400"
            title="Edit"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>

        </div>

      </div>

      {goal.description && (
        <p className="mb-5 line-clamp-2 text-sm leading-6 text-white/40">
          {goal.description}
        </p>
      )}

      <div className="mb-3 flex items-end justify-between gap-4">

        <div className="min-w-0">

          <p className="text-xs text-white/30">
            Progress
          </p>

          <p
            className={`mt-1 truncate text-lg font-bold ${theme.amount}`}
          >
            {money(current)}
          </p>

        </div>

        <div className="shrink-0 text-right">

          <p className="text-xs text-white/30">
            Target
          </p>

          <p className="mt-1 text-sm font-medium">
            {money(target)}
          </p>

        </div>

      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-white/10">

        <div
          className={`h-full rounded-full transition-all duration-500 ${theme.progress}`}
          style={{
            width: `${Math.min(
              Math.max(progress, 0),
              100
            )}%`,
          }}
        />

      </div>

      <div className="mb-5 flex items-center justify-between text-xs">

        <span className={theme.amount}>
          {progress}%
        </span>

        <span className="text-right text-white/30">
          {money(remaining)} remaining
        </span>

      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">

        <div className="flex items-center gap-2">

          <StatusBadge
            progress={progress}
            deadlineInfo={deadlineInfo}
          />

          {goal.reminderEnabled &&
            !completed && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"
                title={`Reminder ${goal.reminderTime || ""}`}
              >
                <Bell size={14} />
              </div>
            )}

        </div>

        {goal.deadline && (
          <div className="min-w-0 text-right">

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
  saving,
  currency,
  onChange,
  onSubmit,
  onClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >

      <div className="flex max-h-[calc(100dvh-20px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#111] shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">

        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

          <div className="min-w-0">

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
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-xl bg-white/10 p-2 text-white/60 transition hover:bg-white/20 hover:text-white disabled:opacity-40"
          >
            <X size={20} />
          </button>

        </div>

        <div className="overflow-y-auto p-5 sm:p-6">

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
              autoFocus
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
                label={`Target Amount (${currency.code})`}
                name="targetAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.targetAmount}
                onChange={onChange}
                placeholder="100000"
                required
                inputMode="decimal"
              />

              <Input
                label={`Current Amount (${currency.code})`}
                name="currentAmount"
                type="number"
                min="0"
                step="0.01"
                value={form.currentAmount}
                onChange={onChange}
                placeholder="0"
                inputMode="decimal"
              />

            </div>

            <div>

              <label className="mb-2 block text-xs text-white/50">
                Category
              </label>

              <div className="relative">

                <select
                  name="category"
                  value={form.category}
                  onChange={onChange}
                  className="w-full appearance-none rounded-2xl border border-white/10 bg-[#171717] px-4 py-3 pr-10 text-sm text-white outline-none transition focus:border-blue-400/40"
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

                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                />

              </div>

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

            {/* =================================================
                REMINDER
            ================================================== */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">

              <div className="flex items-center justify-between gap-4">

                <div className="flex items-center gap-3">

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    {form.reminderEnabled ? (
                      <Bell size={18} />
                    ) : (
                      <BellOff size={18} />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">
                      Goal Reminder
                    </p>

                    <p className="mt-1 text-xs text-white/30">
                      Remind me about this goal deadline
                    </p>
                  </div>

                </div>

                <label className="relative inline-flex cursor-pointer items-center">

                  <input
                    type="checkbox"
                    name="reminderEnabled"
                    checked={form.reminderEnabled}
                    onChange={onChange}
                    className="peer sr-only"
                  />

                  <div className="h-6 w-11 rounded-full bg-white/10 transition peer-checked:bg-blue-500" />

                  <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />

                </label>

              </div>

              {form.reminderEnabled && (
                <div className="mt-4">

                  <label className="mb-2 block text-xs text-white/50">
                    Reminder Time
                  </label>

                  <input
                    type="time"
                    name="reminderTime"
                    value={form.reminderTime}
                    onChange={onChange}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40"
                  />

                </div>
              )}

            </div>

            <div className="flex gap-3 pt-3">

              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingGoal
                  ? "Save Changes"
                  : "Create Goal"}
              </button>

            </div>

          </form>

        </div>

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
      icon:
        "bg-blue-500/10 text-blue-400",
      border:
        "border-blue-400/10 hover:border-blue-400/30",
      value:
        "text-blue-400",
    },

    green: {
      icon:
        "bg-green-500/10 text-green-400",
      border:
        "border-green-400/10 hover:border-green-400/30",
      value:
        "text-green-400",
    },

    red: {
      icon:
        "bg-red-500/10 text-red-400",
      border:
        "border-red-400/10 hover:border-red-400/30",
      value:
        "text-red-400",
    },
  };

  const theme =
    colors[color] ||
    colors.blue;

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
          type="button"
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
  const target =
    Number(goal.targetAmount || 0);

  const current =
    Number(goal.currentAmount || 0);

  if (
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return 0;
  }

  if (
    !Number.isFinite(current) ||
    current <= 0
  ) {
    return 0;
  }

  return Math.round(
    (current / target) * 100
  );
}

function getTimestampValue(timestamp) {
  if (!timestamp) {
    return 0;
  }

  if (
    typeof timestamp.toMillis ===
    "function"
  ) {
    return timestamp.toMillis();
  }

  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }

  if (typeof timestamp === "number") {
    return timestamp;
  }

  if (
    typeof timestamp.seconds ===
    "number"
  ) {
    return (
      timestamp.seconds * 1000 +
      Math.floor(
        (timestamp.nanoseconds || 0) /
          1000000
      )
    );
  }

  return 0;
}

function formatDate(date) {
  if (!date) {
    return "";
  }

  const value = new Date(
    `${date}T00:00:00`
  );

  if (
    Number.isNaN(value.getTime())
  ) {
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
  if (!deadline) {
    return null;
  }

  const deadlineDate =
    new Date(
      `${deadline}T23:59:59`
    );

  if (
    Number.isNaN(
      deadlineDate.getTime()
    )
  ) {
    return null;
  }

  return {
    overdue:
      deadlineDate.getTime() <
      Date.now(),
  };
}