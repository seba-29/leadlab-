// ============================================================
// Lead Lab — Store SUPABASE (Postgres) — modo producción
// Usa la service role key SOLO en el servidor (API routes).
// Siembra los datos demo la primera vez que encuentra la BD vacía.
// ============================================================
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  Tenant,
  Conversacion,
  Mensaje,
  Lead,
  Cita,
  Derivacion,
  UsoEvento,
  Cerebro,
  Etapa,
} from "./types";
import { datosSeed } from "./storeLocal";

let client: SupabaseClient | null = null;
let seeded: Promise<void> | null = null;

function sb(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
  }
  return client;
}

function lanzar(ctx: string, error: { message: string } | null): void {
  if (error) throw new Error(`[supabase:${ctx}] ${error.message}`);
}

async function ensureSeed(): Promise<void> {
  if (!seeded) {
    seeded = (async () => {
      const { count, error } = await sb()
        .from("tenants")
        .select("id", { count: "exact", head: true });
      lanzar("seed-check", error);
      if ((count ?? 0) > 0) return;
      const d = datosSeed();
      lanzar("seed-tenants", (await sb().from("tenants").insert(d.tenants.map(tenantARow))).error);
      lanzar(
        "seed-convs",
        (await sb().from("conversaciones").insert(d.conversaciones.map(convARow))).error,
      );
      lanzar("seed-msgs", (await sb().from("mensajes").insert(d.mensajes.map(msgARow))).error);
      lanzar("seed-leads", (await sb().from("leads").insert(d.leads.map(leadARow))).error);
      lanzar("seed-citas", (await sb().from("citas").insert(d.citas.map(citaARow))).error);
      lanzar(
        "seed-der",
        (await sb().from("derivaciones").insert(d.derivaciones.map(derARow))).error,
      );
    })().catch((e) => {
      seeded = null; // permitir reintento
      throw e;
    });
  }
  return seeded;
}

function ahora(): string {
  return new Date().toISOString();
}

