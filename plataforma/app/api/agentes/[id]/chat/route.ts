import { NextRequest, NextResponse } from "next/server";
import { runAgent, type ChatMessage } from "@/lib/agent";
import { getTenant, crearConversacion, agregarMensaje, listLeads } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta ANTHROPIC_API_KEY. Copia .env.example a .env.local y agrega tu API key de Anthropic.",
      },
      { status: 500 },
    );
  }

  const { id } = await params;
  const tenant = await getTenant(id);
  if (!tenant) return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    let conversacionId: string | undefined = body?.conversacionId;

    // Primera interacción del test → creamos la conversación (aparece en el Inbox)
    if (!conversacionId) {
      const conv = await crearConversacion({
        tenantId: tenant.id,
        contactoNombre: "Prueba interna",
        canal: "playground",
      });
      conversacionId = conv.id;
    }

    const lastUser = messages[messages.length - 1];
    if (lastUser?.role === "user") {
      await agregarMensaje(conversacionId, "cliente", lastUser.content);
    }

    const result = await runAgent(tenant, messages, conversacionId);
    if (result.reply) await agregarMensaje(conversacionId, "bot", result.reply);

    const leads = await listLeads(tenant.id);
    return NextResponse.json({ ...result, conversacionId, leads });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado en el agente." },
      { status: 500 },
    );
  }
}
