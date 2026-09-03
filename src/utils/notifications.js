import { LocalNotifications } from "@capacitor/local-notifications";

// ===========================================================
// PERMISSION
// ===========================================================

export async function requestNotificationPermission() {
  try {
    const current =
      await LocalNotifications.checkPermissions();

    if (current.display === "granted") {
      return true;
    }

    const result =
      await LocalNotifications.requestPermissions();

    return result.display === "granted";
  } catch (error) {
    console.error(
      "Notification permission error:",
      error
    );

    return false;
  }
}

// ===========================================================
// CHANNEL
// ===========================================================

export async function createNotificationChannel() {
  try {
    await LocalNotifications.createChannel({
      id: "my-dashboard-reminders",
      name: "My Dashboard Reminders",
      description:
        "Tasks, goals, habits and calendar reminders.",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  } catch (error) {
    console.error(
      "Notification channel error:",
      error
    );
  }
}

// ===========================================================
// INIT
// ===========================================================

export async function initializeNotifications() {
  const granted =
    await requestNotificationPermission();

  if (!granted) {
    return false;
  }

  await createNotificationChannel();

  return true;
}

// ===========================================================
// SAFE ID
// ===========================================================

function notificationId(prefix, id) {
  let hash = 0;

  const value = `${prefix}-${id}`;

  for (
    let index = 0;
    index < value.length;
    index++
  ) {
    hash =
      (hash * 31 +
        value.charCodeAt(index)) |
      0;
  }

  return Math.abs(hash) % 2000000000;
}

// ===========================================================
// DATE + TIME
// ===========================================================

function createDateTime(date, time) {
  if (!date) {
    return null;
  }

  const safeTime = time || "09:00";

  const value = new Date(
    `${date}T${safeTime}:00`
  );

  if (Number.isNaN(value.getTime())) {
    return null;
  }

  return value;
}

// ===========================================================
// CANCEL
// ===========================================================

export async function cancelNotification(id) {
  try {
    await LocalNotifications.cancel({
      notifications: [
        {
          id,
        },
      ],
    });
  } catch (error) {
    console.error(
      "Cancel notification error:",
      error
    );
  }
}

// ===========================================================
// TASK
// ===========================================================

export async function scheduleTaskNotification({
  id,
  title,
  dueDate,
  reminderTime = "09:00",
}) {
  if (!dueDate) {
    return false;
  }

  const granted =
    await initializeNotifications();

  if (!granted) {
    return false;
  }

  const at = createDateTime(
    dueDate,
    reminderTime
  );

  if (
    !at ||
    at.getTime() <= Date.now()
  ) {
    return false;
  }

  const notificationIdValue =
    notificationId("task", id);

  await cancelNotification(
    notificationIdValue
  );

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationIdValue,

        title: "Task Reminder",

        body: `${
          title || "Task"
        } is due today.`,

        channelId:
          "my-dashboard-reminders",

        schedule: {
          at,
          allowWhileIdle: true,
        },

        extra: {
          type: "task",
          itemId: id,
        },
      },
    ],
  });

  return true;
}

export async function cancelTaskNotification(id) {
  return cancelNotification(
    notificationId("task", id)
  );
}

// ===========================================================
// GOAL
// ===========================================================

export async function scheduleGoalNotification({
  id,
  title,
  deadline,
  reminderTime = "09:00",
}) {
  if (!deadline) {
    return false;
  }

  const granted =
    await initializeNotifications();

  if (!granted) {
    return false;
  }

  const at = createDateTime(
    deadline,
    reminderTime
  );

  if (
    !at ||
    at.getTime() <= Date.now()
  ) {
    return false;
  }

  const notificationIdValue =
    notificationId("goal", id);

  await cancelNotification(
    notificationIdValue
  );

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationIdValue,

        title: "Goal Reminder",

        body: `${
          title || "Goal"
        } deadline is today.`,

        channelId:
          "my-dashboard-reminders",

        schedule: {
          at,
          allowWhileIdle: true,
        },

        extra: {
          type: "goal",
          itemId: id,
        },
      },
    ],
  });

  return true;
}

export async function cancelGoalNotification(id) {
  return cancelNotification(
    notificationId("goal", id)
  );
}

// ===========================================================
// HABIT
// ===========================================================

export async function scheduleHabitNotification({
  id,
  name,
  reminderTime = "09:00",
}) {
  const granted =
    await initializeNotifications();

  if (!granted) {
    return false;
  }

  const [hours, minutes] =
    reminderTime
      .split(":")
      .map(Number);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return false;
  }

  const now = new Date();

  const at = new Date();

  at.setHours(
    hours,
    minutes,
    0,
    0
  );

  if (
    at.getTime() <=
    now.getTime()
  ) {
    at.setDate(
      at.getDate() + 1
    );
  }

  const notificationIdValue =
    notificationId("habit", id);

  await cancelNotification(
    notificationIdValue
  );

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationIdValue,

        title: "Habit Reminder",

        body: `${
          name || "Habit"
        } is waiting for you today.`,

        channelId:
          "my-dashboard-reminders",

        schedule: {
          at,
          repeats: true,
          every: "day",
          allowWhileIdle: true,
        },

        extra: {
          type: "habit",
          itemId: id,
        },
      },
    ],
  });

  return true;
}

export async function cancelHabitNotification(id) {
  return cancelNotification(
    notificationId("habit", id)
  );
}

// ===========================================================
// CALENDAR
// ===========================================================

export async function scheduleCalendarNotification({
  id,
  title,
  date,
  time = "09:00",
}) {
  if (!date) {
    return false;
  }

  const granted =
    await initializeNotifications();

  if (!granted) {
    return false;
  }

  const at = createDateTime(
    date,
    time
  );

  if (
    !at ||
    at.getTime() <= Date.now()
  ) {
    return false;
  }

  const notificationIdValue =
    notificationId(
      "calendar",
      id
    );

  await cancelNotification(
    notificationIdValue
  );

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationIdValue,

        title: "Calendar Reminder",

        body: `${
          title || "Calendar event"
        } is scheduled for today.`,

        channelId:
          "my-dashboard-reminders",

        schedule: {
          at,
          allowWhileIdle: true,
        },

        extra: {
          type: "calendar",
          itemId: id,
        },
      },
    ],
  });

  return true;
}

export async function cancelCalendarNotification(id) {
  return cancelNotification(
    notificationId("calendar", id)
  );
}