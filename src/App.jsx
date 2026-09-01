import { useEffect, useState } from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase/config";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";

import Dashboard from "./pages/Dashboard";
import Finance from "./pages/Finance";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Habits from "./pages/Habits";
import Fitness from "./pages/Fitness";
import Calendar from "./pages/Calendar";
import Travel from "./pages/Travel";
import Notes from "./pages/Notes";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

import Login from "./pages/Login";

export default function App() {
  // =========================================================
  // USER
  // =========================================================

  const [user, setUser] = useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  // =========================================================
  // ACTIVE PAGE
  // =========================================================

  const [activePage, setActivePage] =
    useState("dashboard");

  // =========================================================
  // MOBILE MENU
  // =========================================================

  const [mobileOpen, setMobileOpen] =
    useState(false);

  // =========================================================
  // DARK MODE
  // =========================================================
  // Default = dark
  // Saved in localStorage
  // =========================================================

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme =
      localStorage.getItem(
        "my-life-dashboard-theme"
      );

    if (savedTheme === "light") {
      return false;
    }

    return true;
  });

  // =========================================================
  // APPLY THEME
  // =========================================================

  useEffect(() => {
    const root =
      document.documentElement;

    if (darkMode) {
      root.classList.add("dark");
      root.classList.remove("light");

      document.body.classList.add("dark");
      document.body.classList.remove("light");

      localStorage.setItem(
        "my-life-dashboard-theme",
        "dark"
      );
    } else {
      root.classList.add("light");
      root.classList.remove("dark");

      document.body.classList.add("light");
      document.body.classList.remove("dark");

      localStorage.setItem(
        "my-life-dashboard-theme",
        "light"
      );
    }
  }, [darkMode]);

  // =========================================================
  // FIREBASE AUTH LISTENER
  // =========================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);

          // When user logs out
          if (!currentUser) {
            setActivePage("dashboard");
          }
        }
      );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // CHANGE PAGE
  // =========================================================

  const handlePageChange = (page) => {
    setActivePage(page);

    // Close mobile sidebar after selecting a page
    setMobileOpen(false);
  };

  // =========================================================
  // AUTH LOADING
  // =========================================================

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">

        <div className="text-center">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />

          <p className="text-sm text-white/40">
            Checking authentication...
          </p>

        </div>

      </div>
    );
  }

  // =========================================================
  // NOT LOGGED IN
  // =========================================================

  if (!user) {
    return <Login />;
  }

  // =========================================================
  // LOGGED IN APP
  // =========================================================

  return (
    <div
      className={`
        min-h-screen transition-colors duration-300
        ${
          darkMode
            ? "bg-black text-white"
            : "bg-[#f5f5f7] text-black"
        }
      `}
    >

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        activePage={activePage}
        setActivePage={handlePageChange}
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        darkMode={darkMode}
      />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        className={`
          min-h-screen transition-colors duration-300
          lg:pl-64
          ${
            darkMode
              ? "bg-black"
              : "bg-[#f5f5f7]"
          }
        `}
      >

        <div className="mx-auto w-full max-w-[1800px] px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">

          {/* =================================================
              MOBILE NAV
          ================================================== */}

          <div className="mb-5 lg:hidden">

            <MobileNav
              user={user}
              onMenuClick={() =>
                setMobileOpen(true)
              }
              darkMode={darkMode}
            />

          </div>

          {/* =================================================
              DASHBOARD
          ================================================== */}

          {activePage === "dashboard" && (
            <Dashboard user={user} />
          )}

          {/* =================================================
              FINANCE
          ================================================== */}

          {activePage === "finance" && (
            <Finance user={user} />
          )}

          {/* =================================================
              TASKS
          ================================================== */}

          {activePage === "tasks" && (
            <Tasks user={user} />
          )}

          {/* =================================================
              GOALS
          ================================================== */}

          {activePage === "goals" && (
            <Goals user={user} />
          )}

          {/* =================================================
              HABITS
          ================================================== */}

          {activePage === "habits" && (
            <Habits user={user} />
          )}

          {/* =================================================
              FITNESS
          ================================================== */}

          {activePage === "fitness" && (
            <Fitness user={user} />
          )}

          {/* =================================================
              CALENDAR
          ================================================== */}

          {activePage === "calendar" && (
            <Calendar user={user} />
          )}

          {/* =================================================
              TRAVEL
          ================================================== */}

          {activePage === "travel" && (
            <Travel user={user} />
          )}

          {/* =================================================
              NOTES
          ================================================== */}

          {activePage === "notes" && (
            <Notes user={user} />
          )}

          {/* =================================================
              ANALYTICS
          ================================================== */}

          {activePage === "analytics" && (
            <Analytics user={user} />
          )}

          {/* =================================================
              SETTINGS
          ================================================== */}

          {activePage === "settings" && (
            <Settings
              user={user}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
            />
          )}

        </div>

      </main>

    </div>
  );
}