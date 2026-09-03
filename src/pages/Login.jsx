import { useState } from "react";

import {
  LogIn,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Capacitor } from "@capacitor/core";

import {
  FirebaseAuthentication,
} from "@capacitor-firebase/authentication";

import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../firebase/config";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError("");

      // Android / iOS
      // Use native Google Sign-In
      if (Capacitor.isNativePlatform()) {
        const result =
          await FirebaseAuthentication.signInWithGoogle();

        const idToken =
          result?.credential?.idToken;

        if (!idToken) {
          throw new Error(
            "Google did not return an ID token."
          );
        }

        const credential =
          GoogleAuthProvider.credential(idToken);

        await signInWithCredential(
          auth,
          credential
        );

        return;
      }

      // Web browser
      // Keep Firebase popup login for normal web
      const provider =
        new GoogleAuthProvider();

      provider.setCustomParameters({
        prompt: "select_account",
      });

      await signInWithPopup(
        auth,
        provider
      );
    } catch (error) {
      console.error(
        "Google login error:",
        error
      );

      switch (error?.code) {
        case "auth/popup-closed-by-user":
          setError(
            "Login window was closed."
          );
          break;

        case "auth/popup-blocked":
          setError(
            "Your browser blocked the login popup."
          );
          break;

        case "auth/network-request-failed":
          setError(
            "Network error. Please check your internet connection."
          );
          break;

        default:
          setError(
            error?.message ||
              "Unable to login with Google. Please try again."
          );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-white/[0.04] blur-3xl" />

        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-white/[0.025] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.045] p-6 shadow-2xl backdrop-blur-2xl sm:p-8">

          <div className="mb-8 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/10 shadow-xl">
              <LogIn size={28} />
            </div>
          </div>

          <div className="text-center">
            <p className="mb-2 text-sm text-white/40">
              Welcome back
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              My Dashboard
            </h1>

            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/35">
              Manage your finance, tasks, goals,
              habits, fitness, travel and daily life
              from one place.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2
                  size={20}
                  className="animate-spin"
                />

                Signing in...
              </>
            ) : (
              <>
                <GoogleIcon />

                Continue with Google
              </>
            )}
          </button>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/25">
            <ShieldCheck size={14} />

            Secure authentication with Firebase
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-white/20">
          Your personal dashboard
        </p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.22a4.46 4.46 0 0 1-1.94 2.93v2.43h3.14c1.84-1.69 2.93-4.18 2.93-7.35Z"
      />

      <path
        fill="#34A853"
        d="M12 21.75c2.63 0 4.84-.87 6.45-2.4l-3.14-2.43c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.28v2.51A9.75 9.75 0 0 0 12 21.75Z"
      />

      <path
        fill="#FBBC05"
        d="M6.53 13.81A5.86 5.86 0 0 1 6.22 12c0-.63.11-1.24.31-1.81V7.68H3.28A9.76 9.76 0 0 0 2.25 12c0 1.57.38 3.05 1.03 4.32l3.25-2.51Z"
      />

      <path
        fill="#EA4335"
        d="M12 6.16c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.25 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.72 5.43l3.25 2.51c.77-2.31 2.93-4.03 5.47-4.03Z"
      />
    </svg>
  );
}