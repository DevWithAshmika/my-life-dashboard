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
} from "lucide-react";

import {
  doc,
  onSnapshot,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

import {
  signOut,
  updateProfile,
} from "firebase/auth";

import { db, auth } from "../firebase/config";
import Loading from "../components/Loading";

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

  const [settings, setSettings] = useState({
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
  });

  // =========================================================
  // LOAD SETTINGS
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const settingsRef = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    const unsubscribe = onSnapshot(
      settingsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();

          setSettings({
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
          });
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Settings loading error:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // HANDLE CHANGE
  // =========================================================

  const handleChange = (name, value) => {
    setSettings((previous) => ({
      ...previous,
      [name]: value,
    }));

    setSaved(false);
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

    try {
      // ---------------------------------------------
      // Save profile name
      // ---------------------------------------------

      const trimmedName = profileName.trim();

      if (
        auth.currentUser &&
        trimmedName &&
        auth.currentUser.displayName !== trimmedName
      ) {
        await updateProfile(auth.currentUser, {
          displayName: trimmedName,
        });
      }

      // ---------------------------------------------
      // Save settings
      // ---------------------------------------------

      const settingsRef = doc(
        db,
        "users",
        user.uid,
        "settings",
        "preferences"
      );

      await setDoc(
        settingsRef,
        {
          ...settings,
          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error(
        "Settings save error:",
        error
      );

      alert("Could not save settings.");
    } finally {
      setSaving(false);
    }
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

    const defaultSettings = {
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

    try {
      const settingsRef = doc(
        db,
        "users",
        user.uid,
        "settings",
        "preferences"
      );

      await setDoc(
        settingsRef,
        {
          ...defaultSettings,
          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      );

      setSettings(defaultSettings);

      alert("Settings reset successfully.");
    } catch (error) {
      console.error(
        "Reset settings error:",
        error
      );

      alert("Could not reset settings.");
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

    const snapshot = await getDocs(
      collectionRef
    );

    await Promise.all(
      snapshot.docs.map((item) =>
        deleteDoc(item.ref)
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

      for (const collectionName of collections) {
        await deleteCollection(collectionName);
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
        "Could not delete all data."
      );
    } finally {
      setSaving(false);
    }
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
                  setProfileName(
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
                  </p>

                </div>

              </div>

            </div>

            <button
              type="button"
              onClick={resetSettings}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] p-4 text-left transition hover:bg-white/[0.06]"
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
            SAVE SETTINGS
        ==================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

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

        <div className="border-t border-white/10 pt-5">

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