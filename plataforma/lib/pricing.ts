// ============================================================
// Lead Lab — Precios y tipo de cambio (fuente única)
// Centraliza USD_CLP y el plan por tipo para que el margen dé
// lo mismo en /clientes, /global y Configuración.
// Puro (sin imports de servidor): importable client y server.
// ============================================================

// Tipo de cambio de referencia CLP→USD (editable; a futuro, API de cambio).
export const USD_CLP = 950;

// Precio de lista mensual por plan (CLP).
export const PLAN_CLP: Record<string, number> = { interno: 0, cliente: 249000 };

export function planClp(tipo: string): number {
  return PLAN_CLP[tipo] ?? 0;
}

export function clpToUsd(clp: number): number {
  return clp / USD_CLP;
}

/** Margen mensual de un cliente: lo que cobras (USD) − lo que gastas en IA. */
export function margen(tipo: string, costoUsd: number) {
  const planUsd = clpToUsd(planClp(tipo));
  const margenUsd = planUsd - costoUsd;
  const margenPct = planUsd > 0 ? margenUsd / planUsd : null;
  return { planUsd, margenUsd, margenPct };
}
