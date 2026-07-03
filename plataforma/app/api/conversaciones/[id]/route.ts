import { NextRequest, NextResponse } from "next/server";
import {
  getConversacion,
  listMensajes,
  setEstadoConversacion,
  agregarMensaje,
  getTenant,
} from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversacion(id);
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  const [mensajes, tenant] = await Promise.all([listMensajes(id), getTenant(conv.tenantId)]);
  return NextResponse.json({ conversacion: conv, mensajes, tenant });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversacion(id);
  if (!conv) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

  const body = await req.json();
  const accion: string = body?.accion;

  if (accion === "tomar") {
    // Un humano toma la conversación → el bot se pausa
    await setEstadoConversacion(id, "humano");
  } else if (accion === "soltar") {
    // Se devuelve al agente
    await setEstadoConversacion(id, "bot");
  } else if (accion === "responder") {
    const texto = String(body?.texto ?? "").trim();
    if (!texto) return NextResponse.json({ error: "Falta texto" }, { status: 400 });
    // Responder manualmente pausa el bot en esta conversación (regla de producto)
    await agregarMensaje(id, "humano", texto);
    await setEstadoConversacion(id, "humano");
  } else {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  const [conversacion, mensajes] = await Promise.all([getConversacion(id), listMensajes(id)]);
  return NextResponse.json({ conversacion, mensajes });
}
