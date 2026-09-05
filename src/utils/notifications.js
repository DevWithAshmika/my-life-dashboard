import { LocalNotifications } from "@capacitor/local-notifications";

const CHANNEL_ID = "my-dashboard-reminders";

/* =========================================================
   HELPERS
========================================================= */

function hashString(value) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash =
      (hash << 5) -
      hash +
      value.charCodeAt(i);

    hash |= 0;
  }

  return Math.abs(hash) || 1;
}

/* =========================================================
   PERMISSION
========================================================= */

export async function requestNotificationPermission() {
  try {
    const permission =
      await LocalNotifications.requestPermissions();

    console.log(
      "My Dashboard Notification Permission:",
      permission.display
    );

    return permission.display === "granted";
  } catch (error) {
    console.error(
      "Notification permission error:",
      error
    );

    return false;
  }
}

/* =========================================================
   ANDROID NOTIFICATION CHANNEL
========================================================= */

export async function createNotificationChannel() {
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "My Dashboard Reminders",
      description:
        "Goals, tasks, calendar and other reminders from My Dashboard",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });

    console.log(
      "My Dashboard Notification Channel: READY"
    );

    return true;
  } catch (error) {
    console.error(
      "Notification channel error:",
      error
    );

    return false;
  }
}

/* =========================================================
   INITIALIZE NOTIFICATIONS
========================================================= */

export async function initializeNotifications() {
  try {
    const granted =
      await requestNotificationPermission();

    if (!granted) {
      console.warn(
        "My Dashboard Notifications: Permission denied"
      );

      return false;
    }

    await createNotificationChannel();

    console.log(
      "My Dashboard Notifications: INITIALIZED"
    );

    return true;
  } catch (error) {
    console.error(
      "Notification initialization error:",
      error
    );

    return false;
  }
}

/* =========================================================
   GENERIC NOTIFICATION
========================================================= */

