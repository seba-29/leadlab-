import { NextRequest, NextResponse } from "next/server";
import {
  listConversaciones,
  listTenants,
  ultimoMensaje,
  crearConversacion,
  setEstadoConversacion,
  agregarMensaje,
} from "@/lib/store";

export const dynamic = "force-dynamic";

// Alta manual de una conversación (contacto que entró por teléfono/presencial).
// Queda en estado "humano" (la maneja una persona, no el bot).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { tenantId, contactoNombre, contactoTelefono, canal, primerMensaje } = body ?? {};
  if (!tenantId || !contactoNombre?.trim()) {
    return NextResponse.json(
      { error: "El nombre del contacto y el cliente son obligatorios." },
      { status: 400 },
    );
  }
  const conv = await crearConversacion({
    tenantId,
    contactoNombre: contactoNombre.trim(),
    canal: canal === "playground" ? "playground" : "whatsapp",
    ...(contactoTelefono?.trim() ? { contactoTelefono: contactoTelefono.trim() } : {}),
  });
  await setEstadoConversacion(conv.id, "humano");
  if (primerMensaje?.trim()) {
    await agregarMensaje(conv.id, "cliente", primerMensaje.trim());
  }
  return NextResponse.json({ conversacion: conv });
}

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;
  const [convs, tenants] = await Promise.all([listConversaciones(tenantId), listTenants()]);

  const items = await Promise.all(
    convs.map(async (c) => {
      const last = await ultimoMensaje(c.id);
      const tenant = tenants.find((t) => t.id === c.tenantId);
      return {
        ...c,
        tenantNombre: tenant?.nombre ?? c.tenantId,
        tenantColor: tenant?.color ?? "#FF6B2C",
        ultimoMensaje: last?.texto ?? "",
        ultimoAutor: last?.autor ?? null,
      };
    }),
  );

  return NextResponse.json({ conversaciones: items });
}
