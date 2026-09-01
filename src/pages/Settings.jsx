import { useEffect, useState } from "react";

import {
  Settings2,
  Save,
  Check,
  Wallet,
  Eye,
  EyeOff,
  DollarSign,
} from "lucide-react";

import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";
import Loading from "../components/Loading";

const CURRENCIES = [
  {
    code: "LKR",
    symbol: "Rs.",
    name: "Sri Lankan Rupee",
  },
  {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
  },
  {
    code: "EUR",
    symbol: "€",
    name: "Euro",
  },
  {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
  },
];

export default function Settings({ user }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    currency: "LKR",

    // IMPORTANT:
    // This is independent from main currency.
    exchangeCurrency: "USD",

    showFinance: true,
    showTasks: true,
    showGoals: true,
    showHabits: true,
    showFitness: true,
    showTravel: true,
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
            currency:
              typeof data.currency === "string"
                ? data.currency
                : "LKR",

            exchangeCurrency:
              typeof data.exchangeCurrency === "string"
                ? data.exchangeCurrency
                : "USD",

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
  // CHANGE SETTING
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
          currency: settings.currency,

          // IMPORTANT
          // Saved separately from main currency.
          exchangeCurrency:
            settings.exchangeCurrency,

          showFinance:
            settings.showFinance,

          showTasks:
            settings.showTasks,

          showGoals:
            settings.showGoals,

          showHabits:
            settings.showHabits,

          showFitness:
            settings.showFitness,

          showTravel:
            settings.showTravel,

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

      alert(
        "Could not save settings."
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

  const selectedCurrency =
    CURRENCIES.find(
      (item) =>
        item.code === settings.currency
    ) || CURRENCIES[0];

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen text-white">

      {/* HEADER */}

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

        {/* =====================================================
            MAIN CURRENCY
        ====================================================== */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl sm:p-6">

          <div className="mb-6 flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <Wallet size={20} />
            </div>

            <div>
              <h2 className="font-semibold">
                Main Currency
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Used throughout Finance and Dashboard.
              </p>
            </div>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {CURRENCIES.map((currency) => {

              const active =
                settings.currency ===
                currency.code;

              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() =>
                    handleChange(
                      "currency",
                      currency.code
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-white/30 bg-white/10"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <span className="text-xl font-bold">
                      {currency.symbol}
                    </span>

                    {active && (
                      <Check
                        size={18}
                        className="text-emerald-400"
                      />
                    )}

                  </div>

                  <p className="mt-3 font-semibold">
                    {currency.code}
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    {currency.name}
                  </p>

                </button>
              );
            })}

          </div>

          <div className="mt-4 rounded-2xl bg-white/[0.025] p-4">

            <p className="text-xs text-white/30">
              Current application currency
            </p>

            <p className="mt-1 font-semibold">
              {selectedCurrency.symbol}{" "}
              {selectedCurrency.code}
            </p>

          </div>

        </div>

        {/* =====================================================
            EXCHANGE RATE CURRENCY
        ====================================================== */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl sm:p-6">

          <div className="mb-6 flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
              <DollarSign size={20} />
            </div>

            <div>
              <h2 className="font-semibold">
                Exchange Rate Currency
              </h2>

              <p className="mt-1 text-xs text-white/30">
                This is separate from your main currency.
              </p>
            </div>

          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {CURRENCIES.map((currency) => {

              const active =
                settings.exchangeCurrency ===
                currency.code;

              const sameAsMain =
                settings.currency ===
                currency.code;

              return (
                <button
                  key={currency.code}
                  type="button"
                  onClick={() =>
                    handleChange(
                      "exchangeCurrency",
                      currency.code
                    )
                  }
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-emerald-400/40 bg-emerald-400/10"
                      : "border-white/10 bg-white/[0.025] hover:bg-white/[0.06]"
                  }`}
                >

                  <div className="flex items-center justify-between">

                    <span className="text-xl font-bold">
                      {currency.symbol}
                    </span>

                    {active && (
                      <Check
                        size={18}
                        className="text-emerald-400"
                      />
                    )}

                  </div>

                  <p className="mt-3 font-semibold">
                    {currency.code}
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    {currency.name}
                  </p>

                  {sameAsMain && (
                    <p className="mt-2 text-[10px] text-white/20">
                      Same as main currency
                    </p>
                  )}

                </button>
              );
            })}

          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-4">

            <p className="text-xs text-white/30">
              Exchange card will show
            </p>

            <p className="mt-1 font-semibold text-emerald-400">
              1 {settings.exchangeCurrency}
              {" = "}
              {settings.currency}
            </p>

          </div>

        </div>

        {/* =====================================================
            DASHBOARD VISIBILITY
        ====================================================== */}

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-2xl sm:p-6">

          <div className="mb-6">

            <h2 className="font-semibold">
              Dashboard Sections
            </h2>

            <p className="mt-1 text-xs text-white/30">
              Choose what appears on your dashboard.
            </p>

          </div>

          <div className="space-y-3">

            <VisibilityRow
              title="Finance"
              enabled={settings.showFinance}
              onClick={() =>
                handleChange(
                  "showFinance",
                  !settings.showFinance
                )
              }
            />

            <VisibilityRow
              title="Tasks"
              enabled={settings.showTasks}
              onClick={() =>
                handleChange(
                  "showTasks",
                  !settings.showTasks
                )
              }
            />

            <VisibilityRow
              title="Goals"
              enabled={settings.showGoals}
              onClick={() =>
                handleChange(
                  "showGoals",
                  !settings.showGoals
                )
              }
            />

            <VisibilityRow
              title="Habits"
              enabled={settings.showHabits}
              onClick={() =>
                handleChange(
                  "showHabits",
                  !settings.showHabits
                )
              }
            />

            <VisibilityRow
              title="Fitness"
              enabled={settings.showFitness}
              onClick={() =>
                handleChange(
                  "showFitness",
                  !settings.showFitness
                )
              }
            />

            <VisibilityRow
              title="Travel"
              enabled={settings.showTravel}
              onClick={() =>
                handleChange(
                  "showTravel",
                  !settings.showTravel
                )
              }
            />

          </div>

        </div>

        {/* SAVE */}

        <div className="flex justify-end">

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
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

      </div>

    </div>
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