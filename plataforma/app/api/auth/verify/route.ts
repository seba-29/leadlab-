import { NextResponse } from "next/server";
import { clienteRuta, AUTH_HABILITADA } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

// Paso 2: verificar el código y abrir la sesión (setea cookies HttpOnly).
export async function POST(req: Request) {
  if (!AUTH_HABILITADA) {
    return NextResponse.json({ error: "Login no configurado aún." }, { status: 500 });
  }
  const { email, token } = await req.json();
  if (!email || !token) {
    return NextResponse.json({ error: "Ingresá el código." }, { status: 400 });
  }

  const sb = await clienteRuta();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return NextResponse.json({ error: "Código inválido o vencido." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
