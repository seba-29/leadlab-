"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";
import { Dropdown } from "../_components/Dropdown";

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
type TenantMin = { id: string; nombre: string };

const IconSearch = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

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

function dentroDe(iso: string, rango: string): boolean {
  if (rango === "todo") return true;
  const t = new Date(iso).getTime();
  if (rango === "hoy") return new Date(iso).toDateString() === new Date().toDateString();
  const dias = rango === "7d" ? 7 : 30;
  return t >= Date.now() - dias * 86400000;
}

const CANAL_CONV: Record<string, { label: string; color: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366" },
  instagram: { label: "Instagram", color: "#E1306C" },
  messenger: { label: "Facebook", color: "#1877F2" },
  playground: { label: "Prueba", color: "#9a938c" },
};
function CanalChip({ canal }: { canal: string }) {
  const ch = CANAL_CONV[canal] ?? { label: canal, color: "#9a938c" };
  return (
    <span
      className="canal-chip"
      style={{ color: ch.color, borderColor: `${ch.color}55`, background: `${ch.color}1a` }}
    >
      {ch.label}
    </span>
  );
}

export default function Inbox() {
  const { scope, isAdmin, tenants } = useAccount();
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [filtroTenant, setFiltroTenant] = useState("");
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [fCanal, setFCanal] = useState("");
  const [fFecha, setFFecha] = useState("todo");
  const [nuevo, setNuevo] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [conv, setConv] = useState<ConvItem | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function cargarLista(tid: string | null = isAdmin ? filtroTenant || null : scope) {
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
  }, [filtroTenant, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selId) return;
    const item = convs.find((c) => c.id === selId) ?? null;
    setConv(item);
    cargarDetalle(selId);
  }, [selId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    return convs.filter((c) => {
      if (fEstado && c.estado !== fEstado) return false;
      if (fCanal && c.canal !== fCanal) return false;
      if (!dentroDe(c.actualizado, fFecha)) return false;
      if (
        term &&
        !c.contactoNombre.toLowerCase().includes(term) &&
        !c.ultimoMensaje.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [convs, q, fEstado, fCanal, fFecha]);

  const hayFiltros = q || fEstado || fCanal || fFecha !== "todo";

  async function accion(a: "tomar" | "soltar" | "responder") {
    if (!selId) return;
    setEnviando(true);
    const body: Record<string, unknown> = { accion: a };
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
      </header>

      <div className="filterbar">
        <div className="filter-search">
          {IconSearch}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por contacto o mensaje…"
          />
        </div>
        {isAdmin && (
          <Dropdown
            compact
            ariaLabel="Cliente"
            value={filtroTenant}
            onChange={setFiltroTenant}
            placeholder="Todos los clientes"
            options={[
              { value: "", label: "Todos los clientes" },
              ...tenants.map((t) => ({ value: t.id, label: t.nombre })),
            ]}
          />
        )}
        <Dropdown
          compact
          ariaLabel="Estado"
          value={fEstado}
          onChange={setFEstado}
          placeholder="Todas"
          options={[
            { value: "", label: "Todas" },
            { value: "bot", label: "🤖 Agente" },
            { value: "humano", label: "👤 Humano" },
            { value: "cerrada", label: "Cerrada" },
          ]}
        />
        <Dropdown
          compact
          ariaLabel="Canal"
          value={fCanal}
          onChange={setFCanal}
          placeholder="Todos los canales"
          options={[
            { value: "", label: "Todos los canales" },
            { value: "whatsapp", label: "WhatsApp", color: "#25D366" },
            { value: "instagram", label: "Instagram", color: "#E1306C" },
            { value: "messenger", label: "Facebook", color: "#1877F2" },
            { value: "playground", label: "Prueba", color: "#9a938c" },
          ]}
        />
        <Dropdown
          compact
          ariaLabel="Fecha"
          value={fFecha}
          onChange={setFFecha}
          options={[
            { value: "todo", label: "Cualquier fecha" },
            { value: "hoy", label: "Hoy" },
            { value: "7d", label: "7 días" },
            { value: "30d", label: "30 días" },
          ]}
        />
        {hayFiltros && (
          <button
            className="filter-clear"
            onClick={() => {
              setQ("");
              setFEstado("");
              setFCanal("");
              setFFecha("todo");
            }}
          >
            Limpiar
          </button>
        )}
        <button className="btn-primary-lg btn-md filter-create" onClick={() => setNuevo(true)}>
          + Nuevo contacto
        </button>
      </div>

      <div className="ib-grid">
        <section className="panel ib-list">
          {visibles.length === 0 && (
            <p className="empty ib-empty">
              {convs.length === 0 ? "Sin conversaciones aún." : "Nada coincide con esos filtros."}
            </p>
          )}
          {visibles.map((c) => (
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
                  <CanalChip canal={c.canal} />
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
                    {conv.tenantNombre} <CanalChip canal={conv.canal} />
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

      {nuevo && (
        <NuevaConversacion
          tenants={tenants}
          soloTenant={!isAdmin}
          defaultTenant={(isAdmin ? filtroTenant : scope) || tenants[0]?.id || ""}
          onClose={() => setNuevo(false)}
          onCreated={async (id) => {
            setNuevo(false);
            await cargarLista();
            setSelId(id);
          }}
        />
      )}
    </div>
  );
}

function NuevaConversacion({
  tenants,
  defaultTenant,
  soloTenant,
  onClose,
  onCreated,
}: {
  tenants: TenantMin[];
  defaultTenant: string;
  soloTenant?: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [f, setF] = useState({
    tenantId: defaultTenant,
    contactoNombre: "",
    contactoTelefono: "",
    canal: "whatsapp",
    primerMensaje: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    if (!f.contactoNombre.trim() || !f.tenantId) {
      setError("El nombre del contacto y el cliente son obligatorios.");
      return;
    }
    setGuardando(true);
    const d = await fetch("/api/conversaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    }).then((r) => r.json());
    setGuardando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    onCreated(d.conversacion.id);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="drawer panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nuevo contacto</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>
        <p className="modal-hint modal-hint-top">
          Agrega un contacto que entró por teléfono o en persona. Queda en tu inbox para que le hagas
          seguimiento.
        </p>
        {!soloTenant && (
          <div className="field">
            <span>Cliente</span>
            <Dropdown
              value={f.tenantId}
              onChange={(v) => setF({ ...f, tenantId: v })}
              options={tenants.map((t) => ({ value: t.id, label: t.nombre }))}
            />
          </div>
        )}
        <div className="cb-row">
          <label className="field">
            <span>Nombre del contacto *</span>
            <input
              value={f.contactoNombre}
              onChange={(e) => setF({ ...f, contactoNombre: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input
              value={f.contactoTelefono}
              onChange={(e) => setF({ ...f, contactoTelefono: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Primer mensaje / nota (opcional)</span>
          <textarea
            rows={2}
            placeholder="Ej: Llamó preguntando por depilación láser, le interesa agendar."
            value={f.primerMensaje}
            onChange={(e) => setF({ ...f, primerMensaje: e.target.value })}
          />
        </label>
        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={crear} disabled={guardando}>
            {guardando ? "Creando…" : "Crear contacto"}
          </button>
        </div>
      </div>
    </div>
  );
}
