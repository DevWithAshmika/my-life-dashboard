import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Trash2,
  Pencil,
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  CalendarDays,
  ChevronDown,
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

// ===========================================================
// LOCAL DATE
// ===========================================================

const getToday = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// ===========================================================
// DEFAULT FORM
// ===========================================================

const getDefaultForm = () => ({
  type: "income",
  amount: "",
  category: "Salary",
  description: "",
  date: getToday(),
});

// ===========================================================
// FINANCE PAGE
// ===========================================================

export default function Finance({ user }) {
  // =========================================================
  // DATA
  // =========================================================

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================================================
  // CURRENCY
  // =========================================================

  const [currency, setCurrency] = useState("LKR");

  // =========================================================
  // FILTERS
  // =========================================================

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [monthFilter, setMonthFilter] = useState(
    getToday().slice(0, 7)
  );

  // =========================================================
  // FORM
  // =========================================================

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(
    getDefaultForm()
  );

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
  // LOAD FINANCE DATA
  // OFFLINE SAFE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const financeRef = collection(
      db,
      "users",
      user.uid,
      "finance"
    );

    const unsubscribe = onSnapshot(
      financeRef,
      (snapshot) => {
        const financeData =
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }));

        financeData.sort((a, b) => {
          const dateA = String(
            a.date || ""
          );

          const dateB = String(
            b.date || ""
          );

          if (dateA !== dateB) {
            return dateB.localeCompare(
              dateA
            );
          }

          const timeA =
            a.createdAt?.seconds || 0;

          const timeB =
            b.createdAt?.seconds || 0;

          return timeB - timeA;
        });

        setRecords(financeData);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Finance Firestore error:",
          error
        );

        /*
         * IMPORTANT:
         *
         * Do NOT do:
         *
         * setRecords([]);
         *
         * here.
         *
         * When the device is offline, Firestore can
         * temporarily report a network/cache error.
         *
         * Keeping the existing state means already
         * loaded/cached finance records remain visible.
         */

        setLoading(false);

        if (
          error?.code ===
          "permission-denied"
        ) {
          alert(
            "You don't have permission to access finance data."
          );
        }
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // LOAD CURRENCY FROM SETTINGS
  // OFFLINE SAFE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
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

        const savedCurrency =
          data.currency;

        if (
          savedCurrency &&
          CURRENCIES[savedCurrency]
        ) {
          setCurrency(savedCurrency);
        }
      },
      (error) => {
        console.error(
          "Currency settings error:",
          error
        );

        /*
         * IMPORTANT:
         *
         * Do not force LKR here.
         *
         * If offline, keep the currency that
         * is already displayed.
         */
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // FILTERED RECORDS
  // =========================================================

  const filteredRecords = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return records.filter((item) => {
      // Month
      if (monthFilter !== "all") {
        const recordMonth =
          String(item.date || "").slice(
            0,
            7
          );

        if (
          recordMonth !== monthFilter
        ) {
          return false;
        }
      }

      // Type
      if (
        typeFilter !== "all" &&
        item.type !== typeFilter
      ) {
        return false;
      }

      // Search
      if (searchValue) {
        const searchableText = [
          item.category,
          item.description,
          item.date,
          item.type,
          String(item.amount || ""),
        ]
          .join(" ")
          .toLowerCase();

        if (
          !searchableText.includes(
            searchValue
          )
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    records,
    search,
    typeFilter,
    monthFilter,
  ]);

  // =========================================================
  // FILTERED TOTALS
  // =========================================================

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredRecords.forEach((item) => {
      const amount = Number(
        item.amount || 0
      );

      if (item.type === "income") {
        income += amount;
      }

      if (item.type === "expense") {
        expense += amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [filteredRecords]);

  // =========================================================
  // ALL TIME TOTALS
  // =========================================================

  const allTimeTotals = useMemo(() => {
    let income = 0;
    let expense = 0;

    records.forEach((item) => {
      const amount = Number(
        item.amount || 0
      );

      if (item.type === "income") {
        income += amount;
      }

      if (item.type === "expense") {
        expense += amount;
      }
    });

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [records]);

  // =========================================================
  // AVAILABLE MONTHS
  // =========================================================

  const availableMonths = useMemo(() => {
    const months = new Set();

    records.forEach((item) => {
      if (item.date) {
        const month = String(
          item.date
        ).slice(0, 7);

        if (month) {
          months.add(month);
        }
      }
    });

    months.add(
      getToday().slice(0, 7)
    );

    return Array.from(months).sort(
      (a, b) =>
        b.localeCompare(a)
    );
  }, [records]);

  // =========================================================
  // FORMAT MONTH
  // =========================================================

  const formatMonth = (value) => {
    if (
      !value ||
      value === "all"
    ) {
      return "All Months";
    }

    const [year, month] =
      value.split("-");

    const date = new Date(
      Number(year),
      Number(month) - 1,
      1
    );

    return date.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );
  };

  // =========================================================
  // FORM CHANGE
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

  // =========================================================
  // CHANGE TYPE
  // =========================================================

  const changeType = (type) => {
    setForm((previous) => ({
      ...previous,
      type,
      category:
        type === "income"
          ? "Salary"
          : "Food",
    }));
  };

  // =========================================================
  // OPEN ADD
  // =========================================================

  const openAddForm = () => {
    if (saving) return;

    setEditingId(null);
    setForm(getDefaultForm());
    setShowForm(true);
  };

  // =========================================================
  // OPEN EDIT
  // =========================================================

  const openEditForm = (item) => {
    if (saving) return;

    setEditingId(item.id);

    setForm({
      type:
        item.type === "expense"
          ? "expense"
          : "income",

      amount:
        item.amount ?? "",

      category:
        item.category ||
        (item.type === "expense"
          ? "Food"
          : "Salary"),

      description:
        item.description || "",

      date:
        item.date || getToday(),
    });

    setShowForm(true);
  };

  // =========================================================
  // RESET FORM
  // =========================================================

  const resetForm = () => {
    if (saving) return;

    setEditingId(null);
    setForm(getDefaultForm());
    setShowForm(false);
  };

  // =========================================================
  // SAVE TRANSACTION
  // OFFLINE FIRESTORE QUEUE
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!user?.uid) {
      alert("You are not logged in.");
      return;
    }

    const amount = Number(
      form.amount
    );

    if (
      !Number.isFinite(amount) ||
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

    if (!form.category) {
      alert(
        "Please select a category."
      );
      return;
    }

    setSaving(true);

    try {
      const financeRef = collection(
        db,
        "users",
        user.uid,
        "finance"
      );

      const financeData = {
        type:
          form.type === "expense"
            ? "expense"
            : "income",

        amount,

        category:
          form.category.trim(),

        description:
          form.description.trim(),

        date: form.date,
      };

      // =====================================================
      // UPDATE
      // =====================================================

      if (editingId) {
        const recordRef = doc(
          db,
          "users",
          user.uid,
          "finance",
          editingId
        );

        await updateDoc(
          recordRef,
          {
            ...financeData,
            updatedAt:
              serverTimestamp(),
          }
        );
      }

      // =====================================================
      // ADD
      // =====================================================

      else {
        await addDoc(financeRef, {
          ...financeData,
          createdAt:
            serverTimestamp(),
        });
      }

      setEditingId(null);
      setForm(getDefaultForm());
      setShowForm(false);

    } catch (error) {
      console.error(
        "Finance save error:",
        error
      );

      /*
       * With Firestore persistent local
       * cache enabled, normal writes can be
       * queued while offline.
       *
       * If this reaches catch, it is a real
       * write/configuration problem rather than
       * simply assuming the device is offline.
       */

      alert(
        "Could not save the transaction. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE
  // OFFLINE FIRESTORE QUEUE
  // =========================================================

  const handleDelete = async (id) => {
    if (!user?.uid || !id) {
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
      const recordRef = doc(
        db,
        "users",
        user.uid,
        "finance",
        id
      );

      await deleteDoc(recordRef);

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
  // CLEAR FILTERS
  // =========================================================

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");

    setMonthFilter(
      getToday().slice(0, 7)
    );
  };

  // =========================================================
  // LOCK BODY SCROLL WHEN MODAL IS OPEN
  // =========================================================

  useEffect(() => {
    if (!showForm) {
      document.body.style.overflow =
        "";
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [showForm]);

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

  // =========================================================
  // FORM CATEGORIES
  // =========================================================

  const categories =
    form.type === "income"
      ? incomeCategories
      : expenseCategories;

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen pb-28 text-white sm:pb-0">

      {/* =====================================================
          HEADER
      ====================================================== */}

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
          className="hidden items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98] sm:flex"
        >
          <Plus size={18} />
          Add Transaction
        </button>

      </div>

      {/* =====================================================
          CURRENCY
      ====================================================== */}

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

      {/* =====================================================
          SUMMARY
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">

        {/* INCOME */}

        <div className="rounded-3xl border border-green-500/20 bg-green-500/5 p-5 backdrop-blur-xl">

          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-500/10 text-green-400">
            <TrendingUp size={20} />
          </div>

          <p className="text-sm text-white/40">
            Total Income
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
            Total Expense
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
            Balance
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

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5">

        <div className="mb-4 flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/60">
            <Filter size={18} />
          </div>

          <div>
            <h2 className="font-semibold">
              Transactions
            </h2>

            <p className="text-xs text-white/30">
              Search and filter your records
            </p>
          </div>

        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">

          {/* SEARCH */}

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
              placeholder="Search transactions..."
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/20 focus:border-white/30"
            />

          </div>

          {/* TYPE */}

          <div className="relative">

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 pr-10 text-sm text-white outline-none focus:border-white/30"
            >
              <option value="all">
                All Types
              </option>

              <option value="income">
                Income
              </option>

              <option value="expense">
                Expense
              </option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
            />

          </div>

          {/* MONTH */}

          <div className="relative">

            <CalendarDays
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
            />

            <select
              value={monthFilter}
              onChange={(event) =>
                setMonthFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#181818] py-3 pl-11 pr-10 text-sm text-white outline-none focus:border-white/30"
            >

              <option value="all">
                All Months
              </option>

              {availableMonths.map(
                (month) => (
                  <option
                    key={month}
                    value={month}
                  >
                    {formatMonth(month)}
                  </option>
                )
              )}

            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
            />

          </div>

          {/* CLEAR */}

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Clear
          </button>

        </div>

        {/* FILTER INFO */}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">

          <div className="flex flex-wrap items-center gap-2 text-xs text-white/30">

            <span>
              Showing{" "}
              <span className="font-semibold text-white/70">
                {filteredRecords.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-white/70">
                {records.length}
              </span>{" "}
              transactions
            </span>

            <span className="hidden text-white/10 sm:inline">
              •
            </span>

            <span>
              {formatMonth(
                monthFilter
              )}
            </span>

          </div>

          <div className="flex gap-4 text-xs">

            <span className="text-green-400">
              + {money(totals.income)}
            </span>

            <span className="text-red-400">
              - {money(totals.expense)}
            </span>

          </div>

        </div>

      </div>

      {/* =====================================================
          TRANSACTION LIST
      ====================================================== */}

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl sm:p-5">

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <div>
            <h2 className="text-lg font-semibold">
              Transaction Records
            </h2>

            <p className="mt-1 text-xs text-white/30">
              {monthFilter === "all"
                ? "All finance records"
                : formatMonth(
                    monthFilter
                  )}
            </p>
          </div>

          <div className="text-sm text-white/30">
            Balance:{" "}
            <span
              className={
                totals.balance >= 0
                  ? "font-semibold text-green-400"
                  : "font-semibold text-red-400"
              }
            >
              {money(
                totals.balance
              )}
            </span>
          </div>

        </div>

        {filteredRecords.length === 0 ? (

          <div className="py-16 text-center">

            <Wallet
              size={32}
              className="mx-auto mb-4 text-white/20"
            />

            <p className="text-sm text-white/30">
              {records.length === 0
                ? "No transactions yet."
                : "No transactions match your filters."}
            </p>

            {records.length === 0 ? (

              <button
                type="button"
                onClick={openAddForm}
                className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Add Transaction
              </button>

            ) : (

              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white"
              >
                Clear Filters
              </button>

            )}

          </div>

        ) : (

          <div className="space-y-3">

            {filteredRecords.map(
              (item) => (

                <div
                  key={item.id}
                  className="flex flex-col gap-4 rounded-2xl bg-white/[0.03] p-4 transition hover:bg-white/[0.06] sm:flex-row sm:items-center sm:justify-between"
                >

                  {/* LEFT */}

                  <div className="flex min-w-0 items-center gap-4">

                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        item.type === "income"
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

                    <div className="min-w-0">

                      <p className="truncate font-medium">
                        {item.category ||
                          "Other"}
                      </p>

                      <p className="truncate text-xs text-white/30">
                        {item.description ||
                          "No description"}
                      </p>

                      <p className="mt-1 text-xs text-white/20">
                        {item.date || "-"}
                      </p>

                    </div>

                  </div>

                  {/* RIGHT */}

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
                        aria-label="Edit transaction"
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
                        aria-label="Delete transaction"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

      {/* =====================================================
          ALL TIME INFO
      ====================================================== */}

      {records.length > 0 && (
        <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.025] p-5">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <p className="text-sm font-medium">
                All-time overview
              </p>

              <p className="mt-1 text-xs text-white/30">
                Based on all your saved finance records
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-right">

              <div>
                <p className="text-[10px] text-white/30">
                  Income
                </p>

                <p className="mt-1 text-sm font-semibold text-green-400">
                  {money(
                    allTimeTotals.income
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-white/30">
                  Expense
                </p>

                <p className="mt-1 text-sm font-semibold text-red-400">
                  {money(
                    allTimeTotals.expense
                  )}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-white/30">
                  Balance
                </p>

                <p
                  className={`mt-1 text-sm font-semibold ${
                    allTimeTotals.balance >=
                    0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {money(
                    allTimeTotals.balance
                  )}
                </p>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          MOBILE ADD BUTTON
      ====================================================== */}

      <button
        type="button"
        onClick={openAddForm}
        aria-label="Add transaction"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-white text-black shadow-2xl shadow-black/40 transition hover:bg-white/90 active:scale-90 sm:hidden"
      >
        <Plus
          size={25}
          strokeWidth={2.5}
        />
      </button>

      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showForm && (

        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetForm();
            }
          }}
        >

          <div className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#111111] shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl">

            {/* MODAL HEADER */}

            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

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
                disabled={saving}
                className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/20 disabled:opacity-50"
                aria-label="Close"
              >
                <X size={19} />
              </button>

            </div>

            {/* FORM */}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">

              <form
                onSubmit={handleSubmit}
                className="space-y-4 pb-2"
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
                    disabled={saving}
                    className={`rounded-2xl py-3.5 text-sm font-semibold transition ${
                      form.type ===
                      "income"
                        ? "bg-green-500 text-white shadow-lg shadow-green-500/20"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
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
                    disabled={saving}
                    className={`rounded-2xl py-3.5 text-sm font-semibold transition ${
                      form.type ===
                      "expense"
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
                    }`}
                  >
                    Expense
                  </button>

                </div>

                {/* AMOUNT */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Amount (
                    {
                      currentCurrency.code
                    })
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={
                      handleChange
                    }
                    placeholder="5000"
                    min="0.01"
                    step="0.01"
                    required
                    inputMode="decimal"
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50"
                  />

                </div>

                {/* CATEGORY */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Category
                  </label>

                  <div className="relative">

                    <select
                      name="category"
                      value={
                        form.category
                      }
                      onChange={
                        handleChange
                      }
                      disabled={saving}
                      className="w-full appearance-none rounded-2xl border border-white/10 bg-[#181818] px-4 py-3.5 pr-10 text-white outline-none focus:border-white/30 disabled:opacity-50"
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

                    <ChevronDown
                      size={17}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                    />

                  </div>

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-white/50">
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
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none placeholder:text-white/20 focus:border-white/30 focus:bg-white/[0.07] disabled:opacity-50"
                  />

                </div>

                {/* DATE */}

                <div>

                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={
                      handleChange
                    }
                    required
                    disabled={saving}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-white/30 disabled:opacity-50"
                  />

                </div>

                {/* SAVE */}

                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full rounded-2xl py-3.5 font-semibold text-white shadow-lg transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
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

        </div>
      )}

    </div>
  );
}