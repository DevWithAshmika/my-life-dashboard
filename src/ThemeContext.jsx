import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";

import { db } from "../firebase/config";

const ThemeContext =
  createContext(null);

export function ThemeProvider({
  user,
  children,
}) {
  const [theme, setTheme] =
    useState("dark");

  const [loading, setLoading] =
    useState(true);

  // =========================================================
  // LOAD THEME FROM FIRESTORE
  // =========================================================

  useEffect(() => {
    if (!user?.uid) {
      setTheme("dark");
      setLoading(false);
      return;
    }

    const reference = doc(
      db,
      "users",
      user.uid,
      "settings",
      "preferences"
    );

    const unsubscribe = onSnapshot(
      reference,
      (snapshot) => {
        if (snapshot.exists()) {
          const data =
            snapshot.data();

          setTheme(
            data.theme === "light"
              ? "light"
              : "dark"
          );
        } else {
          setTheme("dark");
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Theme loading error:",
          error
        );

        setTheme("dark");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // =========================================================
  // APPLY THEME TO HTML
  // =========================================================

  useEffect(() => {
    document.documentElement.classList.remove(
      "dark",
      "light"
    );

    document.documentElement.classList.add(
      theme
    );

    document.documentElement.setAttribute(
      "data-theme",
      theme
    );
  }, [theme]);

  // =========================================================
  // CHANGE THEME
  // =========================================================

  const changeTheme = async (
    newTheme
  ) => {
    if (
      newTheme !== "dark" &&
      newTheme !== "light"
    ) {
      return;
    }

    setTheme(newTheme);

    if (!user?.uid) {
      return;
    }

    try {
      const reference = doc(
        db,
        "users",
        user.uid,
        "settings",
        "preferences"
      );

      await setDoc(
        reference,
        {
          theme: newTheme,
        },
        {
          merge: true,
        }
      );
    } catch (error) {
      console.error(
        "Theme save error:",
        error
      );
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        changeTheme,
        loading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}
