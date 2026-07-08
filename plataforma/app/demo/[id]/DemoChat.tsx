"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function DemoChat({
  id,
  nombre,
  agente,
  rubro,
  color,
}: {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  color: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const greeting = `¡Hola! 👋 Soy ${agente}, de ${nombre}. Cuéntame en qué te puedo ayudar — precios, una cotización o agendar una visita.`;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, events]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const d = await fetch(`/api/demo/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      }).then((r) => r.json());
      if (d.error) {
        setMessages((m) => [...m, { role: "assistant", content: "⚠️ " + d.error }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: d.reply || "…" }]);
        if (d.events?.length) setEvents((ev) => [...ev, ...d.events]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Error de conexión." }]);
    }
    setLoading(false);
  }

  return (
    <div className="demo-shell">
      <div className="demo-card">
        <div className="demo-head">
          <div className="demo-avatar" style={{ background: color }}>
            {agente[0]}
          </div>
          <div className="demo-head-info">
            <div className="demo-name">{agente}</div>
            <div className="demo-sub">
              <span className="online-dot" /> {nombre} · {rubro}
            </div>
          </div>
        </div>

        <div className="demo-msgs">
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
          {events.length > 0 && (
            <div className="demo-events">
              {events.map((e, i) => (
                <div key={i} className="demo-event">
                  {e}
                </div>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="demo-composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Escríbele a ${agente}…`}
            rows={1}
          />
          <button onClick={send} disabled={loading || !input.trim()} aria-label="Enviar">
            Enviar
          </button>
        </div>
      </div>

      <a className="demo-badge" href="https://leadlab.cl" target="_blank" rel="noopener noreferrer">
        Con tecnología de <strong>Lead<span className="demo-badge-b">Lab</span></strong> · agentes de IA que
        atienden tu WhatsApp 24/7
      </a>
    </div>
  );
}
