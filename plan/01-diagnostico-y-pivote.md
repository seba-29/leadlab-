# 01 — Diagnóstico y Pivote

## Diagnóstico honesto de Lead Lab 1.0

Lo que pasó con la agencia de páginas web no fue un problema de capacidad — la landing se construyó, la habilidad técnica está (Heat lo demuestra: decenas de sitios, cotizadores y herramientas de IA entregados). Fallaron tres cosas, y conviene nombrarlas para no repetirlas:

### 1. El modelo de negocio estaba mal elegido

Una agencia de páginas web vive de **volver a vender cada mes desde cero**. Con un ticket de $300-500k por sitio, facturar $2M/mes exige cerrar ~5 clientes nuevos todos los meses, para siempre. No hay acumulación: el año 2 empieza igual de vacío que el año 1. Y el mercado presiona el precio hacia abajo: Wix, Canva, Webflow, freelancers a $100k, y ahora IA que genera sitios en minutos. **Es una cinta de correr que se acelera.**

### 2. El dolor que atacaba era débil

"Necesito una página web" es un *nice to have* aplazable. Nadie pierde plata esta noche por no tener sitio nuevo. En cambio, "me escribieron 12 personas por el anuncio y contesté 4" es plata que se fue **hoy**. Los negocios pagan rápido y retienen cuando el servicio está conectado directo a sus ventas.

### 3. El patrón personal: construir es refugio, vender es exposición

Varias veces el ciclo fue: idea → construir con entusiasmo → "falta pulir esto antes de mostrar" → nunca se muestra → siguiente idea. Construir da sensación de avance sin riesgo de rechazo. **La corrección no es motivacional, es estructural**: este plan pone la venta *antes* que la construcción en el calendario, define "hecho" como "alguien externo lo vio/usó/pagó", y limita explícitamente qué se puede construir en cada fase. El roadmap (doc 07) está diseñado para que la salida al mercado no dependa de sentirse listo.

---

## El pivote: de vender proyectos a vender un empleado digital

### La tesis

> Toda pyme chilena que invierte en marketing (ads, Instagram, referidos) tiene el mismo cuello de botella: **la conversación**. Los leads llegan por WhatsApp e Instagram a toda hora; la capacidad de responder es humana, cara y de horario de oficina. Un agente de IA bien implementado responde en segundos, todos los días, califica, agenda y nunca se enferma — a una fracción del costo de una persona.

Lead Lab vende ese agente **como servicio administrado**: Lead Lab lo construye, lo entrena con el negocio del cliente, lo conecta a sus canales y lo opera. El cliente solo ve resultados en su consola.

### Por qué el momento es ahora (y la ventana no es eterna)

1. **La tecnología acaba de cruzar el umbral.** Los modelos actuales (Claude) mantienen conversaciones de venta indistinguibles de un buen vendedor humano, en chileno, con reglas de negocio. Hace 18 meses esto era un bot de menús que la gente odiaba.
2. **Las pymes ya saben que quieren IA, pero no saben implementarla.** ~70% declara usarla, pero solo ~16% de forma activa e integrada. El discurso de venta no es evangelizar ("la IA existe") sino ejecutar ("yo te la dejo funcionando el martes").
3. **La competencia local todavía deja un hueco** (detalle en doc 02): los SaaS baratos ($15-50k/mes) son bots de flujos que el cliente debe configurar solo; las agencias serias parten en $650k+ /mes. **Entre $150k y $300k/mes con implementación incluida hay un espacio casi vacío.**
4. **WhatsApp cobra por plantilla, no por conversación de servicio**: responder leads entrantes es gratis en la API oficial. La estructura de costos juega a favor.

### Por qué recurrente cambia todo

| Métrica | Agencia web | Lead Lab 2.0 |
|---|---|---|
| Ingreso mes 12 con 10 ventas totales en el año | $0 (si no vendes ese mes) | ~$2M/mes y creciendo |
| Valor de un cliente (LTV) | $400k una vez | $150-250k × 18-30 meses = $2,7-7,5M |
| Qué pasa si un mes no vendes nada | Crisis | Nada: el MRR sigue |
| Incentivo del negocio | Cerrar y pasar al siguiente | Que al cliente le vaya bien (retención) |

### La relación con Heat

La cartera y red de Heat (clínicas estéticas, automotoras, institutos, retail) es **el activo comercial más valioso disponible**: relaciones de confianza en los nichos exactos donde este producto brilla. Definir temprano, con honestidad:

- **Si Heat es tuyo** → Lead Lab puede operar como línea de producto / marca hermana, y la cartera Heat es el canal natural de pilotos. Cero conflicto.
- **Si Heat es tu empleo o tiene socios** → transparentar y acordar el modelo (referidos, revenue share, o separación clara de clientes) *antes* del primer piloto. Un conflicto comercial mal manejado mata el proyecto más rápido que cualquier bug.

En ambos casos la recomendación es la misma: **los primeros 3 pilotos salen de gente que ya te conoce y te ha visto entregar.** Vender frío algo nuevo, con marca nueva, sin casos — ese es el modo difícil y es exactamente lo que mató a Lead Lab 1.0.

### Qué pasa con lo ya construido

- **La landing (leadlab1 en Netlify) se conserva y se ajusta el mensaje** — de "hacemos tu página web" a "tu recepcionista IA 24/7" — en una tarde, no en un mes. Es un cambio de textos, no un rediseño.
- La experiencia haciendo sitios no se bota: cada cliente de Lead Lab probablemente necesitará ajustes web tarde o temprano, y eso se puede vender como adicional puntual. Pero **no es el producto ni aparece en el pitch**.
