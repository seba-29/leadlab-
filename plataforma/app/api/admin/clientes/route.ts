import { NextResponse } from "next/server";
import { listTenants, listConversaciones, listLeads, listUsos, listCitas } from "@/lib/store";
import { planClp, clpToUsd, margen } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tenants, convs, leads, usos, citas] = await Promise.all([
    listTenants(),
    listConversaciones(),
    listLeads(),
    listUsos(),
    listCitas(),
  ]);

  const clientes = tenants.map((t) => {
    const u = usos.filter((x) => x.tenantId === t.id);
    const tokensIn = u.reduce((s, x) => s + x.tokensIn + x.tokensInCacheRead + x.tokensInCacheWrite, 0);
    const tokensOut = u.reduce((s, x) => s + x.tokensOut, 0);
    const costoUsd = u.reduce((s, x) => s + x.costoUsd, 0);
    const lds = leads.filter((l) => l.tenantId === t.id);
    const m = margen(t.tipo, costoUsd);
    return {
      id: t.id,
      nombre: t.nombre,
      agente: t.agente,
      rubro: t.rubro,
      tipo: t.tipo,
      color: t.color,
      model: t.model,
      conversaciones: convs.filter((c) => c.tenantId === t.id).length,
      leads: lds.length,
      ganados: lds.filter((l) => l.etapa === "ganado").length,
      citas: citas.filter((c) => c.tenantId === t.id).length,
      llamadasIa: u.length,
      tokensIn,
      tokensOut,
      costoUsd,
      planClp: planClp(t.tipo),
      planUsd: m.planUsd,
      margenUsd: m.margenUsd,
      margenPct: m.margenPct,
    };
  });

  const planUsdTotal = clientes.reduce((s, c) => s + c.planUsd, 0);
  const costoUsdTotal = clientes.reduce((s, c) => s + c.costoUsd, 0);
  const totales = {
    clientes: clientes.filter((c) => c.tipo === "cliente").length,
    costoUsd: costoUsdTotal,
    llamadasIa: clientes.reduce((s, c) => s + c.llamadasIa, 0),
    mrrClp: clientes.reduce((s, c) => s + c.planClp, 0),
    margenUsd: planUsdTotal - costoUsdTotal,
    margenPct: planUsdTotal > 0 ? (planUsdTotal - costoUsdTotal) / planUsdTotal : null,
  };

  return NextResponse.json({ clientes, totales });
}
