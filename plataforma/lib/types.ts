// ============================================================
// Lead Lab — Tipos compartidos de la capa de datos
// ============================================================
export type Etapa = "nuevo" | "contactado" | "agendado" | "ganado" | "perdido";
export const ETAPAS: Etapa[] = ["nuevo", "contactado", "agendado", "ganado", "perdido"];

export type Servicio = { nombre: string; precio: string; detalle?: string };
export type Faq = { pregunta: string; respuesta: string };

export type Cerebro = {
  descripcion: string;
  tono: string;
  horario: string;
  servicios: Servicio[];
  faq: Faq[];
  reglas: string;
};

export type Tenant = {
  id: string;
  nombre: string; // negocio: "Lead Lab", "Clínica Aurora"
  agente: string; // nombre del agente: "Lía", "Sofía"
  rubro: string;
  tipo: "interno" | "cliente";
  color: string; // hex para el avatar
  model: string;
  plan?: "agente" | "crm" | "pro"; // plan comercial del cliente (default: crm)
  cerebro: Cerebro;
  promptOverride?: string; // si existe, se usa tal cual (caso Lía)
  logoUrl?: string; // logo de marca (Supabase Storage)
};

export type Miembro = {
  id: string;
  tenantId: string;
  nombre: string;
  correo: string;
  rol: "admin" | "ejecutivo" | "marketing";
  estado: "pendiente" | "activo";
  creado: string;
};

export type Conversacion = {
  id: string;
  tenantId: string;
  contactoNombre: string;
  contactoTelefono?: string;
  canal: "whatsapp" | "playground";
  estado: "bot" | "humano" | "cerrada";
  creado: string;
  actualizado: string;
};

export type Mensaje = {
  id: string;
  conversacionId: string;
  autor: "cliente" | "bot" | "humano";
  texto: string;
  creado: string;
};

export type Lead = {
  id: string;
  tenantId: string;
  conversacionId?: string;
  nombre: string;
  negocio?: string;
  telefono?: string;
  interes?: string;
  etapa: Etapa;
  valorEstimado?: number;
  notas?: string;
  fuente: string;
  creado: string;
  actualizado: string;
};

export type Cita = {
  id: string;
  tenantId: string;
  conversacionId?: string;
  fechaHora: string;
  contacto?: string;
  creado: string;
};

export type Derivacion = {
  id: string;
  tenantId: string;
  conversacionId?: string;
  motivo: string;
  resumen?: string;
  creado: string;
};

export type UsoEvento = {
  id: string;
  tenantId: string;
  model: string;
  tokensIn: number;
  tokensInCacheRead: number;
  tokensInCacheWrite: number;
  tokensOut: number;
  costoUsd: number;
  creado: string;
};

