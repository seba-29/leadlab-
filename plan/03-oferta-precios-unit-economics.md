# 03 — Oferta, Precios y Unit Economics

## Principio: vender resultado, cobrar plan, implementar como servicio

El cliente no compra "un chatbot": compra **leads atendidos en segundos, citas agendadas y cero oportunidades perdidas**. La tecnología no aparece en la boleta; aparece "Servicio Lead Lab — Plan Agente".

## Los planes

| | **Agente** | **Agente + CRM** ⭐ | **Pro** |
|---|---|---|---|
| Precio mensual (+IVA) | **$149.000** | **$249.000** | **desde $390.000** |
| Canales | WhatsApp | WhatsApp + Instagram + Messenger | Todos + web widget |
| Agente IA 24/7 (Claude) | ✅ | ✅ | ✅ |
| Agendamiento de citas | ✅ (link o registro simple) | ✅ integrado | ✅ + integración a su agenda (Agenda Pro, Reservo, GCal) |
| Derivación a humano + aviso al equipo | ✅ | ✅ | ✅ multi-equipo |
| Consola Lead Lab (inbox, leads, métricas) | Lectura básica | ✅ completa (kanban, notas, tags) | ✅ + usuarios ilimitados |
| Recordatorios de cita (plantillas utility) | 100/mes incl. | 500/mes incl. | 2.000/mes incl. |
| Campañas salientes (plantillas marketing) | — | Costo + 20% | Gestionadas por Lead Lab |
| Conversaciones incluidas/mes | 1.000 | 3.000 | 8.000 |
| Ajustes al agente | 1/mes | Ilimitados razonables | Ilimitados + reunión mensual |
| **Setup inicial (una vez)** | **$190.000** | **$190.000** | **$290.000** |

Notas de diseño de precios:

- **$149k está anclado contra la recepcionista ($490-600k)**, no contra los bots de $15k. El pitch siempre compara con el costo humano o con 1 venta perdida.
- El plan del medio existe para ser elegido (ancla clásica). La meta es que el cliente promedio quede en **~$200.000/mes ≈ US$210** → 10 clientes ≈ **US$2.100 MRR**: exactamente la meta declarada.
- El **setup** filtra curiosos, financia las horas de implementación y da compromiso. En pilotos fundadores se rebaja, nunca se regala del todo.
- Excedentes de conversaciones: aviso y upgrade de plan, no cobro sorpresa.
- Cobro **mes anticipado**, transferencia o tarjeta; sin permanencia forzada pero con incentivo anual (2 meses gratis pagando 12) más adelante, no en pilotos.

### Precio fundador (solo primeros 3, solo mes 1-2)

- Setup $90.000 + $90.000/mes por 3 meses → luego tarifa plena del plan elegido.
- A cambio, por escrito: testimonio en video, caso de estudio con números, 2 referidos presentados.
- Se dice explícitamente: *"este precio existe porque eres fundador; en 90 días la tarifa es la de lista"*.

## Unit economics por cliente

Supuestos de un cliente activo típico (clínica mediana): **600 conversaciones/mes**, ~8 respuestas del agente por conversación (~4.800 llamadas a Claude), ~3.000 tokens de entrada por llamada (prompt de sistema + conocimiento del negocio, mayormente cacheados) y ~150 de salida. Con prompt caching (~90% de descuento sobre lo cacheado), el costo mensual de Claude por cliente queda:

| Modelo | Precio (in/out por MTok) | Costo/cliente/mes | Cuándo usarlo |
|---|---|---|---|
| Haiku 4.5 | $1 / $5 | **~US$9** | Volumen alto, prompts ya afinados, FAQ simples |
| Sonnet (4.6 / 5) | $3 / $15 | **~US$28** | **Default de producción**: calidad/costo óptimo para venta conversacional |
| Opus 4.8 | $5 / $25 | **~US$47** | Pilotos y demos (máxima calidad = máximo wow), casos complejos |

Estrategia de modelo: **partir los pilotos en Opus 4.8** (que la primera impresión sea impecable), y cuando el prompt y las herramientas estén afinados, bajar el tráfico rutinario a Sonnet/Haiku por configuración por cliente. El margen aguanta cualquiera de los tres.

### Estructura de costos mensual por cliente (Plan Agente + CRM, $249k ≈ US$260)

| Ítem | US$/mes |
|---|---|
| Claude API (Sonnet, 600 conv) | 28 |
| WhatsApp API: conversaciones de servicio (leads que escriben) | **0** (gratis respondiendo dentro de 24 h) |
| WhatsApp plantillas utility incluidas (500 × ~$0,013) | 7 |
| Infraestructura prorrateada (Vercel, Supabase, worker, monitoreo) | 5 |
| **COGS total** | **~40** |
| **Margen bruto** | **~US$220 → ~85%** |

Referencias de precios WhatsApp Chile: marketing ~US$0,059/mensaje (~84 CLP), utility ~US$0,013 (~19 CLP), servicio gratis ([crmwhata](https://crmwhata.com/whatsapp-business-api-precios/), [businesschat.io](https://www.businesschat.io/es/post-es/precios-whatsapp-business-api-en-chile)). Las campañas de marketing salientes se cobran al cliente a costo + 20%: nunca son pérdida.

### Costos fijos del negocio (independientes de clientes)

| Ítem | US$/mes |
|---|---|
| Vercel Pro | 20 |
| Supabase Pro | 25 |
| Worker (Railway/Fly) | 5-10 |
| Dominio, email, misc | 10 |
| **Total fijo** | **~US$65 (~$62.000 CLP)** |

**Punto de equilibrio: el cliente #1 ya paga toda la infraestructura.** Con 2 clientes el negocio es rentable en caja. Todo lo demás es margen para reinvertir en venta.

## Proyección simple (conservadora)

| Mes | Clientes | MRR CLP | MRR US$ | Hito |
|---|---|---|---|---|
| M1 | 0→2 pilotos | $180k | ~190 | Demo lista, primeros cierres fundador |
| M2 | 3 | $270k | ~285 | 3 pilotos operando |
| M3 | 4-5 | $700k-900k | ~800 | Pilotos pasan a tarifa plena, consola v2 |
| M4 | 6-7 | $1,3M | ~1.400 | Primeros referidos + 1 alianza agencia |
| M6 | **10** | **$2M+** | **~2.100** | Meta cumplida; decidir siguiente etapa |
| M12 (si se sostiene ritmo) | 20-25 | $4,5-5,5M | ~5.000 | Contratar primera ayuda (implementación/soporte) |

La proyección asume cerrar **1-2 clientes nuevos al mes** — con 5+ conversaciones de venta semanales y una demo que se vende sola, es una tasa de conversión modesta (~10%). El churn se combate con el resumen diario y el reporte mensual: el cliente tiene que *ver* cada semana lo que el agente le capturó.

## Formalización (mínimo indispensable, sin burocracia paralizante)

- **Mes 1 (con el primer piloto cerrado, no antes):** crear SpA por "Tu empresa en un día", iniciar actividades en SII, boleta/factura electrónica. Costo ~$0-50k y unas horas.
- Cuenta bancaria empresa o cuenta vista para separar flujos. Contabilidad simple externalizada cuando haya >3 clientes (~$60-100k/mes).
- Contrato de servicio simple de 2-3 páginas por cliente: alcance, plan, datos (el cliente es dueño de sus conversaciones), continuidad y término con 30 días de aviso. Se redacta una vez y se reutiliza.
