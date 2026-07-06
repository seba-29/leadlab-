// ============================================================
// Lead Lab — Envío de correos (Resend)
// Un solo canal para el código de login y las notificaciones.
// Se activa con RESEND_API_KEY; sin ella, cae al correo interno
// de Supabase (rate-limited, solo para pruebas).
// ============================================================
const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
// Hasta verificar leadlab.cl en Resend, se usa el remitente compartido
// onboarding@resend.dev (solo entrega al dueño de la cuenta Resend).
const FROM = process.env.EMAIL_FROM ?? "Lead Lab <onboarding@resend.dev>";

export const EMAIL_CONFIGURADO = Boolean(RESEND_KEY);

export async function enviarCorreo(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

function shell(titulo: string, cuerpo: string): string {
  return `<div style="background:#0b0a09;padding:32px 0;font-family:'Segoe UI',Roboto,Arial,sans-serif">
    <div style="max-width:440px;margin:0 auto;background:#161311;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:32px 30px;color:#f4f1ec">
      <div style="font-size:22px;font-weight:700;letter-spacing:-.5px;margin-bottom:20px">
        Lead<span style="color:#ff6b2c">Lab</span><span style="color:#c6f24e">.</span>
      </div>
      <div style="font-size:17px;font-weight:700;margin-bottom:8px">${titulo}</div>
      ${cuerpo}
      <div style="margin-top:26px;font-size:11px;color:rgba(244,241,236,.4)">Lead Lab · agentes de IA que atienden tus leads 24/7</div>
    </div>
  </div>`;
}

export async function enviarCodigoLogin(to: string, codigo: string): Promise<boolean> {
  const html = shell(
    "Tu código de acceso",
    `<p style="font-size:13.5px;color:rgba(244,241,236,.6);line-height:1.6;margin:0 0 18px">
       Usá este código para entrar a tu consola. Vence en 1 hora.
     </p>
     <div style="font-size:32px;font-weight:800;letter-spacing:.28em;text-align:center;
       background:rgba(255,107,44,.12);border:1px solid rgba(255,107,44,.35);border-radius:12px;
       padding:16px;color:#ff8a52">${codigo}</div>
     <p style="font-size:11.5px;color:rgba(244,241,236,.4);line-height:1.6;margin:18px 0 0">
       Si no intentaste ingresar, ignorá este correo.
     </p>`,
  );
  return enviarCorreo({ to, subject: `Tu código de acceso a Lead Lab: ${codigo}`, html });
}
