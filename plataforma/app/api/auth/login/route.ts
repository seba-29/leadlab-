import { NextResponse } from "next/server";
import { clienteEfimero, clienteAdmin, AUTH_HABILITADA } from "@/lib/supabaseAuth";
import { EMAIL_CONFIGURADO, enviarCodigoLogin } from "@/lib/email";

export const dynamic = "force-dynamic";

// Paso 1: validar correo + contraseña y enviar el código de acceso al correo.
export async function POST(req: Request) {
  if (!AUTH_HABILITADA) {
    return NextResponse.json({ error: "Login no configurado aún." }, { status: 500 });
  }
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Ingresá correo y contraseña." }, { status: 400 });
  }

  // 1) ¿La clave es correcta? (cliente efímero, no deja sesión)
  const { error: e1 } = await clienteEfimero().auth.signInWithPassword({ email, password });
  if (e1) {
    return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
  }

  // 2) Enviar el código de 2FA.
  if (EMAIL_CONFIGURADO) {
    // Generamos el código server-side y lo mandamos nosotros por Resend.
    const { data, error } = await clienteAdmin().auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    const codigo = data?.properties?.email_otp;
    if (error || !codigo) {
      return NextResponse.json({ error: "No pudimos generar el código." }, { status: 500 });
    }
    const enviado = await enviarCodigoLogin(email, codigo);
    if (!enviado) {
      return NextResponse.json({ error: "No pudimos enviar el correo del código." }, { status: 500 });
    }
  } else {
    // Fallback: correo interno de Supabase (rate-limited, solo pruebas).
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
  }

  return NextResponse.json({ ok: true });
}
