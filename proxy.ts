import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/", "/settings", "/api/meetings", "/api/research", "/api/connect", "/api/digest"];
// Auth pages and their API routes are always public
const publicPaths = ["/auth/", "/api/auth/"];

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow auth pages and API routes
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (!protectedPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // NextAuth sets this cookie when a session exists
  const sessionToken =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}
