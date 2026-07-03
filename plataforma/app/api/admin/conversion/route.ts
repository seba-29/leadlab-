import { NextRequest, NextResponse } from "next/server";
import {
  listLeads,
  listConversaciones,
  listDerivaciones,
  listMensajes,
  listTenants,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const ETAPAS_FLUJO = ["nuevo", "contactado", "agendado", "ganado"] as const;

// Embudo de conversión + tasas. Con ?tenantId → scoped a un cliente.
// Sin tenantId → global + comparativa por cliente (solo admin).
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;

  const [leads, convs, derivaciones, tenants] = await Promise.all([
    listLeads(tenantId),
    listConversaciones(tenantId),
    listDerivaciones(tenantId),
    listTenants(),
  ]);

  const metricas = await calcular(leads, convs, derivaciones);

  // Comparativa por cliente solo en vista global (sin tenantId)
  let porTenant: {
    id: string;
    nombre: string;
    color: string;
    tasaCierre: number;
    derivPct: number;
    tiempoRespuestaSeg: number | null;
  }[] = [];
  if (!tenantId) {
    porTenant = await Promise.all(
      tenants
        .filter((t) => t.tipo === "cliente")
        .map(async (t) => {
          const l = leads.filter((x) => x.tenantId === t.id);
          const c = convs.filter((x) => x.tenantId === t.id);
          const d = derivaciones.filter((x) => x.tenantId === t.id);
          const m = await calcular(l, c, d);
          return {
            id: t.id,
            nombre: t.nombre,
            color: t.color,
            tasaCierre: m.tasaCierre,
            derivPct: m.derivPct,
            tiempoRespuestaSeg: m.tiempoRespuestaSeg,
          };
        }),
    );
  }

  return NextResponse.json({ ...metricas, porTenant });
}

async function calcular(
  leads: { etapa: string }[],
  convs: { id: string }[],
  derivaciones: unknown[],
) {
  const cuenta = (e: string) => leads.filter((l) => l.etapa === e).length;
  const embudo = ETAPAS_FLUJO.map((etapa) => ({ etapa, n: cuenta(etapa) }));
  const perdidos = cuenta("perdido");
  const ganados = cuenta("ganado");
  const agendados = cuenta("agendado");

  const tasaCierre = ganados + perdidos > 0 ? ganados / (ganados + perdidos) : 0;
  const tasaAgenda = leads.length > 0 ? (agendados + ganados) / leads.length : 0;
  const derivPct = convs.length > 0 ? derivaciones.length / convs.length : 0;

  // Tiempo de respuesta IA: promedio (primer msg bot) − (primer msg cliente) por conv.
  // N listMensajes — aceptable para v1. TODO: agregado SQL al escalar.
  let sumSeg = 0;
  let nSeg = 0;
  for (const c of convs) {
    const msgs = await listMensajes(c.id);
    const cliente = msgs.find((m) => m.autor === "cliente");
    const bot = msgs.find((m) => m.autor === "bot" && new Date(m.creado) >= new Date(cliente?.creado ?? 0));
    if (cliente && bot) {
      const seg = (new Date(bot.creado).getTime() - new Date(cliente.creado).getTime()) / 1000;
      if (seg >= 0 && seg < 3600) {
        sumSeg += seg;
        nSeg++;
      }
    }
  }
  const tiempoRespuestaSeg = nSeg > 0 ? Math.round(sumSeg / nSeg) : null;

  return {
    embudo,
    perdidos,
    tasaCierre,
    tasaAgenda,
    derivPct,
    tiempoRespuestaSeg,
    pipeline: leads.filter((l) => ["nuevo", "contactado", "agendado"].includes(l.etapa)).length,
  };
}
