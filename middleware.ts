import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Função para decodificar JWT (apenas para verificar expiração)
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

// Função para verificar se o token está expirado
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) {
    return true; // Se não conseguir decodificar ou não tem exp, considera expirado
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

// Função para verificar se o usuário é admin
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

  // Verificar se é uma rota administrativa que precisa de proteção
  const adminRoutes = [
    "/estoque",
    "/feed-test",
    // Adicione outras rotas administrativas aqui
  ];

  const isAdminRoute = adminRoutes.some((route) => pathname.startsWith(route));

  if (isAdminRoute) {
    // Obter token do cookie ou header (Next.js middleware não tem acesso direto ao localStorage)
    // Vamos usar um cookie que será definido pelo frontend
    const token = request.cookies.get("appToken")?.value;
    const userCookie = request.cookies.get("user")?.value;

    console.log("🔐 Middleware - Verificando acesso admin:", {
      pathname,
      hasToken: !!token,
      hasUserCookie: !!userCookie,
      tokenLength: token?.length || 0,
    });

    // Se não tem token, redirecionar para login
    if (!token || token === "undefined") {
      console.log("❌ Middleware - Token ausente, redirecionando para login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se o token está expirado
    if (isTokenExpired(token)) {
      console.log("❌ Middleware - Token expirado, redirecionando para login");
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      loginUrl.searchParams.set("reason", "token_expired");
      return NextResponse.redirect(loginUrl);
    }

    // Verificar se o usuário é admin (para rotas administrativas específicas)
    const requiresAdmin = ["/estoque", "/feed-test"];
    if (requiresAdmin.some((route) => pathname.startsWith(route))) {
      if (!isUserAdmin(userCookie || null)) {
        console.log("❌ Middleware - Usuário não é admin, redirecionando");
        const unauthorizedUrl = new URL("/unauthorized", request.url);
        return NextResponse.redirect(unauthorizedUrl);
      }
    }

    console.log("✅ Middleware - Acesso autorizado");
  }

  return NextResponse.next();
}

// Configurar em quais rotas o middleware deve ser executado
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};
