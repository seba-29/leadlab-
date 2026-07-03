"use client";

import { useEffect, useRef, useState } from "react";

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

export default function ProbarAgentes() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [sel, setSel] = useState<Tenant | null>(null);

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => setTenants(d.tenants ?? []))
      .catch(() => {});
  }, []);

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
        {tenants.map((t) => (
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
        <div className="ag-card ag-card-new" title="Disponible en la siguiente fase">
          <div className="ag-avatar ag-avatar-new">+</div>
          <div className="ag-info">
            <div className="ag-name">Nuevo agente</div>
            <div className="ag-biz">Se crea al onboardear un cliente</div>
          </div>
        </div>
      </div>

      {sel ? (
        <Tester key={sel.id} tenant={sel} />
      ) : (
        <div className="panel ag-empty">
          <p>👆 Elige un agente para probarlo en vivo.</p>
        </div>
      )}
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
