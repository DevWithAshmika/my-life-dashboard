import { useEffect, useState } from "react";

import {
  Settings2,
  Save,
  Check,
  Eye,
  EyeOff,
  Bell,
  User,
  ShieldCheck,
  LogOut,
  Database,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Trash2,
  X,
} from "lucide-react";

import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  getDocsFromCache,
  deleteDoc,
} from "firebase/firestore";

import {
  signOut,
  updateProfile,
} from "firebase/auth";

import { db, auth } from "../firebase/config";
import Loading from "../components/Loading";

// ===========================================================
// DEFAULT SETTINGS
// ===========================================================

const DEFAULT_SETTINGS = {
  notifications: true,

  taskNotifications: true,
  goalNotifications: true,
  habitNotifications: true,
  financeNotifications: true,

  showFinance: true,
  showTasks: true,
  showGoals: true,
  showHabits: true,
  showFitness: true,
  showTravel: true,

  compactDashboard: false,
  showWelcomeMessage: true,
  showRecentActivity: true,
};

// ===========================================================
// LOCAL STORAGE HELPERS
// ===========================================================

const getSettingsBackupKey = (uid) =>
  `my-dashboard-${uid}-settings`;

const getProfileBackupKey = (uid) =>
  `my-dashboard-${uid}-profile`;

const loadSettingsBackup = (uid) => {
  try {
    const raw = localStorage.getItem(
      getSettingsBackupKey(uid)
    );

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.warn(
      "Could not load local settings backup:",
      error
    );

    return null;
  }
};

const saveSettingsBackup = (uid, settings) => {
  try {
    localStorage.setItem(
      getSettingsBackupKey(uid),
      JSON.stringify(settings)
    );
  } catch (error) {
    console.warn(
      "Could not save local settings backup:",
      error
    );
  }
};

const loadProfileBackup = (uid) => {
  try {
    return (
      localStorage.getItem(
        getProfileBackupKey(uid)
      ) || ""
    );
  } catch (error) {
    console.warn(
      "Could not load local profile backup:",
      error
    );

    return "";
  }
};

const saveProfileBackup = (uid, name) => {
  try {
    localStorage.setItem(
      getProfileBackupKey(uid),
      name || ""
    );
  } catch (error) {
    console.warn(
      "Could not save local profile backup:",
      error
    );
  }
};

const removeUserLocalBackups = (uid) => {
  if (!uid) return;

  const keys = [
    getSettingsBackupKey(uid),
    getProfileBackupKey(uid),

    `my-dashboard-${uid}-finance`,
    `my-dashboard-${uid}-tasks`,
    `my-dashboard-${uid}-goals`,
    `my-dashboard-${uid}-habits`,
    `my-dashboard-${uid}-fitness`,
    `my-dashboard-${uid}-calendar`,
    `my-dashboard-${uid}-travel`,
    `my-dashboard-${uid}-notes`,
  ];

  try {
    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn(
      "Could not clear local dashboard backups:",
      error
    );
  }
};

// ===========================================================
// MAIN SETTINGS
// ===========================================================

