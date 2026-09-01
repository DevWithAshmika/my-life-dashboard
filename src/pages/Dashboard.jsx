import { useEffect, useMemo, useState } from "react";

import {
  Wallet,
  CheckSquare,
  Target,
  Repeat,
  Dumbbell,
  CalendarDays,
  Map,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Settings2,
  DollarSign,
  ChevronDown,
  RefreshCw,
  Check,
  ArrowUpRight,
} from "lucide-react";

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

import { db } from "../firebase/config";
import Loading from "../components/Loading";

// ===========================================================
// CURRENCIES
// ===========================================================

const CURRENCIES = {
  LKR: {
    code: "LKR",
    symbol: "Rs.",
    name: "Sri Lankan Rupee",
  },

  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
  },

  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
  },

  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
  },
};

// ===========================================================
// MAIN DASHBOARD
// ===========================================================

export default function Dashboard({
  user,
  setActivePage,
}) {
  // =========================================================
  // DATA
  // =========================================================

  const [data, setData] = useState({
    finance: [],
    tasks: [],
    goals: [],
    habits: [],
    fitness: [],
    calendar: [],
    travel: [],
    notes: [],
  });

  // =========================================================
  // SETTINGS
  // =========================================================

  const [preferences, setPreferences] = useState({
    currency: "LKR",
    exchangeCurrency: "USD",

    showFinance: true,
    showTasks: true,
    showGoals: true,
    showHabits: true,
    showFitness: true,
    showTravel: true,
  });

  const [loading, setLoading] = useState(true);

  // =========================================================
  // EXCHANGE RATE
  // =========================================================

  const [exchangeRate, setExchangeRate] = useState(null);
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeError, setExchangeError] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);

  // =========================================================
  // CURRENCY INFO
  // =========================================================

  const currencyInfo = useMemo(() => {
    return (
      CURRENCIES[preferences.currency] ||
      CURRENCIES.LKR
    );
  }, [preferences.currency]);

  const exchangeCurrencyInfo = useMemo(() => {
    return (
      CURRENCIES[preferences.exchangeCurrency] ||
      CURRENCIES.USD
    );
  }, [preferences.exchangeCurrency]);

  // =========================================================
  // PAGE NAVIGATION
  // =========================================================

  function goToPage(page) {
    if (typeof setActivePage === "function") {
      setActivePage(page);
    }
  }

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  function formatMoney(amount) {
    const number = Number(amount || 0);

    return `${currencyInfo.symbol} ${number.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  // =========================================================
  // FIREBASE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const collectionNames = [
      "finance",
      "tasks",
      "goals",
      "habits",
      "fitness",
      "calendar",
      "travel",
      "notes",
    ];

    const unsubscribers = collectionNames.map(
      (collectionName) => {
        const reference = collection(
          db,
          "users",
          user.uid,
          collectionName
        );

        return onSnapshot(
          reference,
          (snapshot) => {
            const items = snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

            setData((previous) => ({
              ...previous,
              [collectionName]: items,
            }));

            setLoading(false);
          },
          (error) => {
            console.error(
              `${collectionName} error:`,
              error
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribers.forEach(
        (unsubscribe) => unsubscribe()
      );
    };
  }, [user?.uid]);

  // =========================================================
  // LIVE SETTINGS
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const reference = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        if (!snapshot.exists()) {
          return;
        }

        const settings = snapshot.data();

        setPreferences({
          currency:
            typeof settings.currency === "string"
              ? settings.currency
              : "LKR",

          exchangeCurrency:
            typeof settings.exchangeCurrency === "string"
              ? settings.exchangeCurrency
              : "USD",

          showFinance:
            settings.showFinance !== false,

          showTasks:
            settings.showTasks !== false,

          showGoals:
            settings.showGoals !== false,

          showHabits:
            settings.showHabits !== false,

          showFitness:
            settings.showFitness !== false,

          showTravel:
            settings.showTravel !== false,
        });
      },
      (error) => {
        console.error(
          "Dashboard settings error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // EXCHANGE RATE
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadExchangeRate() {
      const base =
        preferences.exchangeCurrency;

      const quote =
        preferences.currency;

      setExchangeError(false);

      if (base === quote) {
        setExchangeRate(1);
        setExchangeLoading(false);
        return;
      }

      setExchangeLoading(true);

      try {
        const response = await fetch(
          `https://api.frankfurter.dev/v2/rate/${base}/${quote}`
        );

        if (!response.ok) {
          throw new Error(
            "Exchange rate request failed"
          );
        }

        const result =
          await response.json();

        if (!cancelled) {
          setExchangeRate(
            Number(result.rate || 0)
          );

          setExchangeError(false);
        }
      } catch (error) {
        console.error(
          "Exchange rate error:",
          error
        );

        if (!cancelled) {
          setExchangeRate(null);
          setExchangeError(true);
        }
      } finally {
        if (!cancelled) {
          setExchangeLoading(false);
        }
      }
    }

    loadExchangeRate();

    return () => {
      cancelled = true;
    };
  }, [
    preferences.currency,
    preferences.exchangeCurrency,
  ]);

  // =========================================================
  // CHANGE EXCHANGE CURRENCY
  // =========================================================

  const changeExchangeCurrency =
    async (currency) => {
      if (!user?.uid) {
        return;
      }

      setExchangeOpen(false);

      setPreferences((previous) => ({
        ...previous,
        exchangeCurrency: currency,
      }));

      try {
        const settingsRef = doc(
          db,
          "users",
          user.uid,
          "settings",
          "preferences"
        );

        await setDoc(
          settingsRef,
          {
            exchangeCurrency: currency,
          },
          {
            merge: true,
          }
        );
      } catch (error) {
        console.error(
          "Exchange currency save error:",
          error
        );
      }
    };

  // =========================================================
  // DATE
  // =========================================================

  const today = new Date();

  const todayString =
    formatDate(today);

  const currentMonth = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}`;

  // =========================================================
  // FINANCE
  // CURRENT MONTH
  // =========================================================

  const financeStats = useMemo(() => {
    let income = 0;
    let expense = 0;

    data.finance.forEach((item) => {
      if (
        !String(item.date || "").startsWith(
          currentMonth
        )
      ) {
        return;
      }

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
  }, [
    data.finance,
    currentMonth,
  ]);

  // =========================================================
  // TOTAL FINANCE BALANCE
  // =========================================================

  const totalFinanceBalance =
    useMemo(() => {
      let income = 0;
      let expense = 0;

      data.finance.forEach((item) => {
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
    }, [data.finance]);

  // =========================================================
  // 7 DAY FINANCE
  // =========================================================

  const last7Days = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();

      date.setDate(
        date.getDate() - i
      );

      const dateString =
        formatDate(date);

      const dayName =
        date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        );

      let income = 0;
      let expense = 0;

      data.finance.forEach((item) => {
        if (item.date !== dateString) {
          return;
        }

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

      days.push({
        date: dateString,
        day: dayName,
        income,
        expense,
      });
    }

    return days;
  }, [data.finance]);

  // =========================================================
  // MONTHLY EXPENSE
  // =========================================================

  const monthlyAnalytics =
    useMemo(() => {
      const categoryTotals = {};

      data.finance.forEach((item) => {
        if (item.type !== "expense") {
          return;
        }

        if (
          !String(item.date || "").startsWith(
            currentMonth
          )
        ) {
          return;
        }

        const category =
          item.category || "Other";

        const amount = Number(
          item.amount || 0
        );

        categoryTotals[category] =
          (categoryTotals[category] || 0) +
          amount;
      });

      return Object.entries(
        categoryTotals
      )
        .map(
          ([category, amount]) => ({
            category,
            amount,
          })
        )
        .sort(
          (a, b) =>
            b.amount - a.amount
        );
    }, [
      data.finance,
      currentMonth,
    ]);

  // =========================================================
  // TASKS
  // =========================================================

  const taskStats = useMemo(() => {
    const total =
      data.tasks.length;

    const completed =
      data.tasks.filter(
        (task) =>
          task.completed === true ||
          task.status === "completed" ||
          task.status === "done"
      ).length;

    const pending =
      total - completed;

    const percentage =
      total > 0
        ? Math.round(
            (completed / total) * 100
          )
        : 0;

    return {
      total,
      completed,
      pending,
      percentage,
    };
  }, [data.tasks]);

  // =========================================================
  // GOALS
  // =========================================================

  const goalStats = useMemo(() => {
    const total =
      data.goals.length;

    const completed =
      data.goals.filter(
        (goal) =>
          goal.completed === true ||
          goal.status === "completed"
      ).length;

    const percentage =
      total > 0
        ? Math.round(
            (completed / total) * 100
          )
        : 0;

    return {
      total,
      completed,
      percentage,
    };
  }, [data.goals]);

  // =========================================================
  // HABITS
  // =========================================================

  const habitStats = useMemo(() => {
    const total =
      data.habits.length;

    const completedToday =
      data.habits.filter(
        (habit) =>
          habit.completedToday === true ||
          habit.todayCompleted === true
      ).length;

    const percentage =
      total > 0
        ? Math.round(
            (completedToday / total) * 100
          )
        : 0;

    return {
      total,
      completedToday,
      percentage,
    };
  }, [data.habits]);

  // =========================================================
  // FITNESS
  // =========================================================

  const fitnessStats = useMemo(
    () => ({
      workouts:
        data.fitness.length,
    }),
    [data.fitness]
  );

  // =========================================================
  // EVENTS
  // =========================================================

  const upcomingEvents =
    useMemo(() => {
      return [...data.calendar]
        .filter((event) => {
          if (!event.date) {
            return false;
          }

          return (
            event.date >= todayString
          );
        })
        .sort((a, b) =>
          String(a.date).localeCompare(
            String(b.date)
          )
        )
        .slice(0, 5);
    }, [
      data.calendar,
      todayString,
    ]);

  // =========================================================
  // TRAVEL
  // =========================================================

  const upcomingTrips =
    useMemo(() => {
      return [...data.travel]
        .filter((trip) => {
          if (!trip.date) {
            return true;
          }

          return (
            trip.date >= todayString
          );
        })
        .sort((a, b) =>
          String(a.date).localeCompare(
            String(b.date)
          )
        )
        .slice(0, 3);
    }, [
      data.travel,
      todayString,
    ]);

  // =========================================================
  // NOTES
  // =========================================================

  const recentNotes =
    useMemo(() => {
      return [...data.notes]
        .sort((a, b) => {
          const aTime =
            a.createdAt?.seconds || 0;

          const bTime =
            b.createdAt?.seconds || 0;

          return bTime - aTime;
        })
        .slice(0, 3);
    }, [data.notes]);

  // =========================================================
  // GREETING
  // =========================================================

  const hour =
    new Date().getHours();

  let greeting =
    "Good morning";

  if (hour >= 12 && hour < 18) {
    greeting =
      "Good afternoon";
  }

  if (hour >= 18 && hour < 22) {
    greeting =
      "Good evening";
  }

  if (hour >= 22 || hour < 5) {
    greeting =
      "Good night";
  }

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading
        text="Loading your dashboard..."
      />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* HEADER */}

      <div className="mb-8">
        <p className="mb-1 text-sm text-white/40">
          {greeting}
        </p>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {user?.displayName ||
                "My Dashboard"}
            </h1>

            <p className="mt-2 text-base text-white/40">
              Here's your personal life overview.
            </p>
          </div>

          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              className="h-14 w-14 rounded-2xl object-cover ring-1 ring-white/10"
            />
          )}
        </div>
      </div>

      {/* =====================================================
          TOP STATS
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* TOTAL BALANCE */}

        {preferences.showFinance && (
          <button
            type="button"
            onClick={() =>
              goToPage("finance")
            }
            className="group w-full text-left"
          >
            <DashboardCard color="green">
              <div className="flex items-start justify-between">
                <CardIcon color="green">
                  <Wallet size={21} />
                </CardIcon>

                <ArrowUpRight
                  size={18}
                  className="text-white/20 transition group-hover:text-emerald-400"
                />
              </div>

              <p className="text-base font-medium text-white/45">
                Total Balance
              </p>

              <h2
                className={`mt-2 text-3xl font-bold ${
                  totalFinanceBalance.balance >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {formatMoney(
                  totalFinanceBalance.balance
                )}
              </h2>

              <div className="mt-3 flex flex-wrap gap-4 text-xs">
                <span className="text-emerald-400">
                  +{" "}
                  {formatMoney(
                    totalFinanceBalance.income
                  )}
                </span>

                <span className="text-red-400">
                  -{" "}
                  {formatMoney(
                    totalFinanceBalance.expense
                  )}
                </span>
              </div>
            </DashboardCard>
          </button>
        )}

        {/* TASKS */}

        {preferences.showTasks && (
          <button
            type="button"
            onClick={() =>
              goToPage("tasks")
            }
            className="group w-full text-left"
          >
            <DashboardCard color="blue">
              <div className="flex items-start justify-between">
                <CardIcon color="blue">
                  <CheckSquare size={21} />
                </CardIcon>

                <ArrowUpRight
                  size={18}
                  className="text-white/20 transition group-hover:text-blue-400"
                />
              </div>

              <p className="text-base font-medium text-white/45">
                Tasks pending
              </p>

              <h2 className="mt-2 text-3xl font-bold text-blue-400">
                {taskStats.pending}
              </h2>

              <p className="mt-2 text-sm text-white/30">
                {taskStats.completed} completed
              </p>
            </DashboardCard>
          </button>
        )}

        {/* GOALS */}

        {preferences.showGoals && (
          <button
            type="button"
            onClick={() =>
              goToPage("goals")
            }
            className="group w-full text-left"
          >
            <DashboardCard color="blue">
              <div className="flex items-start justify-between">
                <CardIcon color="blue">
                  <Target size={21} />
                </CardIcon>

                <ArrowUpRight
                  size={18}
                  className="text-white/20 transition group-hover:text-blue-400"
                />
              </div>

              <p className="text-base font-medium text-white/45">
                Goal progress
              </p>

              <h2 className="mt-2 text-3xl font-bold text-blue-400">
                {goalStats.percentage}%
              </h2>

              <ProgressBar
                percentage={
                  goalStats.percentage
                }
                color="blue"
              />
            </DashboardCard>
          </button>
        )}

        {/* HABITS */}

        {preferences.showHabits && (
          <button
            type="button"
            onClick={() =>
              goToPage("habits")
            }
            className="group w-full text-left"
          >
            <DashboardCard color="green">
              <div className="flex items-start justify-between">
                <CardIcon color="green">
                  <Repeat size={21} />
                </CardIcon>

                <ArrowUpRight
                  size={18}
                  className="text-white/20 transition group-hover:text-emerald-400"
                />
              </div>

              <p className="text-base font-medium text-white/45">
                Habits today
              </p>

              <h2 className="mt-2 text-3xl font-bold text-emerald-400">
                {habitStats.completedToday}/
                {habitStats.total}
              </h2>

              <p className="mt-2 text-sm text-white/30">
                {habitStats.percentage}% completed
              </p>
            </DashboardCard>
          </button>
        )}
      </div>

      {/* =====================================================
          EXCHANGE RATE
      ====================================================== */}

      {preferences.showFinance && (
        <SectionCard
          className="mb-6"
          color="blue"
        >
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

            <div className="flex items-center gap-3">
              <CardIcon color="blue">
                <DollarSign size={20} />
              </CardIcon>

              <div>
                <h2 className="font-semibold">
                  Currency & Exchange Rate
                </h2>

                <p className="mt-1 text-xs text-white/30">
                  Click the currency to change it
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setExchangeOpen(
                    (previous) =>
                      !previous
                  )
                }
                className="flex min-w-[150px] items-center justify-between gap-4 rounded-2xl border border-blue-400/20 bg-blue-500/5 px-4 py-3 transition hover:bg-blue-500/10"
              >
                <div className="flex items-center gap-3">

                  <span className="text-lg font-bold text-blue-400">
                    {
                      exchangeCurrencyInfo.symbol
                    }
                  </span>

                  <div className="text-left">
                    <p className="text-xs text-white/30">
                      Exchange
                    </p>

                    <p className="font-semibold">
                      {
                        exchangeCurrencyInfo.code
                      }
                    </p>
                  </div>

                </div>

                <ChevronDown
                  size={17}
                  className={`transition ${
                    exchangeOpen
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              {exchangeOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-2xl border border-blue-400/20 bg-[#151515] p-2 shadow-2xl">

                  {Object.values(
                    CURRENCIES
                  ).map((currency) => {
                    const active =
                      preferences.exchangeCurrency ===
                      currency.code;

                    return (
                      <button
                        key={currency.code}
                        type="button"
                        onClick={() =>
                          changeExchangeCurrency(
                            currency.code
                          )
                        }
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                          active
                            ? "bg-blue-500/15"
                            : "hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-3">

                          <span className="w-7 text-center font-semibold text-blue-400">
                            {currency.symbol}
                          </span>

                          <div>
                            <p className="text-sm font-medium">
                              {currency.code}
                            </p>

                            <p className="text-[10px] text-white/30">
                              {currency.name}
                            </p>
                          </div>

                        </div>

                        {active && (
                          <span className="text-blue-400">
                            <Check size={16} />
                          </span>
                        )}
                      </button>
                    );
                  })}

                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-blue-400/10 bg-blue-500/[0.03] p-5">

            {exchangeLoading ? (
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />

                <span className="text-sm text-white/40">
                  Loading exchange rate...
                </span>
              </div>
            ) : exchangeError ? (
              <div>
                <div className="flex items-center gap-2 text-red-400">
                  <RefreshCw size={16} />

                  <p className="text-sm font-medium">
                    Exchange rate unavailable
                  </p>
                </div>

                <p className="mt-2 text-xs text-white/25">
                  Please check your internet connection and try again.
                </p>
              </div>
            ) : exchangeRate !== null ? (
              <div>
                <p className="text-sm text-white/40">
                  Current exchange rate
                </p>

                <div className="mt-2 flex flex-wrap items-baseline gap-2">

                  <span className="text-2xl font-bold">
                    1{" "}
                    {
                      exchangeCurrencyInfo.code
                    }
                  </span>

                  <span className="text-white/30">
                    =
                  </span>

                  <span className="text-2xl font-bold text-blue-400">
                    {
                      currencyInfo.symbol
                    }{" "}
                    {Number(
                      exchangeRate
                    ).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      }
                    )}
                  </span>

                  <span className="text-lg font-semibold text-blue-400">
                    {
                      currencyInfo.code
                    }
                  </span>

                </div>

                <p className="mt-2 text-xs text-white/25">
                  1{" "}
                  {
                    exchangeCurrencyInfo.code
                  }{" "}
                  converted to your main currency (
                  {
                    currencyInfo.code
                  }
                  )
                </p>
              </div>
            ) : null}

          </div>
        </SectionCard>
      )}

      {/* =====================================================
          FINANCE + TASKS
      ====================================================== */}

      {(preferences.showFinance ||
        preferences.showTasks) && (
        <div className="mb-6 grid gap-5 lg:grid-cols-2">

          {preferences.showFinance && (
            <SectionCard color="green">

              <SectionHeader
                icon={<Wallet size={20} />}
                title="Finance Overview"
                subtitle="This month"
                action={() =>
                  goToPage("finance")
                }
                color="green"
              />

              <div className="grid grid-cols-2 gap-3">

                <MiniCard
                  icon={
                    <TrendingUp size={17} />
                  }
                  title="Income"
                  value={
                    financeStats.income
                  }
                  positive
                  currencyInfo={
                    currencyInfo
                  }
                />

                <MiniCard
                  icon={
                    <TrendingDown size={17} />
                  }
                  title="Expenses"
                  value={
                    financeStats.expense
                  }
                  negative
                  currencyInfo={
                    currencyInfo
                  }
                />

              </div>

              <button
                type="button"
                onClick={() =>
                  goToPage("finance")
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 transition hover:bg-emerald-500/15"
              >
                Open Finance
                <ArrowUpRight size={15} />
              </button>

            </SectionCard>
          )}

          {preferences.showTasks && (
            <SectionCard color="blue">

              <SectionHeader
                icon={
                  <CheckSquare size={20} />
                }
                title="Task Progress"
                subtitle="Your current task progress"
                action={() =>
                  goToPage("tasks")
                }
                color="blue"
              />

              <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/10">

                <div
                  className="h-full rounded-full bg-blue-400 transition-all"
                  style={{
                    width: `${taskStats.percentage}%`,
                  }}
                />

              </div>

              <div className="flex justify-between text-sm">

                <span className="text-white/40">
                  {taskStats.completed} completed
                </span>

                <span className="text-blue-400">
                  {taskStats.percentage}%
                </span>

              </div>

              <button
                type="button"
                onClick={() =>
                  goToPage("tasks")
                }
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500/10 px-4 py-3 text-sm text-blue-400 transition hover:bg-blue-500/15"
              >
                Open Tasks
                <ArrowUpRight size={15} />
              </button>

            </SectionCard>
          )}

        </div>
      )}

      {/* =====================================================
          7 DAY FINANCE
      ====================================================== */}

      {preferences.showFinance && (
        <SectionCard
          className="mb-6"
          color="green"
        >

          <SectionHeader
            icon={
              <TrendingUp size={20} />
            }
            title="7-Day Finance"
            subtitle="Income and expenses for the last 7 days"
            action={() =>
              goToPage("finance")
            }
            color="green"
          />

          <div className="h-[300px] w-full">

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <BarChart data={last7Days}>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />

                <XAxis
                  dataKey="day"
                  stroke="rgba(255,255,255,0.35)"
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  stroke="rgba(255,255,255,0.35)"
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "16px",
                    color: "#fff",
                  }}
                  formatter={(value) =>
                    formatMoney(value)
                  }
                />

                <Bar
                  dataKey="income"
                  name="Income"
                  fill="#34d399"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill="#f87171"
                  radius={[6, 6, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </SectionCard>
      )}

      {/* =====================================================
          MONTHLY EXPENSE
      ====================================================== */}

      {preferences.showFinance && (
        <SectionCard
          className="mb-6"
          color="red"
        >

          <SectionHeader
            icon={
              <TrendingDown size={20} />
            }
            title="Monthly Expense Breakdown"
            subtitle="Where your money is going this month"
            action={() =>
              goToPage("finance")
            }
            color="red"
          />

          {monthlyAnalytics.length === 0 ? (
            <EmptyState text="No expenses recorded this month." />
          ) : (
            <div className="space-y-5">

              {monthlyAnalytics.map(
                (item) => {

                  const percentage =
                    financeStats.expense > 0
                      ? Math.round(
                          (item.amount /
                            financeStats.expense) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={item.category}
                    >

                      <div className="mb-2 flex items-center justify-between">

                        <span className="text-sm">
                          {item.category}
                        </span>

                        <span className="text-sm text-red-400/80">
                          {formatMoney(
                            item.amount
                          )}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-white/10">

                        <div
                          className="h-full rounded-full bg-red-400 transition-all"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                      <p className="mt-1 text-right text-xs text-white/20">
                        {percentage}%
                      </p>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </SectionCard>
      )}

      {/* =====================================================
          QUICK OVERVIEW
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {preferences.showFitness && (
          <button
            type="button"
            onClick={() =>
              goToPage("fitness")
            }
            className="group text-left"
          >
            <QuickCard
              icon={
                <Dumbbell size={20} />
              }
              title="Workouts"
              value={
                fitnessStats.workouts
              }
              color="green"
            />
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            goToPage("calendar")
          }
          className="group text-left"
        >
          <QuickCard
            icon={
              <CalendarDays size={20} />
            }
            title="Upcoming Events"
            value={
              upcomingEvents.length
            }
            color="blue"
          />
        </button>

        {preferences.showTravel && (
          <button
            type="button"
            onClick={() =>
              goToPage("travel")
            }
            className="group text-left"
          >
            <QuickCard
              icon={<Map size={20} />}
              title="Trips"
              value={
                data.travel.length
              }
              color="blue"
            />
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            goToPage("notes")
          }
          className="group text-left"
        >
          <QuickCard
            icon={
              <FileText size={20} />
            }
            title="Notes"
            value={
              data.notes.length
            }
            color="blue"
          />
        </button>

      </div>

      {/* =====================================================
          EVENTS + TRAVEL
      ====================================================== */}

      <div className="grid gap-5 lg:grid-cols-2">

        {/* EVENTS */}

        <SectionCard color="blue">

          <SectionHeader
            icon={
              <CalendarDays size={20} />
            }
            title="Upcoming Events"
            subtitle="From your calendar"
            action={() =>
              goToPage("calendar")
            }
            color="blue"
          />

          {upcomingEvents.length === 0 ? (
            <EmptyState text="No upcoming events." />
          ) : (
            <div className="space-y-3">

              {upcomingEvents.map(
                (event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() =>
                      goToPage("calendar")
                    }
                    className="group flex w-full items-center gap-3 rounded-2xl border border-blue-400/10 bg-blue-500/[0.03] p-4 text-left transition hover:bg-blue-500/[0.07]"
                  >

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <Clock size={17} />
                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate font-medium">
                        {event.title ||
                          "Untitled Event"}
                      </p>

                      <p className="mt-1 text-xs text-white/30">
                        {event.date}
                      </p>

                    </div>

                    <ArrowUpRight
                      size={16}
                      className="shrink-0 text-white/20 transition group-hover:text-blue-400"
                    />

                  </button>
                )
              )}

            </div>
          )}

        </SectionCard>

        {/* TRAVEL */}

        {preferences.showTravel && (
          <SectionCard color="blue">

            <SectionHeader
              icon={<Map size={20} />}
              title="Upcoming Travel"
              subtitle="Your next journeys"
              action={() =>
                goToPage("travel")
              }
              color="blue"
            />

            {upcomingTrips.length === 0 ? (
              <EmptyState text="No upcoming trips." />
            ) : (
              <div className="space-y-3">

                {upcomingTrips.map(
                  (trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() =>
                        goToPage("travel")
                      }
                      className="group w-full rounded-2xl border border-blue-400/10 bg-blue-500/[0.03] p-4 text-left transition hover:bg-blue-500/[0.07]"
                    >

                      <div className="flex items-center justify-between gap-3">

                        <p className="font-medium">
                          {trip.place ||
                            trip.title ||
                            "Unnamed Trip"}
                        </p>

                        <ArrowUpRight
                          size={16}
                          className="shrink-0 text-white/20 transition group-hover:text-blue-400"
                        />

                      </div>

                      {trip.date && (
                        <span className="mt-1 block text-xs text-white/30">
                          {trip.date}
                        </span>
                      )}

                      {trip.notes && (
                        <p className="mt-2 line-clamp-2 text-xs text-white/30">
                          {trip.notes}
                        </p>
                      )}

                    </button>
                  )
                )}

              </div>
            )}

          </SectionCard>
        )}

      </div>

      {/* =====================================================
          NOTES
      ====================================================== */}

      <SectionCard
        className="mt-5"
        color="blue"
      >

        <SectionHeader
          icon={
            <FileText size={20} />
          }
          title="Recent Notes"
          subtitle="Your latest notes"
          action={() =>
            goToPage("notes")
          }
          color="blue"
        />

        {recentNotes.length === 0 ? (
          <EmptyState text="No notes yet." />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">

            {recentNotes.map(
              (note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() =>
                    goToPage("notes")
                  }
                  className="group rounded-2xl border border-blue-400/10 bg-blue-500/[0.03] p-4 text-left transition hover:bg-blue-500/[0.07]"
                >

                  <div className="flex items-start justify-between gap-3">

                    <p className="font-medium">
                      {note.title ||
                        "Untitled"}
                    </p>

                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-white/20 transition group-hover:text-blue-400"
                    />

                  </div>

                  <p className="mt-2 line-clamp-3 text-sm text-white/30">
                    {note.content ||
                      note.text ||
                      "No content"}
                  </p>

                </button>
              )
            )}

          </div>
        )}

      </SectionCard>

      {/* =====================================================
          SETTINGS HINT
      ====================================================== */}

      {!preferences.showFinance &&
        !preferences.showTasks &&
        !preferences.showGoals &&
        !preferences.showHabits &&
        !preferences.showFitness &&
        !preferences.showTravel && (
          <div className="mt-6 rounded-3xl border border-blue-400/10 bg-blue-500/[0.03] p-8 text-center">

            <Settings2
              size={28}
              className="mx-auto mb-3 text-blue-400/40"
            />

            <h3 className="font-semibold">
              Dashboard is customized
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-white/30">
              All optional dashboard sections
              are currently hidden. You can
              enable them again from Settings.
            </p>

          </div>
        )}

    </div>
  );
}

// ===========================================================
// DATE FORMAT
// ===========================================================

function formatDate(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ===========================================================
// COLOR HELPERS
// ===========================================================

function getCardColor(color) {
  if (color === "green") {
    return {
      border:
        "border-emerald-400/10",
      background:
        "bg-emerald-500/[0.025]",
      hover:
        "group-hover:border-emerald-400/25 group-hover:bg-emerald-500/[0.04]",
    };
  }

  if (color === "red") {
    return {
      border:
        "border-red-400/10",
      background:
        "bg-red-500/[0.025]",
      hover:
        "group-hover:border-red-400/25 group-hover:bg-red-500/[0.04]",
    };
  }

  if (color === "blue") {
    return {
      border:
        "border-blue-400/10",
      background:
        "bg-blue-500/[0.025]",
      hover:
        "group-hover:border-blue-400/25 group-hover:bg-blue-500/[0.04]",
    };
  }

  return {
    border:
      "border-white/10",
    background:
      "bg-white/[0.04]",
    hover:
      "group-hover:border-white/20 group-hover:bg-white/[0.06]",
  };
}

// ===========================================================
// DASHBOARD CARD
// ===========================================================

function DashboardCard({
  children,
  color = "default",
}) {
  const colors =
    getCardColor(color);

  return (
    <div
      className={`rounded-3xl border ${colors.border} ${colors.background} p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition ${colors.hover}`}
    >
      {children}
    </div>
  );
}

// ===========================================================
// CARD ICON
// ===========================================================

function CardIcon({
  children,
  color = "default",
}) {
  const classes = {
    green:
      "bg-emerald-500/10 text-emerald-400",
    red:
      "bg-red-500/10 text-red-400",
    blue:
      "bg-blue-500/10 text-blue-400",
    default:
      "bg-white/10 text-white/70",
  };

  return (
    <div
      className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${
        classes[color] ||
        classes.default
      }`}
    >
      {children}
    </div>
  );
}

