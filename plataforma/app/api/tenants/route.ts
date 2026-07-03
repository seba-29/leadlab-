import { NextRequest, NextResponse } from "next/server";
import { listTenants, crearTenant } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nombre = String(body?.nombre ?? "").trim();
  const agente = String(body?.agente ?? "").trim();
  const rubro = String(body?.rubro ?? "").trim();
  if (!nombre || !agente || !rubro) {
    return NextResponse.json({ error: "Faltan nombre, agente o rubro" }, { status: 400 });
  }
  const tenant = await crearTenant({
    nombre,
    agente,
    rubro,
    color: String(body?.color ?? "#5EEAD4"),
    descripcion: body?.descripcion ? String(body.descripcion) : undefined,
    horario: body?.horario ? String(body.horario) : undefined,
    tono: body?.tono ? String(body.tono) : undefined,
  });
  return NextResponse.json({ tenant }, { status: 201 });
}
