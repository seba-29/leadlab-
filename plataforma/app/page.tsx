"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };
type Lead = {
  nombre?: string;
  negocio?: string;
  pautea_en_meta?: boolean;
  canal?: string;
  interes?: string;
  etapa?: string;
};

const GREETING =
  "¡Hola! 😊 Soy Lía, la asistente de Lead Lab. Cuéntame, ¿qué negocio tienes? Así te muestro cómo podríamos ayudarte a no perder ni un cliente.";

export default function Playground() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages((m) => [...m, { role: "assistant", content: "⚠️ " + data.error }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply || "…" }]);
        if (data.events?.length) setEvents((ev) => [...ev, ...data.events]);
        if (data.leads) setLeads(data.leads);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "⚠️ Error de conexión con el servidor." },
      ]);
    }
    setLoading(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <main className="shell">
      <div className="bg-glow" aria-hidden />
      <header className="topbar">
        <div className="brand">
          Lead<span className="brand-accent">Lab</span>
          <span className="brand-dot" />
        </div>
        <div className="topbar-tag">Playground · Agente Lía</div>
      </header>

      <div className="grid">
        {/* Chat */}
        <section className="panel chat">
          <div className="chat-head">
            <div className="avatar">L</div>
            <div>
              <div className="chat-name">Lía</div>
              <div className="chat-status">
                <span className="online-dot" /> Recepcionista IA · en línea 24/7
              </div>
            </div>
          </div>

          <div className="messages">
            <Bubble role="assistant">{GREETING}</Bubble>
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role}>
                {m.content}
              </Bubble>
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
              onKeyDown={onKeyDown}
              placeholder="Escríbele a Lía… (ej: tengo una clínica estética)"
              rows={1}
            />
            <button onClick={send} disabled={loading || !input.trim()}>
              Enviar
            </button>
          </div>
        </section>

        {/* Panel lateral: leads + eventos */}
        <aside className="side">
          <div className="panel side-block">
            <div className="side-title">
              Leads capturados <span className="pill">{leads.length}</span>
            </div>
            {leads.length === 0 ? (
              <p className="empty">
                Conversa con Lía y verás cómo va calificando y capturando cada lead acá. 👇
              </p>
            ) : (
              <div className="leads">
                {leads.map((l, i) => (
                  <div key={i} className="lead-card">
                    <div className="lead-name">{l.nombre || "Sin nombre"}</div>
                    {l.negocio && <div className="lead-line">🏷️ {l.negocio}</div>}
                    {l.interes && <div className="lead-line">💬 {l.interes}</div>}
                    {typeof l.pautea_en_meta === "boolean" && (
                      <div className="lead-line">
                        📣 {l.pautea_en_meta ? "Invierte en ads" : "No invierte en ads"}
                      </div>
                    )}
                    <div className="lead-stage">{l.etapa || "nuevo"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel side-block">
            <div className="side-title">Actividad del agente</div>
            {events.length === 0 ? (
              <p className="empty">Las acciones de Lía (capturar, agendar, derivar) aparecen aquí.</p>
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
    </main>
  );
}

function Bubble({ role, children }: { role: "user" | "assistant"; children: React.ReactNode }) {
  return <div className={`bubble ${role}`}>{children}</div>;
}
