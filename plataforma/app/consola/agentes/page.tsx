"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount } from "../_account/AccountContext";

type Tenant = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
};
type Msg = { role: "user" | "assistant"; content: string };
type LeadItem = { nombre: string; interes?: string; etapa: string };

const COLORES = ["#5EEAD4", "#F472B6", "#93C5FD", "#FFC93F", "#A78BFA", "#FF6B2C", "#C6F24E"];

export default function ProbarAgentes() {
  const { tenants, scope, isAdmin, current, refreshTenants } = useAccount();
  const [sel, setSel] = useState<Tenant | null>(null);
  const [creando, setCreando] = useState(false);

  const visibles = isAdmin ? tenants : tenants.filter((t) => t.id === scope);

  // En modo cliente el agente es el propio: autoseleccionar.
  useEffect(() => {
    if (!isAdmin) setSel(current);
  }, [isAdmin, current]);

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Probar agentes</h1>
          <p className="con-sub">
            Conversa con cualquier agente como si fueras un cliente. Cada prueba queda registrada en el
            Inbox y los leads capturados caen al Kanban.
          </p>
        </div>
      </header>

      <div className="ag-cards">
        {visibles.map((t) => (
          <button
            key={t.id}
            className={`ag-card ${sel?.id === t.id ? "active" : ""}`}
            onClick={() => setSel(t)}
          >
            <div className="ag-avatar" style={{ background: t.color }}>
              {t.agente[0]}
            </div>
            <div className="ag-info">
              <div className="ag-name">{t.agente}</div>
              <div className="ag-biz">
                {t.nombre} · {t.rubro}
              </div>
            </div>
            <span className={`ag-tag ${t.tipo}`}>{t.tipo === "interno" ? "Interno" : "Cliente"}</span>
          </button>
        ))}
        {isAdmin && (
          <button className="ag-card ag-card-new" onClick={() => setCreando(true)}>
            <div className="ag-avatar ag-avatar-new">+</div>
            <div className="ag-info">
              <div className="ag-name">Nuevo agente</div>
              <div className="ag-biz">Onboardea un cliente en minutos</div>
            </div>
          </button>
        )}
      </div>

      {creando && (
        <NuevoAgente
          onClose={() => setCreando(false)}
          onCreated={(t) => {
            setCreando(false);
            refreshTenants();
            setSel(t);
          }}
        />
      )}

      {sel ? (
        <Tester key={sel.id} tenant={sel} />
      ) : (
        <div className="panel ag-empty">
          <p>👆 Elige un agente para probarlo en vivo, o crea uno nuevo.</p>
        </div>
      )}
    </div>
  );
}

function NuevoAgente({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: Tenant) => void;
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
      body: JSON.stringify(form),
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
            Después complétale servicios y precios en la pestaña <strong>Cerebro</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}

function Tester({ tenant }: { tenant: Tenant }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [convId, setConvId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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
            <div key={i} className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
              {m.content}
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
      </aside>
    </div>
  );
}
