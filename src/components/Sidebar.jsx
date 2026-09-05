import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Target,
  Repeat,
  Dumbbell,
  CalendarDays,
  Map,
  TrendingUp,
  FileText,
  Settings,
  LogOut,
  X,
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "../firebase/config";

const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "finance",
    label: "Finance",
    icon: Wallet,
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: CheckSquare,
  },
  {
    id: "goals",
    label: "Goals",
    icon: Target,
  },
  {
    id: "habits",
    label: "Habits",
    icon: Repeat,
  },
  {
    id: "fitness",
    label: "Fitness",
    icon: Dumbbell,
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    id: "travel",
    label: "Travel",
    icon: Map,
  },
  {
    id: "notes",
    label: "Notes",
    icon: FileText,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: TrendingUp,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar({
  activePage,
  setActivePage,
  user,
  mobileOpen = false,
  setMobileOpen,
}) {
  function handleNavigation(id) {
    if (typeof setActivePage === "function") {
      setActivePage(id);
    }

    if (typeof setMobileOpen === "function") {
      setMobileOpen(false);
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleLogout() {
    const confirmed =
      window.confirm(
        "Are you sure you want to logout?"
      );

    if (!confirmed) return;

    try {
      await signOut(auth);

      if (
        typeof setMobileOpen ===
        "function"
      ) {
        setMobileOpen(false);
      }
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      window.alert(
        "Unable to logout. Please try again."
      );
    }
  }

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside
        className="
          fixed
          left-0
          top-0
          z-[50]
          hidden
          h-screen
          w-[260px]
          border-r
          border-white/10
          bg-black/95
          p-4
          backdrop-blur-2xl
          lg:block
        "
      >
        <SidebarContent
          activePage={activePage}
          handleNavigation={handleNavigation}
          user={user}
          handleLogout={handleLogout}
        />
      </aside>

      {/* =====================================================
          MOBILE SIDEBAR
      ====================================================== */}

      {mobileOpen && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            lg:hidden
          "
        >
          {/* OVERLAY */}

          <button
            type="button"
            aria-label="Close menu"
            onClick={() =>
              setMobileOpen(false)
            }
            className="
              absolute
              inset-0
              h-full
              w-full
              border-0
              bg-black/70
              p-0
              backdrop-blur-sm
            "
          />

          {/* DRAWER */}

          <aside
            className="
              absolute
              left-0
              top-0
              z-[10000]
              flex
              h-[100dvh]
              w-[290px]
              max-w-[85vw]
              flex-col
              border-r
              border-white/10
              bg-black
              p-4
              shadow-2xl
            "
          >
            {/* MOBILE HEADER */}

            <div
              className="
                mb-6
                flex
                shrink-0
                items-center
                justify-between
              "
            >
              <div className="px-2">
                <p
                  className="
                    text-xs
                    font-medium
                    tracking-[0.18em]
                    text-white/40
                  "
                >
                  MENU
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setMobileOpen(false)
                }
                aria-label="Close menu"
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.06]
                  text-white/60
                  transition
                  active:scale-95
                "
              >
                <X size={19} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="min-h-0 flex-1">
              <SidebarContent
                activePage={activePage}
                handleNavigation={handleNavigation}
                user={user}
                handleLogout={handleLogout}
              />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Sidebar Content
|--------------------------------------------------------------------------
*/

function SidebarContent({
  activePage,
  handleNavigation,
  user,
  handleLogout,
}) {
  return (
    <div
      className="
        flex
        h-full
        min-h-0
        flex-col
      "
    >
      {/* BRAND */}

      <div
        className="
          mb-7
          flex
          shrink-0
          items-center
          gap-3
          px-2
        "
      >
        <div
          className="
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-2xl
            border
            border-white/10
            bg-white/[0.08]
            text-white
          "
        >
          <LayoutDashboard size={20} />
        </div>

        <div className="min-w-0">
          <h1
            className="
              truncate
              text-sm
              font-bold
              text-white
            "
          >
            My Dashboard
          </h1>

          <p
            className="
              truncate
              text-xs
              text-white/30
            "
          >
            Personal Dashboard
          </p>
        </div>
      </div>

      {/* NAVIGATION */}

      <nav
        className="
          min-h-0
          flex-1
          space-y-1
          overflow-y-auto
          pr-1
        "
      >
        {navigation.map((item) => {
          const Icon = item.icon;

          const active =
            activePage === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                handleNavigation(
                  item.id
                )
              }
              className={`
                group
                flex
                min-h-[48px]
                w-full
                shrink-0
                items-center
                gap-3
                rounded-2xl
                px-3
                py-3
                text-left
                text-sm
                font-medium
                transition-all
                duration-200
                active:scale-[0.98]
                ${
                  active
                    ? "bg-white text-black shadow-lg"
                    : "text-white/50 hover:bg-white/[0.06] hover:text-white active:bg-white/[0.10]"
                }
              `}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "shrink-0 text-black"
                    : "shrink-0 text-white/50 group-hover:text-white"
                }
              />

              <span className="truncate">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* USER */}

      <div
        className="
          mt-4
          shrink-0
          border-t
          border-white/10
          pt-4
        "
      >
        <div
          className="
            mb-3
            flex
            items-center
            gap-3
            rounded-2xl
            border
            border-white/[0.06]
            bg-white/[0.05]
            p-3
          "
        >
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="
                h-10
                w-10
                shrink-0
                rounded-xl
                object-cover
              "
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-white/10
                text-sm
                font-semibold
                text-white
              "
            >
              {getInitials(
                user?.displayName ||
                  user?.email ||
                  "User"
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p
              className="
                truncate
                text-sm
                font-medium
                text-white
              "
            >
              {user?.displayName ||
                "User"}
            </p>

            <p
              className="
                truncate
                text-xs
                text-white/30
              "
            >
              {user?.email ||
                "Signed in"}
            </p>
          </div>
        </div>

        {/* LOGOUT */}

        <button
          type="button"
          onClick={handleLogout}
          className="
            flex
            min-h-[48px]
            w-full
            items-center
            gap-3
            rounded-2xl
            px-3
            py-3
            text-sm
            font-medium
            text-red-400
            transition
            hover:bg-red-500/10
            hover:text-red-300
            active:scale-[0.98]
          "
        >
          <LogOut size={18} />

          <span>
            Logout
          </span>
        </button>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Initials
|--------------------------------------------------------------------------
*/

function getInitials(value) {
  if (!value) {
    return "U";
  }

  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");
}