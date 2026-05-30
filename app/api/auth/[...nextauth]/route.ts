import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    // Identity-only Google login — no calendar scope here.
    // Calendar access is handled separately via /api/connect/google.
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
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // Upsert user in DB on every sign-in
        const user = await db.user.upsert({
          where: { email: profile.email! },
          create: {
            email: profile.email!,
            name: profile.name,
            avatarUrl: (profile as any).picture,
          },
          update: {
            name: profile.name,
            avatarUrl: (profile as any).picture,
          },
        });
        token.dbUserId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).dbUserId = token.dbUserId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
