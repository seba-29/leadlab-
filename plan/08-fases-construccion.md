# 08 — Fases de Construcción (el plan de build)

> Cómo construimos el producto, en el orden que ship-ea. Cada fase produce algo **que funciona y se puede mostrar**, no un pedazo suelto. Clave: **el 80% se construye SIN Meta**, así no nos quedamos pegados esperando el desbloqueo.

## Stack (definido)

| Capa | Elección |
|---|---|
| Frontend + consola | Next.js (App Router) + TypeScript en Vercel |
| Estilos | Tailwind + design system propio (paleta naranjo/glass) |
| Base de datos, Auth, Realtime | Supabase (Postgres + RLS + Realtime) |
| Motor del agente | Anthropic SDK (Claude) + tool use |
| Canal WhatsApp | Cloud API directo (cuando destrabe Meta) o 360dialog de puente |

## Las fases

### FASE 0 — Cimientos · *no necesita Meta*
- Scaffold Next.js + Tailwind + deploy en Vercel.
- **Design system Lead Lab:** tokens de la paleta naranjo (`#FF6B2C` / rust `#CC785C` / lima `#C6F24E` / base `#0B0A09`), tipografías, componentes glass (botones, cards, inputs).
- Proyecto Supabase + Auth + esquema base.
- **Hecho cuando:** el proyecto levanta, se ve con identidad Lead Lab, y hay login.

### FASE 1 — Lía viva (el agente en código) · *no necesita Meta* ← EMPEZAMOS AQUÍ
- Motor del agente: loop de Claude + las 3 tools (`capturar_lead`, `agendar_llamada`, `derivar_a_humano`) escribiendo a Supabase.
- **Playground web** para conversar con Lía YA, sin WhatsApp — para probar, afinar y hasta mostrar a alguien.
- **Hecho cuando:** le escribes a Lía en el navegador, conversa bien, califica, y el lead aparece en Supabase.

### FASE 2 — La consola completa · *no necesita Meta*
- Multi-tenant + RLS por cliente.
- **Inbox** de conversaciones (ver chats, bot vs humano, "tomar"/"soltar").
- **Kanban de leads** (drag & drop, las 5 etapas: Nuevo → Contactado → Agendado → Ganado → Perdido).
- **Dashboard** de métricas.
- **Cerebro del agente** editable por cliente (servicios, precios, tono).
- **Hecho cuando:** navegas la consola entera con los datos reales del playground.

### FASE 3 — Canal WhatsApp real · *SÍ necesita Meta / BSP*
- Webhook → resolver tenant → correr agente → responder.
- Ventana de 24 h, debounce, coexistence.
- Realtime a la consola (los mensajes aparecen en vivo).
- **Hecho cuando:** le escribes al WhatsApp, Lía responde, y lo ves en vivo en la consola.

### FASE 4 — Landing nueva + demo interactiva · *solo el CTA final necesita Meta*
- Reescribir leadlab.cl al nuevo mensaje + marca naranjo.
- Sección **"prueba un agente"** en vivo en la página (reusa el motor de Fase 1).
- **Hecho cuando:** leadlab.cl vende el nuevo servicio y deja probar un agente ahí mismo.

### FASE 5 — Salir al aire · *necesita Meta (ads/pixel)*
- Creatividades estilo Hormozi (pain-driven), pixel, campañas.
- Onboard de los primeros pilotos a la consola.
- **Hecho cuando:** corre la primera campaña y cae el primer lead real en tu consola.

## El insight anti-parálisis

Fases 0, 1, 2 y casi toda la 4 **no dependen de Meta**. O sea, construimos casi todo el producto mientras el desbloqueo de Meta avanza en paralelo. Meta deja de ser el muro que detiene todo.

## Dos requisitos prácticos antes del build pesado

1. **Persistencia del código.** Este entorno es un contenedor remoto y efímero, y el push está bloqueado (403). Si construimos la consola acá y no se puede pushear, el código se pierde al reciclarse el contenedor. Hay que: (a) arreglar el permiso de escritura del repo en GitHub, o (b) trabajar en tu Claude Code local (los archivos quedan en tu máquina).
2. **Modelo.** Para el build grande conviene el modelo más capaz (Fable 5). El usuario lo activa con `/model`.