export async function scheduleNotification({
  id,
  title,
  body,
  date,
  extra = {},
}) {
  try {
    if (!id || !title || !body || !date) {
      console.warn(
        "Invalid notification data"
      );

      return false;
    }

    const notificationDate =
      date instanceof Date
        ? date
        : new Date(date);

    if (
      Number.isNaN(
        notificationDate.getTime()
      )
    ) {
      console.warn(
        "Invalid notification date:",
        date
      );

      return false;
    }

    if (
      notificationDate.getTime() <=
      Date.now()
    ) {
      console.warn(
        "Notification date is in the past:",
        notificationDate
      );

      return false;
    }

    const granted =
      await requestNotificationPermission();

    if (!granted) {
      console.warn(
        "Notification permission not granted"
      );

      return false;
    }

    await createNotificationChannel();

    const notificationId =
      typeof id === "number"
        ? id
        : hashString(String(id));

    // Remove an older notification with
    // the same ID before scheduling.
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: notificationDate,
            allowWhileIdle: true,
          },
          extra,
        },
      ],
    });

    console.log(
      "Notification scheduled:",
      {
        id: notificationId,
        title,
        body,
        date: notificationDate,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Schedule notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CANCEL GENERIC NOTIFICATION
========================================================= */

export async function cancelNotification(id) {
  try {
    if (!id) {
      return false;
    }

    const notificationId =
      typeof id === "number"
        ? id
        : hashString(String(id));

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    });

    console.log(
      "Notification cancelled:",
      notificationId
    );

    return true;
  } catch (error) {
    console.error(
      "Cancel notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   GOAL NOTIFICATION
========================================================= */

export async function scheduleGoalNotification(goal) {
  try {
    if (!goal) {
      console.warn(
        "Goal notification: Goal data missing"
      );

      return false;
    }

    const goalId =
      goal.id ||
      goal.goalId;

    if (!goalId) {
      console.warn(
        "Goal notification: Missing goal ID"
      );

      return false;
    }

    const deadline =
      goal.deadline ||
      goal.reminderDate ||
      goal.reminderAt ||
      goal.dueDate ||
      goal.targetDate;

    if (!deadline) {
      console.warn(
        "Goal notification: No deadline/reminder date",
        goal
      );

      return false;
    }

    const reminderTime =
      goal.reminderTime ||
      "09:00";

    let reminderDate;

    if (deadline instanceof Date) {
      reminderDate =
        new Date(deadline);

      const [
        hours = "09",
        minutes = "00",
      ] =
        String(reminderTime).split(":");

      reminderDate.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
      );
    } else {
      const deadlineString =
        String(deadline).trim();

      const timeString =
        String(reminderTime).trim();

      reminderDate =
        new Date(
          `${deadlineString}T${timeString}:00`
        );
    }

    if (
      Number.isNaN(
        reminderDate.getTime()
      )
    ) {
      console.warn(
        "Goal notification: Invalid date/time",
        {
          deadline,
          reminderTime,
          reminderDate,
        }
      );

      return false;
    }

    if (
      reminderDate.getTime() <=
      Date.now()
    ) {
      console.warn(
        "Goal notification: Reminder time is in the past",
        {
          reminderDate,
          now: new Date(),
        }
      );

      return false;
    }

    const title =
      goal.title ||
      goal.name ||
      "Goal Reminder";

    const body =
      goal.description &&
      String(
        goal.description
      ).trim()
        ? String(
            goal.description
          ).trim()
        : `Don't forget about your goal: ${title}`;

    const notificationId =
      hashString(
        `goal-${goalId}`
      );

    const granted =
      await requestNotificationPermission();

    if (!granted) {
      console.warn(
        "Goal notification: Permission denied"
      );

      return false;
    }

    await createNotificationChannel();

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: `🎯 ${title}`,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: reminderDate,
            allowWhileIdle: true,
          },
          extra: {
            type: "goal",
            goalId: String(goalId),
            deadline: String(deadline),
            reminderTime:
              String(reminderTime),
          },
        },
      ],
    });

    console.log(
      "REAL GOAL NOTIFICATION SCHEDULED",
      {
        goalId,
        notificationId,
        title,
        body,
        deadline,
        reminderTime,
        reminderDate,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Schedule goal notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CANCEL GOAL NOTIFICATION
========================================================= */

export async function cancelGoalNotification(
  goalId
) {
  try {
    if (!goalId) {
      console.warn(
        "Cancel goal notification: Missing goal ID"
      );

      return false;
    }

    const notificationId =
      hashString(
        `goal-${goalId}`
      );

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    });

    console.log(
      "Goal notification cancelled:",
      {
        goalId,
        notificationId,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Cancel goal notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   TASK NOTIFICATION
========================================================= */

export async function scheduleTaskNotification(task) {
  try {
    if (!task) {
      return false;
    }

    const taskId =
      task.id ||
      task.taskId;

    if (!taskId) {
      console.warn(
        "Task notification: Missing task ID"
      );

      return false;
    }

    const dueDate =
      task.dueDate ||
      task.deadline ||
      task.date ||
      task.taskDate;

    if (!dueDate) {
      console.warn(
        "Task notification: No due date"
      );

      return false;
    }

    const reminderTime =
      task.reminderTime ||
      "09:00";

    const completed =
      task.completed === true ||
      task.status === "completed" ||
      task.status === "done";

    if (completed) {
      console.log(
        "Task notification: Task already completed"
      );

      return false;
    }

    let reminderDate;

    if (dueDate instanceof Date) {
      reminderDate =
        new Date(dueDate);

      const [
        hours = "09",
        minutes = "00",
      ] =
        String(reminderTime).split(":");

      reminderDate.setHours(
        Number(hours),
        Number(minutes),
        0,
        0
      );
    } else {
      reminderDate =
        new Date(
          `${String(dueDate).trim()}T${String(
            reminderTime
          ).trim()}:00`
        );
    }

    if (
      Number.isNaN(
        reminderDate.getTime()
      )
    ) {
      console.warn(
        "Task notification: Invalid date/time"
      );

      return false;
    }

    if (
      reminderDate.getTime() <=
      Date.now()
    ) {
      console.warn(
        "Task notification: Reminder time is in the past"
      );

      return false;
    }

    const title =
      task.title ||
      task.name ||
      "Task Reminder";

    const body =
      task.description &&
      String(
        task.description
      ).trim()
        ? String(
            task.description
          ).trim()
        : `Don't forget about your task: ${title}`;

    const notificationId =
      hashString(
        `task-${taskId}`
      );

    const granted =
      await requestNotificationPermission();

    if (!granted) {
      console.warn(
        "Task notification: Permission denied"
      );

      return false;
    }

    await createNotificationChannel();

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: `✅ ${title}`,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: reminderDate,
            allowWhileIdle: true,
          },
          extra: {
            type: "task",
            taskId: String(taskId),
            dueDate: String(dueDate),
            reminderTime:
              String(reminderTime),
          },
        },
      ],
    });

    console.log(
      "REAL TASK NOTIFICATION SCHEDULED",
      {
        taskId,
        notificationId,
        title,
        reminderDate,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Schedule task notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CANCEL TASK NOTIFICATION
========================================================= */

export async function cancelTaskNotification(
  taskId
) {
  try {
    if (!taskId) {
      return false;
    }

    const notificationId =
      hashString(
        `task-${taskId}`
      );

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    });

    console.log(
      "Task notification cancelled:",
      {
        taskId,
        notificationId,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Cancel task notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CALENDAR NOTIFICATION
========================================================= */

export async function scheduleCalendarNotification(
  calendarEvent
) {
  try {
    if (!calendarEvent) {
      console.warn(
        "Calendar notification: Event data missing"
      );

      return false;
    }

    const eventId =
      calendarEvent.id ||
      calendarEvent.eventId;

    if (!eventId) {
      console.warn(
        "Calendar notification: Missing event ID"
      );

      return false;
    }

    if (
      !calendarEvent.date ||
      !calendarEvent.time
    ) {
      console.warn(
        "Calendar notification: Date or time missing"
      );

      return false;
    }

    if (
      !calendarEvent.reminder ||
      calendarEvent.reminder === "none"
    ) {
      console.log(
        "Calendar notification: No reminder selected"
      );

      return false;
    }

    const status =
      calendarEvent.status ||
      "upcoming";

    if (
      status === "completed" ||
      status === "cancelled"
    ) {
      console.log(
        "Calendar notification: Event is not active"
      );

      return false;
    }

    const eventDateTime =
      new Date(
        `${String(calendarEvent.date).trim()}T${String(
          calendarEvent.time
        ).trim()}:00`
      );

    if (
      Number.isNaN(
        eventDateTime.getTime()
      )
    ) {
      console.warn(
        "Calendar notification: Invalid event date/time",
        {
          date: calendarEvent.date,
          time: calendarEvent.time,
        }
      );

      return false;
    }

    let minutesBefore;

    switch (
      calendarEvent.reminder
    ) {
      case "5 minutes":
        minutesBefore = 5;
        break;

      case "15 minutes":
        minutesBefore = 15;
        break;

      case "30 minutes":
        minutesBefore = 30;
        break;

      case "1 hour":
        minutesBefore = 60;
        break;

      case "1 day":
        minutesBefore = 24 * 60;
        break;

      default:
        console.warn(
          "Calendar notification: Unknown reminder value",
          calendarEvent.reminder
        );

        return false;
    }

    const reminderDate =
      new Date(
        eventDateTime.getTime() -
          minutesBefore *
            60 *
            1000
      );

    if (
      reminderDate.getTime() <=
      Date.now()
    ) {
      console.warn(
        "Calendar notification: Reminder time is in the past",
        {
          eventDateTime,
          reminderDate,
        }
      );

      return false;
    }

    const title =
      calendarEvent.title ||
      "Calendar Reminder";

    const body =
      `${title} starts in ${calendarEvent.reminder}.`;

    const notificationId =
      hashString(
        `calendar-${eventId}`
      );

    const granted =
      await requestNotificationPermission();

    if (!granted) {
      console.warn(
        "Calendar notification: Permission denied"
      );

      return false;
    }

    await createNotificationChannel();

    // Cancel previous notification
    // before creating the new one.
    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    }).catch(() => {});

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: `📅 ${title}`,
          body,
          channelId: CHANNEL_ID,
          schedule: {
            at: reminderDate,
            allowWhileIdle: true,
          },
          extra: {
            type: "calendar",
            eventId: String(eventId),
            eventDate: String(
              calendarEvent.date
            ),
            eventTime: String(
              calendarEvent.time
            ),
            reminder: String(
              calendarEvent.reminder
            ),
          },
        },
      ],
    });

    console.log(
      "REAL CALENDAR NOTIFICATION SCHEDULED",
      {
        eventId,
        notificationId,
        title,
        eventDateTime,
        reminderDate,
        reminder:
          calendarEvent.reminder,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Schedule calendar notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CANCEL CALENDAR NOTIFICATION
========================================================= */

export async function cancelCalendarNotification(
  eventId
) {
  try {
    if (!eventId) {
      console.warn(
        "Cancel calendar notification: Missing event ID"
      );

      return false;
    }

    const notificationId =
      hashString(
        `calendar-${eventId}`
      );

    await LocalNotifications.cancel({
      notifications: [
        {
          id: notificationId,
        },
      ],
    });

    console.log(
      "Calendar notification cancelled:",
      {
        eventId,
        notificationId,
      }
    );

    return true;
  } catch (error) {
    console.error(
      "Cancel calendar notification error:",
      error
    );

    return false;
  }
}

/* =========================================================
   CANCEL ALL
========================================================= */

export async function cancelAllNotifications() {
  try {
    await LocalNotifications.cancelAll();

    console.log(
      "All notifications cancelled"
    );

    return true;
  } catch (error) {
    console.error(
      "Cancel all notifications error:",
      error
    );

    return false;
  }
}

/* =========================================================
   GET PENDING NOTIFICATIONS
========================================================= */

export async function getPendingNotifications() {
  try {
    const result =
      await LocalNotifications.getPending();

    console.log(
      "Pending notifications:",
      result.notifications
    );

    return (
      result.notifications || []
    );
  } catch (error) {
    console.error(
      "Get pending notifications error:",
      error
    );

    return [];
  }
}