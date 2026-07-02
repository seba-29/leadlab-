# 04 — Producto y Consola

## Principio de construcción

Cada versión existe para desbloquear la siguiente venta, no para estar "completa". El orden es: **demo que vende → agente que opera → consola que retiene.**

---

## V0 — La Demo Vendedora (semanas 1-2)

**Objetivo:** que cualquier prospecto pueda escribirle a un número de WhatsApp y quedar impactado en 2 minutos. Nada más.

- Un (1) número de WhatsApp con API oficial conectado a Claude.
- Personaje: "Sofía", recepcionista IA de la **Clínica Estética Demo** (catálogo realista: limpieza facial, botox, depilación láser, precios, horarios).
- Capacidades de la demo: responde en chileno cálido y natural, cotiza desde su lista de precios, ofrece y "agenda" horas (registro simple), maneja objeciones básicas, y si le preguntan algo fuera de libreto deriva elegante ("te contacto con nuestra coordinadora").
- Guion de demo para ventas: el prospecto escanea un QR → habla con Sofía → a los 2 minutos: *"esto mismo, entrenado con TU clínica y en TU número, es lo que te instalo la próxima semana"*.
- **Bonus de cierre:** en la reunión, cargar 3-4 datos del negocio del prospecto (nombre, 3 servicios, horario) a un segundo tenant y mostrarle al agente hablando *de su propia clínica* en vivo. Ese momento cierra ventas.

**Explícitamente fuera de V0:** consola, multi-canal, dashboard, sitio nuevo, logo. Fuera.

## V1 — Agente en Producción (mes 1-2, con pilotos firmados)

**Objetivo:** operar 2-3 clientes reales de forma confiable, con visibilidad para el dueño **sin necesidad de consola todavía**.

| Capacidad | Detalle |
|---|---|
| Multi-tenant real | Config por cliente: prompt, conocimiento, tono, horarios, precios, número propio |
| Agente completo | Responder, calificar (nombre, servicio de interés, urgencia), agendar, registrar lead |
| Derivación a humano | Detecta intención de hablar con persona / caso complejo / reclamo → pausa el bot en esa conversación y **avisa al dueño por WhatsApp** con resumen y link |
| Modo humano | Si el dueño responde manualmente desde su WhatsApp (coexistencia app/API), el bot se silencia en esa conversación por N horas |
| Resumen diario | Mensaje automático al dueño 21:00: "Hoy: 14 conversaciones, 6 leads nuevos, 3 horas agendadas, 1 derivada. Destacado: María pidió cotización de botox, quedó de confirmar." |
| Registro de leads | Tabla consultable (aunque sea vista en Supabase o un sheet sincronizado al principio) |
| Reporte semanal | PDF/página simple con métricas — lo genera Lead Lab, lo recibe el cliente por WhatsApp/email |
| Panel interno de operación | Herramienta mínima PARA LEAD LAB (no para el cliente): ver conversaciones, editar prompt/KB, pausar agente, reintentar mensajes |

**El insight:** el dueño de pyme vive en WhatsApp, no en dashboards. En V1, WhatsApp *es* la consola del cliente. Eso permite cobrar desde el día 1 sin haber construido frontend.

## V2 — Consola Lead Lab (meses 2-4)

**Objetivo:** retención, diferenciación y justificación del plan de $249k. Es la "consola administrativa bonita" de la visión — construida cuando ya hay ingresos que la financian y usuarios reales que la piden.

### Pantallas (en orden de construcción)

1. **Inbox unificado** — Todas las conversaciones (WhatsApp; luego IG/FB) en vivo (Supabase Realtime). Filtros: sin leer / atendiendo bot / atendiendo humano / cerradas. Vista de conversación con historial completo, quién respondió (🤖/👤), y botón **"Tomar conversación"** (pausa el bot) / **"Devolver al agente"**. Responder desde la consola.
2. **Pipeline de leads (kanban)** — Columnas: Nuevo → Contactado → Agendado → Asistió/Compró → Perdido. Tarjeta: nombre, teléfono, servicio de interés, valor estimado, fuente, notas, tags. El agente crea y mueve tarjetas solo; el humano puede arrastrar.
3. **Dashboard** — Conversaciones/día, tiempo de primera respuesta (será ~10 seg: mostrarlo con orgullo), leads por semana, tasa lead→cita, citas agendadas, ingresos estimados recuperados fuera de horario ("las ventas de las 10 PM").
4. **Cerebro del agente** — Editor de conocimiento: servicios y precios, FAQ, políticas, tono. Guardar → el agente lo usa al instante. Historial de cambios. (Esto convierte "ajustes al agente" de trabajo manual de Lead Lab en self-service parcial.)
5. **Campañas y recordatorios** — Plantillas aprobadas de WhatsApp, recordatorio automático de cita (24 h y 2 h antes), reactivación de leads fríos ("hace 30 días cotizaste X, tenemos hora el jueves"). Con costos por mensaje visibles.
6. **Configuración** — Usuarios del cliente, horarios, canales conectados, plan y facturación.

### Principios de diseño

- **Simple gana**: la usuaria es la dueña de la clínica o su coordinadora, no un ingeniero. Cada pantalla debe explicarse sola en 10 segundos.
- Español chileno en toda la UI. Móvil-first: la van a mirar desde el teléfono entre pacientes.
- Marca blanca ligera: logo del cliente arriba, "powered by Lead Lab" abajo — cada usuario de la consola es un canal de marketing.
- Identidad visual propia y cuidada (aquí sí se invierte en diseño — es el escaparate del producto), pero **después** de que funcione.

## V3 — Después de 10 clientes (no antes)

Backlog para entonces, estrictamente si los clientes lo piden: integraciones nativas (Agenda Pro, Reservo, Google Calendar bidireccional, Bsale/Defontana para pagos), widget web, self-onboarding con Embedded Signup de Meta, panel multi-sucursal, English/portugués para expandir región, API pública.

---

## Qué NO se construye nunca (hasta nuevo aviso)

- Marketplace de plantillas, app móvil nativa, editor visual de flujos (el punto es que NO haya flujos), facturación automatizada compleja, multi-idioma, "IA para redes sociales" ni cualquier otra idea nueva brillante. **Una idea nueva por trimestre, evaluada solo si 3+ clientes la pidieron.**
