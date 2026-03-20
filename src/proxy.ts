import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = [
  "/dashboard",
  "/inventory",
  "/classifier",
  "/documents",
  "/audit",
  "/settings",
  "/incidents",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
    "/dashboard/:path*",
    "/inventory/:path*",
    "/classifier/:path*",
    "/documents/:path*",
    "/audit/:path*",
    "/settings/:path*",
    "/incidents/:path*",
    "/login",
  ],
};
