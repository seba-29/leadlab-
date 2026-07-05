import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const URL = process.env.SUPABASE_URL;
const ANON = process.env.SUPABASE_ANON_KEY;
const PASS = process.env.CONSOLE_PASSWORD;

// Rutas siempre accesibles (sin sesión)
function exenta(path: string): boolean {
  return (
    path === "/login" ||
    path.startsWith("/api/auth/") || // endpoints de login
    path.startsWith("/api/canales/") // webhook de Meta
  );
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (exenta(path)) return NextResponse.next();

  // --- Modo Supabase Auth (login real con clave + código) ---
  if (URL && ANON) {
    const res = NextResponse.next({ request: req });
    const supabase = createServerClient(URL, ANON, {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list) {
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return res;
  }

  // --- Fallback: candado básico (mientras no esté la auth real) ---
  if (PASS) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth.startsWith("Basic ")) {
      try {
        const [user, pwd] = atob(auth.slice(6)).split(":");
        if (user === "leadlab" && pwd === PASS) return NextResponse.next();
      } catch {
        /* header malformado */
      }
    }
    return new NextResponse("Acceso restringido", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Lead Lab"' },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
