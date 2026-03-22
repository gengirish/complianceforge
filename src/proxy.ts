import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Session auth must not apply — e.g. external uptime monitors */
const PUBLIC_UNAUTHENTICATED_PATHS = ["/api/health"];

const PROTECTED_PATHS = [
  "/dashboard",
  "/inventory",
  "/classifier",
  "/documents",
  "/audit",
  "/settings",
  "/incidents",
  "/scanner",
  "/calendar",
  "/conformity",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_UNAUTHENTICATED_PATHS.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    )
  ) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected) {
    const auth = request.cookies.get("cf_auth");
    if (!auth?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (pathname === "/login") {
    const auth = request.cookies.get("cf_auth");
    if (auth?.value) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/health",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/classifier/:path*",
    "/documents/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/incidents/:path*",
    "/scanner/:path*",
    "/calendar/:path*",
    "/conformity/:path*",
    "/login",
  ],
};
