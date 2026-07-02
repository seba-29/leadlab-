# Lead Lab — Plataforma

App Next.js de Lead Lab. **Fase 1:** el agente **Lía** vivo + un playground web para conversar con ella y probarla, sin depender de WhatsApp ni de Meta.

## Cómo correrlo

```bash
cd plataforma
npm install
cp .env.example .env.local      # y pega tu ANTHROPIC_API_KEY
npm run dev
```

Abre http://localhost:3000 y conversa con Lía. Verás cómo:
- responde en chileno, cálido y natural,
- califica al prospecto (qué negocio, si pautea, por dónde le llegan las consultas),
- **captura el lead** en el panel de la derecha en vivo,
- agenda una llamada o deriva a un humano cuando corresponde.

## Estructura

```
plataforma/
  app/
    page.tsx            # el playground (chat + panel de leads)
    layout.tsx
    globals.css         # sistema de diseño naranjo / liquid glass
    api/chat/route.ts   # endpoint que corre el agente
  lib/
    agent.ts            # Lía: system prompt, herramientas y loop de Claude
    leads.ts            # store de leads (en memoria por ahora)
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí | Tu API key de Anthropic |
| `LIA_MODEL` | No | Modelo del agente (default `claude-opus-4-8`) |

## Siguiente (Fase 2)

Consola multi-tenant con Supabase: auth, inbox de conversaciones, Kanban de leads, dashboard y editor del "cerebro" del agente. El store en memoria de `lib/leads.ts` pasa a Postgres con RLS.
