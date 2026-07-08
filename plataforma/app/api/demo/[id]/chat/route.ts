import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, tools, DEFAULT_MODEL, type ChatMessage } from "@/lib/agent";
import { getDemo } from "@/lib/demos";
import type { Tenant } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Chat PÚBLICO de un agente demo (sin auth). Corre el agente en memoria:
// nunca escribe leads/citas reales al store; solo devuelve la respuesta y
// los "eventos" para mostrar que capturó/agendó. Solo sirve agentes demo.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const demo = getDemo(id);
  if (!demo) {
    return NextResponse.json({ error: "Demo no encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const entrantes: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  // Guarda simple contra abuso: acotamos historial y largo de cada mensaje.
  const history: ChatMessage[] = entrantes
    .slice(-24)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

  const tenant = { ...demo, tipo: "cliente", model: DEFAULT_MODEL } as unknown as Tenant;

  const events: string[] = [];
  const leads: { nombre: string; interes?: string; etapa: string }[] = [];

  // Ejecutor en memoria: no toca el store (los agentes demo no existen ahí).
  function ejecutar(name: string, input: Record<string, unknown>): string {
    if (name === "capturar_lead") {
      const nombre = String(input?.nombre ?? "Interesado");
      const interes = input?.interes ? String(input.interes) : undefined;
      leads.push({ nombre, interes, etapa: "nuevo" });
      events.push(`🎯 Lead capturado: ${nombre}${interes ? " — " + interes : ""}`);
      return "Lead registrado en el CRM.";
    }
    if (name === "agendar") {
      const fh = String(input?.fecha_hora ?? "");
      events.push(`📅 Visita agendada: ${fh}`);
      return "Visita agendada. Se enviará confirmación.";
    }
    if (name === "derivar_a_humano") {
      const motivo = String(input?.motivo ?? "");
      events.push(`🙋 Derivado a una persona: ${motivo}`);
      return "Conversación derivada al equipo. Avísale al cliente con calidez que ya le escriben.";
    }
    return "Ok.";
  }

  try {
    const client = new Anthropic();
    const messages: Anthropic.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    let reply = "";

    for (let i = 0; i < 6; i++) {
      const res = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: [
          { type: "text", text: buildSystemPrompt(tenant), cache_control: { type: "ephemeral" } },
        ],
        tools,
        messages,
      });

      const textParts: string[] = [];
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of res.content) {
        if (block.type === "text") {
          textParts.push(block.text);
        } else if (block.type === "tool_use") {
          const out = ejecutar(block.name, (block.input ?? {}) as Record<string, unknown>);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: out });
        }
      }
      if (textParts.length) reply = textParts.join("\n").trim();
      if (res.stop_reason !== "tool_use") break;

      messages.push({ role: "assistant", content: res.content as Anthropic.MessageParam["content"] });
      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({ reply, events, leads });
  } catch {
    return NextResponse.json({ error: "No pudimos responder en este momento." }, { status: 500 });
  }
}
