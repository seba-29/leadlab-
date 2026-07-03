import { NextRequest, NextResponse } from "next/server";
import { getTenant, updateCerebro } from "@/lib/store";
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
  if (!body?.cerebro) return NextResponse.json({ error: "Falta cerebro" }, { status: 400 });
  const tenant = await updateCerebro(id, body.cerebro);
  if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  return NextResponse.json({ tenant, prompt: buildSystemPrompt(tenant) });
}
