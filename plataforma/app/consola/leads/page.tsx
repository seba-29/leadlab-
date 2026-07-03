"use client";

import { useEffect, useState } from "react";

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
  fuente: string;
  actualizado: string;
};

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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leads")
      .then((r) => r.json())
      .then((d) => setLeads(d.leads ?? []))
      .catch(() => {});
  }, []);

  async function mover(leadId: string, etapa: string) {
    // Optimista: movemos al tiro y confirmamos contra la API
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
            Tu pipeline comercial. Arrastra las tarjetas entre etapas — el agente crea y mueve leads
            solo, tú ajustas lo que haga falta.
          </p>
        </div>
      </header>

      <div className="kb">
        {ETAPAS.map((col) => {
          const items = leads.filter((l) => l.etapa === col.key);
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
                      <span className="kb-dot" style={{ background: l.tenantColor }} />
                      {l.tenantNombre} · {l.fuente}
                    </div>
                  </div>
                ))}
                {items.length === 0 && <div className="kb-empty">Suelta un lead acá</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
