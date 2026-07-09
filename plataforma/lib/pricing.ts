// ============================================================
// Lead Lab — Precios, planes y tipo de cambio (fuente única)
// Centraliza USD_CLP, el catálogo de planes y el markup de tokens
// para que el MRR, el margen y lo comercial den lo mismo en toda la app.
// Puro (sin imports de servidor): importable client y server.
// ============================================================

// Tipo de cambio de referencia CLP→USD (editable; a futuro, API de cambio).
export const USD_CLP = 950;

export type PlanKey = "agente" | "crm" | "pro";

export type Plan = {
  key: PlanKey;
  nombre: string;
  corto: string;
  clp: number;
  color: string;
  incluye: string;
};

// Catálogo de los 3 planes reales que se venden.
export const PLANES: Plan[] = [
  { key: "agente", nombre: "Plan Agente", corto: "Agente", clp: 149000, color: "#5EEAD4", incluye: "Agente IA 24/7 en WhatsApp" },
  { key: "crm", nombre: "Plan Agente + CRM", corto: "Agente + CRM", clp: 249000, color: "#FF6B2C", incluye: "+ Instagram/Facebook + consola" },
  { key: "pro", nombre: "Plan Pro", corto: "Pro", clp: 390000, color: "#FFC93F", incluye: "+ integraciones y multi-sucursal" },
];

// Compat: precio "cliente" por defecto = plan CRM (el más elegido).
export const PLAN_CLP: Record<string, number> = { interno: 0, cliente: 249000 };

// Markup por defecto sobre el costo de tokens que se recarga al cliente.
export const MARKUP_TOKENS_DEFAULT = 0.35;

export function planDe(key?: string): Plan | undefined {
  return PLANES.find((p) => p.key === key);
}

/** Precio mensual (CLP) de un tenant según su plan; interno = 0. */
export function planClpDe(t: { tipo: string; plan?: string }): number {
  if (t.tipo === "interno") return 0;
  const p = planDe(t.plan);
  return p ? p.clp : PLAN_CLP.cliente;
}

export function planClp(tipo: string): number {
  return PLAN_CLP[tipo] ?? 0;
}

export function clpToUsd(clp: number): number {
  return clp / USD_CLP;
}

export function usdToClp(usd: number): number {
  return usd * USD_CLP;
}

/** Margen mensual de un cliente: lo que cobras (USD) − lo que gastas en IA. */
export function margen(tipo: string, costoUsd: number) {
  const planUsd = clpToUsd(planClp(tipo));
  const margenUsd = planUsd - costoUsd;
  const margenPct = planUsd > 0 ? margenUsd / planUsd : null;
  return { planUsd, margenUsd, margenPct };
}
