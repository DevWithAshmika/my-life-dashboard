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
  ArrowUpRight,
  ArrowDownRight,
  ReceiptText,
  CircleDollarSign,
} from "lucide-react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
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
// FORMAT DATE
// ===========================================================

const formatRecordDate = (value) => {
  if (!value) return "-";

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return value;
  }

  const [year, month, day] = parts;

  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// ===========================================================
// CREATED TIME HELPER
// Supports both old Firestore Timestamp data and new
// local numeric timestamps.
// ===========================================================

const getCreatedTime = (value) => {
  if (!value) return 0;

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value?.seconds === "number"
  ) {
    return value.seconds * 1000;
  }

  if (
    typeof value?.toMillis === "function"
  ) {
    return value.toMillis();
  }

  return 0;
};

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
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        const financeData = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        financeData.sort((a, b) => {
          const dateA = String(a.date || "");
          const dateB = String(b.date || "");

          if (dateA !== dateB) {
            return dateB.localeCompare(dateA);
          }

          const timeA = getCreatedTime(
            a.createdAt
          );

          const timeB = getCreatedTime(
            b.createdAt
          );

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
      {
        includeMetadataChanges: true,
      },
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

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // FILTERED RECORDS
  // =========================================================

  const filteredRecords = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return records.filter((item) => {
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

      if (
        typeFilter !== "all" &&
        item.type !== typeFilter
      ) {
        return false;
      }

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
    if (saving) return;

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
  //
  // IMPORTANT:
  // This is LOCAL-FIRST.
  //
  // We do NOT wait for Firestore network confirmation.
  // The document is written to Firestore's local cache
  // immediately and Firebase will sync it automatically
  // when internet becomes available.
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

    const category =
      String(
        form.category || ""
      ).trim();

    if (!category) {
      alert(
        "Please select a category."
      );
      return;
    }

    const description =
      String(
        form.description || ""
      ).trim();

    const now = Date.now();

    const transactionData = {
      type:
        form.type === "expense"
          ? "expense"
          : "income",

      amount,

      category,

      description,

      date: form.date,
    };

    // =======================================================
    // EDIT EXISTING TRANSACTION
    // =======================================================

    if (editingId) {
      const recordRef = doc(
        db,
        "users",
        user.uid,
        "finance",
        editingId
      );

      const updatedRecord = {
        ...transactionData,

        id: editingId,

        // Keep original creation time.
        createdAt:
          records.find(
            (item) =>
              item.id === editingId
          )?.createdAt || now,

        updatedAt: now,
      };

      // Update UI immediately.
      setRecords((previous) =>
        previous.map((item) =>
          item.id === editingId
            ? {
                ...item,
                ...updatedRecord,
              }
            : item
        )
      );

      // Close immediately.
      setEditingId(null);
      setForm(getDefaultForm());
      setShowForm(false);

      // Unlock UI immediately.
      setSaving(false);

      // Write to Firestore local cache.
      // We intentionally do not await this.
      setDoc(recordRef, {
        ...transactionData,
        createdAt:
          updatedRecord.createdAt,
        updatedAt: now,
      })
        .then(() => {
          console.log(
            "Finance: transaction update queued successfully."
          );
        })
        .catch((error) => {
          console.error(
            "Finance update error:",
            error
          );

          console.error(
            "Finance update error code:",
            error?.code
          );
        });

      return;
    }

    // =======================================================
    // CREATE NEW TRANSACTION
    // =======================================================

    const financeRef = collection(
      db,
      "users",
      user.uid,
      "finance"
    );

    // Generate the document reference locally.
    // This avoids waiting for addDoc() to complete.
    const newRecordRef = doc(
      financeRef
    );

    const newRecord = {
      id: newRecordRef.id,
      ...transactionData,
      createdAt: now,
    };

    // =======================================================
    // UPDATE UI IMMEDIATELY
    // =======================================================

    setRecords((previous) => [
      newRecord,
      ...previous,
    ]);

    // =======================================================
    // CLOSE FORM IMMEDIATELY
    // =======================================================

    setEditingId(null);
    setForm(getDefaultForm());
    setShowForm(false);
    setSaving(false);

    // =======================================================
    // SAVE TO FIRESTORE LOCAL CACHE
    //
    // setDoc() queues the write locally.
    // Firebase syncs it automatically when online.
    // =======================================================

    setDoc(newRecordRef, {
      ...transactionData,
      createdAt: now,
    })
      .then(() => {
        console.log(
          "Finance: transaction queued successfully."
        );
      })
      .catch((error) => {
        console.error(
          "Finance save error:",
          error
        );

        console.error(
          "Finance error code:",
          error?.code
        );

        console.error(
          "Finance error message:",
          error?.message
        );
      });
  };

  // =========================================================
  // DELETE
  // OFFLINE-FIRST
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

    // =======================================================
    // REMOVE FROM UI IMMEDIATELY
    // =======================================================

    setRecords((previous) =>
      previous.filter(
        (item) => item.id !== id
      )
    );

    const recordRef = doc(
      db,
      "users",
      user.uid,
      "finance",
      id
    );

    // =======================================================
    // DELETE FROM FIRESTORE CACHE
    // =======================================================

    deleteDoc(recordRef)
      .then(() => {
        console.log(
          "Finance: delete queued successfully."
        );
      })
      .catch((error) => {
        console.error(
          "Finance delete error:",
          error
        );
      });
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
  // LOCK BODY SCROLL
  // =========================================================

  useEffect(() => {
    if (!showForm) {
      document.body.style.overflow = "";
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
    <div className="relative min-h-screen overflow-hidden pb-28 text-white sm:pb-8">

      <div className="pointer-events-none absolute -left-32 top-0 h-72 w-72 rounded-full bg-red-500/[0.07] blur-3xl" />

      <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-orange-400/[0.05] blur-3xl" />

      <div className="relative">

        {/* HEADER */}

        <div className="mb-5 flex items-center justify-between gap-4 sm:mb-7">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/10 bg-gradient-to-br from-red-500/20 to-orange-400/10 shadow-lg shadow-red-500/10">

              <Wallet
                size={20}
                className="text-red-300"
              />

            </div>

            <div>

              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">
                Money
              </p>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Finance
              </h1>

            </div>

          </div>

          <button
            type="button"
            onClick={openAddForm}
            disabled={saving}
            className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white px-5 py-3 text-sm font-semibold text-black shadow-xl shadow-black/20 transition hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
          >
            <Plus size={18} />
            Add Transaction
          </button>

        </div>

        {/* CURRENCY */}

        <div className="mb-5 flex items-center justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 shadow-xl shadow-black/10 backdrop-blur-2xl sm:px-5">

          <div className="flex items-center gap-3">

            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.07]">

              <CircleDollarSign
                size={17}
                className="text-white/60"
              />

            </div>

            <div>

              <p className="text-[10px] uppercase tracking-wider text-white/30">
                Current Currency
              </p>

              <p className="mt-0.5 text-sm font-semibold text-white">
                {currentCurrency.code}
              </p>

            </div>

          </div>

          <div className="rounded-xl border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white/70">
            {currentCurrency.symbol}
          </div>

        </div>

        {/* SUMMARY */}

        <div className="mb-6 grid gap-3 sm:grid-cols-3 sm:gap-4">

          {/* INCOME */}

          <div className="group relative overflow-hidden rounded-[26px] border border-emerald-400/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]">

            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-400/[0.08] blur-2xl" />

            <div className="relative">

              <div className="mb-5 flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-400/10 text-emerald-400">
                  <TrendingUp size={20} />
                </div>

                <div className="rounded-xl bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                  INCOME
                </div>

              </div>

              <p className="text-xs text-white/35">
                Total Income
              </p>

              <p className="mt-1.5 break-words text-2xl font-bold tracking-tight text-emerald-400 sm:text-3xl">
                {money(totals.income)}
              </p>

            </div>

          </div>

          {/* EXPENSE */}

          <div className="group relative overflow-hidden rounded-[26px] border border-red-400/10 bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/[0.06]">

            <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-red-400/[0.08] blur-2xl" />

            <div className="relative">

              <div className="mb-5 flex items-center justify-between">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/10 bg-red-400/10 text-red-400">
                  <TrendingDown size={20} />
                </div>

                <div className="rounded-xl bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                  EXPENSE
                </div>

              </div>

              <p className="text-xs text-white/35">
                Total Expense
              </p>

              <p className="mt-1.5 break-words text-2xl font-bold tracking-tight text-red-400 sm:text-3xl">
                {money(totals.expense)}
              </p>

            </div>

          </div>

          {/* BALANCE */}

          <div
            className={`group relative overflow-hidden rounded-[26px] border bg-white/[0.045] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/[0.06] ${
              totals.balance >= 0
                ? "border-blue-400/10"
                : "border-red-400/10"
            }`}
          >

            <div
              className={`absolute -right-10 -top-10 h-24 w-24 rounded-full blur-2xl ${
                totals.balance >= 0
                  ? "bg-blue-400/[0.08]"
                  : "bg-red-400/[0.08]"
              }`}
            />

            <div className="relative">

              <div className="mb-5 flex items-center justify-between">

                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${
                    totals.balance >= 0
                      ? "border-blue-400/10 bg-blue-400/10 text-blue-400"
                      : "border-red-400/10 bg-red-400/10 text-red-400"
                  }`}
                >
                  <Wallet size={20} />
                </div>

                <div
                  className={`rounded-xl px-2.5 py-1 text-[10px] font-semibold ${
                    totals.balance >= 0
                      ? "bg-blue-400/10 text-blue-400"
                      : "bg-red-400/10 text-red-400"
                  }`}
                >
                  BALANCE
                </div>

              </div>

              <p className="text-xs text-white/35">
                Current Balance
              </p>

              <p
                className={`mt-1.5 break-words text-2xl font-bold tracking-tight sm:text-3xl ${
                  totals.balance >= 0
                    ? "text-blue-400"
                    : "text-red-400"
                }`}
              >
                {money(totals.balance)}
              </p>

            </div>

          </div>

        </div>

        {/* FILTERS */}

        <div className="mb-6 overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl sm:p-5">

          <div className="mb-4 flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white/60">
              <Filter size={17} />
            </div>

            <div>

              <h2 className="text-sm font-semibold">
                Transactions
              </h2>

              <p className="mt-0.5 text-[11px] text-white/30">
                Search and filter your records
              </p>

            </div>

          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto]">

            <div className="relative">

              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
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
                className="h-12 w-full rounded-2xl border border-white/[0.08] bg-black/10 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-white/20 focus:bg-white/[0.06]"
              />

            </div>

            <div className="relative">

              <select
                value={typeFilter}
                onChange={(event) =>
                  setTypeFilter(
                    event.target.value
                  )
                }
                className="h-12 w-full min-w-[140px] appearance-none rounded-2xl border border-white/[0.08] bg-[#151515] px-4 pr-10 text-sm text-white outline-none transition focus:border-white/20"
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
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
              />

            </div>

            <div className="relative">

              <CalendarDays
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
              />

              <select
                value={monthFilter}
                onChange={(event) =>
                  setMonthFilter(
                    event.target.value
                  )
                }
                className="h-12 w-full min-w-[170px] appearance-none rounded-2xl border border-white/[0.08] bg-[#151515] pl-11 pr-10 text-sm text-white outline-none transition focus:border-white/20"
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
                size={15}
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
              />

            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="h-12 rounded-2xl border border-white/[0.08] bg-white/[0.045] px-5 text-sm font-medium text-white/55 transition hover:bg-white/[0.08] hover:text-white active:scale-[0.98]"
            >
              Clear
            </button>

          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/30">

              <span>
                Showing{" "}
                <span className="font-semibold text-white/70">
                  {filteredRecords.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-white/70">
                  {records.length}
                </span>
              </span>

              <span className="text-white/10">
                •
              </span>

              <span>
                {formatMonth(
                  monthFilter
                )}
              </span>

            </div>

            <div className="flex gap-4 text-xs">

              <span className="font-medium text-emerald-400">
                + {money(totals.income)}
              </span>

              <span className="font-medium text-red-400">
                - {money(totals.expense)}
              </span>

            </div>

          </div>

        </div>

        {/* TRANSACTION LIST */}

        <div className="overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.045] p-4 shadow-xl shadow-black/10 backdrop-blur-2xl sm:p-5">

          <div className="mb-5 flex items-center justify-between gap-3">

            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.07] text-white/60">
                <ReceiptText size={17} />
              </div>

              <div>

                <h2 className="text-sm font-semibold sm:text-base">
                  Transaction Records
                </h2>

                <p className="mt-0.5 text-[11px] text-white/30">
                  {monthFilter === "all"
                    ? "All finance records"
                    : formatMonth(
                        monthFilter
                      )}
                </p>

              </div>

            </div>

            <div className="hidden text-right text-xs text-white/30 sm:block">

              Balance{" "}

              <span
                className={
                  totals.balance >= 0
                    ? "font-semibold text-blue-400"
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

            <div className="rounded-3xl border border-dashed border-white/[0.08] bg-black/10 py-16 text-center">

              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.05]">
                <Wallet
                  size={25}
                  className="text-white/20"
                />
              </div>

              <p className="text-sm text-white/35">
                {records.length === 0
                  ? "No transactions yet."
                  : "No transactions match your filters."}
              </p>

              {records.length === 0 ? (

                <button
                  type="button"
                  onClick={openAddForm}
                  className="mt-5 rounded-2xl bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98]"
                >
                  Add Transaction
                </button>

              ) : (

                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-2xl bg-white/[0.08] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.12]"
                >
                  Clear Filters
                </button>

              )}

            </div>

          ) : (

            <div className="space-y-2.5">

              {filteredRecords.map(
                (item) => {

                  const isIncome =
                    item.type ===
                    "income";

                  return (
                    <div
                      key={item.id}
                      className="group rounded-[22px] border border-white/[0.055] bg-black/[0.10] p-3.5 transition hover:border-white/[0.10] hover:bg-white/[0.045] sm:p-4"
                    >

                      <div className="flex items-center gap-3 sm:gap-4">

                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            isIncome
                              ? "border-emerald-400/10 bg-emerald-400/10 text-emerald-400"
                              : "border-red-400/10 bg-red-400/10 text-red-400"
                          }`}
                        >

                          {isIncome ? (
                            <ArrowUpRight
                              size={19}
                            />
                          ) : (
                            <ArrowDownRight
                              size={19}
                            />
                          )}

                        </div>

                        <div className="min-w-0 flex-1">

                          <div className="flex min-w-0 items-center gap-2">

                            <p className="truncate text-sm font-semibold text-white/90">
                              {item.category ||
                                "Other"}
                            </p>

                            <span
                              className={`hidden rounded-lg px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:inline ${
                                isIncome
                                  ? "bg-emerald-400/10 text-emerald-400"
                                  : "bg-red-400/10 text-red-400"
                              }`}
                            >
                              {isIncome
                                ? "Income"
                                : "Expense"}
                            </span>

                          </div>

                          <p className="mt-0.5 truncate text-[11px] text-white/30">
                            {item.description ||
                              "No description"}
                          </p>

                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/20">

                            <CalendarDays
                              size={11}
                            />

                            <span>
                              {formatRecordDate(
                                item.date
                              )}
                            </span>

                          </div>

                        </div>

                        <div className="flex shrink-0 items-center gap-2">

                          <div className="hidden text-right sm:block">

                            <p
                              className={`text-sm font-bold ${
                                isIncome
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {isIncome
                                ? "+"
                                : "-"}{" "}
                              {money(
                                item.amount
                              )}
                            </p>

                          </div>

                          <div className="flex gap-1.5">

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  item
                                )
                              }
                              disabled={saving}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.05] text-white/50 transition hover:bg-white/[0.10] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Edit transaction"
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(
                                  item.id
                                )
                              }
                              disabled={saving}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/10 bg-red-400/[0.07] text-red-400 transition hover:bg-red-400/[0.14] hover:text-red-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                              aria-label="Delete transaction"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>

                          </div>

                        </div>

                      </div>

                      <div className="mt-2.5 border-t border-white/[0.05] pt-2.5 sm:hidden">

                        <p
                          className={`text-right text-sm font-bold ${
                            isIncome
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {isIncome
                            ? "+"
                            : "-"}{" "}
                          {money(
                            item.amount
                          )}
                        </p>

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </div>

        {/* ALL TIME OVERVIEW */}

        {records.length > 0 && (

          <div className="mt-5 overflow-hidden rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-5 shadow-xl shadow-black/10 backdrop-blur-2xl">

            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white/50">
                  <TrendingUp size={17} />
                </div>

                <div>

                  <p className="text-sm font-semibold">
                    All-time overview
                  </p>

                  <p className="mt-0.5 text-[11px] text-white/30">
                    Based on all your saved finance records
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-3 gap-5">

                <div>

                  <p className="text-[9px] uppercase tracking-wider text-white/25">
                    Income
                  </p>

                  <p className="mt-1 text-xs font-semibold text-emerald-400 sm:text-sm">
                    {money(
                      allTimeTotals.income
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-[9px] uppercase tracking-wider text-white/25">
                    Expense
                  </p>

                  <p className="mt-1 text-xs font-semibold text-red-400 sm:text-sm">
                    {money(
                      allTimeTotals.expense
                    )}
                  </p>

                </div>

                <div>

                  <p className="text-[9px] uppercase tracking-wider text-white/25">
                    Balance
                  </p>

                  <p
                    className={`mt-1 text-xs font-semibold sm:text-sm ${
                      allTimeTotals.balance >= 0
                        ? "text-blue-400"
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

      </div>

      {/* MOBILE ADD BUTTON */}

      <button
        type="button"
        onClick={openAddForm}
        disabled={saving}
        aria-label="Add transaction"
        className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white text-black shadow-2xl shadow-black/50 transition hover:scale-105 hover:bg-white/90 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50 sm:hidden"
      >
        <Plus
          size={24}
          strokeWidth={2.5}
        />
      </button>

      {/* ADD / EDIT MODAL */}

      {showForm && (

        <div
          className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 p-0 backdrop-blur-xl sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              resetForm();
            }
          }}
        >

          <div className="relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#101010]/95 shadow-2xl shadow-black/60 backdrop-blur-3xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-[30px]">

            <div
              className={`pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl ${
                form.type === "income"
                  ? "bg-emerald-500/10"
                  : "bg-red-500/10"
              }`}
            />

            <div className="relative flex shrink-0 items-center justify-between border-b border-white/[0.06] p-5 sm:p-6">

              <div className="flex items-center gap-3">

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    form.type === "income"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : "bg-red-400/10 text-red-400"
                  }`}
                >
                  <Wallet size={18} />
                </div>

                <div>

                  <h2 className="text-lg font-semibold">
                    {editingId
                      ? "Edit Transaction"
                      : "Add Transaction"}
                  </h2>

                  <p className="mt-0.5 text-[11px] text-white/30">
                    Manage your finance record
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.06] text-white/60 transition hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
                aria-label="Close"
              >
                <X size={18} />
              </button>

            </div>

            <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">

              <form
                onSubmit={handleSubmit}
                className="space-y-4 pb-2"
              >

                {/* TYPE */}

                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">

                  <button
                    type="button"
                    onClick={() =>
                      changeType(
                        "income"
                      )
                    }
                    disabled={saving}
                    className={`rounded-xl py-3 text-sm font-semibold transition ${
                      form.type ===
                      "income"
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white/70"
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
                    className={`rounded-xl py-3 text-sm font-semibold transition ${
                      form.type ===
                      "expense"
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                        : "text-white/40 hover:bg-white/[0.05] hover:text-white/70"
                    }`}
                  >
                    Expense
                  </button>

                </div>

                {/* AMOUNT */}

                <div>

                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/35">
                    Amount (
                    {
                      currentCurrency.code
                    })
                  </label>

                  <div className="relative">

                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/30">
                      {
                        currentCurrency.symbol
                      }
                    </span>

                    <input
                      type="number"
                      name="amount"
                      value={
                        form.amount
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="5000"
                      min="0.01"
                      step="0.01"
                      required
                      inputMode="decimal"
                      disabled={saving}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-white/15 focus:border-white/20 focus:bg-white/[0.07] disabled:opacity-50"
                    />

                  </div>

                </div>

                {/* CATEGORY */}

                <div>

                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/35">
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
                      className="w-full appearance-none rounded-2xl border border-white/[0.08] bg-[#181818] px-4 py-3.5 pr-10 text-sm text-white outline-none transition focus:border-white/20 disabled:opacity-50"
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
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/30"
                    />

                  </div>

                </div>

                {/* DESCRIPTION */}

                <div>

                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/35">
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
                    className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/15 focus:border-white/20 focus:bg-white/[0.07] disabled:opacity-50"
                  />

                </div>

                {/* DATE */}

                <div>

                  <label className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/35">
                    Date
                  </label>

                  <div className="relative">

                    <CalendarDays
                      size={16}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/25"
                    />

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
                      disabled={saving}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.045] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-white/20 disabled:opacity-50"
                    />

                  </div>

                </div>

                {/* SAVE */}

                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full rounded-2xl py-3.5 text-sm font-semibold text-white shadow-xl transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                    form.type ===
                    "income"
                      ? "bg-emerald-500 shadow-emerald-500/20 hover:bg-emerald-400"
                      : "bg-red-500 shadow-red-500/20 hover:bg-red-400"
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