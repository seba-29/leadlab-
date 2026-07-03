import { NextResponse } from "next/server";
import { listConversaciones, listLeads, listCitas, listDerivaciones } from "@/lib/store";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId");
  const [convsAll, leadsAll, citasAll, derivacionesAll] = await Promise.all([
    listConversaciones(),
    listLeads(),
    listCitas(),
    listDerivaciones(),
  ]);

  // Scope por subcuenta: si viene ?tenantId, filtramos todo a ese tenant.
  const of = <T extends { tenantId: string }>(arr: T[]) =>
    tenantId ? arr.filter((x) => x.tenantId === tenantId) : arr;
  const convs = of(convsAll);
  const leads = of(leadsAll);
  const citas = of(citasAll);
  const derivaciones = of(derivacionesAll);

  const hace7 = Date.now() - 7 * DIA_MS;
  const en7dias = (iso: string) => new Date(iso).getTime() >= hace7;

  const leadsNuevos7d = leads.filter((l) => en7dias(l.creado)).length;
  const conversaciones7d = convs.filter((c) => en7dias(c.actualizado)).length;
  const citas7d = citas.filter((c) => en7dias(c.creado)).length;
  const pipeline = leads
    .filter((l) => ["nuevo", "contactado", "agendado"].includes(l.etapa))
    .reduce((sum, l) => sum + (l.valorEstimado ?? 0), 0);

  // % atendido por IA: conversaciones que NO escalaron a humano ni se derivaron.
  const escaladas = new Set<string>();
  for (const c of convs) if (c.estado === "humano") escaladas.add(c.id);
  for (const d of derivaciones) if (d.conversacionId) escaladas.add(d.conversacionId);
  const porcentajeIa =
    convs.length < 3 ? null : Math.round(100 * (1 - escaladas.size / convs.length));

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
    porcentajeIa,
    porDia,
    porEtapa,
    ultimosLeads: leads.slice(0, 6),
    atencion: [...derivaciones]
      .sort((a, b) => b.creado.localeCompare(a.creado))
      .slice(0, 5)
      .map((d) => ({
        id: d.id,
        motivo: d.motivo,
        resumen: d.resumen ?? "",
        conversacionId: d.conversacionId ?? null,
        creado: d.creado,
      })),
    // fechaHora puede ser ISO (seed) o texto libre (creada por el agente): las de
    // texto libre se muestran igual, las ISO pasadas se ocultan
    proximasCitas: citas
      .filter((c) => {
        const t = new Date(c.fechaHora).getTime();
        return isNaN(t) || t >= Date.now();
      })
      .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
      .slice(0, 5)
      .map((c) => ({ id: c.id, fechaHora: c.fechaHora, contacto: c.contacto ?? "" })),
  });
}
