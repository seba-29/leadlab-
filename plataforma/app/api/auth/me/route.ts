import { NextResponse } from "next/server";
import { clienteRuta, AUTH_HABILITADA } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

// Identidad del usuario logueado para el menú de la topbar (nombre + correo).
// Sin auth real (candado básico), devuelve user:null y el menú cae a genérico.
export async function GET() {
  if (!AUTH_HABILITADA) {
    return NextResponse.json({ user: null });
  }
  const supa = await clienteRuta();
  const { data } = await supa.auth.getUser();
  const u = data.user;
  if (!u) return NextResponse.json({ user: null });

  const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
  const nombre =
    (typeof meta.name === "string" && meta.name) ||
    (typeof meta.nombre === "string" && meta.nombre) ||
    (u.email ? u.email.split("@")[0] : "Usuario");

  return NextResponse.json({ user: { email: u.email ?? "", nombre } });
}
