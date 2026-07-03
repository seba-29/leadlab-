import { NextRequest, NextResponse } from "next/server";
import {
  listLeads,
  moverLead,
  actualizarLead,
  crearLead,
  listTenants,
  ETAPAS,
  type Etapa,
} from "@/lib/store";

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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const tenantId = String(body?.tenantId ?? "").trim();
  const nombre = String(body?.nombre ?? "").trim();
  if (!tenantId || !nombre) {
    return NextResponse.json({ error: "Faltan tenantId o nombre" }, { status: 400 });
  }
  const lead = await crearLead({
    tenantId,
    nombre,
    negocio: body?.negocio ? String(body.negocio) : undefined,
    telefono: body?.telefono ? String(body.telefono) : undefined,
    interes: body?.interes ? String(body.interes) : undefined,
    valorEstimado: typeof body?.valorEstimado === "number" ? body.valorEstimado : undefined,
    notas: body?.notas ? String(body.notas) : undefined,
    fuente: "Manual",
    etapa: ETAPAS.includes(body?.etapa) ? (body.etapa as Etapa) : "nuevo",
  });
  return NextResponse.json({ lead }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const leadId = String(body?.leadId ?? "");
  if (!leadId) return NextResponse.json({ error: "Falta leadId" }, { status: 400 });

  // Solo mover de etapa (drag del kanban)
  if (body?.etapa && Object.keys(body).length === 2) {
    const etapa = String(body.etapa) as Etapa;
    if (!ETAPAS.includes(etapa)) return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
    const lead = await moverLead(leadId, etapa);
    if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    return NextResponse.json({ lead });
  }

  // Edición general (drawer)
  const patch: any = {};
  for (const k of ["nombre", "negocio", "telefono", "interes", "notas"] as const) {
    if (typeof body?.[k] === "string") patch[k] = body[k];
  }
  if (typeof body?.valorEstimado === "number") patch.valorEstimado = body.valorEstimado;
  if (body?.etapa && ETAPAS.includes(body.etapa)) patch.etapa = body.etapa as Etapa;

  const lead = await actualizarLead(leadId, patch);
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  return NextResponse.json({ lead });
}
