import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Trash2,
  Pencil,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
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

export default function Finance({ user }) {

  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  // =========================================================
  // MAIN CURRENCY
  // =========================================================

  const [currency, setCurrency] =
    useState("LKR");

  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] =
    useState(false);

  const [editingId, setEditingId] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // TODAY
  // =========================================================

  const getToday = () => {
    return new Date()
      .toISOString()
      .split("T")[0];
  };

  // =========================================================
  // FORM STATE
  // =========================================================

  const [form, setForm] =
    useState({
      type: "income",
      amount: "",
      category: "Salary",
      description: "",
      date: getToday(),
    });

  // =========================================================
  // CATEGORIES
  // =========================================================

  const incomeCategories = [
    "Salary",
    "Freelance",
    "Business",
    "Photography",
    "Content Creation",
    "Other",
  ];

  const expenseCategories = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Travel",
    "Fitness",
    "Education",
    "Entertainment",
    "Other",
  ];

  // =========================================================
  // CURRENT CURRENCY
  // =========================================================

  const currentCurrency =
    CURRENCIES[currency] ||
    CURRENCIES.LKR;

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  const formatMoney = (amount) => {

    const value =
      Number(amount || 0);

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
  // FIRESTORE FINANCE
  // =========================================================

  useEffect(() => {

    if (!user?.uid) {

      setRecords([]);
      setLoading(false);

      return;
    }

    const financeRef =
      collection(
        db,
        "users",
        user.uid,
        "finance"
      );

    const unsubscribe =
      onSnapshot(
        financeRef,
        (snapshot) => {

          const financeData =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          financeData.sort(
            (a, b) => {

              const dateA =
                String(
                  a.date || ""
                );

              const dateB =
                String(
                  b.date || ""
                );

              return dateB.localeCompare(
                dateA
              );
            }
          );

          setRecords(
            financeData
          );

          setLoading(false);
        },
        (error) => {

          console.error(
            "Finance Firestore error:",
            error
          );

          setLoading(false);
        }
      );

    return () =>
      unsubscribe();

  }, [user?.uid]);

  // =========================================================
  // MAIN CURRENCY FROM SETTINGS
  //
  // IMPORTANT:
  //
  // Finance only listens to `currency`.
  //
  // It does NOT use `exchangeCurrency`.
  //
  // =========================================================

  useEffect(() => {

    if (!user?.uid) {

      setCurrency("LKR");

      return;
    }

    const settingsRef =
      doc(
        db,
        "users",
        user.uid,
        "settings",
        "preferences"
      );

    const unsubscribe =
      onSnapshot(
        settingsRef,
        (snapshot) => {

          if (!snapshot.exists()) {

            setCurrency("LKR");

            return;
          }

          const data =
            snapshot.data();

          const savedCurrency =
            data.currency;

          if (
            savedCurrency &&
            CURRENCIES[
              savedCurrency
            ]
          ) {

            setCurrency(
              savedCurrency
            );

          } else {

            setCurrency("LKR");

          }
        },
        (error) => {

          console.error(
            "Currency settings error:",
            error
          );

          setCurrency("LKR");
        }
      );

    return () =>
      unsubscribe();

  }, [user?.uid]);

  // =========================================================
  // CURRENT MONTH
  // =========================================================

  const currentMonth =
    new Date()
      .toISOString()
      .slice(0, 7);

  // =========================================================
  // MONTHLY RECORDS
  // =========================================================

  const monthlyRecords =
    useMemo(() => {

      return records.filter(
        (item) =>
          String(
            item.date || ""
          ).startsWith(
            currentMonth
          )
      );

    }, [
      records,
      currentMonth,
    ]);

  // =========================================================
  // TOTALS
  // =========================================================

  const totals =
    useMemo(() => {

      let income = 0;
      let expense = 0;

      monthlyRecords.forEach(
        (item) => {

          const amount =
            Number(
              item.amount || 0
            );

          if (
            item.type ===
            "income"
          ) {

            income += amount;

          }

          if (
            item.type ===
            "expense"
          ) {

            expense += amount;

          }

        }
      );

      return {
        income,
        expense,
        balance:
          income - expense,
      };

    }, [monthlyRecords]);

  // =========================================================
  // FORM CHANGE
  // =========================================================

  const handleChange =
    (event) => {

      const {
        name,
        value,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,
          [name]: value,
        })
      );
    };

  // =========================================================
  // CHANGE TYPE
  // =========================================================

  const changeType =
    (type) => {

      setForm(
        (previous) => ({
          ...previous,
          type,

          category:
            type === "income"
              ? "Salary"
              : "Food",
        })
      );
    };

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddForm =
    () => {

      setEditingId(null);

      setForm({
        type: "income",
        amount: "",
        category: "Salary",
        description: "",
        date: getToday(),
      });

      setShowForm(true);
    };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditForm =
    (item) => {

      setEditingId(
        item.id
      );

      setForm({
        type:
          item.type ||
          "income",

        amount:
          item.amount ??
          "",

        category:
          item.category ||
          "Other",

        description:
          item.description ||
          "",

        date:
          item.date ||
          getToday(),
      });

      setShowForm(true);
    };

  // =========================================================
  // RESET
  // =========================================================

  const resetForm =
    () => {

      setEditingId(null);

      setForm({
        type: "income",
        amount: "",
        category: "Salary",
        description: "",
        date: getToday(),
      });

      setShowForm(false);
    };

  // =========================================================
  // SAVE
  // =========================================================

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      if (!user?.uid) {

        alert(
          "You are not logged in."
        );

        return;
      }

      const amount =
        Number(form.amount);

      if (
        !amount ||
        amount <= 0
      ) {

        alert(
          "Please enter a valid amount."
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

        const financeRef =
          collection(
            db,
            "users",
            user.uid,
            "finance"
          );

        const financeData = {
          type:
            form.type,

          amount:
            amount,

          category:
            form.category,

          description:
            form.description.trim(),

          date:
            form.date,
        };

        if (editingId) {

          const recordRef =
            doc(
              db,
              "users",
              user.uid,
              "finance",
              editingId
            );

          await updateDoc(
            recordRef,
            financeData
          );

        } else {

          await addDoc(
            financeRef,
            {
              ...financeData,

              createdAt:
                serverTimestamp(),
            }
          );

        }

        resetForm();

      } catch (error) {

        console.error(
          "Finance save error:",
          error
        );

        alert(
          "Could not save the transaction. Check Firebase configuration."
        );

      } finally {

        setSaving(false);

      }
    };

  // =========================================================
  // DELETE
  // =========================================================

  const handleDelete =
    async (id) => {

      if (!user?.uid) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to delete this transaction?"
        );

      if (!confirmed) {
        return;
      }

      try {

        const recordRef =
          doc(
            db,
            "users",
            user.uid,
            "finance",
            id
          );

        await deleteDoc(
          recordRef
        );

      } catch (error) {

        console.error(
          "Finance delete error:",
          error
        );

        alert(
          "Could not delete this transaction."
        );
      }
    };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (
      <Loading
        text="Loading finance..."
      />
    );
  }

  const categories =
    form.type === "income"
      ? incomeCategories
      : expenseCategories;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* HEADER */}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="text-3xl font-bold tracking-tight">
            Finance
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Track your income and expenses.
          </p>

        </div>

        <button
          type="button"
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
        >

          <Plus size={18} />

          Add Transaction

        </button>

      </div>

      {/* CURRENCY */}

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

      {/* SUMMARY */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">

        {/* INCOME */}

        <div className="rounded-3xl border border-green-500/20 bg-green-500/5 p-5 backdrop-blur-xl">

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">

            <TrendingUp size={20} />

          </div>

          <p className="text-sm text-white/40">
            Total Income This Month
          </p>

          <p className="mt-2 text-3xl font-bold text-green-400">
            {money(totals.income)}
          </p>

        </div>

        {/* EXPENSE */}

        <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5 backdrop-blur-xl">

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">

            <TrendingDown size={20} />

          </div>

          <p className="text-sm text-white/40">
            Total Expense This Month
          </p>

          <p className="mt-2 text-3xl font-bold text-red-400">
            {money(totals.expense)}
          </p>

        </div>

        {/* BALANCE */}

        <div
          className={`rounded-3xl border p-5 backdrop-blur-xl ${
            totals.balance >= 0
              ? "border-green-500/20 bg-green-500/5"
              : "border-red-500/20 bg-red-500/5"
          }`}
        >

          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
              totals.balance >= 0
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >

            <Wallet size={20} />

          </div>

          <p className="text-sm text-white/40">
            Balance This Month
          </p>

          <p
            className={`mt-2 text-3xl font-bold ${
              totals.balance >= 0
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {money(totals.balance)}
          </p>

        </div>

      </div>

      {/* TRANSACTIONS */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">

        <div className="mb-5">

          <h2 className="text-lg font-semibold">
            Transactions
          </h2>

          <p className="mt-1 text-xs text-white/30">
            Your finance records
          </p>

        </div>

        {records.length === 0 ? (

          <div className="py-16 text-center">

            <Wallet
              size={32}
              className="mx-auto mb-4 text-white/20"
            />

            <p className="text-sm text-white/30">
              No transactions yet.
            </p>

            <button
              type="button"
              onClick={openAddForm}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Add Transaction
            </button>

          </div>

        ) : (

          <div className="space-y-3">

            {records.map((item) => (

              <div
                key={item.id}
                className="flex flex-col gap-4 rounded-2xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
              >

                <div className="flex items-center gap-4">

                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      item.type ===
                      "income"
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >

                    {item.type ===
                    "income" ? (
                      <TrendingUp
                        size={18}
                      />
                    ) : (
                      <TrendingDown
                        size={18}
                      />
                    )}

                  </div>

                  <div>

                    <p className="font-medium">
                      {item.category ||
                        "Other"}
                    </p>

                    <p className="text-xs text-white/30">
                      {item.description ||
                        "No description"}
                    </p>

                    <p className="mt-1 text-xs text-white/20">
                      {item.date || "-"}
                    </p>

                  </div>

                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">

                  <p
                    className={`font-semibold ${
                      item.type ===
                      "income"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >

                    {item.type ===
                    "income"
                      ? "+"
                      : "-"}

                    {" "}

                    {money(
                      item.amount
                    )}

                  </p>

                  <div className="flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(
                          item
                        )
                      }
                      className="rounded-xl bg-white/10 p-2 transition hover:bg-white/20"
                    >

                      <Pencil
                        size={15}
                      />

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          item.id
                        )
                      }
                      className="rounded-xl bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                    >

                      <Trash2
                        size={15}
                      />

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

      {/* =====================================================
          FORM MODAL
      ====================================================== */}

      {showForm && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#111] p-6 shadow-2xl">

            <div className="mb-6 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-semibold">
                  {editingId
                    ? "Edit Transaction"
                    : "Add Transaction"}
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Manage your finance record
                </p>

              </div>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl bg-white/10 p-2 hover:bg-white/20"
              >

                <X size={18} />

              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >

              {/* TYPE */}

              <div className="grid grid-cols-2 gap-2">

                <button
                  type="button"
                  onClick={() =>
                    changeType(
                      "income"
                    )
                  }
                  className={`rounded-2xl py-3 text-sm font-medium ${
                    form.type ===
                    "income"
                      ? "bg-green-500 text-white"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  Income
                </button>

                <button
                  type="button"
                  onClick={() =>
                    changeType(
                      "expense"
                    )
                  }
                  className={`rounded-2xl py-3 text-sm font-medium ${
                    form.type ===
                    "expense"
                      ? "bg-red-500 text-white"
                      : "bg-white/10 text-white/60"
                  }`}
                >
                  Expense
                </button>

              </div>

              {/* AMOUNT */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Amount ({currentCurrency.code})
                </label>

                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="5000"
                  min="0"
                  step="0.01"
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                />

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
                    handleChange
                  }
                  className="w-full rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-white outline-none"
                >

                  {categories.map(
                    (category) => (
                      <option
                        key={
                          category
                        }
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* DESCRIPTION */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Description
                </label>

                <input
                  type="text"
                  name="description"
                  value={
                    form.description
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Monthly salary"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/20 focus:border-white/30"
                />

              </div>

              {/* DATE */}

              <div>

                <label className="mb-2 block text-xs text-white/40">
                  Date
                </label>

                <input
                  type="date"
                  name="date"
                  value={
                    form.date
                  }
                  onChange={
                    handleChange
                  }
                  required
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                />

              </div>

              {/* SAVE */}

              <button
                type="submit"
                disabled={saving}
                className={`w-full rounded-2xl py-3 font-semibold transition disabled:opacity-50 ${
                  form.type ===
                  "income"
                    ? "bg-green-500 hover:bg-green-400"
                    : "bg-red-500 hover:bg-red-400"
                }`}
              >

                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Transaction"
                  : "Save Transaction"}

              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}