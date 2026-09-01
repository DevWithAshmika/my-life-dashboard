import { useMemo } from "react";

import {
  CheckSquare,
  CalendarDays,
  AlertCircle,
  Wallet,
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

      // Overdue

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
          message: `${title} is overdue.`,
          date: taskDate,
        });
      }

      // Today

      if (
        taskDate === todayString &&
        !completed
      ) {
        result.push({
          id: `today-task-${task.id}`,
          type: "task",
          icon: CheckSquare,
          title: "Task due today",
          message: `${title} is scheduled for today.`,
          date: todayString,
        });
      }
    });

    // =======================================================
    // CALENDAR
    // =======================================================

    const calendar =
      data.calendar || [];

    calendar.forEach((event) => {

      if (
        event.date !== todayString
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
        item.date !== todayString
      ) {
        return;
      }

      const amount = Number(
        item.amount || 0
      );

      if (amount <= 0) {
        return;
      }

      if (item.type === "income") {

        result.push({
          id: `income-${item.id}`,
          type: "income",
          icon: Wallet,
          title: "Income recorded",
          message: `Rs. ${amount.toLocaleString()} income was added today.`,
          date: todayString,
        });

      }

      if (item.type === "expense") {

        result.push({
          id: `expense-${item.id}`,
          type: "expense",
          icon: Wallet,
          title: "Expense recorded",
          message: `Rs. ${amount.toLocaleString()} expense was recorded today.`,
          date: todayString,
        });

      }
    });

    // =======================================================
    // SORT
    // =======================================================

    return result.sort((a, b) => {

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
    });

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