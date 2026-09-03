import { useMemo } from "react";

import {
  CheckSquare,
  CalendarDays,
  AlertCircle,
  Wallet,
  Target,
  Repeat,
} from "lucide-react";

export default function NotificationSystem({
  data,
}) {
  const notifications = useMemo(() => {
    if (!data) {
      return [];
    }

    const result = [];

    const today = new Date();

    const todayString =
      formatDate(today);

    // =======================================================
    // TASKS
    // =======================================================

    const tasks = data.tasks || [];

    tasks.forEach((task) => {
      const completed =
        task.completed === true ||
        task.status === "completed" ||
        task.status === "done";

      const taskDate =
        task.dueDate ||
        task.date;

      const title =
        task.title ||
        task.name ||
        "Untitled task";

      if (
        taskDate &&
        taskDate < todayString &&
        !completed
      ) {
        result.push({
          id: `overdue-task-${task.id}`,
          type: "overdue",
          icon: AlertCircle,
          title: "Overdue task",
          message:
            `${title} is overdue.`,
          date: taskDate,
        });
      }

      if (
        taskDate === todayString &&
        !completed
      ) {
        result.push({
          id: `today-task-${task.id}`,
          type: "task",
          icon: CheckSquare,
          title: "Task due today",
          message:
            `${title} is scheduled for today.`,
          date: todayString,
        });
      }
    });

    // =======================================================
    // GOALS
    // =======================================================

    const goals = data.goals || [];

    goals.forEach((goal) => {
      const target =
        Number(
          goal.targetAmount || 0
        );

      const current =
        Number(
          goal.currentAmount || 0
        );

      const completed =
        target > 0 &&
        current >= target;

      if (!goal.deadline || completed) {
        return;
      }

      if (
        goal.deadline <
        todayString
      ) {
        result.push({
          id: `overdue-goal-${goal.id}`,
          type: "overdue",
          icon: AlertCircle,
          title: "Goal overdue",
          message:
            `${goal.title || "Goal"} has passed its deadline.`,
          date: goal.deadline,
        });
      }

      if (
        goal.deadline ===
        todayString
      ) {
        result.push({
          id: `today-goal-${goal.id}`,
          type: "goal",
          icon: Target,
          title: "Goal deadline today",
          message:
            `${goal.title || "Goal"} reaches its deadline today.`,
          date: goal.deadline,
        });
      }
    });

    // =======================================================
    // HABITS
    // =======================================================

    const habits = data.habits || [];

    habits.forEach((habit) => {
      const completed =
        habit.completedToday === true;

      if (completed) {
        return;
      }

      result.push({
        id: `habit-${habit.id}`,
        type: "habit",
        icon: Repeat,
        title: "Habit reminder",
        message:
          `${habit.name || "Habit"} is waiting for today.`,
        date: todayString,
      });
    });

    // =======================================================
    // CALENDAR
    // =======================================================

    const calendar =
      data.calendar || [];

    calendar.forEach((event) => {
      if (
        event.date !==
        todayString
      ) {
        return;
      }

      if (
        event.status ===
        "cancelled"
      ) {
        return;
      }

      result.push({
        id: `event-${event.id}`,
        type: "event",
        icon: CalendarDays,
        title: "Event today",
        message:
          event.title ||
          "You have a calendar event today.",
        date:
          event.time
            ? `${event.date} • ${event.time}`
            : event.date,
      });
    });

    // =======================================================
    // FINANCE
    // =======================================================

    const finance =
      data.finance || [];

    finance.forEach((item) => {
      if (
        item.date !==
        todayString
      ) {
        return;
      }

      const amount =
        Number(
          item.amount || 0
        );

      if (amount <= 0) {
        return;
      }

      if (
        item.type ===
        "income"
      ) {
        result.push({
          id: `income-${item.id}`,
          type: "income",
          icon: Wallet,
          title: "Income recorded",
          message:
            `Rs. ${amount.toLocaleString()} income was added today.`,
          date: todayString,
        });
      }

      if (
        item.type ===
        "expense"
      ) {
        result.push({
          id: `expense-${item.id}`,
          type: "expense",
          icon: Wallet,
          title: "Expense recorded",
          message:
            `Rs. ${amount.toLocaleString()} expense was recorded today.`,
          date: todayString,
        });
      }
    });

    // =======================================================
    // SORT
    // =======================================================

    return result.sort(
      (a, b) => {
        if (
          a.type === "overdue" &&
          b.type !== "overdue"
        ) {
          return -1;
        }

        if (
          b.type === "overdue" &&
          a.type !== "overdue"
        ) {
          return 1;
        }

        return 0;
      }
    );
  }, [data]);

  return notifications;
}

// ===========================================================
// DATE
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