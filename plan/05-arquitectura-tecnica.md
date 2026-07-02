# 05 — Arquitectura Técnica

## Stack (aprovechando lo que ya dominas)

| Capa | Elección | Por qué |
|---|---|---|
| Consola web | **Next.js en Vercel** | Ya es tu stack; deploy en minutos |
| Base de datos + Auth + Realtime | **Supabase** (Postgres, RLS, Realtime, Storage, pgvector) | Multi-tenant con RLS, inbox en vivo con Realtime, todo en un servicio |
| Worker de mensajería | **Node/TS** en Railway o Fly.io (o Supabase Edge Functions al inicio) | Recibe webhooks de Meta, corre el loop del agente, envía respuestas. Separado de la consola para que un peak de mensajes no bote nada |
| IA | **Claude API** (Anthropic) | Calidad conversacional en español; tool use; prompt caching |
| Mensajería | **WhatsApp Cloud API directa de Meta** + Instagram/Messenger (Graph API) | Sin intermediarios (BSP) que cobren margen por mensaje |
| Prototipo V0 (opcional) | Make.com | Ya lo tienes; sirve para la demo en días. Se reemplaza por código en V1 |

> **Regla dura: solo API oficial de Meta.** Nada de librerías no oficiales tipo WhatsApp Web automatizado (Baileys, etc.): riesgo de baneo del número del cliente = negocio muerto. Que Lead Lab use la API oficial es además un argumento de venta contra los bots baratos que arriesgan el número.

## Arquitectura general

```
Meta (WhatsApp / IG / Messenger)
        │  webhooks (mensajes entrantes)
        ▼
┌─────────────────────────┐
│ Worker (Node/TS)        │  1. verifica firma (X-Hub-Signature-256)
│                         │  2. resuelve tenant por phone_number_id
│                         │  3. guarda mensaje en Supabase
│                         │  4. debounce 6-10 s (junta mensajes seguidos)
│                         │  5. ¿bot pausado en esta conversación? → solo notificar
│                         │  6. loop del agente Claude (tools)
│                         │  7. envía respuesta vía Cloud API
└─────────────────────────┘
        │                        ▲
        ▼                        │ Realtime (inbox en vivo)
   Supabase (Postgres) ◄──── Consola Next.js (Vercel)
   tenants, conversations,       dueño del negocio + equipo Lead Lab
   messages, leads, appointments,
   knowledge, campaigns, usage
```

Detalles operativos que hacen la diferencia entre demo y producto:

- **Debounce de entrada:** la gente escribe "hola" / "una consulta" / "cuánto sale el láser" en 3 mensajes. Se acumulan 6-10 s de silencio antes de invocar al agente, y se responde una sola vez, natural.
- **Idempotencia:** Meta reintenta webhooks; deduplicar por `message_id`.
- **Cola:** al crecer, los webhooks encolan (pgmq de Supabase o Upstash QStash) y el worker procesa con reintentos. Al inicio, procesar directo está bien.
- **Marcar como leído + indicador de escritura** vía API: la conversación se siente humana.
- **Ventana de 24 h:** respuestas libres solo dentro de 24 h desde el último mensaje del usuario (gratis). Fuera de ventana → solo plantillas aprobadas (pagadas). El worker debe saber en qué caso está.

## Integración WhatsApp Cloud API (el corazón)

Pasos de implementación (una vez para la demo, luego repetible por cliente):

1. **App en Meta for Developers** (tipo Business) + Business Portfolio de Lead Lab. Producto "WhatsApp" agregado a la app.
2. **Número:** el de prueba que da Meta sirve para desarrollo; para la demo se compra un número dedicado. Para clientes: su número, dado de alta en la plataforma (u opción de **coexistencia**: desde 2025 un número puede seguir usando la app WhatsApp Business *y* la Cloud API a la vez — onboarding mucho menos traumático para el cliente; verificar limitaciones vigentes al implementar).
3. **Webhook:** endpoint público con verificación GET (`hub.verify_token` / `hub.challenge`) y recepción POST. Validar `X-Hub-Signature-256` con el app secret. Suscribirse al campo `messages`.
4. **Envío:** `POST graph.facebook.com/v<XX>/{phone_number_id}/messages` con tipos `text`, `interactive` (botones/listas — útiles para "elige un horario"), `template`.
5. **Verificación del negocio en Meta** (la de Lead Lab y/o la del cliente) para display name y para subir de nivel de envío: los límites de conversaciones iniciadas por empresa escalan por tiers (250 → 1.000 → 10.000 → 100.000/día) según verificación y calidad. Para responder leads entrantes el límite prácticamente no estorba.
6. **Plantillas:** crear y someter a aprobación las de recordatorio de cita y reactivación (categoría utility/marketing). Precio por mensaje desde julio 2025 (Chile: utility ~19 CLP, marketing ~84 CLP; servicio = gratis).
7. **Camino a escala:** con varios clientes, postular a **Tech Provider de Meta** y usar **Embedded Signup** para conectar números de clientes con un flujo OAuth en la consola, sin tocar su Business Manager a mano.

