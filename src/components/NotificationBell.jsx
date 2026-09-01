import { useMemo, useState } from "react";
import {
  Bell,
  CheckSquare,
  CalendarDays,
  AlertCircle,
  Wallet,
  X,
  Check,
} from "lucide-react";

export default function NotificationBell({
  notifications = [],
}) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState([]);

  const unreadCount = useMemo(() => {
    return notifications.filter(
      (item) => !readIds.includes(item.id)
    ).length;
  }, [notifications, readIds]);

  function markAsRead(id) {
    setReadIds((previous) => {
      if (previous.includes(id)) {
        return previous;
      }

      return [...previous, id];
    });
  }

  function markAllAsRead() {
    setReadIds(
      notifications.map((item) => item.id)
    );
  }

  return (
    <div className="relative">

      {/* Bell Button */}

      <button
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/70 backdrop-blur-xl transition hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}

      {open && (
        <>
          {/* Mobile backdrop */}

          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
            onClick={() => setOpen(false)}
          />

          <div className="fixed left-4 right-4 top-20 z-50 overflow-hidden rounded-3xl border border-white/10 bg-[#111]/95 shadow-2xl backdrop-blur-2xl sm:absolute sm:left-auto sm:right-0 sm:top-14 sm:w-[380px]">

            {/* Header */}

            <div className="flex items-center justify-between border-b border-white/10 p-4">

              <div>
                <h3 className="font-semibold">
                  Notifications
                </h3>

                <p className="mt-1 text-xs text-white/30">
                  {unreadCount} unread
                </p>
              </div>

              <div className="flex items-center gap-2">

                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="rounded-xl px-3 py-2 text-xs text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    Mark all read
                  </button>
                )}

                <button
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                >
                  <X size={17} />
                </button>

              </div>

            </div>

            {/* List */}

            <div className="max-h-[430px] overflow-y-auto">

              {notifications.length === 0 ? (

                <div className="px-6 py-12 text-center">

                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-white/20">
                    <Bell size={22} />
                  </div>

                  <p className="text-sm text-white/40">
                    You're all caught up.
                  </p>

                  <p className="mt-1 text-xs text-white/20">
                    No new notifications.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-white/5">

                  {notifications.map(
                    (notification) => {

                      const isRead =
                        readIds.includes(
                          notification.id
                        );

                      return (
                        <NotificationItem
                          key={notification.id}
                          notification={
                            notification
                          }
                          isRead={isRead}
                          onRead={() =>
                            markAsRead(
                              notification.id
                            )
                          }
                        />
                      );
                    }
                  )}

                </div>
              )}

            </div>

          </div>
        </>
      )}

    </div>
  );
}

// ===========================================================
// NOTIFICATION ITEM
// ===========================================================

function NotificationItem({
  notification,
  isRead,
  onRead,
}) {
  const Icon =
    notification.icon || Bell;

  return (
    <button
      onClick={onRead}
      className={`flex w-full gap-3 p-4 text-left transition ${
        isRead
          ? "bg-transparent opacity-50"
          : "bg-white/[0.025] hover:bg-white/[0.06]"
      }`}
    >

      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          notification.type === "expense"
            ? "bg-red-500/10 text-red-400"
            : notification.type === "income"
            ? "bg-emerald-500/10 text-emerald-400"
            : notification.type === "overdue"
            ? "bg-red-500/10 text-red-400"
            : "bg-white/10 text-white/60"
        }`}
      >
        <Icon size={17} />
      </div>

      <div className="min-w-0 flex-1">

        <div className="flex items-start justify-between gap-2">

          <p className="text-sm font-medium">
            {notification.title}
          </p>

          {!isRead && (
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-400" />
          )}

        </div>

        <p className="mt-1 text-xs leading-5 text-white/35">
          {notification.message}
        </p>

        {notification.date && (
          <p className="mt-2 text-[10px] text-white/20">
            {notification.date}
          </p>
        )}

      </div>

      {isRead && (
        <Check
          size={14}
          className="mt-1 shrink-0 text-emerald-400/60"
        />
      )}

    </button>
  );
}