"use client";

// ============================================================
// Lead Lab — Piezas de "Agentes IA"
// Componentes compartidos por el shell tabbed de /consola/agentes:
//  · Tester        — probar un agente en vivo (cliente y admin)
//  · NuevoAgente   — alta de agente (admin)
//  · FlotaAgentes  — overview de toda la flota (admin, tab "Agentes")
//  · CerebroEditor — editar el cerebro de cada negocio (admin, tab "Cerebros")
//  · FichaAgente   — ficha de lectura del propio agente (cliente, tab "Ficha")
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useAccount } from "../_account/AccountContext";
import { USD_CLP, MARKUP_TOKENS_DEFAULT } from "@/lib/pricing";

// ---- Tipos ----
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
export type AgenteBase = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
};
export type TenantFull = AgenteBase & {
  cerebro: Cerebro;
  promptOverride?: string;
};
type Msg = { role: "user" | "assistant"; content: string };
type LeadItem = { nombre: string; interes?: string; etapa: string };

type ClienteFlota = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
  model: string;
  conversaciones: number;
  leads: number;
  ganados: number;
  citas: number;
  costoUsd: number;
  margenUsd: number;
  margenPct: number | null;
};

const COLORES = ["#5EEAD4", "#F472B6", "#93C5FD", "#FFC93F", "#A78BFA", "#FF6B2C", "#C6F24E"];
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function modeloFriendly(m?: string): string {
  const s = (m || "").toLowerCase();
  if (s.includes("sonnet")) return "Claude Sonnet 5";
  if (s.includes("haiku")) return "Claude Haiku 4.5";
  if (s.includes("opus")) return "Claude Opus";
  return "Claude";
}

