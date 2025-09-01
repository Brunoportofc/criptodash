// Firebase client initialization
// This module is safe to import in client components only

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"

// Your web app's Firebase configuration
// Note: Firebase web config keys are not secrets. They can be safely exposed in the client per Firebase docs.
// Prefer reading from NEXT_PUBLIC_* environment variables so the same code works across environments.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDT-PtpyIs7gzfXIIDJ3xc2kZakYUID2YM",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "akintec-e85aa.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "akintec-e85aa",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "akintec-e85aa.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "80719610531",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:80719610531:web:dac10334255a335a8e7516",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-YD8V1LC9K6",
}

let _app: FirebaseApp | null = null
let _analytics: Analytics | undefined

export async function initFirebase(): Promise<{ app: FirebaseApp; analytics?: Analytics }> {
  if (typeof window === "undefined") {
    // Avoid initializing on the server
    throw new Error("initFirebase must be called on the client side")
  }

  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(firebaseConfig)

    // Analytics is only available in the browser and when supported
    try {
      if (await isSupported()) {
        _analytics = getAnalytics(_app)
      }
    } catch (e) {
      // Silently ignore analytics init errors (e.g., in unsupported environments)
      console.warn("Firebase Analytics not initialized:", (e as Error).message)
    }
  }

  return { app: _app, analytics: _analytics }
}