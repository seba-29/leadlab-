import { NextRequest, NextResponse } from "next/server";
import { guardarLogo, quitarLogo } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const dataUrl = String(body?.dataUrl ?? "");
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "Falta una imagen válida" }, { status: 400 });
  }
  if (dataUrl.length > 900_000) {
    return NextResponse.json({ error: "El logo es muy pesado (máx ~600 KB)" }, { status: 413 });
  }
  const logoUrl = await guardarLogo(id, dataUrl);
  if (!logoUrl) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
  return NextResponse.json({ logoUrl });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await quitarLogo(id);
  return NextResponse.json({ ok: true });
}
