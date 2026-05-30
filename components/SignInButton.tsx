"use client";

import { signOut, useSession } from "next-auth/react";

export default function SignInButton({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2">
        {session.user?.image && (
          <img src={session.user.image} alt="" className="w-7 h-7 rounded-full ring-1 ring-white/10" />
        )}
        {compact ? (
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors hidden md:block"
          >
            Sign out
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    );
  }

  return null;
}
