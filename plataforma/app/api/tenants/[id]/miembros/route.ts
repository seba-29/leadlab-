import { NextRequest, NextResponse } from "next/server";
import { listMiembros, crearMiembro, eliminarMiembro } from "@/lib/store";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const miembros = await listMiembros(id);
  return NextResponse.json({ miembros });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const nombre = String(body?.nombre ?? "").trim();
  const correo = String(body?.correo ?? "").trim().toLowerCase();
  const rol = ["admin", "ejecutivo", "marketing"].includes(body?.rol) ? body.rol : "ejecutivo";
  if (!nombre || !correo) {
    return NextResponse.json({ error: "Nombre y correo son obligatorios" }, { status: 400 });
  }
  if (!/.+@.+\..+/.test(correo)) {
    return NextResponse.json({ error: "Ese correo no se ve válido" }, { status: 400 });
  }
  try {
    const miembro = await crearMiembro({ tenantId: id, nombre, correo, rol });
    return NextResponse.json({ miembro }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ese correo ya está en el equipo" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  await params;
  const miembroId = new URL(req.url).searchParams.get("miembroId");
  if (!miembroId) return NextResponse.json({ error: "Falta miembroId" }, { status: 400 });
  await eliminarMiembro(miembroId);
  return NextResponse.json({ ok: true });
}
