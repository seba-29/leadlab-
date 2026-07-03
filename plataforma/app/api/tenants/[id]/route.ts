import { NextRequest, NextResponse } from "next/server";
import { getTenant, updateCerebro, updateTenant } from "@/lib/store";
import { buildSystemPrompt } from "@/lib/agent";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const tenant = await getTenant(id);
  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  return NextResponse.json({ tenant, prompt: buildSystemPrompt(tenant) });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  // Datos del negocio (Configuración, cara cliente): nombre/rubro/agente/color.
  // No permite cambiar tipo/plan/id — eso lo controla el admin.
  if (body?.datos) {
    const { nombre, rubro, agente, color } = body.datos;
    const t = await updateTenant(id, { nombre, rubro, agente, color });
    if (!t) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  // Cerebro (editor admin, o el horario que manda Configuración).
  if (body?.cerebro) {
    const t = await updateCerebro(id, body.cerebro);
    if (!t) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  }

  if (!body?.datos && !body?.cerebro) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const tenant = await getTenant(id);
  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  return NextResponse.json({ tenant, prompt: buildSystemPrompt(tenant) });
}
