import { useEffect, useState } from "react";

import { onAuthStateChanged } from "firebase/auth";
import { Network } from "@capacitor/network";

import { auth } from "./firebase/config";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import Header from "./components/Header";

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

import {
  requestNotificationPermission,
} from "./utils/notifications";

export default function App() {
  /* =========================
     AUTH
  ========================= */

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] =
    useState(true);

  /* =========================
     NAVIGATION
  ========================= */

  const [activePage, setActivePage] =
    useState("dashboard");

  const [mobileOpen, setMobileOpen] =
    useState(false);

  /* =========================
     THEME
  ========================= */

  const [darkMode, setDarkMode] =
    useState(() => {
      const savedTheme =
        localStorage.getItem(
          "my-life-dashboard-theme"
        );

      return savedTheme !== "light";
    });

  /* =========================
     ACCENT COLOR
  ========================= */

  const [accentColor, setAccentColor] =
    useState(() => {
      return (
        localStorage.getItem(
          "my-life-dashboard-color"
        ) || "emerald"
      );
    });

  /* =========================
     NETWORK
  ========================= */

  const [isOnline, setIsOnline] =
    useState(
      typeof navigator !== "undefined"
        ? navigator.onLine
        : true
    );

  const [
    showBackOnline,
    setShowBackOnline,
  ] = useState(false);

  /* =========================
     FIREBASE AUTH
  ========================= */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        },
        (error) => {
          console.error(
            "Auth state error:",
            error
          );

          setAuthLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  /* =========================
     NETWORK LISTENER
  ========================= */

  useEffect(() => {
    let networkListener = null;
    let backOnlineTimer = null;

    const setupNetworkListener =
      async () => {
        try {
          const status =
            await Network.getStatus();

          setIsOnline(
            status.connected
          );

          networkListener =
            await Network.addListener(
              "networkStatusChange",
              (status) => {
                setIsOnline(
                  (previousOnline) => {
                    if (
                      !previousOnline &&
                      status.connected
                    ) {
                      setShowBackOnline(
                        true
                      );

                      clearTimeout(
                        backOnlineTimer
                      );

                      backOnlineTimer =
                        setTimeout(() => {
                          setShowBackOnline(
                            false
                          );
                        }, 3000);
                    }

                    return status.connected;
                  }
                );
              }
            );
        } catch (error) {
          console.error(
            "Network listener error:",
            error
          );
        }
      };

    setupNetworkListener();

    /* Browser fallback */

    const handleOnline = () => {
      setIsOnline(
        (previousOnline) => {
          if (!previousOnline) {
            setShowBackOnline(true);

            clearTimeout(
              backOnlineTimer
            );

            backOnlineTimer =
              setTimeout(() => {
                setShowBackOnline(false);
              }, 3000);
          }

          return true;
        }
      );
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      clearTimeout(
        backOnlineTimer
      );

      if (networkListener) {
        networkListener.remove();
      }

      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  /* =========================
     NOTIFICATIONS
  ========================= */

  useEffect(() => {
    const setupNotifications =
      async () => {
        try {
          const granted =
            await requestNotificationPermission();

          if (granted) {
            console.log(
              "🔔 Notification permission granted"
            );
          } else {
            console.log(
              "🔕 Notification permission denied"
            );
          }
        } catch (error) {
          console.error(
            "Notification setup error:",
            error
          );
        }
      };

    if (user) {
      setupNotifications();
    }
  }, [user]);

  /* =========================
     DARK MODE
  ========================= */

  useEffect(() => {
    localStorage.setItem(
      "my-life-dashboard-theme",
      darkMode
        ? "dark"
        : "light"
    );

    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );
  }, [darkMode]);

  /* =========================
     ACCENT COLOR SAVE
  ========================= */

  useEffect(() => {
    localStorage.setItem(
      "my-life-dashboard-color",
      accentColor
    );
  }, [accentColor]);

  /* =========================
     PAGE CHANGE
  ========================= */

  const handlePageChange = (
    page
  ) => {
    setActivePage(page);

    /* Close mobile sidebar */
    setMobileOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* =========================
     AUTH LOADING
  ========================= */

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-4">
          <div
            className="
              h-10
              w-10
              animate-spin
              rounded-full
              border-2
              border-white/20
              border-t-white
            "
          />

          <p className="text-sm text-white/50">
            Loading My Dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* =========================
     LOGIN
  ========================= */

  if (!user) {
    return <Login />;
  }

  /* =========================
     PAGE RENDER
  ========================= */

  const renderPage = () => {
    switch (activePage) {
      /* =====================
         DASHBOARD
      ===================== */

      case "dashboard":
        return (
          <Dashboard
            user={user}
            setActivePage={
              handlePageChange
            }
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         FINANCE
      ===================== */

      case "finance":
        return (
          <Finance
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         TASKS
      ===================== */

      case "tasks":
        return (
          <Tasks
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         GOALS
      ===================== */

      case "goals":
        return (
          <Goals
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         HABITS
      ===================== */

      case "habits":
        return (
          <Habits
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         FITNESS
      ===================== */

      case "fitness":
        return (
          <Fitness
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         CALENDAR
      ===================== */

      case "calendar":
        return (
          <Calendar
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         TRAVEL
      ===================== */

      case "travel":
        return (
          <Travel
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         NOTES
      ===================== */

      case "notes":
        return (
          <Notes
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         ANALYTICS
      ===================== */

      case "analytics":
        return (
          <Analytics
            user={user}
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );

      /* =====================
         SETTINGS
      ===================== */

      case "settings":
        return (
          <Settings
            user={user}
            darkMode={darkMode}
            setDarkMode={
              setDarkMode
            }
            accentColor={
              accentColor
            }
            setAccentColor={
              setAccentColor
            }
          />
        );

      /* =====================
         DEFAULT
      ===================== */

      default:
        return (
          <Dashboard
            user={user}
            setActivePage={
              handlePageChange
            }
            darkMode={darkMode}
            accentColor={accentColor}
          />
        );
    }
  };

  /* =========================
     MAIN APP
  ========================= */

  return (
    <div
      className={
        darkMode
          ? "min-h-screen bg-[#050505] text-white"
          : "min-h-screen bg-slate-50 text-slate-900"
      }
    >
      {/* =====================
          DESKTOP + MOBILE SIDEBAR
      ===================== */}

      <Sidebar
        activePage={activePage}
        setActivePage={
          handlePageChange
        }
        user={user}
        mobileOpen={mobileOpen}
        setMobileOpen={
          setMobileOpen
        }
      />

      {/* =====================
          MAIN CONTENT
      ===================== */}

      <main className="min-h-screen lg:pl-64">

        {/* =====================
            HEADER
        ===================== */}

        <Header
          user={user}
          onMenuClick={() =>
            setMobileOpen(true)
          }
        />

        {/* =====================
            OFFLINE MESSAGE
        ===================== */}

        {!isOnline && (
          <div className="sticky top-16 z-20 px-4 sm:px-6">
            <div className="mx-auto mt-2 max-w-7xl">
              <div
                className="
                  rounded-2xl
                  border
                  border-amber-400/20
                  bg-amber-400/10
                  px-4
                  py-3
                  text-center
                  text-sm
                  text-amber-200
                "
              >
                You are offline. Your saved
                data will remain available
                and changes will sync when
                you are back online.
              </div>
            </div>
          </div>
        )}

        {/* =====================
            BACK ONLINE
        ===================== */}

        {showBackOnline && (
          <div
            className="
              fixed
              left-1/2
              top-5
              z-[11000]
              -translate-x-1/2
            "
          >
            <div
              className="
                rounded-full
                border
                border-emerald-400/20
                bg-emerald-500/15
                px-5
                py-2.5
                text-sm
                font-medium
                text-emerald-300
                shadow-2xl
              "
            >
              ✓ Back online. Syncing your
              data...
            </div>
          </div>
        )}

        {/* =====================
            PAGE CONTAINER
        ===================== */}

        <div
          className="
            px-4
            pb-24
            sm:px-6
            lg:px-8
          "
        >
          <div className="mx-auto max-w-7xl">
            {renderPage()}
          </div>
        </div>
      </main>

      {/* =====================
          MOBILE BOTTOM NAV
      ===================== */}

      <MobileNav
        activePage={activePage}
        setActivePage={
          handlePageChange
        }
      />
    </div>
  );
}