import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import { onAuthStateChanged } from "firebase/auth";

import { Network } from "@capacitor/network";
import { App as CapacitorApp } from "@capacitor/app";

import { auth } from "./firebase/config";

import {
  initializeNotifications,
} from "./utils/notifications";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import Header from "./components/Header";

/*
|--------------------------------------------------------------------------
| Lazy Loaded Pages
|--------------------------------------------------------------------------
*/

const Dashboard = lazy(
  () => import("./pages/Dashboard")
);

const Finance = lazy(
  () => import("./pages/Finance")
);

const Tasks = lazy(
  () => import("./pages/Tasks")
);

const Goals = lazy(
  () => import("./pages/Goals")
);

const Habits = lazy(
  () => import("./pages/Habits")
);

const Fitness = lazy(
  () => import("./pages/Fitness")
);

const Calendar = lazy(
  () => import("./pages/Calendar")
);

const Travel = lazy(
  () => import("./pages/Travel")
);

const Notes = lazy(
  () => import("./pages/Notes")
);

const Analytics = lazy(
  () => import("./pages/Analytics")
);

const Settings = lazy(
  () => import("./pages/Settings")
);

const Login = lazy(
  () => import("./pages/Login")
);

/*
|--------------------------------------------------------------------------
| Page Loading
|--------------------------------------------------------------------------
*/

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div
          className="
            mx-auto
            mb-4
            h-9
            w-9
            animate-spin
            rounded-full
            border-2
            border-white/10
            border-t-white
          "
        />

        <p className="text-sm text-white/50">
          Loading...
        </p>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| App
|--------------------------------------------------------------------------
*/