export default function Settings({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [profileName, setProfileName] = useState(
    user?.displayName || ""
  );

  const [settings, setSettings] = useState(
    DEFAULT_SETTINGS
  );

  const [privacyModal, setPrivacyModal] = useState(null);

  // =========================================================
  // LOAD SETTINGS OFFLINE-FIRST
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const settingsRef = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    // -------------------------------------------------------
    // LOCAL SETTINGS FIRST
    // -------------------------------------------------------

    const localSettings =
      loadSettingsBackup(user.uid);

    if (localSettings) {
      setSettings(localSettings);
      setLoading(false);
    }

    // -------------------------------------------------------
    // LOCAL PROFILE FIRST
    // -------------------------------------------------------

    const localProfile =
      loadProfileBackup(user.uid);

    if (localProfile) {
      setProfileName(localProfile);
    } else if (user?.displayName) {
      setProfileName(user.displayName);

      saveProfileBackup(
        user.uid,
        user.displayName
      );
    }

    // -------------------------------------------------------
    // FIRESTORE CACHE
    // -------------------------------------------------------

    getDocsFromCache(
      collection(
        db,
        "users",
        user.uid,
        "settings"
      )
    ).catch(() => {
      // Settings is a document, so collection cache
      // may not always be available in the same way.
    });

    // -------------------------------------------------------
    // FIRESTORE LIVE LISTENER
    // -------------------------------------------------------

    const unsubscribe = onSnapshot(
      settingsRef,
      {
        includeMetadataChanges: true,
      },
      (snapshot) => {
        if (cancelled) return;

        if (snapshot.exists()) {
          const data = snapshot.data();

          const nextSettings = {
            notifications:
              data.notifications !== false,

            taskNotifications:
              data.taskNotifications !== false,

            goalNotifications:
              data.goalNotifications !== false,

            habitNotifications:
              data.habitNotifications !== false,

            financeNotifications:
              data.financeNotifications !== false,

            showFinance:
              data.showFinance !== false,

            showTasks:
              data.showTasks !== false,

            showGoals:
              data.showGoals !== false,

            showHabits:
              data.showHabits !== false,

            showFitness:
              data.showFitness !== false,

            showTravel:
              data.showTravel !== false,

            compactDashboard:
              data.compactDashboard === true,

            showWelcomeMessage:
              data.showWelcomeMessage !== false,

            showRecentActivity:
              data.showRecentActivity !== false,
          };

          setSettings(nextSettings);

          saveSettingsBackup(
            user.uid,
            nextSettings
          );
        } else {
          const backup =
            loadSettingsBackup(user.uid);

          if (backup) {
            setSettings(backup);
          }
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Settings loading error:",
          error
        );

        const backup =
          loadSettingsBackup(user.uid);

        if (backup) {
          setSettings(backup);
        }

        setLoading(false);
      }
    );

    // -------------------------------------------------------
    // LOADING FALLBACK
    // -------------------------------------------------------

    const loadingTimer = setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 4000);

    return () => {
      cancelled = true;
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [
    user?.uid,
    user?.displayName,
  ]);

  // =========================================================
  // HANDLE SETTING CHANGE
  // =========================================================

  const handleChange = (name, value) => {
    setSettings((previous) => {
      const nextSettings = {
        ...previous,
        [name]: value,
      };

      if (user?.uid) {
        saveSettingsBackup(
          user.uid,
          nextSettings
        );
      }

      return nextSettings;
    });

    setSaved(false);
  };

  // =========================================================
  // HANDLE PROFILE NAME CHANGE
  // =========================================================

  const handleProfileNameChange = (value) => {
    setProfileName(value);
    setSaved(false);

    if (user?.uid) {
      saveProfileBackup(
        user.uid,
        value
      );
    }
  };

  // =========================================================
  // SAVE SETTINGS
  // =========================================================

  const saveSettings = async () => {
    if (!user?.uid) {
      alert("You are not logged in.");
      return;
    }

    setSaving(true);
    setSaved(false);

    const trimmedName =
      profileName.trim();

    // -------------------------------------------------------
    // SAVE LOCALLY FIRST
    // -------------------------------------------------------

    saveSettingsBackup(
      user.uid,
      settings
    );

    saveProfileBackup(
      user.uid,
      trimmedName
    );

    // -------------------------------------------------------
    // UPDATE UI IMMEDIATELY
    // -------------------------------------------------------

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);

    // -------------------------------------------------------
    // FIRESTORE SETTINGS
    // -------------------------------------------------------

    const settingsRef = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    void setDoc(
      settingsRef,
      {
        ...settings,

        theme: "dark",

        updatedAt: new Date(),
      },
      {
        merge: true,
      }
    ).catch((error) => {
      console.warn(
        "Settings will sync when online:",
        error
      );
    });

    // -------------------------------------------------------
    // FIREBASE PROFILE
    // -------------------------------------------------------

    if (
      auth.currentUser &&
      trimmedName &&
      auth.currentUser.displayName !==
        trimmedName
    ) {
      void updateProfile(
        auth.currentUser,
        {
          displayName: trimmedName,
        }
      ).catch((error) => {
        console.warn(
          "Profile name will sync when online:",
          error
        );
      });
    }

    setSaving(false);
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmed) return;

    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      alert("Could not logout.");
    }
  };

  // =========================================================
  // RESET SETTINGS
  // =========================================================

  const resetSettings = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      "Reset all dashboard settings to default values?"
    );

    if (!confirmed) return;

    try {
      setSaving(true);

      const nextSettings = {
        ...DEFAULT_SETTINGS,
      };

      // -----------------------------------------------------
      // LOCAL FIRST
      // -----------------------------------------------------

      setSettings(nextSettings);

      saveSettingsBackup(
        user.uid,
        nextSettings
      );

      // -----------------------------------------------------
      // FIREBASE BACKGROUND SYNC
      // -----------------------------------------------------

      const settingsRef = doc(
        db,
        "users",
        user.uid,
        "settings",
        "preferences"
      );

      void setDoc(
        settingsRef,
        {
          ...nextSettings,

          theme: "dark",

          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      ).catch((error) => {
        console.warn(
          "Reset settings will sync when online:",
          error
        );
      });

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);

      alert(
        "Settings reset successfully."
      );
    } catch (error) {
      console.error(
        "Reset settings error:",
        error
      );

      alert(
        "Could not reset settings."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // DELETE COLLECTION
  // =========================================================

  const deleteCollection = async (
    collectionName
  ) => {
    if (!user?.uid) return;

    const collectionRef = collection(
      db,
      "users",
      user.uid,
      collectionName
    );

    let snapshot;

    try {
      snapshot = await getDocs(
        collectionRef
      );
    } catch (error) {
      console.warn(
        `Could not read ${collectionName} online. Trying cache.`,
        error
      );

      try {
        snapshot = await getDocsFromCache(
          collectionRef
        );
      } catch (cacheError) {
        console.warn(
          `Could not read ${collectionName} from cache.`,
          cacheError
        );

        return;
      }
    }

    // -------------------------------------------------------
    // FIRESTORE DELETE
    // -------------------------------------------------------

    await Promise.all(
      snapshot.docs.map((item) =>
        deleteDoc(item.ref).catch((error) => {
          console.warn(
            `Could not delete ${collectionName} document:`,
            error
          );
        })
      )
    );
  };

  // =========================================================
  // DELETE ALL DATA
  // =========================================================

  const deleteAllData = async () => {
    if (!user?.uid) return;

    const confirmed = window.confirm(
      "WARNING!\n\nThis will permanently delete your Finance, Tasks, Goals, Habits, Fitness, Calendar, Travel and Notes data.\n\nThis action cannot be undone.\n\nContinue?"
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      "Are you absolutely sure you want to delete ALL dashboard data?"
    );

    if (!secondConfirm) return;

    try {
      setSaving(true);

      const collections = [
        "finance",
        "tasks",
        "goals",
        "habits",
        "fitness",
        "calendar",
        "travel",
        "notes",
      ];

      // -----------------------------------------------------
      // REMOVE LOCAL BACKUPS FIRST
      // -----------------------------------------------------

      removeUserLocalBackups(
        user.uid
      );

      // -----------------------------------------------------
      // DELETE FIRESTORE DATA
      // -----------------------------------------------------

      for (const collectionName of collections) {
        await deleteCollection(
          collectionName
        );
      }

      alert(
        "All dashboard data has been deleted."
      );
    } catch (error) {
      console.error(
        "Delete all data error:",
        error
      );

      alert(
        "Local data was cleared. Some cloud data may sync/delete when you are online."
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // PRIVACY CONTENT
  // =========================================================

  const privacyContent = {
    privacy: {
      title: "Privacy Policy",
      icon: <ShieldCheck size={20} />,
      content: (
        <div className="space-y-5 text-sm leading-6 text-white/60">

          <div>
            <h3 className="mb-2 font-semibold text-white">
              1. Information We Collect
            </h3>

            <p>
              My Dashboard may collect and store information
              that you provide when using the application.
              This may include your name, email address,
              profile photo, financial records, tasks, goals,
              habits, fitness information, calendar events,
              travel information and notes.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              2. Google Sign-In
            </h3>

            <p>
              My Dashboard uses Google Sign-In for
              authentication. We may receive your name,
              email address, profile photo and Google account
              identifier to provide your account.
            </p>

            <p className="mt-2">
              Your Google password is not stored by
              My Dashboard.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              3. How We Use Your Information
            </h3>

            <p>
              Your information is used to provide and operate
              My Dashboard, synchronize your data, display
              financial information and analytics, manage
              your dashboard features and maintain application
              security.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              4. Financial Information
            </h3>

            <p>
              My Dashboard may store income, expenses, amounts,
              dates and categories that you enter. This
              information is used to provide personal finance
              tracking and analytics features.
            </p>

            <p className="mt-2">
              My Dashboard does not provide financial,
              investment, tax or legal advice.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              5. Data Storage
            </h3>

            <p>
              My Dashboard uses Google Firebase services,
              including Firebase Authentication and Cloud
              Firestore, to authenticate users and store
              application data.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              6. Offline Storage
            </h3>

            <p>
              My Dashboard supports offline functionality.
              To provide this feature, some application data
              may be temporarily stored in the application's
              local device storage and Firestore local cache.
            </p>

            <p className="mt-2">
              Changes made while offline may remain on the
              device until an internet connection becomes
              available and the changes can be synchronized
              with Firebase.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              7. Information Sharing
            </h3>

            <p>
              We do not sell, rent or trade your personal
              information. Information may be processed by
              trusted third-party services that are required
              to operate the application, including Firebase
              services used for authentication and data
              storage.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              8. Data Security
            </h3>

            <p>
              My Dashboard uses Firebase Authentication and
              Cloud Firestore to help protect account access
              and user data. Access to cloud data should be
              restricted through appropriate Firebase
              security rules.
            </p>

            <p className="mt-2">
              Data stored locally on your device may be
              accessible according to the security of your
              device and operating system. No internet-based
              or local storage system can be guaranteed to be
              completely secure.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              9. Data Deletion
            </h3>

            <p>
              You can delete your dashboard data using the
              Data Management section. Deleting dashboard data
              removes the application records managed by
              My Dashboard.
            </p>

            <p className="mt-2">
              Account deletion is separate from deleting
              dashboard records. If you want your Firebase
              authentication account and associated personal
              information deleted, you may request account
              deletion from the application owner.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              10. Changes to This Policy
            </h3>

            <p>
              This Privacy Policy may be updated from time to
              time to reflect changes to the application,
              technology or legal requirements.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/40">
              Last Updated: September 5, 2026
            </p>
          </div>

        </div>
      ),
    },

    terms: {
      title: "Terms & Conditions",
      icon: <FileText size={20} />,
      content: (
        <div className="space-y-5 text-sm leading-6 text-white/60">

          <div>
            <h3 className="mb-2 font-semibold text-white">
              1. Use of the Application
            </h3>

            <p>
              My Dashboard is a personal productivity and
              information management application designed to
              help users manage finances, tasks, goals,
              habits, calendar events, fitness, travel and
              notes.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              2. User Account
            </h3>

            <p>
              Some features require you to sign in using
              Google. You are responsible for maintaining the
              security of your account and device.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              3. User Data
            </h3>

            <p>
              You are responsible for the information you
              enter or upload into My Dashboard. You should
              ensure that the information you provide is
              accurate and appropriate.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              4. Offline Functionality
            </h3>

            <p>
              Some features may continue to work when an
              internet connection is unavailable. Changes
              made while offline may be synchronized with
              Firebase after connectivity is restored.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              5. Financial Disclaimer
            </h3>

            <p>
              My Dashboard is a personal finance tracking tool.
              It does not provide financial, investment, tax,
              accounting or legal advice.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              6. Application Availability
            </h3>

            <p>
              We aim to keep My Dashboard available and
              reliable, but we cannot guarantee that the
              application will always be available or
              completely error-free.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              7. Prohibited Activities
            </h3>

            <p>
              You must not attempt to gain unauthorized access
              to the application, interfere with its operation,
              introduce malicious software or access another
              user's information.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              8. Intellectual Property
            </h3>

            <p>
              The My Dashboard application, design, interface,
              branding, software and original content may be
              protected by applicable intellectual property
              laws.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              9. Changes to These Terms
            </h3>

            <p>
              These Terms & Conditions may be updated from
              time to time. Continued use of the application
              after changes become effective may constitute
              acceptance of the updated terms.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs text-white/40">
              Last Updated: September 5, 2026
            </p>
          </div>

        </div>
      ),
    },

    deletion: {
      title: "Data & Account Deletion",
      icon: <Trash2 size={20} />,
      content: (
        <div className="space-y-5 text-sm leading-6 text-white/60">

          <div>
            <h3 className="mb-2 font-semibold text-white">
              Delete Dashboard Data
            </h3>

            <p>
              You can permanently delete your Finance, Tasks,
              Goals, Habits, Fitness, Calendar, Travel and
              Notes data from the Data Management section.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              Local Data
            </h3>

            <p>
              My Dashboard may keep temporary local copies of
              your application data to support offline use.
              When you use the Delete All Dashboard Data
              function, these local application backups are
              also cleared.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-white">
              Delete Your Account
            </h3>

            <p>
              Deleting dashboard data does not automatically
              delete your Google or Firebase Authentication
              account.
            </p>

            <p className="mt-2">
              If you want to delete your My Dashboard account
              and associated personal information, please
              contact the application owner using the support
              email address provided by the application.
            </p>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4">

            <div className="flex items-start gap-3">

              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <p className="text-xs leading-5 text-white/50">
                Deleting your dashboard data is permanent
                and cannot be undone.
              </p>

            </div>

          </div>

        </div>
      ),
    },
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <Loading text="Loading settings..." />
    );
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8">

        <div className="flex items-center gap-3">

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <Settings2 size={22} />
          </div>

          <div>

            <h1 className="text-3xl font-bold">
              Settings
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Customize your personal dashboard.
            </p>

          </div>

        </div>

      </div>

      <div className="space-y-5">

        {/* ===================================================
            PROFILE
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<User size={20} />}
            title="Profile"
            subtitle="Manage your personal information."
          />

          <div className="grid gap-4 md:grid-cols-2">

            <div>

              <label className="mb-2 block text-sm text-white/50">
                Display Name
              </label>

              <input
                value={profileName}
                onChange={(e) =>
                  handleProfileNameChange(
                    e.target.value
                  )
                }
                placeholder="Your name"
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-white/30"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm text-white/50">
                Email Address
              </label>

              <input
                value={user?.email || ""}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/40 outline-none"
              />

            </div>

          </div>

        </SectionCard>

        {/* ===================================================
            GOOGLE ACCOUNT
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<ShieldCheck size={20} />}
            title="Google Account"
            subtitle="Your connected authentication account."
          />

          <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

            <div className="flex items-center gap-4">

              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                  <User size={20} />
                </div>
              )}

              <div className="min-w-0">

                <p className="font-semibold">
                  {user?.displayName ||
                    profileName ||
                    "Google User"}
                </p>

                <p className="truncate text-sm text-white/40">
                  {user?.email ||
                    "No email available"}
                </p>

                <p className="mt-1 text-xs text-emerald-400">
                  Google account connected
                </p>

              </div>

            </div>

          </div>

        </SectionCard>

        {/* ===================================================
            NOTIFICATIONS
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<Bell size={20} />}
            title="Notifications"
            subtitle="Control dashboard notification preferences."
          />

          <div className="space-y-3">

            <ToggleRow
              title="Notifications"
              description="Enable dashboard notifications"
              enabled={
                settings.notifications
              }
              onClick={() =>
                handleChange(
                  "notifications",
                  !settings.notifications
                )
              }
            />

            <ToggleRow
              title="Finance Notifications"
              description="Receive finance related reminders"
              enabled={
                settings.financeNotifications &&
                settings.notifications
              }
              disabled={
                !settings.notifications
              }
              onClick={() =>
                handleChange(
                  "financeNotifications",
                  !settings.financeNotifications
                )
              }
            />

            <ToggleRow
              title="Task Notifications"
              description="Receive task reminders"
              enabled={
                settings.taskNotifications &&
                settings.notifications
              }
              disabled={
                !settings.notifications
              }
              onClick={() =>
                handleChange(
                  "taskNotifications",
                  !settings.taskNotifications
                )
              }
            />

            <ToggleRow
              title="Goal Notifications"
              description="Receive goal reminders"
              enabled={
                settings.goalNotifications &&
                settings.notifications
              }
              disabled={
                !settings.notifications
              }
              onClick={() =>
                handleChange(
                  "goalNotifications",
                  !settings.goalNotifications
                )
              }
            />

            <ToggleRow
              title="Habit Notifications"
              description="Receive habit reminders"
              enabled={
                settings.habitNotifications &&
                settings.notifications
              }
              disabled={
                !settings.notifications
              }
              onClick={() =>
                handleChange(
                  "habitNotifications",
                  !settings.habitNotifications
                )
              }
            />

          </div>

        </SectionCard>

        {/* ===================================================
            DASHBOARD VISIBILITY
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<Eye size={20} />}
            title="Dashboard Sections"
            subtitle="Choose what appears on your dashboard."
          />

          <div className="space-y-3">

            <VisibilityRow
              title="Finance"
              enabled={
                settings.showFinance
              }
              onClick={() =>
                handleChange(
                  "showFinance",
                  !settings.showFinance
                )
              }
            />

            <VisibilityRow
              title="Tasks"
              enabled={
                settings.showTasks
              }
              onClick={() =>
                handleChange(
                  "showTasks",
                  !settings.showTasks
                )
              }
            />

            <VisibilityRow
              title="Goals"
              enabled={
                settings.showGoals
              }
              onClick={() =>
                handleChange(
                  "showGoals",
                  !settings.showGoals
                )
              }
            />

            <VisibilityRow
              title="Habits"
              enabled={
                settings.showHabits
              }
              onClick={() =>
                handleChange(
                  "showHabits",
                  !settings.showHabits
                )
              }
            />

            <VisibilityRow
              title="Fitness"
              enabled={
                settings.showFitness
              }
              onClick={() =>
                handleChange(
                  "showFitness",
                  !settings.showFitness
                )
              }
            />

            <VisibilityRow
              title="Travel"
              enabled={
                settings.showTravel
              }
              onClick={() =>
                handleChange(
                  "showTravel",
                  !settings.showTravel
                )
              }
            />

          </div>

        </SectionCard>

        {/* ===================================================
            DASHBOARD PREFERENCES
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<Settings2 size={20} />}
            title="Dashboard Preferences"
            subtitle="Fine tune how your dashboard behaves."
          />

          <div className="space-y-3">

            <ToggleRow
              title="Compact Dashboard"
              description="Use a more compact card layout"
              enabled={
                settings.compactDashboard
              }
              onClick={() =>
                handleChange(
                  "compactDashboard",
                  !settings.compactDashboard
                )
              }
            />

            <ToggleRow
              title="Welcome Message"
              description="Show the welcome section on dashboard"
              enabled={
                settings.showWelcomeMessage
              }
              onClick={() =>
                handleChange(
                  "showWelcomeMessage",
                  !settings.showWelcomeMessage
                )
              }
            />

            <ToggleRow
              title="Recent Activity"
              description="Show recent dashboard activity"
              enabled={
                settings.showRecentActivity
              }
              onClick={() =>
                handleChange(
                  "showRecentActivity",
                  !settings.showRecentActivity
                )
              }
            />

          </div>

        </SectionCard>

        {/* ===================================================
            DATA MANAGEMENT
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<Database size={20} />}
            title="Data Management"
            subtitle="Manage your personal dashboard data."
          />

          <div className="space-y-3">

            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">

                  <CheckCircle2
                    size={18}
                    className="text-emerald-400"
                  />

                </div>

                <div>

                  <p className="font-medium">
                    Cloud Data
                  </p>

                  <p className="mt-1 text-xs leading-5 text-white/30">
                    Your dashboard data is stored in your
                    Firebase account and synced across sessions.
                    Offline changes are synchronized when
                    internet access becomes available.
                  </p>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={resetSettings}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06] disabled:opacity-50"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">

                  <RotateCcw size={18} />

                </div>

                <div>

                  <p className="font-medium">
                    Reset Settings
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Restore all settings to default.
                  </p>

                </div>

              </div>

            </button>

            <button
              type="button"
              onClick={deleteAllData}
              disabled={saving}
              className="flex w-full items-center justify-between rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-4 text-left transition hover:bg-red-500/10 disabled:opacity-50"
            >

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">

                  <AlertTriangle
                    size={18}
                    className="text-red-400"
                  />

                </div>

                <div>

                  <p className="font-medium text-red-400">
                    Delete All Dashboard Data
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Permanently delete your Finance,
                    Tasks, Goals, Habits, Fitness,
                    Calendar, Travel and Notes data.
                  </p>

                </div>

              </div>

            </button>

          </div>

        </SectionCard>

        {/* ===================================================
            PRIVACY & SECURITY
        ==================================================== */}

        <SectionCard>

          <SectionHeader
            icon={<ShieldCheck size={20} />}
            title="Privacy & Security"
            subtitle="Manage your privacy, data and account information."
          />

          <div className="space-y-3">

            <PrivacyRow
              icon={<ShieldCheck size={18} />}
              title="Privacy Policy"
              description="Learn how your personal data is collected and protected."
              onClick={() =>
                setPrivacyModal("privacy")
              }
            />

            <PrivacyRow
              icon={<FileText size={18} />}
              title="Terms & Conditions"
              description="Read the terms for using My Dashboard."
              onClick={() =>
                setPrivacyModal("terms")
              }
            />

            <PrivacyRow
              icon={<Trash2 size={18} />}
              title="Data & Account Deletion"
              description="Learn how to delete your personal data and account."
              onClick={() =>
                setPrivacyModal("deletion")
              }
            />

          </div>

        </SectionCard>

        {/* ===================================================
            SAVE SETTINGS
        ==================================================== */}

        <div className="flex flex-col gap-3 pb-8 sm:flex-row sm:justify-end">

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >

            {saved ? (
              <>
                <Check size={18} />
                Saved
              </>
            ) : (
              <>
                <Save size={18} />

                {saving
                  ? "Saving..."
                  : "Save Settings"}
              </>
            )}

          </button>

        </div>

        {/* ===================================================
            LOGOUT
        ==================================================== */}

        <div className="border-t border-white/10 pb-8 pt-5">

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.05] px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
          >

            <LogOut size={18} />

            Logout

          </button>

        </div>

      </div>

      {/* =====================================================
          PRIVACY MODAL
      ====================================================== */}

      {privacyModal &&
        privacyContent[privacyModal] && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 pb-20 backdrop-blur-md"
            onClick={() =>
              setPrivacyModal(null)
            }
          >

            <div
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#111111]/95 shadow-2xl backdrop-blur-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >

              {/* Modal Header */}

              <div className="flex items-center justify-between border-b border-white/10 p-5">

                <div className="flex items-center gap-3">

                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    {privacyContent[
                      privacyModal
                    ].icon}
                  </div>

                  <div>

                    <h2 className="font-semibold">
                      {
                        privacyContent[
                          privacyModal
                        ].title
                      }
                    </h2>

                    <p className="mt-1 text-xs text-white/30">
                      My Dashboard
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setPrivacyModal(null)
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={20} />
                </button>

              </div>

              {/* Modal Content */}

              <div className="overflow-y-auto p-5 pb-8 sm:p-7">

                {
                  privacyContent[
                    privacyModal
                  ].content
                }

              </div>

              {/* Modal Footer */}

              <div className="border-t border-white/10 p-4">

                <button
                  type="button"
                  onClick={() =>
                    setPrivacyModal(null)
                  }
                  className="w-full rounded-2xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-white/90"
                >
                  Done
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

// ===========================================================
// SECTION CARD
// ===========================================================

function SectionCard({
  children,
  className = "",
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

// ===========================================================
// SECTION HEADER
// ===========================================================

function SectionHeader({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="mb-6 flex items-center gap-3">

      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10">
        {icon}
      </div>

      <div>

        <h2 className="font-semibold">
          {title}
        </h2>

        <p className="mt-1 text-xs text-white/30">
          {subtitle}
        </p>

      </div>

    </div>
  );
}

// ===========================================================
// TOGGLE ROW
// ===========================================================

function ToggleRow({
  title,
  description,
  enabled,
  onClick,
  disabled = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-2xl bg-white/[0.025] p-4 text-left transition ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-white/[0.05]"
      }`}
    >

      <div>

        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs text-white/30">
          {description}
        </p>

      </div>

      <div
        className={`relative h-6 w-11 rounded-full transition ${
          enabled
            ? "bg-emerald-500"
            : "bg-white/10"
        }`}
      >

        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />

      </div>

    </button>
  );
}

// ===========================================================
// VISIBILITY ROW
// ===========================================================

function VisibilityRow({
  title,
  enabled,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.05]"
    >

      <div>

        <p className="font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs text-white/30">
          {enabled
            ? "Visible on dashboard"
            : "Hidden from dashboard"}
        </p>

      </div>

      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          enabled
            ? "bg-emerald-400/10 text-emerald-400"
            : "bg-white/10 text-white/30"
        }`}
      >

        {enabled ? (
          <Eye size={17} />
        ) : (
          <EyeOff size={17} />
        )}

      </div>

    </button>
  );
}

// ===========================================================
// PRIVACY ROW
// ===========================================================

function PrivacyRow({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
    >

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
          {icon}
        </div>

        <div>

          <p className="font-medium">
            {title}
          </p>

          <p className="mt-1 text-xs leading-5 text-white/30">
            {description}
          </p>

        </div>

      </div>

      <div className="text-white/30">
        →
      </div>

    </button>
  );
}