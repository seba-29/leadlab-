-- ============================================================
-- Lead Lab — Esquema Supabase (Fase 3)
-- Pegar en el SQL Editor de Supabase (o aplicar como migración).
-- Espeja la capa de datos de lib/store.ts, con RLS multi-tenant.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- tablas ----------

create table if not exists tenants (
  id          text primary key,                 -- slug: 'leadlab', 'aurora'
  nombre      text not null,
  agente      text not null,
  rubro       text not null,
  tipo        text not null default 'cliente' check (tipo in ('interno','cliente')),
  color       text not null default '#5EEAD4',
  model       text not null default 'claude-opus-4-8',
  cerebro     jsonb not null default '{}'::jsonb,
  prompt_override text,
  phone_number_id text,                         -- WhatsApp Cloud API (canal)
  creado      timestamptz not null default now()
);

create table if not exists usuarios_tenant (
  user_id   uuid not null references auth.users(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  rol       text not null default 'dueno' check (rol in ('dueno','equipo','leadlab')),
  primary key (user_id, tenant_id)
);

create table if not exists conversaciones (
  id                text primary key default ('conv_' || replace(gen_random_uuid()::text,'-','')),
  tenant_id         text not null references tenants(id) on delete cascade,
  contacto_nombre   text not null,
  contacto_telefono text,
  canal             text not null default 'whatsapp' check (canal in ('whatsapp','instagram','messenger','playground')),
  estado            text not null default 'bot' check (estado in ('bot','humano','cerrada')),
  creado            timestamptz not null default now(),
  actualizado       timestamptz not null default now()
);

create table if not exists mensajes (
  id              text primary key default ('msg_' || replace(gen_random_uuid()::text,'-','')),
  conversacion_id text not null references conversaciones(id) on delete cascade,
  autor           text not null check (autor in ('cliente','bot','humano')),
  texto           text not null,
  meta_message_id text unique,                  -- dedupe de reintentos del webhook
  creado          timestamptz not null default now()
);

create table if not exists leads (
  id              text primary key default ('lead_' || replace(gen_random_uuid()::text,'-','')),
  tenant_id       text not null references tenants(id) on delete cascade,
  conversacion_id text references conversaciones(id) on delete set null,
  nombre          text not null,
  negocio         text,
  telefono        text,
  interes         text,
  etapa           text not null default 'nuevo' check (etapa in ('nuevo','contactado','agendado','ganado','perdido')),
  valor_estimado  numeric,
  notas           text,
  fuente          text not null default 'WhatsApp',
  creado          timestamptz not null default now(),
  actualizado     timestamptz not null default now()
);

create table if not exists citas (
  id              text primary key default ('cita_' || replace(gen_random_uuid()::text,'-','')),
  tenant_id       text not null references tenants(id) on delete cascade,
  conversacion_id text references conversaciones(id) on delete set null,
  fecha_hora      text not null,                -- texto libre o ISO; se normaliza en app
  contacto        text,
  creado          timestamptz not null default now()
);

create table if not exists derivaciones (
  id              text primary key default ('der_' || replace(gen_random_uuid()::text,'-','')),
  tenant_id       text not null references tenants(id) on delete cascade,
  conversacion_id text references conversaciones(id) on delete set null,
  motivo          text not null,
  resumen         text,
  atendida        boolean not null default false,
  creado          timestamptz not null default now()
);

create table if not exists usage_events (
  id        bigint generated always as identity primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  tipo      text not null check (tipo in ('claude_tokens_in','claude_tokens_out','wa_template')),
  cantidad  numeric not null,
  costo_usd numeric,
  creado    timestamptz not null default now()
);

-- ---------- índices ----------
create index if not exists idx_conv_tenant     on conversaciones(tenant_id, actualizado desc);
create index if not exists idx_conv_contacto   on conversaciones(tenant_id, contacto_telefono);
create index if not exists idx_msg_conv        on mensajes(conversacion_id, creado);
create index if not exists idx_leads_tenant    on leads(tenant_id, etapa, actualizado desc);
create index if not exists idx_usage_tenant    on usage_events(tenant_id, creado desc);

-- ---------- RLS ----------
alter table tenants        enable row level security;
alter table usuarios_tenant enable row level security;
alter table conversaciones enable row level security;
alter table mensajes       enable row level security;
alter table leads          enable row level security;
alter table citas          enable row level security;
alter table derivaciones   enable row level security;
alter table usage_events   enable row level security;

-- helper: tenants a los que pertenece el usuario autenticado
create or replace function mis_tenants() returns setof text
language sql stable security definer set search_path = public as $$
  select tenant_id from usuarios_tenant where user_id = auth.uid()
$$;

-- el equipo Lead Lab (rol 'leadlab' en cualquier fila) ve todo
create or replace function es_leadlab() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuarios_tenant where user_id = auth.uid() and rol = 'leadlab')
$$;

create policy sel_tenants on tenants for select
  using (es_leadlab() or id in (select mis_tenants()));

create policy sel_membresias on usuarios_tenant for select
  using (user_id = auth.uid() or es_leadlab());

create policy sel_conv on conversaciones for select
  using (es_leadlab() or tenant_id in (select mis_tenants()));
create policy mod_conv on conversaciones for update
  using (es_leadlab() or tenant_id in (select mis_tenants()));

create policy sel_msg on mensajes for select
  using (es_leadlab() or conversacion_id in
    (select id from conversaciones where tenant_id in (select mis_tenants())));
create policy ins_msg on mensajes for insert
  with check (es_leadlab() or conversacion_id in
    (select id from conversaciones where tenant_id in (select mis_tenants())));

create policy sel_leads on leads for select
  using (es_leadlab() or tenant_id in (select mis_tenants()));
create policy mod_leads on leads for update
  using (es_leadlab() or tenant_id in (select mis_tenants()));
create policy ins_leads on leads for insert
  with check (es_leadlab() or tenant_id in (select mis_tenants()));

create policy sel_citas on citas for select
  using (es_leadlab() or tenant_id in (select mis_tenants()));
create policy sel_der on derivaciones for select
  using (es_leadlab() or tenant_id in (select mis_tenants()));
create policy sel_usage on usage_events for select
  using (es_leadlab() or tenant_id in (select mis_tenants()));

-- El worker/webhook usa la service_role key (bypassa RLS): inserta mensajes,
-- conversaciones, leads, citas y usage_events sin políticas adicionales.

-- ---------- Realtime (inbox en vivo) ----------
-- En el dashboard de Supabase: Database → Replication → añadir
-- 'mensajes' y 'conversaciones' a la publicación supabase_realtime.
