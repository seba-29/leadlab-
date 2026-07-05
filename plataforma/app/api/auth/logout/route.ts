import { NextResponse } from "next/server";
import { clienteRuta, AUTH_HABILITADA } from "@/lib/supabaseAuth";

export const dynamic = "force-dynamic";

export async function POST() {
  if (AUTH_HABILITADA) {
    const sb = await clienteRuta();
    await sb.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
