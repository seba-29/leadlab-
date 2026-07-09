// ============================================================
// Lead Lab — Canales de origen del lead
// Deriva el canal (WhatsApp / Instagram / Facebook / Meta Ads /
// Referido / Web) desde el texto de `fuente`, con color de marca.
// Puro: importable client y server.
// ============================================================

export type Canal = { key: string; label: string; color: string };

const REGLAS: (Canal & { match: RegExp })[] = [
  { key: "instagram", label: "Instagram", color: "#E1306C", match: /insta/i },
  { key: "facebook", label: "Facebook", color: "#1877F2", match: /face|messenger/i },
  { key: "meta", label: "Meta Ads", color: "#8B5CF6", match: /meta|\bads\b|form|campa/i },
  { key: "referido", label: "Referido", color: "#FFC93F", match: /refer/i },
  { key: "web", label: "Web", color: "#5EEAD4", match: /web|sitio|landing/i },
  { key: "whatsapp", label: "WhatsApp", color: "#25D366", match: /whats/i },
];

// Catálogo para pickers (sin regex).
export const CANALES: Canal[] = REGLAS.map(({ key, label, color }) => ({ key, label, color }));

export function canalDe(fuente?: string): Canal {
  const f = fuente || "";
  return REGLAS.find((c) => c.match.test(f)) ?? { key: "otro", label: f || "Otro", color: "#9a938c" };
}
