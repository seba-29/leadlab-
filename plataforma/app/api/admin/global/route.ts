import { NextResponse } from "next/server";
import {
  listTenants,
  listConversaciones,
  listLeads,
  listUsos,
  listDerivaciones,
} from "@/lib/store";
import { planClp, margen } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const DIA_MS = 24 * 60 * 60 * 1000;

// Agregados de TODA la plataforma + salud/sparkline por cliente (solo admin).
export async function GET() {
  const [tenants, convs, leads, usos, derivaciones] = await Promise.all([
    listTenants(),
    listConversaciones(),
    listLeads(),
    listUsos(),
    listDerivaciones(),
  ]);

  const hace7 = Date.now() - 7 * DIA_MS;
  const en7 = (iso: string) => new Date(iso).getTime() >= hace7;

  const clientes = tenants.map((t) => {
    const cs = convs.filter((c) => c.tenantId === t.id);
    const conv7d = cs.filter((c) => en7(c.actualizado)).length;
    const lds = leads.filter((l) => l.tenantId === t.id);
    const leads7d = lds.filter((l) => en7(l.creado)).length;
    const ganados = lds.filter((l) => l.etapa === "ganado").length;
    const derivacionesPend = derivaciones.filter((d) => d.tenantId === t.id).length;
    const costoUsd = usos
      .filter((u) => u.tenantId === t.id)
      .reduce((s, u) => s + u.costoUsd, 0);
    const m = margen(t.tipo, costoUsd);

    // sparkline: leads por día, últimos 7 días
    const spark: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * DIA_MS).toISOString().slice(0, 10);
      spark.push(lds.filter((l) => l.creado.slice(0, 10) === d).length);
    }

    // salud heurística
    let salud: "verde" | "ambar" | "rojo" = "verde";
    const margenMalo = m.margenPct != null && m.margenPct < 0;
    if (derivacionesPend >= 3 || margenMalo || (t.tipo === "cliente" && conv7d === 0)) {
      salud = "rojo";
    } else if (derivacionesPend > 0 || (m.margenPct != null && m.margenPct < 0.3)) {
      salud = "ambar";
    }

    return {
      id: t.id,
      nombre: t.nombre,
      agente: t.agente,
      color: t.color,
      rubro: t.rubro,
      tipo: t.tipo,
      conv7d,
      leads7d,
      ganados,
      derivacionesPend,
      costoUsd,
      planClp: planClp(t.tipo),
      margenPct: m.margenPct,
      salud,
      spark,
    };
  });

  const planUsdTotal = clientes.reduce((s, c) => s + margen(c.tipo, c.costoUsd).planUsd, 0);
  const costoUsdMes = clientes.reduce((s, c) => s + c.costoUsd, 0);

  const totales = {
    mrrClp: clientes.reduce((s, c) => s + c.planClp, 0),
    nClientes: clientes.filter((c) => c.tipo === "cliente").length,
    agentesActivos: clientes.filter((c) => c.conv7d > 0).length,
    convActivas7d: convs.filter((c) => en7(c.actualizado)).length,
    convTotales: convs.length,
    leadsTotales: leads.length,
    ganadosTotales: leads.filter((l) => l.etapa === "ganado").length,
    derivacionesPendientes: derivaciones.length,
    costoUsdMes,
    margenUsdMes: planUsdTotal - costoUsdMes,
    margenPct: planUsdTotal > 0 ? (planUsdTotal - costoUsdMes) / planUsdTotal : null,
  };

  return NextResponse.json({ totales, clientes });
}
