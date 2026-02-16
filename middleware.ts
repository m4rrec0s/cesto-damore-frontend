import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function decodeJWT(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

function isUserAdmin(userString: string | null): boolean {
  if (!userString) return false;

  try {
    const user = JSON.parse(userString);
    return user.role === "admin";
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const adminRoutes = ["/manage", "/manage/*"];

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    const token = request.cookies.get("appToken")?.value;
    const userCookie = request.cookies.get("user")?.value;

    if (!token || token === "undefined") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isTokenExpired(token)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      loginUrl.searchParams.set("reason", "token_expired");
      return NextResponse.redirect(loginUrl);
    }

    const requiresAdmin = ["/estoque", "/feed-test"];
    if (requiresAdmin.some((route) => pathname.startsWith(route))) {
      if (!isUserAdmin(userCookie || null)) {
        const unauthorizedUrl = new URL("/unauthorized", request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
