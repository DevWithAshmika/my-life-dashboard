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
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  Sparkles,
} from "lucide-react";

import {
  collection,
  doc,
  onSnapshot,
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

export default function Dashboard({
  user,
  setActivePage,
  darkMode = true,
}) {
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

  const [preferences, setPreferences] = useState({
    showFinance: true,
    showTasks: true,
    showGoals: true,
    showHabits: true,
    showFitness: true,
    showTravel: true,
  });

  const [loading, setLoading] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | Navigation
  |--------------------------------------------------------------------------
  */

  const goToPage = (page) => {
    if (typeof setActivePage === "function") {
      setActivePage(page);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Firestore Live Data
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user?.uid) return;

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
        const ref = collection(
          db,
          "users",
          user.uid,
          collectionName
        );

        return onSnapshot(
          ref,
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
              `Error loading ${collectionName}:`,
              error
            );

            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, [user?.uid]);

  /*
  |--------------------------------------------------------------------------
  | Dashboard Preferences
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!user?.uid) return;

    const ref = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const settings = snapshot.data();

        setPreferences({
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
          "Preferences error:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  /*
  |--------------------------------------------------------------------------
  | Dates
  |--------------------------------------------------------------------------
  */

  const today = new Date();

  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  );

  const startOfNextMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  /*
  |--------------------------------------------------------------------------
  | Money
  |--------------------------------------------------------------------------
  */

  const formatMoney = (value) => {
    return `Rs. ${Number(value || 0).toLocaleString(
      "en-LK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  /*
  |--------------------------------------------------------------------------
  | Finance
  |--------------------------------------------------------------------------
  */

  const financeStats = useMemo(() => {
    const finance = data.finance || [];

    const monthly = finance.filter((item) => {
      const date = parseDate(item.date);

      return (
        date &&
        date >= startOfMonth &&
        date < startOfNextMonth
      );
    });

    const income = monthly
      .filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          "income"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const expense = monthly
      .filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          "expense"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const totalIncome = finance
      .filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          "income"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    const totalExpense = finance
      .filter(
        (item) =>
          String(item.type || "").toLowerCase() ===
          "expense"
      )
      .reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      );

    return {
      income,
      expense,
      balance: income - expense,
      totalIncome,
      totalExpense,
      totalBalance:
        totalIncome - totalExpense,
    };
  }, [data.finance]);

  /*
  |--------------------------------------------------------------------------
  | 7 Day Finance
  |--------------------------------------------------------------------------
  */

  const last7Days = useMemo(() => {
    const finance = data.finance || [];

    return Array.from(
      { length: 7 },
      (_, index) => {
        const date = new Date(sevenDaysAgo);

        date.setDate(
          sevenDaysAgo.getDate() + index
        );

        const nextDate = new Date(date);

        nextDate.setDate(
          date.getDate() + 1
        );

        const daily = finance.filter(
          (item) => {
            const itemDate = parseDate(
              item.date
            );

            return (
              itemDate &&
              itemDate >= date &&
              itemDate < nextDate
            );
          }
        );

        const income = daily
          .filter(
            (item) =>
              String(item.type || "").toLowerCase() ===
              "income"
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.amount || 0),
            0
          );

        const expense = daily
          .filter(
            (item) =>
              String(item.type || "").toLowerCase() ===
              "expense"
          )
          .reduce(
            (sum, item) =>
              sum + Number(item.amount || 0),
            0
          );

        return {
          name: date.toLocaleDateString(
            "en-US",
            {
              weekday: "short",
            }
          ),
          income,
          expense,
        };
      }
    );
  }, [data.finance]);

  /*
  |--------------------------------------------------------------------------
  | Expense Breakdown
  |--------------------------------------------------------------------------
  */

  const expenseBreakdown = useMemo(() => {
    const grouped = {};

    (data.finance || [])
      .filter((item) => {
        const date = parseDate(item.date);

        return (
          date &&
          date >= startOfMonth &&
          date < startOfNextMonth &&
          String(item.type || "").toLowerCase() ===
            "expense"
        );
      })
      .forEach((item) => {
        const category =
          item.category ||
          item.description ||
          "Other";

        grouped[category] =
          (grouped[category] || 0) +
          Number(item.amount || 0);
      });

    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [data.finance]);

  /*
  |--------------------------------------------------------------------------
  | Tasks
  |--------------------------------------------------------------------------
  */

  const taskStats = useMemo(() => {
    const tasks = data.tasks || [];

    const completed = tasks.filter(
      (task) =>
        task.completed === true ||
        task.status === "completed" ||
        task.status === "done"
    ).length;

    const todayTasks = tasks
      .filter((task) => {
        if (
          task.completed === true ||
          task.status === "completed" ||
          task.status === "done"
        ) {
          return false;
        }

        const date = parseDate(
          task.dueDate ||
            task.date ||
            task.deadline
        );

        return (
          date &&
          date >= startOfToday &&
          date <= endOfToday
        );
      })
      .slice(0, 5);

    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed,
      todayTasks,
    };
  }, [data.tasks]);

  /*
  |--------------------------------------------------------------------------
  | Goals
  |--------------------------------------------------------------------------
  */

  const goalStats = useMemo(() => {
    const goals = data.goals || [];

    const completed = goals.filter(
      (goal) =>
        goal.completed === true ||
        goal.status === "completed" ||
        goal.status === "done"
    );

    const active = goals.filter(
      (goal) =>
        goal.completed !== true &&
        goal.status !== "completed" &&
        goal.status !== "done"
    );

    return {
      total: goals.length,
      completed: completed.length,
      active: active.length,
      activeGoals: active.slice(0, 4),
    };
  }, [data.goals]);

  /*
  |--------------------------------------------------------------------------
  | Habits
  |--------------------------------------------------------------------------
  */

  const habitStats = useMemo(() => {
    const habits = data.habits || [];

    const completedToday = habits.filter(
      (habit) =>
        habit.completedToday === true ||
        habit.todayCompleted === true ||
        habit.completed === true
    ).length;

    return {
      total: habits.length,
      completedToday,
      remaining: Math.max(
        habits.length - completedToday,
        0
      ),
      percentage:
        habits.length > 0
          ? Math.round(
              (completedToday /
                habits.length) *
                100
            )
          : 0,
    };
  }, [data.habits]);

  /*
  |--------------------------------------------------------------------------
  | Fitness
  |--------------------------------------------------------------------------
  */

  const fitnessStats = useMemo(() => {
    const fitness = data.fitness || [];

    const recent = fitness.filter((item) => {
      const date = parseDate(
        item.date ||
          item.createdAt
      );

      return (
        date &&
        date >= sevenDaysAgo &&
        date <= endOfToday
      );
    });

    return {
      total: fitness.length,
      recent,
    };
  }, [data.fitness]);

  /*
  |--------------------------------------------------------------------------
  | Upcoming Events
  |--------------------------------------------------------------------------
  */

  const upcomingEvents = useMemo(() => {
    return (data.calendar || [])
      .filter((event) => {
        const date = parseDate(
          event.date ||
            event.startDate ||
            event.start
        );

        return date && date >= startOfToday;
      })
      .sort((a, b) => {
        const dateA = parseDate(
          a.date ||
            a.startDate ||
            a.start
        );

        const dateB = parseDate(
          b.date ||
            b.startDate ||
            b.start
        );

        return (
          (dateA?.getTime() || 0) -
          (dateB?.getTime() || 0)
        );
      })
      .slice(0, 5);
  }, [data.calendar]);

  /*
  |--------------------------------------------------------------------------
  | Upcoming Travel
  |--------------------------------------------------------------------------
  */

  const upcomingTrips = useMemo(() => {
    return (data.travel || [])
      .filter((trip) => {
        const date = parseDate(
          trip.date ||
            trip.startDate ||
            trip.fromDate
        );

        return date && date >= startOfToday;
      })
      .sort((a, b) => {
        const dateA = parseDate(
          a.date ||
            a.startDate ||
            a.fromDate
        );

        const dateB = parseDate(
          b.date ||
            b.startDate ||
            b.fromDate
        );

        return (
          (dateA?.getTime() || 0) -
          (dateB?.getTime() || 0)
        );
      })
      .slice(0, 5);
  }, [data.travel]);

  /*
  |--------------------------------------------------------------------------
  | Recent Notes
  |--------------------------------------------------------------------------
  */

  const recentNotes = useMemo(() => {
    return [...(data.notes || [])]
      .sort((a, b) => {
        const dateA = parseDate(
          a.updatedAt ||
            a.createdAt ||
            a.date
        );

        const dateB = parseDate(
          b.updatedAt ||
            b.createdAt ||
            b.date
        );

        return (
          (dateB?.getTime() || 0) -
          (dateA?.getTime() || 0)
        );
      })
      .slice(0, 4);
  }, [data.notes]);

  /*
  |--------------------------------------------------------------------------
  | Greeting
  |--------------------------------------------------------------------------
  */

  const greeting = useMemo(() => {
    const hour = today.getHours();

    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";

    return "Good Evening";
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return <Loading />;
  }

  /*
  |--------------------------------------------------------------------------
  | Dashboard UI
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className={`min-h-screen pb-10 ${
        darkMode
          ? "text-white"
          : "text-slate-900"
      }`}
    >

      {/* HERO */}

      <section className="relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#0b0d0c] p-5 shadow-2xl sm:p-7 lg:p-8">

        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/[0.08] blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-blue-500/[0.05] blur-3xl" />

        <div className="relative z-10">

          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">

            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/10">
                  <Sparkles
                    size={15}
                    className="text-emerald-400"
                  />
                </div>

                <span className="text-sm font-medium text-emerald-400">
                  {greeting}
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                {user?.displayName ||
                  "Welcome"}
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/40">
                Everything important about your
                day, all in one place.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 backdrop-blur-xl">
              <CalendarDays
                size={17}
                className="text-white/50"
              />

              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/30">
                  Today
                </p>

                <p className="mt-0.5 text-sm font-medium text-white/80">
                  {today.toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* BALANCE */}

          <button
            type="button"
            onClick={() => goToPage("finance")}
            className="mt-7 w-full rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-5 text-left backdrop-blur-xl transition hover:border-emerald-400/20 hover:bg-white/[0.05] sm:p-6"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

              <div>
                <p className="text-xs font-medium text-white/35">
                  Total Balance
                </p>

                <p
                  className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${
                    financeStats.totalBalance >= 0
                      ? "text-white"
                      : "text-red-400"
                  }`}
                >
                  {formatMoney(
                    financeStats.totalBalance
                  )}
                </p>

                <div className="mt-3">
                  {financeStats.totalBalance >= 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                      <TrendingUp size={12} />
                      Positive balance
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400">
                      <TrendingDown size={12} />
                      Negative balance
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm text-white/30">
                Open Finance
                <ArrowUpRight size={15} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">

              <div className="rounded-2xl border border-emerald-400/[0.08] bg-emerald-400/[0.04] p-4">
                <div className="flex items-center gap-2 text-emerald-400">
                  <TrendingUp size={15} />
                  <span className="text-xs">
                    Income
                  </span>
                </div>

                <p className="mt-2 text-base font-semibold text-white">
                  {formatMoney(
                    financeStats.income
                  )}
                </p>

                <p className="mt-1 text-[10px] text-white/25">
                  This month
                </p>
              </div>

              <div className="rounded-2xl border border-red-400/[0.08] bg-red-400/[0.04] p-4">
                <div className="flex items-center gap-2 text-red-400">
                  <TrendingDown size={15} />
                  <span className="text-xs">
                    Expenses
                  </span>
                </div>

                <p className="mt-2 text-base font-semibold text-white">
                  {formatMoney(
                    financeStats.expense
                  )}
                </p>

                <p className="mt-1 text-[10px] text-white/25">
                  This month
                </p>
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* STATS */}

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">

        <StatCard
          title="Tasks"
          value={taskStats.pending}
          subtitle="Pending"
          icon={CheckSquare}
          accent="blue"
          onClick={() => goToPage("tasks")}
        />

        <StatCard
          title="Goals"
          value={goalStats.active}
          subtitle="Active goals"
          icon={Target}
          accent="purple"
          onClick={() => goToPage("goals")}
        />

        <StatCard
          title="Habits"
          value={`${habitStats.percentage}%`}
          subtitle={`${habitStats.completedToday}/${habitStats.total} today`}
          icon={Repeat}
          accent="orange"
          onClick={() => goToPage("habits")}
        />

        <StatCard
          title="Workouts"
          value={fitnessStats.total}
          subtitle="Total workouts"
          icon={Dumbbell}
          accent="cyan"
          onClick={() => goToPage("fitness")}
        />
      </section>

      {/* FINANCE + TASKS */}

      <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">

        {preferences.showFinance && (
          <GlassCard>
            <SectionTitle
              icon={TrendingUp}
              title="Money Flow"
              subtitle="Your last 7 days"
              accent="emerald"
              action="Finance"
              onAction={() =>
                goToPage("finance")
              }
            />

            <div className="mt-6 h-[270px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={last7Days}
                  margin={{
                    top: 5,
                    right: 5,
                    left: -25,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.055)"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "rgba(255,255,255,0.25)",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill: "rgba(255,255,255,0.025)",
                    }}
                    contentStyle={{
                      background: "#101211",
                      border:
                        "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "14px",
                      color: "#fff",
                    }}
                    formatter={(value) =>
                      formatMoney(value)
                    }
                  />

                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#10b981"
                    radius={[
                      6,
                      6,
                      2,
                      2,
                    ]}
                    maxBarSize={22}
                  />

                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#ef4444"
                    radius={[
                      6,
                      6,
                      2,
                      2,
                    ]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 flex items-center gap-5">
              <LegendDot
                label="Income"
                className="bg-emerald-400"
              />

              <LegendDot
                label="Expense"
                className="bg-red-400"
              />
            </div>
          </GlassCard>
        )}

        {preferences.showTasks && (
          <GlassCard>
            <SectionTitle
              icon={CheckSquare}
              title="Today's Focus"
              subtitle={`${taskStats.pending} tasks waiting`}
              accent="blue"
              action="Tasks"
              onAction={() =>
                goToPage("tasks")
              }
            />

            <div className="mt-5">
              {taskStats.todayTasks.length >
              0 ? (
                <div className="space-y-2.5">
                  {taskStats.todayTasks.map(
                    (task, index) => (
                      <button
                        type="button"
                        key={
                          task.id ||
                          `task-${index}`
                        }
                        onClick={() =>
                          goToPage("tasks")
                        }
                        className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 text-left transition hover:border-blue-400/20 hover:bg-blue-400/[0.04]"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                          <CheckSquare size={16} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white/85">
                            {task.title ||
                              task.name ||
                              "Untitled Task"}
                          </p>

                          {task.priority && (
                            <p className="mt-1 text-[10px] text-white/30">
                              {task.priority}
                            </p>
                          )}
                        </div>

                        <ChevronRight
                          size={16}
                          className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-blue-400"
                        />
                      </button>
                    )
                  )}
                </div>
              ) : (
                <EmptyState
                  icon={CircleCheck}
                  title="All clear"
                  text="You have no pending tasks for today."
                  accent="blue"
                />
              )}
            </div>
          </GlassCard>
        )}
      </section>

      {/* GOALS + HABITS */}

      <section className="mt-5 grid gap-5 lg:grid-cols-2">

        {preferences.showGoals && (
          <GlassCard>
            <SectionTitle
              icon={Target}
              title="Goals"
              subtitle={`${goalStats.completed} completed`}
              accent="purple"
              action="View Goals"
              onAction={() =>
                goToPage("goals")
              }
            />

            {goalStats.activeGoals.length >
            0 ? (
              <div className="mt-5 space-y-4">
                {goalStats.activeGoals.map(
                  (goal, index) => {
                    const current = Number(
                      goal.current ||
                        goal.progress ||
                        goal.completedAmount ||
                        0
                    );

                    const target = Number(
                      goal.target ||
                        goal.goal ||
                        goal.targetAmount ||
                        100
                    );

                    const progress =
                      target > 0
                        ? Math.min(
                            Math.round(
                              (current /
                                target) *
                                100
                            ),
                            100
                          )
                        : 0;

                    return (
                      <button
                        type="button"
                        key={
                          goal.id ||
                          `goal-${index}`
                        }
                        onClick={() =>
                          goToPage("goals")
                        }
                        className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-left transition hover:border-purple-400/20 hover:bg-purple-400/[0.035]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm font-medium text-white/80">
                            {goal.title ||
                              goal.name ||
                              "Untitled Goal"}
                          </p>

                          <span className="shrink-0 text-xs font-semibold text-purple-400">
                            {progress}%
                          </span>
                        </div>

                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                          <div
                            className="h-full rounded-full bg-purple-400 transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <EmptyState
                icon={Target}
                title="No active goals"
                text="Create a goal and start making progress."
                accent="purple"
              />
            )}
          </GlassCard>
        )}

        {preferences.showHabits && (
          <GlassCard>
            <SectionTitle
              icon={Repeat}
              title="Daily Habits"
              subtitle="Today's progress"
              accent="orange"
              action="View Habits"
              onAction={() =>
                goToPage("habits")
              }
            />

            <div className="mt-5 flex items-center gap-6">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="8"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="263.89"
                    strokeDashoffset={
                      263.89 -
                      (263.89 *
                        habitStats.percentage) /
                        100
                    }
                  />
                </svg>

                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {habitStats.percentage}%
                  </p>

                  <p className="text-[10px] text-white/30">
                    completed
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-2xl font-bold text-white">
                    {habitStats.completedToday}
                  </p>

                  <p className="text-xs text-white/35">
                    Completed today
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-bold text-orange-400">
                    {habitStats.remaining}
                  </p>

                  <p className="text-xs text-white/35">
                    Remaining
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        )}
      </section>

      {/* EXPENSES */}

      {preferences.showFinance && (
        <GlassCard className="mt-5">
          <SectionTitle
            icon={TrendingDown}
            title="Where Your Money Goes"
            subtitle="This month's expenses"
            accent="red"
            action="View Finance"
            onAction={() =>
              goToPage("finance")
            }
          />

          {expenseBreakdown.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {expenseBreakdown.map(
                (item, index) => {
                  const percentage =
                    financeStats.expense > 0
                      ? Math.round(
                          (item.value /
                            financeStats.expense) *
                            100
                        )
                      : 0;

                  return (
                    <button
                      type="button"
                      key={`${item.name}-${index}`}
                      onClick={() =>
                        goToPage("finance")
                      }
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-left transition hover:border-red-400/20 hover:bg-red-400/[0.035]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white/70">
                          {item.name}
                        </p>

                        <span className="text-xs font-semibold text-red-400">
                          {percentage}%
                        </span>
                      </div>

                      <p className="mt-2 text-base font-bold text-white">
                        {formatMoney(
                          item.value
                        )}
                      </p>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                          className="h-full rounded-full bg-red-400"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <EmptyState
              icon={TrendingDown}
              title="No expenses yet"
              text="Your expense categories will appear here."
              accent="red"
            />
          )}
        </GlassCard>
      )}

      {/* EVENTS + TRAVEL */}

      <section className="mt-5 grid gap-5 xl:grid-cols-2">

        <GlassCard>
          <SectionTitle
            icon={CalendarDays}
            title="Upcoming Events"
            subtitle="What's coming next"
            accent="blue"
            action="Calendar"
            onAction={() =>
              goToPage("calendar")
            }
          />

          {upcomingEvents.length > 0 ? (
            <div className="mt-5 space-y-2.5">
              {upcomingEvents.map(
                (event, index) => {
                  const date = parseDate(
                    event.date ||
                      event.startDate ||
                      event.start
                  );

                  return (
                    <button
                      type="button"
                      key={
                        event.id ||
                        `event-${index}`
                      }
                      onClick={() =>
                        goToPage("calendar")
                      }
                      className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left transition hover:border-blue-400/20 hover:bg-blue-400/[0.035]"
                    >
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
                        {date && (
                          <>
                            <span className="text-[9px] uppercase">
                              {date.toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                }
                              )}
                            </span>

                            <span className="text-base font-bold">
                              {date.getDate()}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/80">
                          {event.title ||
                            event.name ||
                            "Untitled Event"}
                        </p>

                        <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                          <Clock size={11} />

                          <span>
                            {event.time ||
                              (date
                                ? date.toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "numeric",
                                      minute:
                                        "2-digit",
                                    }
                                  )
                                : "No time")}
                          </span>
                        </div>
                      </div>

                      <ChevronRight
                        size={16}
                        className="text-white/15 transition group-hover:text-blue-400"
                      />
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="No upcoming events"
              text="Your calendar is clear for now."
              accent="blue"
            />
          )}
        </GlassCard>

        {preferences.showTravel && (
          <GlassCard>
            <SectionTitle
              icon={Map}
              title="Upcoming Travel"
              subtitle="Your next adventures"
              accent="teal"
              action="Travel"
              onAction={() =>
                goToPage("travel")
              }
            />

            {upcomingTrips.length > 0 ? (
              <div className="mt-5 space-y-2.5">
                {upcomingTrips.map(
                  (trip, index) => {
                    const date = parseDate(
                      trip.date ||
                        trip.startDate ||
                        trip.fromDate
                    );

                    return (
                      <button
                        type="button"
                        key={
                          trip.id ||
                          `trip-${index}`
                        }
                        onClick={() =>
                          goToPage("travel")
                        }
                        className="group flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5 text-left transition hover:border-teal-400/20 hover:bg-teal-400/[0.035]"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400/10 text-teal-400">
                          <Map size={18} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white/80">
                            {trip.title ||
                              trip.name ||
                              trip.destination ||
                              "Untitled Trip"}
                          </p>

                          <p className="mt-1 truncate text-[10px] text-white/30">
                            {trip.destination ||
                              trip.location ||
                              (date
                                ? formatDate(
                                    date
                                  )
                                : "No date")}
                          </p>
                        </div>

                        <ChevronRight
                          size={16}
                          className="text-white/15 transition group-hover:text-teal-400"
                        />
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <EmptyState
                icon={Map}
                title="No upcoming trips"
                text="Your future adventures will appear here."
                accent="teal"
              />
            )}
          </GlassCard>
        )}
      </section>

      {/* NOTES */}

      <GlassCard className="mt-5">
        <SectionTitle
          icon={FileText}
          title="Recent Notes"
          subtitle="Your latest thoughts"
          accent="violet"
          action="View Notes"
          onAction={() =>
            goToPage("notes")
          }
        />

        {recentNotes.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {recentNotes.map(
              (note, index) => (
                <button
                  type="button"
                  key={
                    note.id ||
                    `note-${index}`
                  }
                  onClick={() =>
                    goToPage("notes")
                  }
                  className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-left transition hover:border-violet-400/20 hover:bg-violet-400/[0.035]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-400">
                      <FileText size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/80">
                        {note.title ||
                          note.name ||
                          "Untitled Note"}
                      </p>

                      {(note.content ||
                        note.text ||
                        note.description) && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-white/30">
                          {note.content ||
                            note.text ||
                            note.description}
                        </p>
                      )}
                    </div>

                    <ArrowUpRight
                      size={15}
                      className="text-white/15 transition group-hover:text-violet-400"
                    />
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <EmptyState
            icon={FileText}
            title="No notes yet"
            text="Create your first note to see it here."
            accent="violet"
          />
        )}
      </GlassCard>

    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Stat Card
|--------------------------------------------------------------------------
*/

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent,
  onClick,
}) {
  const accents = {
    blue: {
      bg: "bg-blue-400/10",
      text: "text-blue-400",
      border:
        "hover:border-blue-400/20",
    },

    purple: {
      bg: "bg-purple-400/10",
      text: "text-purple-400",
      border:
        "hover:border-purple-400/20",
    },

    orange: {
      bg: "bg-orange-400/10",
      text: "text-orange-400",
      border:
        "hover:border-orange-400/20",
    },

    cyan: {
      bg: "bg-cyan-400/10",
      text: "text-cyan-400",
      border:
        "hover:border-cyan-400/20",
    },
  };

  const style =
    accents[accent] ||
    accents.blue;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 text-left transition duration-200 ${style.border}`}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${style.bg} ${style.text}`}
        >
          <Icon size={17} />
        </div>

        <ArrowUpRight
          size={15}
          className="text-white/15 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      </div>

      <p className="mt-4 text-xs text-white/35">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold text-white">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-white/25">
        {subtitle}
      </p>
    </button>
  );
}

/*
|--------------------------------------------------------------------------
| Glass Card
|--------------------------------------------------------------------------
*/

function GlassCard({
  children,
  className = "",
}) {
  return (
    <section
      className={`rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-4 shadow-xl backdrop-blur-xl sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}

/*
|--------------------------------------------------------------------------
| Section Title
|--------------------------------------------------------------------------
*/

function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  accent,
  action,
  onAction,
}) {
  const colors = {
    emerald:
      "bg-emerald-400/10 text-emerald-400",
    blue:
      "bg-blue-400/10 text-blue-400",
    purple:
      "bg-purple-400/10 text-purple-400",
    orange:
      "bg-orange-400/10 text-orange-400",
    red:
      "bg-red-400/10 text-red-400",
    teal:
      "bg-teal-400/10 text-teal-400",
    violet:
      "bg-violet-400/10 text-violet-400",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            colors[accent] ||
            colors.emerald
          }`}
        >
          <Icon size={18} />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-white/85">
            {title}
          </h2>

          <p className="mt-0.5 truncate text-[10px] text-white/25">
            {subtitle}
          </p>
        </div>
      </div>

      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-white/35 transition hover:text-white/70"
        >
          {action}
          <ChevronRight size={13} />
        </button>
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Legend
|--------------------------------------------------------------------------
*/

function LegendDot({
  label,
  className,
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2 w-2 rounded-full ${className}`}
      />

      <span className="text-[10px] text-white/30">
        {label}
      </span>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Empty State
|--------------------------------------------------------------------------
*/

function EmptyState({
  icon: Icon,
  title,
  text,
  accent,
}) {
  const colors = {
    blue:
      "bg-blue-400/10 text-blue-400",
    purple:
      "bg-purple-400/10 text-purple-400",
    orange:
      "bg-orange-400/10 text-orange-400",
    red:
      "bg-red-400/10 text-red-400",
    teal:
      "bg-teal-400/10 text-teal-400",
    violet:
      "bg-violet-400/10 text-violet-400",
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
          colors[accent] ||
          colors.blue
        }`}
      >
        <Icon size={20} />
      </div>

      <p className="mt-3 text-sm font-medium text-white/60">
        {title}
      </p>

      <p className="mt-1 max-w-xs text-[11px] leading-5 text-white/25">
        {text}
      </p>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Date Parser
|--------------------------------------------------------------------------
*/

function parseDate(value) {
  if (!value) return null;

  if (
    value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  if (
    value &&
    typeof value.seconds === "number"
  ) {
    return new Date(
      value.seconds * 1000
    );
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/*
|--------------------------------------------------------------------------
| Date Formatter
|--------------------------------------------------------------------------
*/

function formatDate(date) {
  if (!date) return "No date";

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
}