function id(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- mapeos fila ↔ objeto ----------

const tenantARow = (t: Tenant) => ({
  id: t.id,
  nombre: t.nombre,
  agente: t.agente,
  rubro: t.rubro,
  tipo: t.tipo,
  color: t.color,
  model: t.model,
  cerebro: t.cerebro,
  prompt_override: t.promptOverride ?? null,
});
const rowATenant = (r: any): Tenant => ({
  id: r.id,
  nombre: r.nombre,
  agente: r.agente,
  rubro: r.rubro,
  tipo: r.tipo,
  color: r.color,
  model: r.model,
  cerebro: r.cerebro as Cerebro,
  promptOverride: r.prompt_override ?? undefined,
});

const convARow = (c: Conversacion) => ({
  id: c.id,
  tenant_id: c.tenantId,
  contacto_nombre: c.contactoNombre,
  contacto_telefono: c.contactoTelefono ?? null,
  canal: c.canal,
  estado: c.estado,
  creado: c.creado,
  actualizado: c.actualizado,
});
const rowAConv = (r: any): Conversacion => ({
  id: r.id,
  tenantId: r.tenant_id,
  contactoNombre: r.contacto_nombre,
  contactoTelefono: r.contacto_telefono ?? undefined,
  canal: r.canal,
  estado: r.estado,
  creado: r.creado,
  actualizado: r.actualizado,
});

const msgARow = (m: Mensaje) => ({
  id: m.id,
  conversacion_id: m.conversacionId,
  autor: m.autor,
  texto: m.texto,
  creado: m.creado,
});
const rowAMsg = (r: any): Mensaje => ({
  id: r.id,
  conversacionId: r.conversacion_id,
  autor: r.autor,
  texto: r.texto,
  creado: r.creado,
});

const leadARow = (l: Lead) => ({
  id: l.id,
  tenant_id: l.tenantId,
  conversacion_id: l.conversacionId ?? null,
  nombre: l.nombre,
  negocio: l.negocio ?? null,
  telefono: l.telefono ?? null,
  interes: l.interes ?? null,
  etapa: l.etapa,
  valor_estimado: l.valorEstimado ?? null,
  notas: l.notas ?? null,
  fuente: l.fuente,
  creado: l.creado,
  actualizado: l.actualizado,
});
const rowALead = (r: any): Lead => ({
  id: r.id,
  tenantId: r.tenant_id,
  conversacionId: r.conversacion_id ?? undefined,
  nombre: r.nombre,
  negocio: r.negocio ?? undefined,
  telefono: r.telefono ?? undefined,
  interes: r.interes ?? undefined,
  etapa: r.etapa,
  valorEstimado: r.valor_estimado != null ? Number(r.valor_estimado) : undefined,
  notas: r.notas ?? undefined,
  fuente: r.fuente,
  creado: r.creado,
  actualizado: r.actualizado,
});

const citaARow = (c: Cita) => ({
  id: c.id,
  tenant_id: c.tenantId,
  conversacion_id: c.conversacionId ?? null,
  fecha_hora: c.fechaHora,
  contacto: c.contacto ?? null,
  creado: c.creado,
});
const rowACita = (r: any): Cita => ({
  id: r.id,
  tenantId: r.tenant_id,
  conversacionId: r.conversacion_id ?? undefined,
  fechaHora: r.fecha_hora,
  contacto: r.contacto ?? undefined,
  creado: r.creado,
});

const derARow = (d: Derivacion) => ({
  id: d.id,
  tenant_id: d.tenantId,
  conversacion_id: d.conversacionId ?? null,
  motivo: d.motivo,
  resumen: d.resumen ?? null,
  creado: d.creado,
});
const rowADer = (r: any): Derivacion => ({
  id: r.id,
  tenantId: r.tenant_id,
  conversacionId: r.conversacion_id ?? undefined,
  motivo: r.motivo,
  resumen: r.resumen ?? undefined,
  creado: r.creado,
});

const rowAUso = (r: any): UsoEvento => ({
  id: r.id,
  tenantId: r.tenant_id,
  model: r.model,
  tokensIn: Number(r.tokens_in),
  tokensInCacheRead: Number(r.tokens_in_cache_read),
  tokensInCacheWrite: Number(r.tokens_in_cache_write),
  tokensOut: Number(r.tokens_out),
  costoUsd: Number(r.costo_usd),
  creado: r.creado,
});

// ---------- API (mismas firmas que storeLocal) ----------

export async function listTenants(): Promise<Tenant[]> {
  await ensureSeed();
  const { data, error } = await sb().from("tenants").select("*").order("creado");
  lanzar("listTenants", error);
  return (data ?? []).map(rowATenant);
}

export async function getTenant(tid: string): Promise<Tenant | undefined> {
  await ensureSeed();
  const { data, error } = await sb().from("tenants").select("*").eq("id", tid).maybeSingle();
  lanzar("getTenant", error);
  return data ? rowATenant(data) : undefined;
}

export async function crearTenant(input: {
  nombre: string;
  agente: string;
  rubro: string;
  color: string;
  descripcion?: string;
  horario?: string;
  tono?: string;
}): Promise<Tenant> {
  await ensureSeed();
  const base = input.nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const { data: existentes } = await sb().from("tenants").select("id").like("id", `${base}%`);
  const ids = new Set((existentes ?? []).map((r: any) => r.id));
  let slug = base || "agente";
  let n = 2;
  while (ids.has(slug)) slug = `${base}-${n++}`;

  const t: Tenant = {
    id: slug,
    nombre: input.nombre,
    agente: input.agente,
    rubro: input.rubro,
    tipo: "cliente",
    color: input.color || "#5EEAD4",
    model: "claude-opus-4-8",
    cerebro: {
      descripcion: input.descripcion || `${input.nombre} es un negocio del rubro ${input.rubro}.`,
      tono: input.tono || "Cálido, cercano y profesional. Mensajes cortos estilo WhatsApp.",
      horario: input.horario || "Lunes a viernes 9:00–19:00",
      servicios: [],
      faq: [],
      reglas:
        "Nunca inventar precios ni disponibilidad. Ante dudas complejas o reclamos, derivar a un humano.",
    },
  };
  lanzar("crearTenant", (await sb().from("tenants").insert(tenantARow(t))).error);
  return t;
}

export async function updateCerebro(tid: string, cerebro: Cerebro): Promise<Tenant | undefined> {
  await ensureSeed();
  const { data, error } = await sb()
    .from("tenants")
    .update({ cerebro })
    .eq("id", tid)
    .select()
    .maybeSingle();
  lanzar("updateCerebro", error);
  return data ? rowATenant(data) : undefined;
}

/** Actualiza datos top-level del negocio (no cerebro, no tipo/plan/id). */
export async function updateTenant(
  tid: string,
  patch: { nombre?: string; rubro?: string; agente?: string; color?: string },
): Promise<Tenant | undefined> {
  await ensureSeed();
  const row: Record<string, unknown> = {};
  if (patch.nombre !== undefined) row.nombre = patch.nombre;
  if (patch.rubro !== undefined) row.rubro = patch.rubro;
  if (patch.agente !== undefined) row.agente = patch.agente;
  if (patch.color !== undefined) row.color = patch.color;
  if (Object.keys(row).length === 0) return getTenant(tid);
  const { data, error } = await sb()
    .from("tenants")
    .update(row)
    .eq("id", tid)
    .select()
    .maybeSingle();
  lanzar("updateTenant", error);
  return data ? rowATenant(data) : undefined;
}

export async function listConversaciones(tenantId?: string): Promise<Conversacion[]> {
  await ensureSeed();
  let q = sb().from("conversaciones").select("*").order("actualizado", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  lanzar("listConversaciones", error);
  return (data ?? []).map(rowAConv);
}

export async function getConversacion(cid: string): Promise<Conversacion | undefined> {
  const { data, error } = await sb().from("conversaciones").select("*").eq("id", cid).maybeSingle();
  lanzar("getConversacion", error);
  return data ? rowAConv(data) : undefined;
}

export async function crearConversacion(
  input: Pick<Conversacion, "tenantId" | "contactoNombre" | "canal"> &
    Partial<Pick<Conversacion, "contactoTelefono">>,
): Promise<Conversacion> {
  await ensureSeed();
  const c: Conversacion = {
    id: id("conv"),
    estado: "bot",
    creado: ahora(),
    actualizado: ahora(),
    ...input,
  };
  lanzar("crearConversacion", (await sb().from("conversaciones").insert(convARow(c))).error);
  return c;
}

export async function setEstadoConversacion(
  cid: string,
  estado: Conversacion["estado"],
): Promise<Conversacion | undefined> {
  const { data, error } = await sb()
    .from("conversaciones")
    .update({ estado, actualizado: ahora() })
    .eq("id", cid)
    .select()
    .maybeSingle();
  lanzar("setEstadoConversacion", error);
  return data ? rowAConv(data) : undefined;
}

export async function listMensajes(cid: string): Promise<Mensaje[]> {
  const { data, error } = await sb()
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", cid)
    .order("creado");
  lanzar("listMensajes", error);
  return (data ?? []).map(rowAMsg);
}

export async function ultimoMensaje(cid: string): Promise<Mensaje | undefined> {
  const { data, error } = await sb()
    .from("mensajes")
    .select("*")
    .eq("conversacion_id", cid)
    .order("creado", { ascending: false })
    .limit(1);
  lanzar("ultimoMensaje", error);
  return data?.[0] ? rowAMsg(data[0]) : undefined;
}

export async function agregarMensaje(
  cid: string,
  autor: Mensaje["autor"],
  texto: string,
): Promise<Mensaje> {
  const m: Mensaje = { id: id("msg"), conversacionId: cid, autor, texto, creado: ahora() };
  lanzar("agregarMensaje", (await sb().from("mensajes").insert(msgARow(m))).error);
  await sb().from("conversaciones").update({ actualizado: m.creado }).eq("id", cid);
  return m;
}

export async function listLeads(tenantId?: string): Promise<Lead[]> {
  await ensureSeed();
  let q = sb().from("leads").select("*").order("actualizado", { ascending: false });
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  lanzar("listLeads", error);
  return (data ?? []).map(rowALead);
}

export async function crearLead(
  input: Omit<Lead, "id" | "creado" | "actualizado" | "etapa"> & { etapa?: Etapa },
): Promise<Lead> {
  await ensureSeed();
  const l: Lead = {
    id: id("lead"),
    etapa: input.etapa ?? "nuevo",
    creado: ahora(),
    actualizado: ahora(),
    ...input,
  };
  lanzar("crearLead", (await sb().from("leads").insert(leadARow(l))).error);
  return l;
}

export async function moverLead(lid: string, etapa: Etapa): Promise<Lead | undefined> {
  const { data, error } = await sb()
    .from("leads")
    .update({ etapa, actualizado: ahora() })
    .eq("id", lid)
    .select()
    .maybeSingle();
  lanzar("moverLead", error);
  return data ? rowALead(data) : undefined;
}

export async function actualizarLead(
  lid: string,
  patch: Partial<
    Pick<Lead, "nombre" | "negocio" | "telefono" | "interes" | "etapa" | "valorEstimado" | "notas">
  >,
): Promise<Lead | undefined> {
  const row: Record<string, unknown> = { actualizado: ahora() };
  if (patch.nombre !== undefined) row.nombre = patch.nombre;
  if (patch.negocio !== undefined) row.negocio = patch.negocio;
  if (patch.telefono !== undefined) row.telefono = patch.telefono;
  if (patch.interes !== undefined) row.interes = patch.interes;
  if (patch.etapa !== undefined) row.etapa = patch.etapa;
  if (patch.valorEstimado !== undefined) row.valor_estimado = patch.valorEstimado;
  if (patch.notas !== undefined) row.notas = patch.notas;
  const { data, error } = await sb().from("leads").update(row).eq("id", lid).select().maybeSingle();
  lanzar("actualizarLead", error);
  return data ? rowALead(data) : undefined;
}

export async function crearCita(input: Omit<Cita, "id" | "creado">): Promise<Cita> {
  const c: Cita = { id: id("cita"), creado: ahora(), ...input };
  lanzar("crearCita", (await sb().from("citas").insert(citaARow(c))).error);
  return c;
}

export async function listCitas(tenantId?: string): Promise<Cita[]> {
  await ensureSeed();
  let q = sb().from("citas").select("*");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  lanzar("listCitas", error);
  return (data ?? []).map(rowACita);
}

export async function crearDerivacion(input: Omit<Derivacion, "id" | "creado">): Promise<Derivacion> {
  const d: Derivacion = { id: id("der"), creado: ahora(), ...input };
  lanzar("crearDerivacion", (await sb().from("derivaciones").insert(derARow(d))).error);
  return d;
}

export async function listDerivaciones(tenantId?: string): Promise<Derivacion[]> {
  await ensureSeed();
  let q = sb().from("derivaciones").select("*");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  lanzar("listDerivaciones", error);
  return (data ?? []).map(rowADer);
}

export async function registrarUso(input: Omit<UsoEvento, "id" | "creado">): Promise<void> {
  const { error } = await sb().from("usage_events").insert({
    id: id("uso"),
    tenant_id: input.tenantId,
    model: input.model,
    tokens_in: input.tokensIn,
    tokens_in_cache_read: input.tokensInCacheRead,
    tokens_in_cache_write: input.tokensInCacheWrite,
    tokens_out: input.tokensOut,
    costo_usd: input.costoUsd,
    creado: ahora(),
  });
  lanzar("registrarUso", error);
}

export async function listUsos(tenantId?: string): Promise<UsoEvento[]> {
  let q = sb().from("usage_events").select("*");
  if (tenantId) q = q.eq("tenant_id", tenantId);
  const { data, error } = await q;
  lanzar("listUsos", error);
  return (data ?? []).map(rowAUso);
}
