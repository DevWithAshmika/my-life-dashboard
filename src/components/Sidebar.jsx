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
  async function handleLogout() {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await signOut(auth);

      if (setMobileOpen) {
        setMobileOpen(false);
      }

      // No manual redirect needed.
      // App.jsx listens to Firebase auth state.
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert(
        "Unable to logout. Please try again."
      );
    }
  }

  function handleNavigation(id) {
    setActivePage(id);

    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ====================================================== */}

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-white/10 bg-black/70 p-4 backdrop-blur-2xl lg:block">

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
        <div className="fixed inset-0 z-[60] lg:hidden">

          {/* Overlay */}

          <button
            aria-label="Close menu"
            onClick={() =>
              setMobileOpen(false)
            }
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}

          <aside className="relative z-10 h-full w-[290px] max-w-[85vw] border-r border-white/10 bg-black/95 p-4 shadow-2xl backdrop-blur-2xl">

            <div className="mb-4 flex justify-end">

              <button
                onClick={() =>
                  setMobileOpen(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white"
              >
                <X size={19} />
              </button>

            </div>

            <SidebarContent
              activePage={activePage}
              handleNavigation={
                handleNavigation
              }
              user={user}
              handleLogout={handleLogout}
            />

          </aside>

        </div>
      )}
    </>
  );
}

// ===========================================================
// SIDEBAR CONTENT
// ===========================================================

function SidebarContent({
  activePage,
  handleNavigation,
  user,
  handleLogout,
}) {
  return (
    <div className="flex h-full flex-col">

      {/* =====================================================
          BRAND
      ====================================================== */}

      <div className="mb-8 flex items-center gap-3 px-2">

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">

          <LayoutDashboard size={20} />

        </div>

        <div className="min-w-0">

          <h1 className="truncate text-sm font-bold">
            My Life
          </h1>

          <p className="text-xs text-white/30">
            Personal Dashboard
          </p>

        </div>

      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}

      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">

        {navigation.map((item) => {

          const Icon = item.icon;

          const active =
            activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() =>
                handleNavigation(item.id)
              }
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                active
                  ? "bg-white text-black shadow-lg"
                  : "text-white/45 hover:bg-white/[0.06] hover:text-white"
              }`}
            >

              <Icon
                size={18}
                className={
                  active
                    ? "text-black"
                    : "text-white/40 group-hover:text-white"
                }
              />

              <span>{item.label}</span>

            </button>
          );
        })}

      </nav>

      {/* =====================================================
          USER
      ====================================================== */}

      <div className="mt-4 border-t border-white/10 pt-4">

        <div className="mb-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">

          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt="Profile"
              className="h-10 w-10 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold">
              {getInitials(
                user?.displayName ||
                  user?.email ||
                  "User"
              )}
            </div>
          )}

          <div className="min-w-0">

            <p className="truncate text-sm font-medium">
              {user?.displayName ||
                "User"}
            </p>

            <p className="truncate text-xs text-white/30">
              {user?.email ||
                "Signed in"}
            </p>

          </div>

        </div>

        {/* LOGOUT */}

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-red-400 transition hover:bg-red-500/10"
        >

          <LogOut size={18} />

          Logout

        </button>

      </div>

    </div>
  );
}

// ===========================================================
// INITIALS
// ===========================================================

function getInitials(value) {
  return value
    .split(" ")
    .slice(0, 2)
    .map((word) =>
      word.charAt(0).toUpperCase()
    )
    .join("");
}