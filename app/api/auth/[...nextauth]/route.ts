import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
            "https://www.googleapis.com/auth/calendar.readonly",
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.googleId = profile.sub;

        // Upsert user in DB on every sign-in
        await db.user.upsert({
          where: { email: profile.email! },
          create: {
            email: profile.email!,
            name: profile.name,
            avatarUrl: (profile as any).picture,
            googleId: profile.sub,
          },
          update: {
            name: profile.name,
            avatarUrl: (profile as any).picture,
          },
        });

        // Store DB user id in token
        const user = await db.user.findUnique({ where: { email: profile.email! } });
        token.dbUserId = user?.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken;
      (session as any).dbUserId = token.dbUserId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
