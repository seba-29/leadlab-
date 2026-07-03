import { NextResponse } from "next/server";
import { listConversaciones, listLeads, listCitas, listDerivaciones } from "@/lib/store";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const [convs, leads, citas, derivaciones] = await Promise.all([
    listConversaciones(),
    listLeads(),
    listCitas(),
    listDerivaciones(),
  ]);

  const hace7 = Date.now() - 7 * DIA_MS;
  const en7dias = (iso: string) => new Date(iso).getTime() >= hace7;

  const leadsNuevos7d = leads.filter((l) => en7dias(l.creado)).length;
  const conversaciones7d = convs.filter((c) => en7dias(c.actualizado)).length;
  const citas7d = citas.filter((c) => en7dias(c.creado)).length;
  const pipeline = leads
    .filter((l) => ["nuevo", "contactado", "agendado"].includes(l.etapa))
    .reduce((sum, l) => sum + (l.valorEstimado ?? 0), 0);

  // Leads por día — últimos 14 días (serie única para el gráfico)
  const porDia: { dia: string; etiqueta: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * DIA_MS);
    const clave = d.toISOString().slice(0, 10);
    const etiqueta = d.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    porDia.push({
      dia: clave,
      etiqueta,
      n: leads.filter((l) => l.creado.slice(0, 10) === clave).length,
    });
  }

  const porEtapa: Record<string, number> = {};
  for (const l of leads) porEtapa[l.etapa] = (porEtapa[l.etapa] ?? 0) + 1;

  return NextResponse.json({
    conversaciones7d,
    leadsNuevos7d,
    citas7d,
    pipeline,
    derivacionesPendientes: derivaciones.length,
    porDia,
    porEtapa,
    ultimosLeads: leads.slice(0, 6),
  });
}
