// Store simple en memoria para la Fase 1 (se reinicia con el servidor).
// En la Fase 2 esto pasa a Supabase con multi-tenant + RLS.

export type Lead = {
  nombre?: string;
  negocio?: string;
  pautea_en_meta?: boolean;
  canal?: string;
  interes?: string;
  etapa?: string;
  creado: string;
};

export type Appointment = {
  fecha_hora?: string;
  contacto?: string;
  creado: string;
};

export type Handoff = {
  motivo?: string;
  resumen?: string;
  creado: string;
};

const leads: Lead[] = [];
const appointments: Appointment[] = [];
const handoffs: Handoff[] = [];

function ahora(): string {
  // Nota: no usamos new Date() a nivel de módulo para evitar side-effects;
  // acá sí es válido porque corre en cada llamada del servidor.
  return new Date().toISOString();
}

export function addLead(input: Partial<Lead>): Lead {
  const lead: Lead = { ...input, etapa: input.etapa || "nuevo", creado: ahora() };
  leads.push(lead);
  return lead;
}

export function addAppointment(input: Partial<Appointment>): Appointment {
  const appt: Appointment = { ...input, creado: ahora() };
  appointments.push(appt);
  return appt;
}

export function addHandoff(input: Partial<Handoff>): Handoff {
  const h: Handoff = { ...input, creado: ahora() };
  handoffs.push(h);
  return h;
}

export function getLeads(): Lead[] {
  return leads;
}

export function getAppointments(): Appointment[] {
  return appointments;
}

export function getHandoffs(): Handoff[] {
  return handoffs;
}
