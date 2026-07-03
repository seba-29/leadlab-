"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";

type ConvItem = {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tenantColor: string;
  contactoNombre: string;
  contactoTelefono?: string;
  canal: "whatsapp" | "playground";
  estado: "bot" | "humano" | "cerrada";
  actualizado: string;
  ultimoMensaje: string;
  ultimoAutor: string | null;
};
type Mensaje = { id: string; autor: "cliente" | "bot" | "humano"; texto: string; creado: string };

function hace(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export default function Inbox() {
  const { scope, isAdmin, tenants } = useAccount();
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [filtro, setFiltro] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conv, setConv] = useState<ConvItem | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function cargarLista(tid: string | null = isAdmin ? filtro || null : scope) {
    const d = await fetch(scopedUrl("/api/conversaciones", tid)).then((r) => r.json());
    setConvs(d.conversaciones ?? []);
  }

  async function cargarDetalle(id: string) {
    const d = await fetch(`/api/conversaciones/${id}`).then((r) => r.json());
    if (d.mensajes) setMensajes(d.mensajes);
    if (d.conversacion) {
      setConv((prev) => ({ ...(prev ?? ({} as ConvItem)), ...d.conversacion }));
    }
  }

  useEffect(() => {
    cargarLista();
  }, [filtro, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selId) return;
    const item = convs.find((c) => c.id === selId) ?? null;
    setConv(item);
    cargarDetalle(selId);
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  async function accion(a: "tomar" | "soltar" | "responder") {
    if (!selId) return;
    setEnviando(true);
    const body: any = { accion: a };
    if (a === "responder") {
      if (!texto.trim()) {
        setEnviando(false);
        return;
      }
      body.texto = texto.trim();
    }
    const d = await fetch(`/api/conversaciones/${selId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    if (d.mensajes) setMensajes(d.mensajes);
    if (d.conversacion) setConv((prev) => (prev ? { ...prev, ...d.conversacion } : prev));
    if (a === "responder") setTexto("");
    setEnviando(false);
    cargarLista();
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">{isAdmin ? "Inbox" : "Conversaciones"}</h1>
          <p className="con-sub">
            {isAdmin
              ? "Todas las conversaciones de todos tus clientes. Toma una para pausar el bot y responder tú."
              : "Tus conversaciones. Toma una para pausar el agente y responder tú."}
          </p>
        </div>
        {isAdmin && (
          <select className="con-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los clientes</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}
      </header>

      <div className="ib-grid">
        <section className="panel ib-list">
          {convs.length === 0 && <p className="empty ib-empty">Sin conversaciones aún.</p>}
          {convs.map((c) => (
            <button
              key={c.id}
              className={`ib-item ${selId === c.id ? "active" : ""}`}
              onClick={() => setSelId(c.id)}
            >
              <div className="ib-avatar" style={{ background: c.tenantColor }}>
                {c.contactoNombre[0]}
              </div>
              <div className="ib-item-body">
                <div className="ib-item-top">
                  <span className="ib-item-name">{c.contactoNombre}</span>
                  <span className="ib-item-time">{hace(c.actualizado)}</span>
                </div>
                <div className="ib-item-preview">
                  {c.ultimoAutor === "cliente" ? "" : c.ultimoAutor === "humano" ? "Tú: " : "🤖 "}
                  {c.ultimoMensaje}
                </div>
                <div className="ib-item-meta">
                  <span className="ib-canal">{c.canal === "whatsapp" ? "WhatsApp" : "Playground"}</span>
                  {isAdmin && <span className="ib-tenant">{c.tenantNombre}</span>}
                  <span className={`estado-pill estado-${c.estado}`}>
                    {c.estado === "bot" ? "🤖 agente" : c.estado === "humano" ? "👤 humano" : "cerrada"}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </section>

        <section className="panel ib-chat">
          {!conv ? (
            <div className="ib-placeholder">
              <p>👈 Elige una conversación para verla completa.</p>
            </div>
          ) : (
            <>
              <div className="chat-head">
                <div className="avatar" style={{ background: conv.tenantColor }}>
                  {conv.contactoNombre[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="chat-name">{conv.contactoNombre}</div>
                  <div className="chat-status">
                    {conv.tenantNombre} · {conv.canal === "whatsapp" ? "WhatsApp" : "Playground"}
                    {conv.contactoTelefono ? ` · ${conv.contactoTelefono}` : ""}
                  </div>
                </div>
                {conv.estado === "bot" ? (
                  <button className="btn-ghost-sm" onClick={() => accion("tomar")} disabled={enviando}>
                    ✋ Tomar conversación
                  </button>
                ) : (
                  <button className="btn-ghost-sm" onClick={() => accion("soltar")} disabled={enviando}>
                    🤖 Devolver al agente
                  </button>
                )}
              </div>

              <div className="messages ib-messages">
                {mensajes.map((m) => (
                  <div
                    key={m.id}
                    className={`bubble ${m.autor === "cliente" ? "assistant" : "user"} ${
                      m.autor === "humano" ? "humano" : ""
                    }`}
                  >
                    {m.autor !== "cliente" && (
                      <span className="msg-autor">{m.autor === "bot" ? "🤖 Agente" : "👤 Tú"}</span>
                    )}
                    {m.texto}
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <div className="composer">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      accion("responder");
                    }
                  }}
                  placeholder={
                    conv.estado === "bot"
                      ? "Escribe para responder tú (esto pausa el agente en esta conversación)…"
                      : "Responde como humano…"
                  }
                  rows={1}
                />
                <button onClick={() => accion("responder")} disabled={enviando || !texto.trim()}>
                  Enviar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