**Instagram y Messenger (fase 2, plan Agente+CRM):** misma app de Meta. IG requiere cuenta profesional (y su vínculo correspondiente) + permisos de mensajería aprobados vía App Review; Messenger usa el token de la página. Misma ventana de 24 h (IG/FB tienen además tag de agente humano de 7 días). El worker ya queda diseñado con `channel` como dimensión desde el día 1 para que esto sea agregar un adaptador, no rehacer nada.

## El agente Claude (diseño)

Un **loop de Messages API con tool use** (no hace falta framework):

```typescript
// worker/agent.ts — esqueleto conceptual
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

const respuesta = await client.messages.create({
  model: tenant.model, // pilotos: "claude-opus-4-8"; producción afinada: sonnet/haiku
  max_tokens: 1024,
  thinking: { type: "adaptive" },
  system: [
    { type: "text", text: PROMPT_BASE_LEADLAB },                    // igual para todos
    { type: "text", text: renderTenantKB(tenant),                   // negocio, precios, tono
      cache_control: { type: "ephemeral", ttl: "1h" } },            // caching: ~90% dcto
  ],
  tools: [agendarHora, guardarLead, derivarAHumano, consultarDisponibilidad],
  messages: historialConversacion, // últimos N turnos desde Supabase
});
```

**Herramientas (tools) del agente:**

| Tool | Qué hace |
|---|---|
| `guardar_lead` | Crea/actualiza el lead (nombre, teléfono, servicio, urgencia, valor estimado) → kanban |
| `consultar_disponibilidad` | Lee horarios disponibles (tabla propia; en Pro, la agenda real del cliente) |
| `agendar_hora` | Registra la cita y dispara confirmación + recordatorios |
| `derivar_a_humano` | Pausa el bot en la conversación, notifica al dueño con resumen |
| `consultar_conocimiento` | (Si la KB crece) búsqueda semántica con pgvector; mientras quepa en el prompt cacheado, no se necesita |

**Reglas del prompt base (guardrails):**

- Precios y disponibilidad **solo** desde herramientas/KB — nunca inventados. Si no sabe: deriva.
- Detectar y derivar: enojo, urgencia médica, negociación fuera de política, pedir humano.
- Horario del negocio: fuera de horario agenda y avisa que confirman temprano.
- Tono por tenant (formal/cercano), siempre chileno natural, mensajes cortos estilo WhatsApp (nada de párrafos de ensayo).
- Máximo de turnos sin avance → ofrecer humano. Registrar TODO lead aunque no agende.

**Costos y calidad:** partir pilotos con **Opus 4.8** (la primera impresión vende), medir, y mover tráfico rutinario a **Sonnet** o **Haiku 4.5** cuando el prompt esté afinado (config por tenant, cambiable al instante). El **resumen diario y reportes** se generan con **Batch API (50% de descuento)** de madrugada. Prompt caching desde el día 1: el 80%+ del prompt (base + KB del negocio) es idéntico entre mensajes.

## Modelo de datos (Supabase, simplificado)

```
tenants(id, nombre, rubro, plan, model, estado, config_jsonb)
channels(id, tenant_id, tipo[whatsapp|instagram|messenger], phone_number_id, page_id, tokens…)
conversations(id, tenant_id, channel_id, contacto_telefono, contacto_nombre,
              estado[bot|humano|cerrada], bot_pausado_hasta, last_message_at)
messages(id, conversation_id, direccion[in|out], autor[cliente|bot|humano],
         tipo, contenido, meta_message_id UNIQUE, created_at)
leads(id, tenant_id, conversation_id, nombre, telefono, servicio_interes,
      etapa[nuevo|contactado|agendado|ganado|perdido], valor_estimado, fuente, notas)
appointments(id, tenant_id, lead_id, servicio, fecha_hora, estado, recordatorios_enviados)
knowledge(id, tenant_id, tipo[servicio|faq|politica], titulo, contenido, embedding vector)
usage_events(id, tenant_id, tipo[claude_tokens|wa_template], cantidad, costo_usd, created_at)
```

- **RLS por tenant en todas las tablas**: el usuario de la consola solo ve su tenant; el equipo Lead Lab (rol interno) ve todo.
- `usage_events` alimenta el control de margen por cliente desde el primer día (saber cuánto cuesta cada cliente evita sorpresas).
- Tokens de Meta cifrados (Supabase Vault) — nunca en texto plano ni en el frontend.

## Seguridad y datos personales

- Verificación de firma de webhooks; secretos en variables de entorno; principio de mínimo acceso.
- Las conversaciones son datos personales: contrato deja claro que **el cliente es el responsable de los datos y Lead Lab el encargado del tratamiento**. Chile: nueva Ley de Protección de Datos Personales (21.719) entra en régimen a fines de 2026 — diseñar desde ya con retención definida, derecho a eliminación por contacto, y sin vender/compartir datos. Ser el proveedor "cumplidor" será diferenciador.
- Backups automáticos de Supabase + export mensual por tenant.

## Lo que NO se necesita ahora

Kubernetes, microservicios, colas distribuidas, fine-tuning de modelos, RAG sofisticado, tests E2E exhaustivos, IaC. **Un worker, una base, una consola.** La arquitectura de arriba aguanta los primeros 50-100 clientes con cambios menores.
