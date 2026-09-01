import { useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";

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
  const [authLoading, setAuthLoading] = useState(true);

  // =========================================================
  // ACTIVE PAGE
  // =========================================================

  const [activePage, setActivePage] = useState("dashboard");

  // =========================================================
  // MOBILE MENU
  // =========================================================

  const [mobileOpen, setMobileOpen] = useState(false);

  // =========================================================
  // THEME
  // =========================================================

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(
      "my-life-dashboard-theme"
    );

    return savedTheme !== "light";
  });

  // =========================================================
  // DASHBOARD COLOR SYSTEM
  //
  // green | red | blue
  // =========================================================

  const [accentColor, setAccentColor] = useState(() => {
    const savedColor = localStorage.getItem(
      "my-life-dashboard-color"
    );

    if (
      savedColor === "green" ||
      savedColor === "red" ||
      savedColor === "blue"
    ) {
      return savedColor;
    }

    return "green";
  });

  // =========================================================
  // APPLY THEME
  // =========================================================

  useEffect(() => {
    const root = document.documentElement;

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
  // APPLY DASHBOARD COLOR
  // =========================================================

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute(
      "data-dashboard-color",
      accentColor
    );

    localStorage.setItem(
      "my-life-dashboard-color",
      accentColor
    );
  }, [accentColor]);

  // =========================================================
  // FIREBASE AUTH
  // =========================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);

        if (!currentUser) {
          setActivePage("dashboard");
          setMobileOpen(false);
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================================================
  // PAGE CHANGE
  // =========================================================

  const handlePageChange = (page) => {
    setActivePage(page);
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
  // LOGIN
  // =========================================================

  if (!user) {
    return <Login />;
  }

  // =========================================================
  // APP
  // =========================================================

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode
          ? "bg-black text-white"
          : "bg-[#f5f5f7] text-black"
      }`}
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
        accentColor={accentColor}
      />

      {/* =====================================================
          MAIN
      ====================================================== */}

      <main
        className={`min-h-screen transition-colors duration-300 lg:pl-64 ${
          darkMode
            ? "bg-black"
            : "bg-[#f5f5f7]"
        }`}
      >

        <div className="mx-auto w-full max-w-[1800px] px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">

          {/* =================================================
              MOBILE NAV
          ================================================= */}

          <div className="mb-5 lg:hidden">

            <MobileNav
              user={user}
              activePage={activePage}
              setActivePage={handlePageChange}
              onMenuClick={() =>
                setMobileOpen(true)
              }
              darkMode={darkMode}
              accentColor={accentColor}
            />

          </div>

          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activePage === "dashboard" && (
            <Dashboard
              user={user}
              setActivePage={handlePageChange}
              accentColor={accentColor}
            />
          )}

          {/* =================================================
              FINANCE
          ================================================= */}

          {activePage === "finance" && (
            <Finance user={user} />
          )}

          {/* =================================================
              TASKS
          ================================================= */}

          {activePage === "tasks" && (
            <Tasks user={user} />
          )}

          {/* =================================================
              GOALS
          ================================================= */}

          {activePage === "goals" && (
            <Goals user={user} />
          )}

          {/* =================================================
              HABITS
          ================================================= */}

          {activePage === "habits" && (
            <Habits user={user} />
          )}

          {/* =================================================
              FITNESS
          ================================================= */}

          {activePage === "fitness" && (
            <Fitness user={user} />
          )}

          {/* =================================================
              CALENDAR
          ================================================= */}

          {activePage === "calendar" && (
            <Calendar user={user} />
          )}

          {/* =================================================
              TRAVEL
          ================================================= */}

          {activePage === "travel" && (
            <Travel user={user} />
          )}

          {/* =================================================
              NOTES
          ================================================= */}

          {activePage === "notes" && (
            <Notes user={user} />
          )}

          {/* =================================================
              ANALYTICS
          ================================================= */}

          {activePage === "analytics" && (
            <Analytics user={user} />
          )}

          {/* =================================================
              SETTINGS
          ================================================= */}

          {activePage === "settings" && (
            <Settings
              user={user}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              accentColor={accentColor}
              setAccentColor={setAccentColor}
            />
          )}

        </div>

      </main>

    </div>
  );
}