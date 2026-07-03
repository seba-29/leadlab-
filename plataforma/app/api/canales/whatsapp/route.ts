// ============================================================
// Canal WhatsApp — webhook de Meta Cloud API (Fase 3)
// GET  → verificación del webhook (hub.challenge)
// POST → mensajes entrantes: valida firma, resuelve tenant,
//        guarda el mensaje, corre el agente (si corresponde)
//        y responde vía Graph API.
//
// Variables de entorno necesarias para activarlo:
//   WHATSAPP_VERIFY_TOKEN   token que tú inventas y pones en Meta al suscribir el webhook
//   META_APP_SECRET         app secret (para validar X-Hub-Signature-256)
//   WHATSAPP_TOKEN          token de acceso del número (Cloud API)
//   WHATSAPP_DEFAULT_TENANT id del tenant a usar si el número no calza (default: leadlab)
//   META_GRAPH_VERSION      opcional (default v23.0)
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { runAgent, type ChatMessage } from "@/lib/agent";
import {
  listTenants,
  listConversaciones,
  crearConversacion,
  agregarMensaje,
  listMensajes,
  getConversacion,
} from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GRAPH = () => process.env.META_GRAPH_VERSION || "v23.0";

// --- GET: verificación del webhook (lo llama Meta una vez al suscribir) ---
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// --- POST: mensajes entrantes ---
export async function POST(req: NextRequest) {
  const raw = await req.text();

  // Firma: en producción Meta manda X-Hub-Signature-256 = sha256 HMAC del body
  const secret = process.env.META_APP_SECRET;
  if (secret) {
    const firma = req.headers.get("x-hub-signature-256") ?? "";
    const esperada =
      "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
    const a = Buffer.from(firma);
    const b = Buffer.from(esperada);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return new Response("Bad signature", { status: 401 });
    }
  }

  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  // Estructura Cloud API: entry[].changes[].value.{metadata, contacts, messages}
  try {
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        const value = change?.value;
        if (!value?.messages) continue; // statuses (entregado/leído) se ignoran por ahora
        const phoneNumberId: string = value?.metadata?.phone_number_id ?? "";
        for (const msg of value.messages) {
          if (msg?.type !== "text") continue; // v1: solo texto
          await procesarEntrante({
            phoneNumberId,
            waId: msg.from,
            nombre: value?.contacts?.[0]?.profile?.name ?? msg.from,
            texto: msg.text?.body ?? "",
            metaMsgId: msg.id,
          });
        }
      }
    }
  } catch (e) {
    console.error("[whatsapp webhook]", e);
  }

  // Meta exige 200 rápido siempre (si no, reintenta)
  return NextResponse.json({ ok: true });
}

// --- lógica de entrada ---

const vistos = new Set<string>(); // dedupe simple de message_id (Meta reintenta webhooks)

async function procesarEntrante(input: {
  phoneNumberId: string;
  waId: string;
  nombre: string;
  texto: string;
  metaMsgId: string;
}) {
  if (!input.texto) return;
  if (input.metaMsgId) {
    if (vistos.has(input.metaMsgId)) return;
    vistos.add(input.metaMsgId);
    if (vistos.size > 5000) vistos.clear();
  }

  // Resolver tenant: por phone_number_id registrado, o el default
  const tenants = await listTenants();
  const tenant =
    tenants.find((t: any) => (t as any).phoneNumberId === input.phoneNumberId) ??
    tenants.find((t) => t.id === (process.env.WHATSAPP_DEFAULT_TENANT || "leadlab")) ??
    tenants[0];
  if (!tenant) return;

  // Buscar conversación abierta de este contacto o crearla
  const convs = await listConversaciones(tenant.id);
  let conv = convs.find((c) => c.contactoTelefono === input.waId && c.estado !== "cerrada");
  if (!conv) {
    conv = await crearConversacion({
      tenantId: tenant.id,
      contactoNombre: input.nombre,
      contactoTelefono: input.waId,
      canal: "whatsapp",
    });
  }

  await agregarMensaje(conv.id, "cliente", input.texto);

  // Debounce: la gente escribe en ráfagas de mensajes cortos.
  // Esperamos unos segundos de silencio antes de invocar al agente.
  programarRespuesta(conv.id, input.phoneNumberId, input.waId);
}

const pendientes = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_MS = 6000;

function programarRespuesta(convId: string, phoneNumberId: string, waId: string) {
  const prev = pendientes.get(convId);
  if (prev) clearTimeout(prev);
  pendientes.set(
    convId,
    setTimeout(() => {
      pendientes.delete(convId);
      responder(convId, phoneNumberId, waId).catch((e) => console.error("[agente]", e));
    }, DEBOUNCE_MS),
  );
}

async function responder(convId: string, phoneNumberId: string, waId: string) {
  const conv = await getConversacion(convId);
  if (!conv || conv.estado !== "bot") return; // pausado por humano → no responde
  if (!process.env.ANTHROPIC_API_KEY) return; // sin key: solo registramos (visible en Inbox)

  const tenants = await listTenants();
  const tenant = tenants.find((t) => t.id === conv.tenantId);
  if (!tenant) return;

  const mensajes = await listMensajes(convId);
  const history: ChatMessage[] = mensajes
    .filter((m) => m.texto)
    .map((m) => ({
      role: m.autor === "cliente" ? ("user" as const) : ("assistant" as const),
      content: m.texto,
    }));
  // La API exige que el primer turno sea del usuario
  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") return;

  const result = await runAgent(tenant, history, convId);
  if (!result.reply) return;

  await agregarMensaje(convId, "bot", result.reply);
  await enviarWhatsApp(phoneNumberId, waId, result.reply);
}

async function enviarWhatsApp(phoneNumberId: string, to: string, texto: string) {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) return; // modo simulación: el mensaje queda en el Inbox igual
  const res = await fetch(`https://graph.facebook.com/${GRAPH()}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!res.ok) console.error("[whatsapp send]", res.status, await res.text());
}