// ============================================================
// FLOTA — overview de todos los agentes (admin)
// ============================================================
export function FlotaAgentes() {
  const { entrarComo } = useAccount();
  const [clientes, setClientes] = useState<ClienteFlota[] | null>(null);

  useEffect(() => {
    fetch("/api/admin/clientes")
      .then((r) => r.json())
      .then((d) => setClientes(d.clientes ?? []))
      .catch(() => setClientes([]));
  }, []);

  if (!clientes)
    return (
      <div className="flota-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="sk sk-card" />
        ))}
      </div>
    );
  if (clientes.length === 0) {
    return (
      <div className="panel ag-empty">
        Todavía no hay agentes. Creá el primero desde <strong>Subcuentas</strong>.
      </div>
    );
  }

  return (
    <div className="flota-grid">
      {clientes.map((c) => {
        const activo = c.conversaciones > 0;
        return (
          <div key={c.id} className="panel flota-card">
            <div className="flota-head">
              <div className="ag-avatar" style={{ background: c.color }}>
                {c.agente[0]}
              </div>
              <div className="flota-id">
                <div className="flota-agente">{c.agente}</div>
                <div className="flota-neg">
                  {c.nombre} · {c.rubro}
                </div>
              </div>
              <span className={`salud-pill ${activo ? "verde" : "ambar"}`}>
                {activo ? "Activo" : "Sin actividad"}
              </span>
            </div>

            <div className="flota-stats">
              <div className="flota-stat">
                <span className="flota-num">{c.conversaciones}</span>
                <span className="flota-lbl">conv.</span>
              </div>
              <div className="flota-stat">
                <span className="flota-num">{c.leads}</span>
                <span className="flota-lbl">leads</span>
              </div>
              <div className="flota-stat">
                <span className="flota-num">{c.citas}</span>
                <span className="flota-lbl">citas</span>
              </div>
            </div>

            <div className="flota-foot">
              <span className="flota-model">{c.model.replace("claude-", "")}</span>
              {c.tipo === "cliente" && (
                <span className={`flota-margen ${c.margenUsd >= 0 ? "margen-pos" : "margen-neg"}`}>
                  {USD.format(c.margenUsd)}
                </span>
              )}
              <button className="btn-ghost-sm flota-probar" onClick={() => entrarComo(c.id)}>
                Probar →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// TESTER — conversar con un agente en vivo
// ============================================================
export function Tester({ tenant }: { tenant: AgenteBase }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [convId, setConvId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rated, setRated] = useState<Record<number, "up" | "down">>({});
  const [feedbackFor, setFeedbackFor] = useState<number | null>(null);
  const [fbText, setFbText] = useState("");
  const [correcciones, setCorrecciones] = useState<{ pregunta: string; deberia: string }[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const greeting =
    tenant.tipo === "interno"
      ? `¡Hola! 😊 Soy ${tenant.agente}, la asistente de ${tenant.nombre}. Cuéntame, ¿qué negocio tienes?`
      : `¡Hola! Te saluda ${tenant.agente}, de ${tenant.nombre} 😊 ¿En qué te puedo ayudar hoy?`;

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`/api/agentes/${tenant.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, conversacionId: convId }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", content: "⚠️ " + data.error }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
        if (data.conversacionId) setConvId(data.conversacionId);
        if (data.events?.length) setEvents((ev) => [...ev, ...data.events]);
        if (data.leads) setLeads(data.leads);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Error de conexión." }]);
    }
    setLoading(false);
  }

  function reiniciar() {
    setMessages([]);
    setEvents([]);
    setConvId(undefined);
    setRated({});
    setFeedbackFor(null);
  }

  function calificar(i: number, up: boolean) {
    setRated((r) => ({ ...r, [i]: up ? "up" : "down" }));
    setFeedbackFor(up ? null : i);
  }

  function guardarCorreccion(i: number) {
    if (!fbText.trim()) return;
    const pregunta = messages[i - 1]?.content ?? "";
    setCorrecciones((c) => [{ pregunta, deberia: fbText.trim() }, ...c]);
    setRated((r) => ({ ...r, [i]: "down" }));
    setFbText("");
    setFeedbackFor(null);
  }

  return (
    <div className="tester-grid">
      <section className="panel chat tester-chat">
        <div className="chat-head">
          <div className="avatar" style={{ background: tenant.color }}>
            {tenant.agente[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div className="chat-name">{tenant.agente}</div>
            <div className="chat-status">
              <span className="online-dot" /> {tenant.nombre} · modo prueba
            </div>
          </div>
          <button className="btn-ghost-sm" onClick={reiniciar}>
            ↺ Reiniciar
          </button>
        </div>

        <div className="messages">
          <div className="bubble assistant">{greeting}</div>
          {messages.map((m, i) => (
            <div key={i} className={`bubble-wrap ${m.role === "user" ? "u" : "a"}`}>
              <div className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>{m.content}</div>
              {m.role === "assistant" && (
                <div className="rate">
                  <button
                    className={`rate-btn ${rated[i] === "up" ? "on" : ""}`}
                    title="Buena respuesta"
                    onClick={() => calificar(i, true)}
                  >
                    👍
                  </button>
                  <button
                    className={`rate-btn ${rated[i] === "down" ? "on down" : ""}`}
                    title="Se puede mejorar"
                    onClick={() => calificar(i, false)}
                  >
                    👎
                  </button>
                  {rated[i] === "up" && <span className="rate-note">¡Gracias!</span>}
                  {rated[i] === "down" && feedbackFor !== i && <span className="rate-note">Anotado ✍️</span>}
                </div>
              )}
              {feedbackFor === i && (
                <div className="rate-fb">
                  <textarea
                    value={fbText}
                    onChange={(e) => setFbText(e.target.value)}
                    rows={2}
                    placeholder="¿Qué debió responder? Esto afina al agente."
                  />
                  <div className="rate-fb-actions">
                    <button className="btn-ghost-sm" onClick={() => setFeedbackFor(null)}>
                      Cancelar
                    </button>
                    <button className="btn-primary-lg btn-md" onClick={() => guardarCorreccion(i)}>
                      Guardar corrección
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="bubble assistant typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Escríbele a ${tenant.agente} como si fueras un cliente…`}
            rows={1}
          />
          <button onClick={send} disabled={loading || !input.trim()}>
            Enviar
          </button>
        </div>
      </section>

      <aside className="side">
        <div className="panel side-block">
          <div className="side-title">
            Leads de {tenant.nombre} <span className="pill">{leads.length}</span>
          </div>
          {leads.length === 0 ? (
            <p className="empty">Cuando el agente capture un lead, aparecerá acá y en el Kanban.</p>
          ) : (
            <div className="leads">
              {leads.slice(0, 5).map((l, i) => (
                <div key={i} className="lead-card">
                  <div className="lead-name">{l.nombre}</div>
                  {l.interes && <div className="lead-line">💬 {l.interes}</div>}
                  <div className="lead-stage">{l.etapa}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="panel side-block">
          <div className="side-title">Actividad del agente</div>
          {events.length === 0 ? (
            <p className="empty">Las acciones (capturar lead, agendar, derivar) aparecen acá en vivo.</p>
          ) : (
            <ul className="events">
              {events.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel side-block">
          <div className="side-title">
            Correcciones <span className="pill">{correcciones.length}</span>
          </div>
          {correcciones.length === 0 ? (
            <p className="empty">
              Califica cada respuesta con 👍 / 👎. Tus correcciones afinan cómo responde el agente.
            </p>
          ) : (
            <div className="correcciones">
              {correcciones.map((c, i) => (
                <div key={i} className="correccion">
                  {c.pregunta && <div className="correccion-q">“{c.pregunta}”</div>}
                  <div className="correccion-d">✍️ {c.deberia}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ============================================================
// NUEVO AGENTE — alta (admin)
// ============================================================
export function NuevoAgente({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: AgenteBase) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    agente: "",
    rubro: "",
    color: COLORES[0],
    descripcion: "",
    horario: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Crear desde la web: la IA lee el sitio y arma la ficha (servicios, FAQ…).
  const [url, setUrl] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [tono, setTono] = useState("");
  const [extra, setExtra] = useState<{ servicios: Servicio[]; faq: Faq[]; reglas: string }>({
    servicios: [],
    faq: [],
    reglas: "",
  });

  async function analizarUrl() {
    if (!url.trim()) return;
    setAnalizando(true);
    setError("");
    setAviso("");
    try {
      const d = await fetch("/api/agentes/desde-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).then((r) => r.json());
      if (d.error) {
        setError(d.error);
      } else {
        const f = d.ficha ?? {};
        setForm((prev) => ({
          ...prev,
          nombre: f.nombre || prev.nombre,
          agente: f.agente || prev.agente,
          rubro: f.rubro || prev.rubro,
          descripcion: f.descripcion || prev.descripcion,
          horario: f.horario || prev.horario,
        }));
        if (typeof f.tono === "string") setTono(f.tono);
        setExtra({
          servicios: Array.isArray(f.servicios) ? f.servicios : [],
          faq: Array.isArray(f.faq) ? f.faq : [],
          reglas: typeof f.reglas === "string" ? f.reglas : "",
        });
        const ns = Array.isArray(f.servicios) ? f.servicios.length : 0;
        const nf = Array.isArray(f.faq) ? f.faq.length : 0;
        setAviso(
          `✓ Ficha lista: ${ns} servicio${ns === 1 ? "" : "s"} y ${nf} pregunta${nf === 1 ? "" : "s"}. Revísala y crea el agente.`,
        );
      }
    } catch {
      setError("No pudimos analizar el sitio. Intenta de nuevo.");
    }
    setAnalizando(false);
  }

  async function crear() {
    if (!form.nombre.trim() || !form.agente.trim() || !form.rubro.trim()) {
      setError("Completa al menos negocio, nombre del agente y rubro.");
      return;
    }
    setGuardando(true);
    setError("");
    const d = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, tono, cerebro: extra }),
    }).then((r) => r.json());
    setGuardando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    onCreated(d.tenant);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nuevo agente</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="url-fill">
          <div className="url-fill-label">⚡ Crear desde la web</div>
          <p className="url-fill-desc">
            Pega el sitio del negocio y la IA arma la ficha (servicios, precios, preguntas) en segundos.
            Ideal para armar demos.
          </p>
          <div className="url-fill-row">
            <input
              placeholder="clinicaejemplo.cl"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  analizarUrl();
                }
              }}
            />
            <button
              className="btn-primary-lg btn-md"
              onClick={analizarUrl}
              disabled={analizando || !url.trim()}
            >
              {analizando ? "Analizando…" : "Rellenar"}
            </button>
          </div>
          {aviso && <div className="url-fill-ok">{aviso}</div>}
        </div>

        <div className="cb-row">
          <label className="field">
            <span>Negocio *</span>
            <input
              placeholder="Ej: Clínica Dental Sonrisa"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Nombre del agente *</span>
            <input
              placeholder="Ej: Valentina"
              value={form.agente}
              onChange={(e) => setForm({ ...form, agente: e.target.value })}
            />
          </label>
        </div>
        <div className="cb-row">
          <label className="field">
            <span>Rubro *</span>
            <input
              placeholder="Ej: Clínica dental"
              value={form.rubro}
              onChange={(e) => setForm({ ...form, rubro: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Horario (opcional)</span>
            <input
              placeholder="Ej: Lun a Vie 9:00–19:00"
              value={form.horario}
              onChange={(e) => setForm({ ...form, horario: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Descripción breve del negocio (opcional)</span>
          <textarea
            rows={2}
            placeholder="Qué hace, dónde está, qué lo distingue…"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />
        </label>
        <div className="field">
          <span>Color del agente</span>
          <div className="swatches">
            {COLORES.map((c) => (
              <button
                key={c}
                className={`swatch ${form.color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setForm({ ...form, color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>
        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={crear} disabled={guardando}>
            {guardando ? "Creando…" : "Crear agente"}
          </button>
          <span className="modal-hint">
            Después complétale servicios y precios en la pestaña <strong>Cerebros</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CEREBRO EDITOR — editar el cerebro de cada negocio (admin)
// ============================================================
export function CerebroEditor() {
  const [tenants, setTenants] = useState<TenantFull[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [cerebro, setCerebro] = useState<Cerebro | null>(null);
  const [prompt, setPrompt] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const sel = tenants.find((t) => t.id === selId) ?? null;

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => {
        const ts: TenantFull[] = d.tenants ?? [];
        setTenants(ts);
        setSelId((prev) => prev || ts[0]?.id || "");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selId) return;
    fetch(`/api/tenants/${selId}`)
      .then((r) => r.json())
      .then((d) => {
        setCerebro(d.tenant?.cerebro ?? null);
        setPrompt(d.prompt ?? "");
        setOk(false);
      })
      .catch(() => {});
  }, [selId]);

  async function guardar() {
    if (!sel || !cerebro) return;
    setGuardando(true);
    const d = await fetch(`/api/tenants/${sel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cerebro }),
    }).then((r) => r.json());
    if (d.prompt) setPrompt(d.prompt);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  function upd<K extends keyof Cerebro>(key: K, value: Cerebro[K]) {
    setCerebro((c) => (c ? { ...c, [key]: value } : c));
  }

  return (
    <div>
      <div className="cerebro-bar">
        <span className="cerebro-bar-label">Negocio</span>
        <select className="con-select" value={selId} onChange={(e) => setSelId(e.target.value)}>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.agente} · {t.nombre}
            </option>
          ))}
        </select>
      </div>

      {sel?.promptOverride ? (
        <div className="panel cb-panel">
          <div className="cb-note">
            🔒 <strong>{sel.agente}</strong> es el agente interno de Lead Lab y usa un prompt curado a
            mano. Se edita en el código (<code>lib/store.ts · LIA_PROMPT</code>).
          </div>
          <details className="cb-preview" open>
            <summary>Ver su prompt</summary>
            <pre>{prompt}</pre>
          </details>
        </div>
      ) : sel && cerebro ? (
        <div className="cb-grid">
          <div className="panel cb-panel">
            <label className="field">
              <span>Descripción del negocio</span>
              <textarea
                rows={3}
                value={cerebro.descripcion}
                onChange={(e) => upd("descripcion", e.target.value)}
              />
            </label>
            <div className="cb-row">
              <label className="field">
                <span>Tono del agente</span>
                <textarea rows={2} value={cerebro.tono} onChange={(e) => upd("tono", e.target.value)} />
              </label>
              <label className="field">
                <span>Horario</span>
                <textarea
                  rows={2}
                  value={cerebro.horario}
                  onChange={(e) => upd("horario", e.target.value)}
                />
              </label>
            </div>

            <div className="cb-section">
              <div className="cb-section-head">
                <span>Servicios y precios</span>
                <button
                  className="btn-ghost-sm"
                  onClick={() =>
                    upd("servicios", [...cerebro.servicios, { nombre: "", precio: "", detalle: "" }])
                  }
                >
                  + Agregar
                </button>
              </div>
              {cerebro.servicios.map((s, i) => (
                <div key={i} className="cb-item-row">
                  <input
                    placeholder="Servicio"
                    value={s.nombre}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], nombre: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <input
                    placeholder="Precio"
                    className="cb-precio"
                    value={s.precio}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], precio: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <input
                    placeholder="Detalle (opcional)"
                    value={s.detalle ?? ""}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], detalle: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <button
                    className="cb-del"
                    title="Eliminar"
                    onClick={() =>
                      upd(
                        "servicios",
                        cerebro.servicios.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="cb-section">
              <div className="cb-section-head">
                <span>Preguntas frecuentes</span>
                <button
                  className="btn-ghost-sm"
                  onClick={() => upd("faq", [...cerebro.faq, { pregunta: "", respuesta: "" }])}
                >
                  + Agregar
                </button>
              </div>
              {cerebro.faq.map((f, i) => (
                <div key={i} className="cb-item-row cb-faq-row">
                  <input
                    placeholder="Pregunta"
                    value={f.pregunta}
                    onChange={(e) => {
                      const arr = [...cerebro.faq];
                      arr[i] = { ...arr[i], pregunta: e.target.value };
                      upd("faq", arr);
                    }}
                  />
                  <input
                    placeholder="Respuesta"
                    value={f.respuesta}
                    onChange={(e) => {
                      const arr = [...cerebro.faq];
                      arr[i] = { ...arr[i], respuesta: e.target.value };
                      upd("faq", arr);
                    }}
                  />
                  <button
                    className="cb-del"
                    title="Eliminar"
                    onClick={() =>
                      upd(
                        "faq",
                        cerebro.faq.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <label className="field">
              <span>Reglas del negocio (qué debe y no debe hacer)</span>
              <textarea rows={3} value={cerebro.reglas} onChange={(e) => upd("reglas", e.target.value)} />
            </label>

            <div className="cb-actions">
              <button className="btn-primary-lg" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              {ok && <span className="cb-ok">✓ Guardado — el agente ya lo está usando</span>}
            </div>
          </div>

          <details className="panel cb-preview">
            <summary>Vista previa del prompt que recibe el agente</summary>
            <pre>{prompt}</pre>
          </details>
        </div>
      ) : (
        <div className="con-loading">Cargando…</div>
      )}
    </div>
  );
}

// ---- Íconos de capacidades (deben seguir a las tools de lib/agent.ts) ----
const IconCapturar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6c1 0 1.9.2 2.7.6" />
    <path d="M17 13v6M14 16h6" />
  </svg>
);
const IconAgendar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    <path d="M9.5 14.5l1.7 1.7 3.3-3.4" />
  </svg>
);
const IconDerivar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="7" cy="8" r="3" />
    <path d="M2.5 19c.5-2.8 2.4-4.3 4.5-4.3" />
    <path d="M14 8h6M17 5l3 3-3 3" />
    <circle cx="17.5" cy="17" r="2.5" />
  </svg>
);

// ============================================================
// FICHA AGENTE — cara CLIENTE (lectura amable, nunca expone el prompt)
// ============================================================
export function FichaAgente({ tenant, cerebro }: { tenant: AgenteBase; cerebro: Cerebro | null }) {
  const [datos, setDatos] = useState<{ model: string; costoUsd: number } | null>(null);
  useEffect(() => {
    fetch("/api/admin/clientes")
      .then((r) => r.json())
      .then((d) => {
        const row = (d.clientes ?? []).find((c: { id: string }) => c.id === tenant.id);
        if (row) setDatos({ model: row.model, costoUsd: row.costoUsd });
      })
      .catch(() => {});
  }, [tenant.id]);

  const caps = [
    {
      icon: IconCapturar,
      name: "Capturar lead",
      desc: "Guarda nombre, interés y valor estimado apenas los detecta, y lo deja en tu Kanban.",
    },
    {
      icon: IconAgendar,
      name: "Agendar",
      desc: "Reserva una hora cuando el cliente acepta y la anota en tu agenda.",
    },
    {
      icon: IconDerivar,
      name: "Derivar a una persona",
      desc: "Te pasa la conversación ante reclamos, urgencias o si piden hablar con un humano.",
    },
  ];
  const servicios = (cerebro?.servicios ?? []).filter((s) => s.nombre);
  const faq = (cerebro?.faq ?? []).filter((f) => f.pregunta);
  const modelo = modeloFriendly(datos?.model);
  const costoMes = (datos?.costoUsd ?? 0) * USD_CLP;
  const cobrado = costoMes * (1 + MARKUP_TOKENS_DEFAULT);

  return (
    <div className="agente-ficha">
      <div className="panel agente-cabecera">
        <div className="agente-cab-avatar" style={{ background: tenant.color }}>
          {tenant.agente[0]}
        </div>
        <div>
          <div className="agente-cab-nombre">{tenant.agente}</div>
          <div className="agente-cab-rubro">
            {tenant.nombre} · {tenant.rubro}
          </div>
        </div>
      </div>

      <div className="panel agente-frase">
        Soy <span className="q">{tenant.agente}</span>, la asistente con IA de{" "}
        <strong>{tenant.nombre}</strong>. Atiendo por WhatsApp al instante, respondo dudas con tu
        información oficial, tomo los datos de cada interesado y agendo — 24/7, sin que se te escape
        ningún lead.
      </div>

      <div className="panel agente-block">
        <div className="agente-block-title">Acciones y movimientos en el CRM</div>
        <div className="agente-caps">
          {caps.map((c) => (
            <div key={c.name} className="agente-cap">
              <div className="agente-cap-head">
                <span className="agente-cap-icon">{c.icon}</span>
                <span className="agente-cap-name">{c.name}</span>
                <span className="pill" style={{ marginLeft: "auto" }}>
                  Automático
                </span>
              </div>
              <div className="agente-cap-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel agente-block">
        <div className="agente-block-title">Motor de IA</div>
        <div className="agente-kv">
          <div className="agente-kv-row">
            <span className="k">Modelo</span>
            <span className="v">{modelo}</span>
          </div>
          {datos && (
            <>
              <div className="agente-kv-row">
                <span className="k">Consumo de IA (mes)</span>
                <span className="v">{CLP.format(Math.round(costoMes))}</span>
              </div>
              <div className="agente-kv-row">
                <span className="k">Se factura al cliente</span>
                <span className="v" style={{ color: "var(--t-lime)" }}>
                  {CLP.format(Math.round(cobrado))}
                </span>
              </div>
            </>
          )}
        </div>
        <p className="agente-cap-desc" style={{ marginTop: 10 }}>
          Facturación transparente: el consumo real de IA + {Math.round(MARKUP_TOKENS_DEFAULT * 100)}% de
          servicio.
        </p>
      </div>

      {(cerebro?.tono || cerebro?.horario) && (
        <div className="panel agente-block">
          <div className="agente-block-title">Cómo habla</div>
          <div className="agente-kv">
            {cerebro?.tono && (
              <div className="agente-kv-row">
                <span className="k">Tono</span>
                <span className="v">{cerebro.tono}</span>
              </div>
            )}
            {cerebro?.horario && (
              <div className="agente-kv-row">
                <span className="k">Horario</span>
                <span className="v">{cerebro.horario}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="panel agente-block">
        <div className="agente-block-title">Base de conocimiento</div>
        <p className="agente-cap-desc" style={{ marginBottom: servicios.length ? 12 : 0 }}>
          Los temas con los que responde{servicios.length ? "" : " se cargan desde su cerebro"}.
        </p>
        {servicios.length > 0 && (
          <div className="kb-tags">
            {servicios.map((s, i) => (
              <span key={i} className="kb-tag">
                {s.nombre}
              </span>
            ))}
          </div>
        )}
        <div className="agente-kv" style={{ marginTop: servicios.length ? 14 : 0 }}>
          <div className="agente-kv-row">
            <span className="k">Reglas</span>
            <span className="v">{cerebro?.reglas ? "Personalizadas" : "Base"}</span>
          </div>
        </div>
      </div>

      {faq.length > 0 && (
        <div className="panel agente-block">
          <div className="agente-block-title">Preguntas que resuelve</div>
          <div className="agente-faq">
            {faq.map((f, i) => (
              <details key={i}>
                <summary>{f.pregunta}</summary>
                <p>{f.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="agente-salud">
        <span className="pill">Base: {servicios.length} temas</span>
        <span className="pill">FAQ: {faq.length}</span>
        <span className="pill">{cerebro?.reglas ? "Reglas propias" : "Reglas base"}</span>
      </div>

      <div className="agente-nota">
        Para ajustar el conocimiento, las acciones o las reglas de {tenant.agente}, escríbenos y lo
        actualizamos.
      </div>
    </div>
  );
}
