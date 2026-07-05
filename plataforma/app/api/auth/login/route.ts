import { NextResponse } from "next/server";
import { clienteEfimero, AUTH_HABILITADA } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

// Paso 1: validar correo + contraseña y enviar el código de 6 dígitos al correo.
export async function POST(req: Request) {
  if (!AUTH_HABILITADA) {
    return NextResponse.json({ error: "Login no configurado aún." }, { status: 500 });
  }
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Ingresá correo y contraseña." }, { status: 400 });
  }

  // 1) La clave es correcta?
  const { error: e1 } = await clienteEfimero().auth.signInWithPassword({ email, password });
  if (e1) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  // 2) Enviar el código al correo (segundo factor). Cliente fresco.
  const { error: e2 } = await clienteEfimero().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (e2) {
    return NextResponse.json(
      { error: "No pudimos enviar el código. Probá de nuevo en un momento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
