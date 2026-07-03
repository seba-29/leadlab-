import { NextRequest, NextResponse } from "next/server";
import { listCitas, listTenants, listConversaciones } from "@/lib/store";

export const dynamic = "force-dynamic";

// Lista las citas (agendadas por la IA) de un tenant, enriquecidas con el
// origen (canal + contacto de la conversación). El front las parte en
// próximas / pasadas.
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId") ?? undefined;
  const [citas, tenants, convs] = await Promise.all([
    listCitas(tenantId),
    listTenants(),
    listConversaciones(tenantId),
  ]);

  const tById = new Map(tenants.map((t) => [t.id, t]));
  const cById = new Map(convs.map((c) => [c.id, c]));

  const items = citas.map((cita) => {
    const t = tById.get(cita.tenantId);
    const conv = cita.conversacionId ? cById.get(cita.conversacionId) : undefined;
    return {
      id: cita.id,
      tenantId: cita.tenantId,
      tenantNombre: t?.nombre ?? "",
      tenantColor: t?.color ?? "#888",
      fechaHora: cita.fechaHora,
      contacto: cita.contacto ?? conv?.contactoNombre ?? "",
      conversacionId: cita.conversacionId ?? null,
      canal: conv?.canal ?? null,
      creado: cita.creado,
    };
  });

  return NextResponse.json({ citas: items });
}
