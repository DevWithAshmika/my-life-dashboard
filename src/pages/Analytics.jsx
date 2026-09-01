import { useEffect, useMemo, useState } from "react";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  BarChart3,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { db } from "../firebase/config";
import Loading from "../components/Loading";

// ===========================================================
// COLORS
// ===========================================================

const COLORS = {
  green: "#22c55e",
  red: "#ef4444",
  blue: "#3b82f6",
};

const CHART_COLORS = [
  COLORS.blue,
  COLORS.green,
  COLORS.red,
];

// ===========================================================
// ANALYTICS
// ===========================================================

export default function Analytics({ user }) {
  const [finance, setFinance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState("monthly");

  const today = new Date();

  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  // =========================================================
  // FIRESTORE LIVE DATA
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setFinance([]);
      setLoading(false);
      return;
    }

    const financeRef = collection(
      db,
      "users",
      user.uid,
      "finance"
    );

    const unsubscribe = onSnapshot(
      financeRef,
      (snapshot) => {
        const records = snapshot.docs.map(
          (item) => ({
            id: item.id,
            ...item.data(),
          })
        );

        setFinance(records);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Analytics Firestore error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // SELECTED DATE RANGE
  // =========================================================

  const filteredFinance = useMemo(() => {
    return finance.filter((item) => {
      if (!item.date) return false;

      const date = new Date(
        `${item.date}T00:00:00`
      );

      if (period === "yearly") {
        return (
          date.getFullYear() ===
          currentYear
        );
      }

      return (
        date.getFullYear() ===
          currentYear &&
        date.getMonth() ===
          currentMonth
      );
    });
  }, [
    finance,
    period,
    currentYear,
    currentMonth,
  ]);

  // =========================================================
  // TOTALS
  // =========================================================

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredFinance.forEach((item) => {
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

    const balance =
      income - expense;

    const savingsRate =
      income > 0
        ? Math.round(
            ((income - expense) /
              income) *
              100
          )
        : 0;

    return {
      income,
      expense,
      balance,
      savingsRate,
    };
  }, [filteredFinance]);

  // =========================================================
  // MONTHLY CHART DATA
  // =========================================================

  const monthlyChartData = useMemo(() => {
    const daysInMonth =
      new Date(
        currentYear,
        currentMonth + 1,
        0
      ).getDate();

    const data = [];

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      const dateString =
        `${currentYear}-${String(
          currentMonth + 1
        ).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;

      let income = 0;
      let expense = 0;

      filteredFinance.forEach(
        (item) => {
          if (
            item.date !==
            dateString
          ) {
            return;
          }

          const amount = Number(
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

      data.push({
        day: String(day),
        income,
        expense,
      });
    }

    return data;
  }, [
    filteredFinance,
    currentYear,
    currentMonth,
  ]);

  // =========================================================
  // YEARLY CHART DATA
  // =========================================================

  const yearlyChartData = useMemo(() => {
    const data = [];

    for (
      let month = 0;
      month < 12;
      month++
    ) {
      let income = 0;
      let expense = 0;

      finance.forEach((item) => {
        if (!item.date) return;

        const date = new Date(
          `${item.date}T00:00:00`
        );

        if (
          date.getFullYear() !==
            currentYear ||
          date.getMonth() !==
            month
        ) {
          return;
        }

        const amount = Number(
          item.amount || 0
        );

        if (
          item.type === "income"
        ) {
          income += amount;
        }

        if (
          item.type === "expense"
        ) {
          expense += amount;
        }
      });

      const monthName =
        new Date(
          currentYear,
          month,
          1
        ).toLocaleDateString(
          "en-US",
          {
            month: "short",
          }
        );

      data.push({
        month: monthName,
        income,
        expense,
      });
    }

    return data;
  }, [
    finance,
    currentYear,
  ]);

  // =========================================================
  // CATEGORY DATA
  // =========================================================

  const categoryData = useMemo(() => {
    const categories = {};

    filteredFinance.forEach(
      (item) => {
        if (
          item.type !==
          "expense"
        ) {
          return;
        }

        const category =
          item.category ||
          "Other";

        const amount = Number(
          item.amount || 0
        );

        categories[category] =
          (categories[category] ||
            0) + amount;
      }
    );

    return Object.entries(
      categories
    )
      .map(
        ([name, value]) => ({
          name,
          value,
        })
      )
      .sort(
        (a, b) =>
          b.value - a.value
      );
  }, [filteredFinance]);

  // =========================================================
  // AVERAGE DAILY EXPENSE
  // =========================================================

  const averageDailyExpense =
    useMemo(() => {
      if (period === "yearly") {
        return totals.expense / 12;
      }

      const days =
        new Date(
          currentYear,
          currentMonth + 1,
          0
        ).getDate();

      return (
        totals.expense / days
      );
    }, [
      totals.expense,
      period,
      currentYear,
      currentMonth,
    ]);

  // =========================================================
  // HIGHEST EXPENSE
  // =========================================================

  const highestExpense = useMemo(() => {
    const expenses =
      filteredFinance.filter(
        (item) =>
          item.type ===
          "expense"
      );

    if (expenses.length === 0) {
      return null;
    }

    return expenses.reduce(
      (highest, item) => {
        return Number(
          item.amount || 0
        ) >
          Number(
            highest.amount || 0
          )
          ? item
          : highest;
      }
    );
  }, [filteredFinance]);

  // =========================================================
  // LAST 7 DAYS
  // =========================================================

  const sevenDayData = useMemo(() => {
    const data = [];

    for (
      let i = 6;
      i >= 0;
      i--
    ) {
      const date = new Date();

      date.setDate(
        date.getDate() - i
      );

      const dateString =
        date
          .toISOString()
          .split("T")[0];

      let income = 0;
      let expense = 0;

      finance.forEach((item) => {
        if (
          item.date !==
          dateString
        ) {
          return;
        }

        const amount = Number(
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
      });

      data.push({
        day: date.toLocaleDateString(
          "en-US",
          {
            weekday: "short",
          }
        ),
        income,
        expense,
      });
    }

    return data;
  }, [finance]);

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading
        text="Loading analytics..."
      />
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

      <div className="mb-8">

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="mb-1 text-sm text-blue-400/70">
              Financial insights
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Analytics
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/40">
              Understand your income,
              expenses and spending
              patterns.
            </p>

          </div>

          {/* FILTER */}

          <div className="flex rounded-2xl border border-white/10 bg-white/[0.04] p-1">

            <button
              type="button"
              onClick={() =>
                setPeriod(
                  "monthly"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm transition ${
                period ===
                "monthly"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() =>
                setPeriod(
                  "yearly"
                )
              }
              className={`rounded-xl px-4 py-2 text-sm transition ${
                period ===
                "yearly"
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                  : "text-white/50 hover:text-white"
              }`}
            >
              Yearly
            </button>

          </div>

        </div>

      </div>

      {/* =====================================================
          STAT CARDS
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={
            <TrendingUp
              size={20}
            />
          }
          title="Income"
          value={totals.income}
          type="income"
        />

        <StatCard
          icon={
            <TrendingDown
              size={20}
            />
          }
          title="Expenses"
          value={totals.expense}
          type="expense"
        />

        <StatCard
          icon={
            <Wallet size={20} />
          }
          title="Balance"
          value={totals.balance}
          type="balance"
        />

        <StatCard
          icon={
            <BarChart3
              size={20}
            />
          }
          title="Savings Rate"
          value={`${totals.savingsRate}%`}
          type="saving"
          noCurrency
        />

      </div>

      {/* =====================================================
          MAIN CHART
      ====================================================== */}

      <SectionCard className="mb-6">

        <SectionHeader
          icon={
            <BarChart3
              size={20}
            />
          }
          title={
            period ===
            "monthly"
              ? "Monthly Income vs Expense"
              : "Yearly Income vs Expense"
          }
          subtitle={
            period ===
            "monthly"
              ? today.toLocaleDateString(
                  "en-US",
                  {
                    month:
                      "long",
                    year:
                      "numeric",
                  }
                )
              : `${currentYear}`
          }
          color="blue"
        />

        <div className="h-[350px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            {period ===
            "monthly" ? (

              <BarChart
                data={
                  monthlyChartData
                }
              >

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
                    background:
                      "#111",
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    borderRadius:
                      "16px",
                    color:
                      "#fff",
                  }}
                  formatter={(
                    value
                  ) =>
                    `Rs. ${Number(
                      value
                    ).toLocaleString()}`
                  }
                />

                <Legend />

                <Bar
                  dataKey="income"
                  name="Income"
                  fill={
                    COLORS.green
                  }
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill={
                    COLORS.red
                  }
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            ) : (

              <BarChart
                data={
                  yearlyChartData
                }
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />

                <XAxis
                  dataKey="month"
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
                    background:
                      "#111",
                    border:
                      "1px solid rgba(255,255,255,0.1)",
                    borderRadius:
                      "16px",
                    color:
                      "#fff",
                  }}
                  formatter={(
                    value
                  ) =>
                    `Rs. ${Number(
                      value
                    ).toLocaleString()}`
                  }
                />

                <Legend />

                <Bar
                  dataKey="income"
                  name="Income"
                  fill={
                    COLORS.green
                  }
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="expense"
                  name="Expense"
                  fill={
                    COLORS.red
                  }
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />

              </BarChart>

            )}

          </ResponsiveContainer>

        </div>

      </SectionCard>

      {/* =====================================================
          7 DAY CHART
      ====================================================== */}

      <SectionCard className="mb-6">

        <SectionHeader
          icon={
            <CalendarDays
              size={20}
            />
          }
          title="Last 7 Days"
          subtitle="Recent financial activity"
          color="blue"
        />

        <div className="h-[300px]">

          <ResponsiveContainer
            width="100%"
            height="100%"
          >

            <LineChart
              data={
                sevenDayData
              }
            >

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
                  background:
                    "#111",
                  border:
                    "1px solid rgba(255,255,255,0.1)",
                  borderRadius:
                    "16px",
                  color: "#fff",
                }}
                formatter={(
                  value
                ) =>
                  `Rs. ${Number(
                    value
                  ).toLocaleString()}`
                }
              />

              <Legend />

              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={
                  COLORS.green
                }
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: COLORS.green,
                }}
                activeDot={{
                  r: 6,
                }}
              />

              <Line
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke={
                  COLORS.red
                }
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: COLORS.red,
                }}
                activeDot={{
                  r: 6,
                }}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </SectionCard>

      {/* =====================================================
          LOWER ANALYTICS
      ====================================================== */}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* CATEGORY */}

        <SectionCard>

          <SectionHeader
            icon={
              <Wallet size={20} />
            }
            title="Expense Categories"
            subtitle="Your spending breakdown"
            color="blue"
          />

          {categoryData.length ===
          0 ? (

            <EmptyState text="No expenses for this period." />

          ) : (

            <>

              <div className="h-[280px]">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <PieChart>

                    <Pie
                      data={
                        categoryData
                      }
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={55}
                      paddingAngle={3}
                    >

                      {categoryData.map(
                        (
                          entry,
                          index
                        ) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              CHART_COLORS[
                                index %
                                  CHART_COLORS.length
                              ]
                            }
                          />
                        )
                      )}

                    </Pie>

                    <Tooltip
                      contentStyle={{
                        background:
                          "#111",
                        border:
                          "1px solid rgba(255,255,255,0.1)",
                        borderRadius:
                          "16px",
                        color:
                          "#fff",
                      }}
                      formatter={(
                        value
                      ) =>
                        `Rs. ${Number(
                          value
                        ).toLocaleString()}`
                      }
                    />

                  </PieChart>

                </ResponsiveContainer>

              </div>

              <div className="space-y-3">

                {categoryData.map(
                  (
                    item,
                    index
                  ) => {

                    const percentage =
                      totals.expense >
                      0
                        ? Math.round(
                            (item.value /
                              totals.expense) *
                              100
                          )
                        : 0;

                    const color =
                      CHART_COLORS[
                        index %
                          CHART_COLORS.length
                      ];

                    return (
                      <div
                        key={
                          item.name
                        }
                        className="flex items-center justify-between gap-4"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div
                            className="h-3 w-3 shrink-0 rounded-full"
                            style={{
                              backgroundColor:
                                color,
                            }}
                          />

                          <span className="truncate text-sm">
                            {
                              item.name
                            }
                          </span>

                        </div>

                        <div className="flex shrink-0 items-center gap-3">

                          <span className="text-xs text-white/30">
                            {
                              percentage
                            }
                            %
                          </span>

                          <span className="text-sm">
                            Rs.{" "}
                            {item.value.toLocaleString()}
                          </span>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </>

          )}

        </SectionCard>

        {/* INSIGHTS */}

        <SectionCard>

          <SectionHeader
            icon={
              <BarChart3
                size={20}
              />
            }
            title="Financial Insights"
            subtitle="Quick overview"
            color="blue"
          />

          <div className="space-y-3">

            <InsightRow
              icon={
                <TrendingUp
                  size={17}
                />
              }
              title="Total Income"
              value={`Rs. ${totals.income.toLocaleString()}`}
              positive
            />

            <InsightRow
              icon={
                <TrendingDown
                  size={17}
                />
              }
              title="Total Expenses"
              value={`Rs. ${totals.expense.toLocaleString()}`}
              negative
            />

            <InsightRow
              icon={
                <Wallet size={17} />
              }
              title="Remaining Balance"
              value={`Rs. ${totals.balance.toLocaleString()}`}
              balance
            />

            <InsightRow
              icon={
                <CalendarDays
                  size={17}
                />
              }
              title="Average Daily Expense"
              value={`Rs. ${Math.round(
                averageDailyExpense
              ).toLocaleString()}`}
              balance
            />

            <InsightRow
              icon={
                <ArrowDownRight
                  size={17}
                />
              }
              title="Highest Expense"
              value={
                highestExpense
                  ? `Rs. ${Number(
                      highestExpense.amount
                    ).toLocaleString()}`
                  : "None"
              }
              negative
            />

            {highestExpense && (
              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-4">

                <p className="text-xs text-blue-400/60">
                  Highest expense
                  category
                </p>

                <p className="mt-1 font-medium">
                  {highestExpense.category ||
                    "Other"}
                </p>

                {highestExpense.description && (
                  <p className="mt-1 text-xs text-white/30">
                    {
                      highestExpense.description
                    }
                  </p>
                )}

              </div>
            )}

          </div>

        </SectionCard>

      </div>

      {/* =====================================================
          TRANSACTION COUNT
      ====================================================== */}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">

        <SmallStat
          title="Transactions"
          value={
            filteredFinance.length
          }
          color="blue"
        />

        <SmallStat
          title="Income Transactions"
          value={
            filteredFinance.filter(
              (item) =>
                item.type ===
                "income"
            ).length
          }
          color="green"
        />

        <SmallStat
          title="Expense Transactions"
          value={
            filteredFinance.filter(
              (item) =>
                item.type ===
                "expense"
            ).length
          }
          color="red"
        />

      </div>

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
  type,
  noCurrency = false,
}) {
  const colorClasses = {
    income: {
      wrapper:
        "border-green-500/20 bg-green-500/[0.045]",
      icon:
        "bg-green-500/10 text-green-400",
      text:
        "text-green-400",
    },

    expense: {
      wrapper:
        "border-red-500/20 bg-red-500/[0.045]",
      icon:
        "bg-red-500/10 text-red-400",
      text:
        "text-red-400",
    },

    balance: {
      wrapper:
        "border-blue-500/20 bg-blue-500/[0.045]",
      icon:
        "bg-blue-500/10 text-blue-400",
      text:
        "text-blue-400",
    },

    saving: {
      wrapper:
        "border-blue-500/20 bg-blue-500/[0.045]",
      icon:
        "bg-blue-500/10 text-blue-400",
      text:
        "text-blue-400",
    },
  };

  const style =
    colorClasses[type] ||
    colorClasses.balance;

  return (
    <div
      className={`rounded-3xl border p-5 backdrop-blur-xl transition hover:bg-white/[0.06] ${style.wrapper}`}
    >

      <div
        className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${style.icon}`}
      >
        {icon}
      </div>

      <p className="text-sm text-white/40">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">

        {!noCurrency && (
          <>Rs. </>
        )}

        {typeof value ===
        "number"
          ? value.toLocaleString()
          : value}

      </p>

      <p
        className={`mt-2 text-xs ${style.text} opacity-60`}
      >
        {type ===
          "income" &&
          "Money received"}

        {type ===
          "expense" &&
          "Money spent"}

        {type ===
          "balance" &&
          "Income minus expenses"}

        {type ===
          "saving" &&
          "Percentage of income saved"}
      </p>

    </div>
  );
}

// ===========================================================
// SECTION CARD
// ===========================================================

function SectionCard({
  children,
  className = "",
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-xl shadow-black/10 backdrop-blur-xl ${className}`}
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
  color = "blue",
}) {
  const colors = {
    blue:
      "bg-blue-500/10 text-blue-400",
    green:
      "bg-green-500/10 text-green-400",
    red:
      "bg-red-500/10 text-red-400",
  };

  return (
    <div className="mb-6 flex items-center gap-3">

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}
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
  );
}

// ===========================================================
// INSIGHT ROW
// ===========================================================

function InsightRow({
  icon,
  title,
  value,
  positive,
  negative,
  balance,
}) {
  let color =
    "text-blue-400";

  if (positive) {
    color =
      "text-green-400";
  }

  if (negative) {
    color =
      "text-red-400";
  }

  if (balance) {
    color =
      "text-blue-400";
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.035] p-4 transition hover:bg-white/[0.06]">

      <div className="flex items-center gap-3">

        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] ${color}`}
        >
          {icon}
        </div>

        <span className="text-sm text-white/60">
          {title}
        </span>

      </div>

      <div className="flex items-center gap-2">

        {positive && (
          <ArrowUpRight
            size={15}
            className="text-green-400"
          />
        )}

        {negative && (
          <ArrowDownRight
            size={15}
            className="text-red-400"
          />
        )}

        <span
          className={`text-sm font-medium ${color}`}
        >
          {value}
        </span>

      </div>

    </div>
  );
}

// ===========================================================
// SMALL STAT
// ===========================================================

function SmallStat({
  title,
  value,
  color = "blue",
}) {
  const colors = {
    blue: {
      border:
        "border-blue-500/15",
      value:
        "text-blue-400",
    },

    green: {
      border:
        "border-green-500/15",
      value:
        "text-green-400",
    },

    red: {
      border:
        "border-red-500/15",
      value:
        "text-red-400",
    },
  };

  const style =
    colors[color] ||
    colors.blue;

  return (
    <div
      className={`rounded-3xl border bg-white/[0.04] p-5 backdrop-blur-xl ${style.border}`}
    >

      <p className="text-sm text-white/40">
        {title}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${style.value}`}
      >
        {value}
      </p>

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
    <div className="py-12 text-center text-sm text-white/30">
      {text}
    </div>
  );
}