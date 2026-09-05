import {
  Menu,
  UserRound,
} from "lucide-react";

import AppNotifications from "./AppNotifications";

export default function Header({
  user,
  onMenuClick,
}) {
  return (
    <header
      className="
        sticky
        top-0
        z-30
        mb-6
        flex
        h-16
        items-center
        justify-between
        border-b
        border-white/5
        bg-black/40
        px-4
        backdrop-blur-2xl
        sm:px-6
      "
    >
      {/* =====================================================
          MOBILE MENU
      ====================================================== */}

      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          border
          border-white/10
          bg-white/5
          text-white/70
          transition-all
          duration-200
          hover:bg-white/10
          hover:text-white
          active:scale-95
          lg:hidden
        "
      >
        <Menu size={21} />
      </button>

      {/* =====================================================
          RIGHT SIDE
      ====================================================== */}

      <div
        className="
          ml-auto
          flex
          items-center
          gap-3
        "
      >
        <AppNotifications
          user={user}
        />

        {/* PROFILE */}

        <div
          className="
            h-10
            w-10
            overflow-hidden
            rounded-xl
            bg-white/10
            ring-1
            ring-white/10
          "
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={
                user?.displayName ||
                "Profile"
              }
              className="
                h-full
                w-full
                object-cover
              "
              referrerPolicy="no-referrer"
              onError={(event) => {
                event.currentTarget.style.display =
                  "none";

                const fallback =
                  event.currentTarget
                    .nextElementSibling;

                if (fallback) {
                  fallback.style.display =
                    "flex";
                }
              }}
            />
          ) : null}

          {/* FALLBACK */}

          <div
            className={`
              h-full
              w-full
              items-center
              justify-center
              text-white/60
              ${
                user?.photoURL
                  ? "hidden"
                  : "flex"
              }
            `}
          >
            <UserRound size={20} />
          </div>
        </div>
      </div>
    </header>
  );
}