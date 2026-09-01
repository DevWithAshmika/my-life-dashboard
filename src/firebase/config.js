import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const auth = getAuth(app);

export const db = getFirestore(app);

export const googleProvider =
  new GoogleAuthProvider();

export default app;