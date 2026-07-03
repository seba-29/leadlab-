"use client";

import { useEffect, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";

type CitaItem = {
  id: string;
  tenantNombre: string;
  tenantColor: string;
  fechaHora: string;
  contacto: string;
  conversacionId: string | null;
  canal: string | null;
};

function fmtCita(fechaHora: string): string {
  const t = new Date(fechaHora);
  if (isNaN(t.getTime())) return fechaHora; // texto libre creado por el agente
  return t.toLocaleDateString("es-CL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Agenda() {
  const { scope, isAdmin, current } = useAccount();
  const [citas, setCitas] = useState<CitaItem[] | null>(null);

  useEffect(() => {
    setCitas(null);
    fetch(scopedUrl("/api/citas", scope))
      .then((r) => r.json())
      .then((d) => setCitas(d.citas ?? []))
      .catch(() => setCitas([]));
  }, [scope]);

  if (!citas) return <div className="con-loading">Cargando agenda…</div>;

  const now = Date.now();
  const proximas: CitaItem[] = [];
  const sinFecha: CitaItem[] = [];
  const pasadas: CitaItem[] = [];
  for (const c of citas) {
    const t = new Date(c.fechaHora).getTime();
    if (isNaN(t)) sinFecha.push(c);
    else if (t >= now) proximas.push(c);
    else pasadas.push(c);
  }
  proximas.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  pasadas.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Agenda</h1>
          <p className="con-sub">
            {isAdmin
              ? "Las citas que agendaron tus agentes, por cliente."
              : `Las citas que ${current?.agente ?? "tu agente"} agendó por ti.`}
          </p>
        </div>
      </header>

      {citas.length === 0 ? (
        <div className="panel ag-empty">
          📅 Aún no hay citas agendadas. En cuanto tu agente cierre una, aparece acá.
        </div>
      ) : (
        <div className="dash-grid">
          <section className="panel dash-side">
            <div className="panel-title">Próximas · {proximas.length + sinFecha.length}</div>
            <div className="mini-leads">
              {sinFecha.map((c) => (
                <CitaRow key={c.id} c={c} admin={isAdmin} sinFecha />
              ))}
              {proximas.map((c) => (
                <CitaRow key={c.id} c={c} admin={isAdmin} />
              ))}
              {proximas.length + sinFecha.length === 0 && <p className="empty">Sin citas próximas.</p>}
            </div>
          </section>
          <section className="panel dash-side">
            <div className="panel-title">Pasadas · {pasadas.length}</div>
            <div className="mini-leads">
              {pasadas.map((c) => (
                <CitaRow key={c.id} c={c} admin={isAdmin} />
              ))}
              {pasadas.length === 0 && <p className="empty">Sin citas pasadas aún.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function CitaRow({ c, admin, sinFecha }: { c: CitaItem; admin: boolean; sinFecha?: boolean }) {
  const canal =
    c.canal === "whatsapp" ? "WhatsApp" : c.canal === "playground" ? "Prueba" : "Agente IA";
  return (
    <div className="mini-lead">
      <div>
        <div className="mini-lead-name">{sinFecha ? c.fechaHora : fmtCita(c.fechaHora)}</div>
        <div className="mini-lead-int">
          {c.contacto || "Contacto sin nombre"}
          {admin && c.tenantNombre ? ` · ${c.tenantNombre}` : ""}
        </div>
      </div>
      <div className="mini-lead-right">
        <span className="ib-canal">{canal}</span>
        {c.conversacionId && (
          <a className="drawer-link" href="/consola/inbox">
            Ver chat →
          </a>
        )}
      </div>
    </div>
  );
}