export default function App() {
  const [user, setUser] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [activePage, setActivePage] =
    useState("dashboard");

  const [mobileOpen, setMobileOpen] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Theme
  |--------------------------------------------------------------------------
  */

  const [darkMode, setDarkMode] =
    useState(() => {
      const savedTheme =
        localStorage.getItem(
          "my-life-dashboard-theme"
        );

      if (savedTheme === null) {
        return true;
      }

      return savedTheme === "dark";
    });

  /*
  |--------------------------------------------------------------------------
  | Accent Color
  |--------------------------------------------------------------------------
  */

  const [accentColor, setAccentColor] =
    useState(() => {
      return (
        localStorage.getItem(
          "my-life-dashboard-color"
        ) || "blue"
      );
    });

  /*
  |--------------------------------------------------------------------------
  | Network
  |--------------------------------------------------------------------------
  */

  const [isOnline, setIsOnline] =
    useState(true);

  const [networkReady, setNetworkReady] =
    useState(false);

  const [showBackOnline, setShowBackOnline] =
    useState(false);

  /*
  |--------------------------------------------------------------------------
  | Refs
  |--------------------------------------------------------------------------
  */

  const activePageRef =
    useRef(activePage);

  const mobileOpenRef =
    useRef(mobileOpen);

  const onlineTimerRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | Keep refs synchronized
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    activePageRef.current =
      activePage;
  }, [activePage]);

  useEffect(() => {
    mobileOpenRef.current =
      mobileOpen;
  }, [mobileOpen]);

  /*
  |--------------------------------------------------------------------------
  | Authentication
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        },
        (error) => {
          console.warn(
            "Authentication state error:",
            error
          );

          setUser(null);
          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Notifications
  |--------------------------------------------------------------------------
  |
  | Do not allow notifications to delay
  | the initial application render.
  |
  */

  useEffect(() => {
    let cancelled = false;

    const setupNotifications =
      async () => {
        try {
          if (cancelled) return;

          await initializeNotifications();
        } catch (error) {
          console.warn(
            "Notification initialization failed:",
            error
          );
        }
      };

    const timer =
      setTimeout(() => {
        setupNotifications();
      }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Theme
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | Accent Color
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    localStorage.setItem(
      "my-life-dashboard-color",
      accentColor
    );
  }, [accentColor]);

  /*
  |--------------------------------------------------------------------------
  | Network Status
  |--------------------------------------------------------------------------
  |
  | This listener is ONLY used for the UI.
  |
  | Firestore manages its own connection,
  | offline persistence and reconnection.
  |
  */

  useEffect(() => {
    let mounted = true;
    let networkListener = null;

    const showOnlineMessage = () => {
      if (!mounted) return;

      setShowBackOnline(true);

      if (onlineTimerRef.current) {
        clearTimeout(
          onlineTimerRef.current
        );
      }

      onlineTimerRef.current =
        setTimeout(() => {
          if (mounted) {
            setShowBackOnline(false);
          }
        }, 3500);
    };

    const handleNetworkChange = (
      connected
    ) => {
      if (!mounted) return;

      setIsOnline(
        Boolean(connected)
      );

      setNetworkReady(true);

      if (connected) {
        showOnlineMessage();
      } else {
        setShowBackOnline(false);
      }
    };

    const setupNetwork =
      async () => {
        try {
          const status =
            await Network.getStatus();

          if (!mounted) return;

          const connected =
            Boolean(
              status.connected
            );

          setIsOnline(
            connected
          );

          setNetworkReady(true);

          console.log(
            "My Dashboard Network:",
            connected,
            status.connectionType
          );

          networkListener =
            await Network.addListener(
              "networkStatusChange",
              (status) => {
                if (!mounted) return;

                console.log(
                  "My Dashboard Network Changed:",
                  status.connected,
                  status.connectionType
                );

                handleNetworkChange(
                  Boolean(
                    status.connected
                  )
                );
              }
            );
        } catch (error) {
          console.warn(
            "Capacitor Network unavailable. Using browser network API.",
            error
          );

          const initialOnline =
            navigator.onLine;

          if (mounted) {
            setIsOnline(
              initialOnline
            );

            setNetworkReady(true);
          }

          const handleBrowserOnline =
            () => {
              handleNetworkChange(
                true
              );
            };

          const handleBrowserOffline =
            () => {
              handleNetworkChange(
                false
              );
            };

          window.addEventListener(
            "online",
            handleBrowserOnline
          );

          window.addEventListener(
            "offline",
            handleBrowserOffline
          );

          networkListener = {
            remove: () => {
              window.removeEventListener(
                "online",
                handleBrowserOnline
              );

              window.removeEventListener(
                "offline",
                handleBrowserOffline
              );
            },
          };
        }
      };

    setupNetwork();

    return () => {
      mounted = false;

      if (onlineTimerRef.current) {
        clearTimeout(
          onlineTimerRef.current
        );
      }

      if (networkListener) {
        networkListener.remove();
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Android Back Button
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let backButtonListener =
      null;

    let mounted = true;

    const setupBackButton =
      async () => {
        try {
          backButtonListener =
            await CapacitorApp.addListener(
              "backButton",
              ({ canGoBack }) => {
                if (!mounted) return;

                /*
                | Close mobile menu
                */

                if (
                  mobileOpenRef.current
                ) {
                  setMobileOpen(false);
                  return;
                }

                /*
                | Go back to Dashboard
                */

                if (
                  activePageRef.current !==
                  "dashboard"
                ) {
                  setActivePage(
                    "dashboard"
                  );

                  return;
                }

                /*
                | Browser history
                */

                if (canGoBack) {
                  window.history.back();
                  return;
                }

                /*
                | Exit application
                */

                CapacitorApp.exitApp();
              }
            );
        } catch (error) {
          console.warn(
            "Android back button setup failed:",
            error
          );
        }
      };

    setupBackButton();

    return () => {
      mounted = false;

      if (
        backButtonListener
      ) {
        backButtonListener.remove();
      }
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Page Navigation
  |--------------------------------------------------------------------------
  */

  const handlePageChange = (
    page
  ) => {
    setActivePage(page);
    setMobileOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const openMobileMenu = () => {
    setMobileOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Authentication Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-screen
          items-center
          justify-center
          bg-zinc-950
          text-white
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              mb-4
              h-10
              w-10
              animate-spin
              rounded-full
              border-2
              border-white/20
              border-t-white
            "
          />

          <p className="text-sm text-white/60">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Login
  |--------------------------------------------------------------------------
  */

  if (!user) {
    return (
      <Suspense
        fallback={
          <PageLoading />
        }
      >
        <Login />
      </Suspense>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main Application
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className={`
        min-h-screen
        transition-colors
        duration-300
        ${
          darkMode
            ? "bg-zinc-950 text-white"
            : "bg-zinc-100 text-zinc-900"
        }
      `}
    >
      <Sidebar
        activePage={
          activePage
        }
        setActivePage={
          handlePageChange
        }
        user={user}
        mobileOpen={
          mobileOpen
        }
        setMobileOpen={
          setMobileOpen
        }
        darkMode={
          darkMode
        }
        setDarkMode={
          setDarkMode
        }
        accentColor={
          accentColor
        }
      />

      <div
        className="
          min-h-screen
          lg:pl-[260px]
        "
      >
        <Header
          activePage={
            activePage
          }
          user={user}
          darkMode={
            darkMode
          }
          setDarkMode={
            setDarkMode
          }
          mobileOpen={
            mobileOpen
          }
          setMobileOpen={
            setMobileOpen
          }
          onMenuClick={
            openMobileMenu
          }
        />

        {/* Offline Banner */}

        {networkReady &&
          !isOnline && (
            <div
              className="
                fixed
                left-1/2
                top-4
                z-[300]
                flex
                -translate-x-1/2
                items-center
                gap-3
                rounded-full
                border
                border-red-400/20
                bg-zinc-950/90
                px-5
                py-3
                text-sm
                font-medium
                text-white
                shadow-2xl
                backdrop-blur-2xl
              "
            >
              <span
                className="
                  flex
                  h-2.5
                  w-2.5
                  rounded-full
                  bg-red-500
                  shadow-[0_0_10px_rgba(239,68,68,0.7)]
                "
              />

              <div className="flex flex-col">
                <span className="font-semibold">
                  You're offline
                </span>
              </div>
            </div>
          )}

        {/* Back Online Banner */}

        {networkReady &&
          isOnline &&
          showBackOnline && (
            <div
              className="
                fixed
                left-1/2
                top-4
                z-[300]
                flex
                -translate-x-1/2
                items-center
                gap-3
                rounded-full
                border
                border-emerald-400/20
                bg-zinc-950/90
                px-5
                py-3
                text-sm
                font-medium
                text-white
                shadow-2xl
                backdrop-blur-2xl
              "
            >
              <span
                className="
                  flex
                  h-2.5
                  w-2.5
                  rounded-full
                  bg-emerald-400
                  shadow-[0_0_10px_rgba(52,211,153,0.7)]
                "
              />

              <div className="flex flex-col">
                <span className="font-semibold">
                  Back online
                </span>

                <span className="text-xs text-emerald-400/70">
                  Syncing your data...
                </span>
              </div>
            </div>
          )}

        <main
          className="
            min-h-[calc(100vh-80px)]
            px-4
            pb-24
            pt-4
            sm:px-6
            lg:px-8
          "
        >
          <Suspense
            fallback={
              <PageLoading />
            }
          >
            {activePage ===
              "dashboard" && (
              <Dashboard
                user={user}
                setActivePage={
                  handlePageChange
                }
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "finance" && (
              <Finance
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "tasks" && (
              <Tasks
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "goals" && (
              <Goals
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "habits" && (
              <Habits
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "fitness" && (
              <Fitness
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "calendar" && (
              <Calendar
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "travel" && (
              <Travel
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "notes" && (
              <Notes
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "analytics" && (
              <Analytics
                user={user}
                darkMode={
                  darkMode
                }
                accentColor={
                  accentColor
                }
              />
            )}

            {activePage ===
              "settings" && (
              <Settings
                user={user}
                darkMode={
                  darkMode
                }
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
            )}
          </Suspense>
        </main>
      </div>

      <MobileNav
        activePage={
          activePage
        }
        setActivePage={
          handlePageChange
        }
      />
    </div>
  );
}