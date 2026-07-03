// ============================================================
// Lead Lab — Capa de datos (despachador)
// Con SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY en el entorno usa
// Postgres (persistencia real, producción). Sin ellas, usa el
// store local JSON (desarrollo/demo). Mismas firmas en ambos.
// ============================================================
import * as local from "./storeLocal";
import * as sb from "./storeSupabase";

export * from "./types";
export { LIA_PROMPT } from "./storeLocal";

export const USANDO_SUPABASE = Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const impl = USANDO_SUPABASE ? sb : local;

export const listTenants = impl.listTenants;
export const getTenant = impl.getTenant;
export const crearTenant = impl.crearTenant;
export const updateCerebro = impl.updateCerebro;
export const updateTenant = impl.updateTenant;
export const listConversaciones = impl.listConversaciones;
export const getConversacion = impl.getConversacion;
export const crearConversacion = impl.crearConversacion;
export const setEstadoConversacion = impl.setEstadoConversacion;
export const listMensajes = impl.listMensajes;
export const ultimoMensaje = impl.ultimoMensaje;
export const agregarMensaje = impl.agregarMensaje;
export const listLeads = impl.listLeads;
export const crearLead = impl.crearLead;
export const moverLead = impl.moverLead;
export const actualizarLead = impl.actualizarLead;
export const crearCita = impl.crearCita;
export const listCitas = impl.listCitas;
export const crearDerivacion = impl.crearDerivacion;
export const listDerivaciones = impl.listDerivaciones;
export const registrarUso = impl.registrarUso;
export const listUsos = impl.listUsos;
