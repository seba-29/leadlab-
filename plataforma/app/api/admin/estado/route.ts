import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Estado de las integraciones de la plataforma (solo presencia de credenciales,
// nunca los valores). Alimenta el tab "Integraciones" de Configuración admin.
export async function GET() {
  const has = (v?: string) => Boolean(v && v.trim());
  return NextResponse.json({
    claude: has(process.env.ANTHROPIC_API_KEY),
    supabase: has(process.env.SUPABASE_URL) && has(process.env.SUPABASE_SERVICE_ROLE_KEY),
    auth: has(process.env.SUPABASE_ANON_KEY),
    email: has(process.env.RESEND_API_KEY),
    whatsapp: has(process.env.WHATSAPP_TOKEN),
    emailFrom: process.env.EMAIL_FROM || "",
    model: process.env.AGENT_MODEL || "por defecto",
  });
}
