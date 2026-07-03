import { NextRequest, NextResponse } from "next/server";

// Candado simple para la versión online (HTTP Basic Auth).
// Se activa SOLO si existe CONSOLE_PASSWORD en el entorno:
//   usuario: leadlab · contraseña: CONSOLE_PASSWORD
// En local (sin la variable) no molesta. La autenticación real por
// usuario llega con Supabase Auth en la Fase 3.
export function middleware(req: NextRequest) {
  const pass = process.env.CONSOLE_PASSWORD;
  if (!pass) return NextResponse.next();

  // El webhook de WhatsApp debe quedar accesible para Meta
  if (req.nextUrl.pathname.startsWith("/api/canales/")) return NextResponse.next();

  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const [user, pwd] = atob(auth.slice(6)).split(":");
      if (user === "leadlab" && pwd === pass) return NextResponse.next();
    } catch {
      // header malformado → pedir credenciales de nuevo
    }
  }
  return new NextResponse("Acceso restringido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Lead Lab"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
