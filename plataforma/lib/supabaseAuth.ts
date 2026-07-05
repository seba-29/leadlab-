// ============================================================
// Lead Lab — Supabase Auth (login real: clave + código 2FA al correo)
// Todo server-side: la anon key no se expone al browser y las
// cookies de sesión son HttpOnly.
// ============================================================
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.SUPABASE_URL ?? "";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// La auth real se activa solo si hay URL + anon key. Si no, la consola
// cae al candado básico (CONSOLE_PASSWORD) — transición sin lockout.
export const AUTH_HABILITADA = Boolean(URL && ANON);

/** Cliente con cookies para route handlers: lee y escribe la sesión. */
export async function clienteRuta() {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* set fuera de un contexto que permita escribir cookies */
        }
      },
    },
  });
}

/** Cliente efímero (sin cookies): valida credenciales sin dejar sesión. */
export function clienteEfimero() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Cliente admin (service role): crear usuarios / generar OTP en pruebas. */
export function clienteAdmin() {
  return createClient(URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
