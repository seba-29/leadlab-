import { NextRequest, NextResponse } from "next/server";
import { listLeads, moverLead, listTenants, ETAPAS, type Etapa } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;
  const [leads, tenants] = await Promise.all([listLeads(tenantId), listTenants()]);
  const items = leads.map((l) => ({
    ...l,
    tenantNombre: tenants.find((t) => t.id === l.tenantId)?.nombre ?? l.tenantId,
    tenantColor: tenants.find((t) => t.id === l.tenantId)?.color ?? "#FF6B2C",
  }));
  return NextResponse.json({ leads: items });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const leadId = String(body?.leadId ?? "");
  const etapa = String(body?.etapa ?? "") as Etapa;
  if (!leadId || !ETAPAS.includes(etapa)) {
    return NextResponse.json({ error: "leadId o etapa inválidos" }, { status: 400 });
  }
  const lead = await moverLead(leadId, etapa);
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  return NextResponse.json({ lead });
}
