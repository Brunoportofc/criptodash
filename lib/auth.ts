import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import { verifyFirebaseIdToken } from "@/lib/firebase-admin"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        try {
          const idToken = credentials?.idToken as string | undefined
          if (!idToken) return null

          const decoded = await verifyFirebaseIdToken(idToken)
          const email = decoded.email
          const name = decoded.name || decoded.email?.split("@")[0] || "Usuário"
          const image = decoded.picture || undefined

          if (!email) return null

          // Ensure user exists in DB
          let user = await prisma.user.findUnique({ where: { email } })
          if (!user) {
            user = await prisma.user.create({
              data: {
                email,
                name,
                image,
                has2FA: false,
              },
            })
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || name,
            image: user.image || image,
          }
        } catch (e) {
          console.error("Firebase credentials authorize error:", e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn() {
      // Para credentials (Firebase), o tratamento do usuário é feito em authorize
      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        const user = await prisma.user.findUnique({ where: { email: session.user.email } })
        if (user) {
          ;(session.user as any).id = user.id
          ;(session.user as any).has2FA = user.has2FA
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}
