import { NextRequest, NextResponse } from "next/server";
import { listTenants, crearTenant, updateCerebro } from "@/lib/store";
import { getPlantilla } from "@/lib/plantillas";

export const dynamic = "force-dynamic";

export async function GET() {
  const tenants = await listTenants();
  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const plantilla = body?.plantillaId ? getPlantilla(String(body.plantillaId)) : undefined;

  const nombre = String(body?.nombre ?? "").trim();
  const agente = String(body?.agente ?? plantilla?.agenteSugerido ?? "").trim();
  const rubro = String(body?.rubro ?? plantilla?.rubro ?? "").trim();
  if (!nombre || !agente || !rubro) {
    return NextResponse.json({ error: "Faltan nombre, agente o rubro" }, { status: 400 });
  }

  const tenant = await crearTenant({
    nombre,
    agente,
    rubro,
    color: String(body?.color ?? "#5EEAD4"),
    descripcion: body?.descripcion ? String(body.descripcion) : plantilla?.cerebro.descripcion,
    horario: body?.horario ? String(body.horario) : plantilla?.cerebro.horario,
    tono: body?.tono ? String(body.tono) : plantilla?.cerebro.tono,
  });

  // Con plantilla: sembrar el cerebro completo (servicios/faq/reglas del rubro)
  if (plantilla) {
    const cerebro = {
      ...plantilla.cerebro,
      descripcion: tenant.cerebro.descripcion,
      tono: tenant.cerebro.tono,
      horario: tenant.cerebro.horario,
    };
    const actualizado = await updateCerebro(tenant.id, cerebro);
    return NextResponse.json({ tenant: actualizado ?? tenant }, { status: 201 });
  }

  return NextResponse.json({ tenant }, { status: 201 });
}
