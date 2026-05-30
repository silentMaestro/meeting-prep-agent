import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Point NextAuth at our own branded pages
  pages: {
    signIn: "/auth/signin",
    newUser: "/settings", // new Google users go straight to connect calendar
    error: "/auth/signin",
  },

  providers: [
    // ── Email + password ──────────────────────────────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        if (!user.emailVerified) {
          // Surface a friendly error — NextAuth will redirect to signIn?error=
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl };
      },
    }),

    // ── Google social login (identity only, no calendar scope) ────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "select_account",
        },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account, profile, user }) {
      // On initial sign-in, upsert the user and store dbUserId
      if (account && (profile || user)) {
        const email = (profile?.email ?? user?.email ?? "").toLowerCase().trim();
        if (!email) return token;

        const dbUser = await db.user.upsert({
          where: { email },
          create: {
            email,
            name: profile?.name ?? user?.name ?? null,
            avatarUrl: (profile as any)?.picture ?? user?.image ?? null,
            // Google sign-ins are auto-verified
            emailVerified: account.provider === "google" ? new Date() : null,
          },
          update: {
            name: profile?.name ?? user?.name ?? undefined,
            avatarUrl: (profile as any)?.picture ?? user?.image ?? undefined,
            // If a credentials user somehow signs in via Google later, mark verified
            ...(account.provider === "google" ? { emailVerified: new Date() } : {}),
          },
        });

        token.dbUserId = dbUser.id;
        token.isNewUser = account.provider === "google";
      }

      // For credentials sign-ins, dbUserId was set during authorize → look it up
      if (!token.dbUserId && token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: (token.email as string).toLowerCase() },
        });
        if (dbUser) token.dbUserId = dbUser.id;
      }

      return token;
    },

    async session({ session, token }) {
      (session as any).dbUserId = token.dbUserId;
      return session;
    },
  },

  session: { strategy: "jwt" },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
