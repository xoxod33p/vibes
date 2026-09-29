import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

let firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedProvider: GoogleAuthProvider | null = null;

export async function getClientAuth(): Promise<{ auth: Auth | null; provider: GoogleAuthProvider | null }> {
  // If config was not inlined during build (e.g. in Docker), fetch runtime config from server
  if (!firebaseConfig.apiKey && typeof window !== "undefined") {
    try {
      const res = await fetch("/api/auth/firebase-config");
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          firebaseConfig = { ...firebaseConfig, ...data };
        }
      }
    } catch (e) {
      console.warn("Failed to fetch runtime Firebase config:", e);
    }
  }

  if (!firebaseConfig.apiKey) {
    return { auth: null, provider: null };
  }

  try {
    if (!cachedApp) {
      cachedApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    }
    if (!cachedAuth && cachedApp) {
      cachedAuth = getAuth(cachedApp);
    }
    if (!cachedProvider) {
      cachedProvider = new GoogleAuthProvider();
    }
    return { auth: cachedAuth, provider: cachedProvider };
  } catch {
    return { auth: null, provider: null };
  }
}
