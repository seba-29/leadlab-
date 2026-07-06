"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";

type Lead = {
  id: string;
  tenantId: string;
  tenantNombre: string;
  tenantColor: string;
  nombre: string;
  negocio?: string;
  telefono?: string;
  interes?: string;
  etapa: string;
  valorEstimado?: number;
  notas?: string;
  fuente: string;
  conversacionId?: string;
  creado?: string;
  actualizado: string;
};
type Tenant = { id: string; nombre: string };

const IconSearch = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </svg>
);

function dentroDe(iso: string | undefined, rango: string): boolean {
  if (rango === "todo" || !iso) return true;
  const dias = rango === "7d" ? 7 : rango === "30d" ? 30 : 90;
  return new Date(iso).getTime() >= Date.now() - dias * 86400000;
}

const ETAPAS: { key: string; label: string }[] = [
  { key: "nuevo", label: "Nuevo" },
  { key: "contactado", label: "Contactado" },
  { key: "agendado", label: "Agendado" },
  { key: "ganado", label: "Ganado" },
  { key: "perdido", label: "Perdido" },
];

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function Kanban() {
  const { scope, isAdmin, tenants } = useAccount();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtro, setFiltro] = useState<string>("");
  const [q, setQ] = useState("");
  const [fFuente, setFFuente] = useState("");
  const [fValor, setFValor] = useState("");
  const [fFecha, setFFecha] = useState("todo");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [selLead, setSelLead] = useState<Lead | null>(null);
  const [nuevo, setNuevo] = useState(false);

  function cargar(tid: string | null = isAdmin ? filtro || null : scope) {
    fetch(scopedUrl("/api/leads", tid))
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => {});
  }

  useEffect(() => {
    cargar();
  }, [filtro, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  const fuentes = useMemo(
    () => Array.from(new Set(leads.map((l) => l.fuente).filter(Boolean))).sort(),
    [leads],
  );

  const visibles = useMemo(() => {
    const term = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (fFuente && l.fuente !== fFuente) return false;
      if (fValor === "con" && !(typeof l.valorEstimado === "number" && l.valorEstimado > 0)) return false;
      if (fValor === "sin" && typeof l.valorEstimado === "number" && l.valorEstimado > 0) return false;
      if (!dentroDe(l.creado ?? l.actualizado, fFecha)) return false;
      if (
        term &&
        !l.nombre.toLowerCase().includes(term) &&
        !(l.interes ?? "").toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [leads, q, fFuente, fValor, fFecha]);

  const hayFiltros = q || fFuente || fValor || fFecha !== "todo";

  async function mover(leadId: string, etapa: string) {
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, etapa } : l)));
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, etapa }),
    }).catch(() => {});
  }

  function onDrop(etapa: string) {
    if (dragId) mover(dragId, etapa);
    setDragId(null);
    setOverCol(null);
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Leads</h1>
          <p className="con-sub">
            Tu pipeline comercial. Arrastra las tarjetas entre etapas, o haz clic en una para ver el
            detalle y editarla.
          </p>
        </div>
      </header>

      <div className="filterbar">
        <div className="filter-search">
          {IconSearch}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o interés…"
          />
        </div>
        {isAdmin && (
          <select className="con-select" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Cliente">
            <option value="">Todos los clientes</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}
        <select className="con-select" value={fFuente} onChange={(e) => setFFuente(e.target.value)} aria-label="Fuente">
          <option value="">Toda fuente</option>
          {fuentes.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select className="con-select" value={fValor} onChange={(e) => setFValor(e.target.value)} aria-label="Valor">
          <option value="">Todo valor</option>
          <option value="con">Con valor</option>
          <option value="sin">Sin valor</option>
        </select>
        <select className="con-select" value={fFecha} onChange={(e) => setFFecha(e.target.value)} aria-label="Fecha">
          <option value="todo">Cualquier fecha</option>
          <option value="7d">7 días</option>
          <option value="30d">30 días</option>
          <option value="90d">90 días</option>
        </select>
        {hayFiltros && (
          <button
            className="filter-clear"
            onClick={() => {
              setQ("");
              setFFuente("");
              setFValor("");
              setFFecha("todo");
            }}
          >
            Limpiar
          </button>
        )}
        <button className="btn-primary-lg btn-md filter-create" onClick={() => setNuevo(true)}>
          + Oportunidad
        </button>
      </div>

      <div className="kb">
        {ETAPAS.map((col) => {
          const items = visibles.filter((l) => l.etapa === col.key);
          const total = items.reduce((s, l) => s + (l.valorEstimado ?? 0), 0);
          return (
            <div
              key={col.key}
              className={`kb-col ${overCol === col.key ? "over" : ""} kb-${col.key}`}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={() => onDrop(col.key)}
            >
              <div className="kb-head">
                <span className="kb-title">{col.label}</span>
                <span className="kb-count">{items.length}</span>
              </div>
              {total > 0 && <div className="kb-total">{CLP.format(total)}</div>}
              <div className="kb-cards">
                {items.map((l) => (
                  <div
                    key={l.id}
                    className={`kb-card ${dragId === l.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={() => setDragId(l.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onClick={() => setSelLead(l)}
                  >
                    <div className="kb-card-top">
                      <span className="kb-card-name">{l.nombre}</span>
                      {typeof l.valorEstimado === "number" && (
                        <span className="kb-card-valor">{CLP.format(l.valorEstimado)}</span>
                      )}
                    </div>
                    {(l.interes || l.negocio) && (
                      <div className="kb-card-int">{l.interes ?? l.negocio}</div>
                    )}
                    <div className="kb-card-meta">
                      {isAdmin && <span className="kb-dot" style={{ background: l.tenantColor }} />}
                      {isAdmin ? `${l.tenantNombre} · ${l.fuente}` : l.fuente}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="kb-empty">Suelta un lead acá</div>}
              </div>
            </div>
          );
        })}
      </div>

      {selLead && (
        <LeadDrawer
          lead={selLead}
          onClose={() => setSelLead(null)}
          onSaved={() => {
            setSelLead(null);
            cargar();
          }}
        />
      )}
      {nuevo && (
        <NuevoLead
          tenants={tenants}
          soloTenant={!isAdmin}
          defaultTenant={(isAdmin ? filtro : scope) || tenants[0]?.id || ""}
          onClose={() => setNuevo(false)}
          onSaved={() => {
            setNuevo(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}

function LeadDrawer({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    nombre: lead.nombre,
    telefono: lead.telefono ?? "",
    interes: lead.interes ?? "",
    valorEstimado: lead.valorEstimado?.toString() ?? "",
    etapa: lead.etapa,
    notas: lead.notas ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    await fetch("/api/leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId: lead.id,
        nombre: f.nombre,
        telefono: f.telefono,
        interes: f.interes,
        notas: f.notas,
        etapa: f.etapa,
        valorEstimado: f.valorEstimado ? Number(f.valorEstimado) : undefined,
      }),
    }).catch(() => {});
    setGuardando(false);
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="drawer panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{lead.nombre}</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="drawer-meta">
          <span className="kb-dot" style={{ background: lead.tenantColor }} /> {lead.tenantNombre} ·{" "}
          {lead.fuente}
          {lead.conversacionId && (
            <a className="drawer-link" href="/consola/inbox">
              Ver conversación →
            </a>
          )}
        </div>
        <div className="cb-row">
          <label className="field">
            <span>Nombre</span>
            <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Interés</span>
          <input value={f.interes} onChange={(e) => setF({ ...f, interes: e.target.value })} />
        </label>
        <div className="cb-row">
          <label className="field">
            <span>Valor estimado (CLP)</span>
            <input
              type="number"
              value={f.valorEstimado}
              onChange={(e) => setF({ ...f, valorEstimado: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Etapa</span>
            <select
              className="con-select drawer-select"
              value={f.etapa}
              onChange={(e) => setF({ ...f, etapa: e.target.value })}
            >
              {ETAPAS.map((e2) => (
                <option key={e2.key} value={e2.key}>
                  {e2.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          <span>Notas</span>
          <textarea rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
        </label>
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevoLead({
  tenants,
  defaultTenant,
  soloTenant,
  onClose,
  onSaved,
}: {
  tenants: Tenant[];
  defaultTenant: string;
  soloTenant?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    tenantId: defaultTenant,
    nombre: "",
    telefono: "",
    interes: "",
    valorEstimado: "",
    notas: "",
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    if (!f.nombre.trim() || !f.tenantId) {
      setError("El nombre y el cliente son obligatorios.");
      return;
    }
    setGuardando(true);
    const d = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        valorEstimado: f.valorEstimado ? Number(f.valorEstimado) : undefined,
      }),
    }).then((r) => r.json());
    setGuardando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    onSaved();
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="drawer panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nueva oportunidad</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>
        {!soloTenant && (
          <label className="field">
            <span>Cliente</span>
            <select
              className="con-select drawer-select"
              value={f.tenantId}
              onChange={(e) => setF({ ...f, tenantId: e.target.value })}
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="cb-row">
          <label className="field">
            <span>Nombre *</span>
            <input value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </label>
          <label className="field">
            <span>Teléfono</span>
            <input value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} />
          </label>
        </div>
        <label className="field">
          <span>Interés</span>
          <input value={f.interes} onChange={(e) => setF({ ...f, interes: e.target.value })} />
        </label>
        <label className="field">
          <span>Valor estimado (CLP)</span>
          <input
            type="number"
            value={f.valorEstimado}
            onChange={(e) => setF({ ...f, valorEstimado: e.target.value })}
          />
        </label>
        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={crear} disabled={guardando}>
            {guardando ? "Creando…" : "Crear oportunidad"}
          </button>
        </div>
      </div>
    </div>
  );
}
