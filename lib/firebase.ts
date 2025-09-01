// Firebase client initialization
// This module is safe to import in client components only

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics"

// Your web app's Firebase configuration
// Note: Firebase web config keys are not secrets. They can be safely exposed in the client per Firebase docs.
// If you prefer, move these values to NEXT_PUBLIC_* environment variables.
const firebaseConfig = {
  apiKey: "AIzaSyDT-PtpyIs7gzfXIIDJ3xc2kZakYUID2YM",
  authDomain: "akintec-e85aa.firebaseapp.com",
  projectId: "akintec-e85aa",
  storageBucket: "akintec-e85aa.firebasestorage.app",
  messagingSenderId: "80719610531",
  appId: "1:80719610531:web:dac10334255a335a8e7516",
  measurementId: "G-YD8V1LC9K6",
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