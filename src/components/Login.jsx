import { signInWithPopup } from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import {
  auth,
  googleProvider,
} from "../firebase/config";

export default function Login() {
  async function handleGoogleLogin() {
    try {
      await signInWithPopup(
        auth,
        googleProvider
      );
    } catch (error) {
      console.error(error);

      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {
        return;
      }

      alert(
        `Login failed: ${error.message}`
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#070707] px-5 text-white">

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center backdrop-blur-xl">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-2xl font-bold text-black">
          M
        </div>

        <h1 className="mt-6 text-3xl font-bold">
          MyLife
        </h1>

        <p className="mt-2 text-sm text-white/40">
          Personal Life Dashboard
        </p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 font-semibold text-black transition hover:bg-white/90"
        >
          <FcGoogle size={22} />

          Continue with Google
        </button>

      </div>

    </main>
  );
}