// ===========================================================
// SECTION CARD
// ===========================================================

function SectionCard({
  children,
  className = "",
  color = "default",
}) {
  const colors =
    getCardColor(color);

  return (
    <div
      className={`rounded-3xl border ${colors.border} ${colors.background} p-5 shadow-xl shadow-black/10 backdrop-blur-2xl sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// ===========================================================
// SECTION HEADER
// ===========================================================

function SectionHeader({
  icon,
  title,
  subtitle,
  action,
  color = "default",
}) {
  const iconClasses = {
    green:
      "bg-emerald-500/10 text-emerald-400",
    red:
      "bg-red-500/10 text-red-400",
    blue:
      "bg-blue-500/10 text-blue-400",
    default:
      "bg-white/10 text-white/70",
  };

  const arrowClasses = {
    green:
      "hover:bg-emerald-500/10 hover:text-emerald-400",
    red:
      "hover:bg-red-500/10 hover:text-red-400",
    blue:
      "hover:bg-blue-500/10 hover:text-blue-400",
    default:
      "hover:bg-white/[0.1] hover:text-white",
  };

  return (
    <div className="mb-6 flex items-center justify-between gap-3">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            iconClasses[color] ||
            iconClasses.default
          }`}
        >
          {icon}
        </div>

        <div>

          <h2 className="font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-xs text-white/30">
            {subtitle}
          </p>

        </div>

      </div>

      {action && (
        <button
          type="button"
          onClick={action}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/30 transition ${
            arrowClasses[color] ||
            arrowClasses.default
          }`}
          aria-label={`Open ${title}`}
        >
          <ArrowUpRight size={16} />
        </button>
      )}

    </div>
  );
}

// ===========================================================
// MINI CARD
// ===========================================================

function MiniCard({
  icon,
  title,
  value,
  positive,
  negative,
  currencyInfo,
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${
        positive
          ? "border border-emerald-400/10 bg-emerald-500/[0.04]"
          : negative
          ? "border border-red-400/10 bg-red-500/[0.04]"
          : "bg-white/[0.04]"
      }`}
    >

      <div
        className={`flex items-center gap-2 text-xs ${
          positive
            ? "text-emerald-400"
            : negative
            ? "text-red-400"
            : "text-white/40"
        }`}
      >

        {icon}

        <span>{title}</span>

      </div>

      <p
        className={`mt-2 text-lg font-semibold ${
          positive
            ? "text-emerald-400"
            : negative
            ? "text-red-400"
            : "text-white"
        }`}
      >
        {currencyInfo.symbol}{" "}

        {Number(
          value || 0
        ).toLocaleString(
          undefined,
          {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }
        )}
      </p>

    </div>
  );
}

// ===========================================================
// QUICK CARD
// ===========================================================

function QuickCard({
  icon,
  title,
  value,
  color = "default",
}) {
  const colors = {
    green: {
      border:
        "border-emerald-400/10",
      bg:
        "bg-emerald-500/[0.025]",
      icon:
        "text-emerald-400",
      hover:
        "group-hover:border-emerald-400/25 group-hover:bg-emerald-500/[0.04]",
    },

    red: {
      border:
        "border-red-400/10",
      bg:
        "bg-red-500/[0.025]",
      icon:
        "text-red-400",
      hover:
        "group-hover:border-red-400/25 group-hover:bg-red-500/[0.04]",
    },

    blue: {
      border:
        "border-blue-400/10",
      bg:
        "bg-blue-500/[0.025]",
      icon:
        "text-blue-400",
      hover:
        "group-hover:border-blue-400/25 group-hover:bg-blue-500/[0.04]",
    },

    default: {
      border:
        "border-white/10",
      bg:
        "bg-white/[0.04]",
      icon:
        "text-white/40",
      hover:
        "group-hover:border-white/20 group-hover:bg-white/[0.06]",
    },
  };

  const current =
    colors[color] ||
    colors.default;

  return (
    <div
      className={`rounded-3xl border ${current.border} ${current.bg} p-5 shadow-xl shadow-black/10 backdrop-blur-2xl transition ${current.hover}`}
    >

      <div className="mb-4 flex items-center justify-between">

        <span className={current.icon}>
          {icon}
        </span>

        <ArrowUpRight
          size={16}
          className={`text-white/20 transition group-hover:${current.icon}`}
        />

      </div>

      <p className="text-sm text-white/40">
        {title}
      </p>

      <p className={`mt-1 text-2xl font-bold ${
        color === "green"
          ? "text-emerald-400"
          : color === "red"
          ? "text-red-400"
          : color === "blue"
          ? "text-blue-400"
          : "text-white"
      }`}>
        {value}
      </p>

    </div>
  );
}

// ===========================================================
// PROGRESS BAR
// ===========================================================

function ProgressBar({
  percentage,
  color = "green",
}) {
  const barColor = {
    green:
      "bg-emerald-400",
    red:
      "bg-red-400",
    blue:
      "bg-blue-400",
  };

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">

      <div
        className={`h-full rounded-full transition-all duration-500 ${
          barColor[color] ||
          barColor.green
        }`}
        style={{
          width: `${percentage}%`,
        }}
      />

    </div>
  );
}

// ===========================================================
// EMPTY STATE
// ===========================================================

function EmptyState({
  text,
}) {
  return (
    <div className="py-8 text-center text-sm text-white/30">
      {text}
    </div>
  );
}