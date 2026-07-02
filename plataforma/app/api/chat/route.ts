import { NextRequest, NextResponse } from "next/server";
import { runLia, type ChatMessage } from "@/lib/agent";
import { getLeads } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "Falta ANTHROPIC_API_KEY en el entorno. Copia .env.example a .env.local y agrega tu API key de Anthropic.",
      },
      { status: 500 },
    );
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const result = await runLia(messages);
    return NextResponse.json({ ...result, leads: getLeads() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Error inesperado en el agente." },
      { status: 500 },
    );
  }
}
