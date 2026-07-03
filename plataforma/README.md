# Lead Lab — Plataforma

La consola de Lead Lab (Fase 2): multi-tenant, con el agente corriendo en código y cinco pestañas:

| Pestaña | Qué hace |
|---|---|
| **Dashboard** | Métricas de los últimos 7 días: conversaciones, leads, citas, pipeline y gráfico de leads/día |
| **Probar agentes** | Conversa con cualquier agente (Lía o el de un cliente) como si fueras un cliente real. Las pruebas quedan en el Inbox y los leads caen al Kanban |
| **Inbox** | Todas las conversaciones de todos los clientes. "Tomar conversación" pausa el bot y respondes tú; "Devolver al agente" lo reactiva |
| **Leads** | Kanban con drag & drop: Nuevo → Contactado → Agendado → Ganado → Perdido |
| **Cerebro** | Editor del conocimiento de cada agente (servicios, precios, tono, reglas) con vista previa del prompt |

Viene con datos demo realistas: **Lía** (agente interno de Lead Lab) y **Sofía** (agente de "Clínica Aurora", clienta de ejemplo — sirve además para demos con prospectos).

## Cómo correrlo

```bash
cd plataforma
npm install
cp .env.example .env.local      # y pega tu ANTHROPIC_API_KEY
npm run dev
```

Abre **http://localhost:3000** → redirige a la consola.

Prueba el flujo completo: ve a **Probar agentes** → elige a Sofía → escríbele *"hola, cuánto sale el botox?"* → dale tu nombre → mira cómo el lead aparece en **Leads** y la conversación en **Inbox**. Ese loop es el producto.

## Estructura

```
plataforma/
  app/
    consola/
      layout.tsx        # sidebar y navegación
      page.tsx          # Dashboard (tiles + gráfico)
      agentes/page.tsx  # Probar agentes (tester en vivo)
      inbox/page.tsx    # Inbox de conversaciones
      leads/page.tsx    # Kanban drag & drop
      cerebro/page.tsx  # Editor del conocimiento por agente
    api/
      agentes/[id]/chat # correr un agente (persiste conversación + leads)
      conversaciones/…  # listar, ver, tomar/soltar/responder
      leads             # listar + mover de etapa
      tenants/…         # agentes y su cerebro
      resumen           # métricas del dashboard
  lib/
    agent.ts            # motor único de agentes (prompt por tenant + tools + loop Claude)
    store.ts            # capa de datos (JSON local con seed demo; Fase 3 → Supabase)
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Tu API key de Anthropic |
| `AGENT_MODEL` | No | Modelo por defecto de los agentes (default `claude-opus-4-8`) |

## Notas de diseño

- **La capa de datos es intercambiable:** `lib/store.ts` expone funciones async con las mismas firmas que tendrá el adaptador de Supabase (Fase 3). Persiste a `.data/store.json` en local; para resetear los datos demo, borra esa carpeta.
- **Regla de producto en el Inbox:** si un humano responde, el bot se pausa en esa conversación (estado `humano`) hasta que se le devuelve el control.
- **Prompt caching:** el prompt del sistema de cada tenant se marca con `cache_control` para pagar ~10% del costo en mensajes siguientes.

## Fase 3 (pre-cableada, lista para enchufar)

- **Canal WhatsApp ya programado**: `app/api/canales/whatsapp/route.ts` implementa el webhook completo de Meta Cloud API — verificación (`hub.challenge`), validación de firma (`X-Hub-Signature-256`), dedupe de reintentos, debounce de ráfagas (6 s), resolución de tenant por número, pausa por humano, respuesta vía Graph API. **Activarlo = pegar 4 variables en `.env.local`** (ver `.env.example`) y apuntar el webhook de Meta a `/api/canales/whatsapp`.
- **Esquema Supabase listo**: `supabase/schema.sql` — tablas espejo del store, RLS multi-tenant (el dueño ve solo su negocio, el equipo Lead Lab ve todo), índices y notas de Realtime. Se aplica pegándolo en el SQL Editor de Supabase.

Lo que falta de Fase 3: crear el proyecto Supabase, escribir el adaptador (`lib/store.ts` ya expone firmas async compatibles) y el desbloqueo de Meta.
