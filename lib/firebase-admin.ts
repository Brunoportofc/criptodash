// Firebase Admin initialization (server-only)
// Do NOT import this from client components

import { initializeApp, getApps, cert, applicationDefault, type App as AdminApp } from "firebase-admin/app"
import { getAuth, type DecodedIdToken } from "firebase-admin/auth"

let adminApp: AdminApp | null = null

export function getAdminApp(): AdminApp {
  if (!adminApp) {
    // Reuse existing default app if already initialized (avoids "app already exists" errors in dev/HMR)
    const existing = getApps()
    if (existing.length > 0) {
      adminApp = existing[0]
      return adminApp
    }

    // If GOOGLE_APPLICATION_CREDENTIALS is set, prefer Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      adminApp = initializeApp({
        credential: applicationDefault(),
      })
      return adminApp
    }

    const projectId = process.env.FIREBASE_PROJECT_ID
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
    let privateKey = process.env.FIREBASE_PRIVATE_KEY

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase Admin credentials env vars. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, or define GOOGLE_APPLICATION_CREDENTIALS to a valid service account JSON.")
    }

    // Normalize and sanitize private key from env
    // 1) Remove surrounding quotes if present
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1)
    }
    // 2) Convert escaped newlines to real newlines
    privateKey = privateKey.replace(/\\n/g, "\n")
    // 3) Normalize CRLF/CR to LF just in case
    privateKey = privateKey.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    // 4) Trim stray whitespace
    privateKey = privateKey.trim()

    // Safe validation (no secret leakage)
    const hasHeader = privateKey.includes("BEGIN PRIVATE KEY")
    const hasFooter = privateKey.includes("END PRIVATE KEY")
    if (!hasHeader || !hasFooter) {
      console.error("FIREBASE_PRIVATE_KEY appears malformed after normalization (missing header/footer)")
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }
  return adminApp
}

export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedIdToken> {
  const app = getAdminApp()
  const auth = getAuth(app)
  return auth.verifyIdToken(idToken)
}