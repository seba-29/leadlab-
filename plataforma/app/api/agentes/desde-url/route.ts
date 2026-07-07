import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = process.env.AGENT_MODEL || "claude-opus-4-8";

// Convierte el HTML del sitio en texto plano acotado para pasárselo al modelo.
function limpiarHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16000);
}

const FICHA_TOOL: Anthropic.Tool = {
  name: "entregar_ficha",
  description: "Entrega la ficha estructurada del negocio para configurar su agente de IA.",
  input_schema: {
    type: "object",
    properties: {
      nombre: { type: "string", description: "Nombre del negocio" },
      agente: {
        type: "string",
        description: "Nombre propio femenino sugerido para la asistente (ej. Sofía, Valentina, Camila)",
      },
      rubro: { type: "string", description: "Rubro del negocio (ej. Clínica estética)" },
      descripcion: { type: "string", description: "Descripción breve del negocio, 1-2 frases" },
      horario: { type: "string", description: "Horario de atención si aparece; si no, vacío" },
      tono: { type: "string", description: "Tono sugerido para la asistente, en español neutro" },
      servicios: {
        type: "array",
        description: "Servicios con su precio. Si no hay precio, usa 'Consultar'.",
        items: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            precio: { type: "string" },
            detalle: { type: "string" },
          },
          required: ["nombre", "precio"],
        },
      },
      faq: {
        type: "array",
        description: "Preguntas frecuentes inferidas del sitio.",
        items: {
          type: "object",
          properties: { pregunta: { type: "string" }, respuesta: { type: "string" } },
          required: ["pregunta", "respuesta"],
        },
      },
      reglas: { type: "string", description: "Reglas del negocio inferidas, si aplican" },
    },
    required: ["nombre", "rubro", "descripcion", "servicios"],
  },
};

async function traerSitio(target: string): Promise<string> {
  const r = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadLabBot/1.0; +https://leadlab.cl)" },
    redirect: "follow",
  });
  if (!r.ok) throw new Error(String(r.status));
  return limpiarHtml(await r.text());
}

// Arma la ficha del negocio (para pre-llenar el cerebro) a partir de su sitio web.
// Solo lo usa el admin desde "Nuevo agente".
export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Falta la dirección del sitio." }, { status: 400 });
  }
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) target = "https://" + target;

  let texto = "";
  try {
    texto = await traerSitio(target);
  } catch {
    return NextResponse.json(
      { error: "No pudimos abrir ese sitio. Revisa la dirección o llena la ficha a mano." },
      { status: 502 },
    );
  }
  if (texto.length < 80) {
    return NextResponse.json(
      { error: "El sitio no entregó texto suficiente. Prueba con otra dirección." },
      { status: 422 },
    );
  }

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      tool_choice: { type: "tool", name: "entregar_ficha" },
      tools: [FICHA_TOOL],
      messages: [
        {
          role: "user",
          content: `Extrae la ficha de este negocio a partir del texto de su sitio web, para configurar una asistente de IA que atienda WhatsApp. Usa SOLO lo que aparezca en el texto; no inventes precios ni datos. Si no hay precios, deja el servicio con precio "Consultar". Responde en español neutro.\n\n--- TEXTO DEL SITIO (${target}) ---\n${texto}`,
        },
      ],
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "No pudimos estructurar la ficha del sitio." }, { status: 502 });
    }
    return NextResponse.json({ ficha: toolUse.input });
  } catch {
    return NextResponse.json({ error: "Error al analizar el sitio con la IA." }, { status: 500 });
  }
}
