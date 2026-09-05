import { initializeApp } from "firebase/app";

import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import {
  initializeFirestore,
  persistentLocalCache,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1bxnF_dJUoHoCx66MA6VtVTPj9XUOfQs",
  authDomain: "mylife-dashboard-9e9da.firebaseapp.com",
  projectId: "mylife-dashboard-9e9da",
  storageBucket: "mylife-dashboard-9e9da.firebasestorage.app",
  messagingSenderId: "1080771407569",
  appId: "1:1080771407569:web:5606e94f7309861eecdff0",
  measurementId: "G-FH4K11XQ56"
};

const app = initializeApp(firebaseConfig);

/*
|--------------------------------------------------------------------------
| Firebase Authentication
|--------------------------------------------------------------------------
*/

export const auth = getAuth(app);

setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.warn(
    "Auth persistence could not be enabled:",
    error
  );
});

/*
|--------------------------------------------------------------------------
| Firestore
|--------------------------------------------------------------------------
|
| Firestore persistent local cache handles:
|
| - Offline reads
| - Offline writes
| - Cached documents
| - Automatic synchronization
| - Reconnection
|
| We do NOT manually disable/enable Firestore
| based on Capacitor network status.
|
| This avoids startup delays and network race conditions.
|
*/

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});

/*
|--------------------------------------------------------------------------
| Google Authentication Provider
|--------------------------------------------------------------------------
*/

export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export default app;