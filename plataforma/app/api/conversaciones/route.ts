import { NextRequest, NextResponse } from "next/server";
import { listConversaciones, listTenants, ultimoMensaje } from "@/lib/store";

export const dynamic = "force-dynamic";

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
