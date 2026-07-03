"use client";

import { useEffect, useState } from "react";
import { useAccount, scopedUrl } from "./_account/AccountContext";

type Resumen = {
  conversaciones7d: number;
  leadsNuevos7d: number;
  citas7d: number;
  pipeline: number;
  derivacionesPendientes: number;
  porcentajeIa: number | null;
  porDia: { dia: string; etiqueta: string; n: number }[];
  porEtapa: Record<string, number>;
  ultimosLeads: {
    id: string;
    nombre: string;
    interes?: string;
    etapa: string;
    valorEstimado?: number;
  }[];
  atencion: { id: string; motivo: string; resumen: string; creado: string }[];
  proximasCitas: { id: string; fechaHora: string; contacto: string }[];
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

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const { scope, isAdmin, current } = useAccount();
  const [data, setData] = useState<Resumen | null>(null);

  useEffect(() => {
    setData(null);
    fetch(scopedUrl("/api/resumen", scope))
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [scope]);

  if (!data) return <div className="con-loading">Cargando métricas…</div>;

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">{isAdmin ? "Dashboard" : `Panel de ${current?.nombre ?? ""}`}</h1>
          <p className="con-sub">
            {isAdmin
              ? "Los últimos 7 días de toda tu operación, de un vistazo."
              : `Los últimos 7 días de ${current?.nombre ?? "tu negocio"}, de un vistazo.`}
          </p>
        </div>
      </header>

      <div className="tiles">
        <Tile label="Conversaciones activas" value={String(data.conversaciones7d)} hint="últimos 7 días" />
        <Tile label="Leads nuevos" value={String(data.leadsNuevos7d)} hint="últimos 7 días" accent />
        <Tile label="Citas agendadas" value={String(data.citas7d)} hint="últimos 7 días" />
        <Tile label="Pipeline abierto" value={CLP.format(data.pipeline)} hint="valor estimado en juego" />
        <Tile
          label="Atendido por IA"
          value={data.porcentajeIa != null ? `${data.porcentajeIa}%` : "—"}
          hint="sin intervención humana"
        />
      </div>

      <div className="dash-grid">
        <section className="panel dash-chart">
          <div className="panel-title">Leads capturados por día · últimos 14 días</div>
          <BarChart data={data.porDia} />
        </section>

        <section className="panel dash-side">
          <div className="panel-title">Últimos leads</div>
          <div className="mini-leads">
            {data.ultimosLeads.map((l) => (
              <div key={l.id} className="mini-lead">
                <div>
                  <div className="mini-lead-name">{l.nombre}</div>
                  {l.interes && <div className="mini-lead-int">{l.interes}</div>}
                </div>
                <div className="mini-lead-right">
                  {typeof l.valorEstimado === "number" && (
                    <div className="mini-lead-valor">{CLP.format(l.valorEstimado)}</div>
                  )}
                  <span className={`etapa-pill etapa-${l.etapa}`}>{l.etapa}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dash-grid dash-grid-2">
        <section className="panel dash-side">
          <div className="panel-title">🙋 Requiere atención humana</div>
          {data.atencion.length === 0 ? (
            <p className="empty">Sin derivaciones pendientes. El agente tiene todo bajo control. ✨</p>
          ) : (
            <div className="mini-leads">
              {data.atencion.map((a) => (
                <a key={a.id} className="mini-lead atencion-item" href="/consola/inbox">
                  <div>
                    <div className="mini-lead-name">{a.motivo}</div>
                    {a.resumen && <div className="mini-lead-int">{a.resumen}</div>}
                  </div>
                  <span className="drawer-link">Ir al inbox →</span>
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="panel dash-side">
          <div className="panel-title">📅 Próximas citas</div>
          {data.proximasCitas.length === 0 ? (
            <p className="empty">Sin citas próximas agendadas.</p>
          ) : (
            <div className="mini-leads">
              {data.proximasCitas.map((c) => (
                <div key={c.id} className="mini-lead">
                  <div>
                    <div className="mini-lead-name">{fmtCita(c.fechaHora)}</div>
                    {c.contacto && <div className="mini-lead-int">{c.contacto}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div className={`tile ${accent ? "tile-accent" : ""}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      <div className="tile-hint">{hint}</div>
    </div>
  );
}

/**
 * Gráfico de barras de una sola serie (leads/día).
 * Serie única → sin leyenda (el título la nombra). Barras naranjo #FF6B2C
 * (contraste validado vs superficie oscura), extremos redondeados,
 * separación entre barras, etiqueta directa solo en el máximo,
 * tooltip nativo por barra.
 */
function BarChart({ data }: { data: { etiqueta: string; n: number }[] }) {
  const W = 640;
  const H = 200;
  const PAD = { top: 18, right: 8, bottom: 26, left: 8 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const max = Math.max(1, ...data.map((d) => d.n));
  const gap = 6;
  const barW = innerW / data.length - gap;
  const maxIdx = data.findIndex((d) => d.n === max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="barchart" role="img" aria-label="Leads capturados por día">
      {/* grid horizontal sutil */}
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + innerH * (1 - f)}
          y2={PAD.top + innerH * (1 - f)}
          stroke="rgba(244,241,236,0.08)"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const h = Math.max(d.n > 0 ? 6 : 2, (d.n / max) * innerH);
        const x = PAD.left + i * (barW + gap) + gap / 2;
        const y = PAD.top + innerH - h;
        return (
          <g key={i} className="bar-g">
            <rect
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="4"
              fill={d.n > 0 ? "#FF6B2C" : "rgba(244,241,236,0.10)"}
            >
              <title>{`${d.etiqueta}: ${d.n} lead${d.n === 1 ? "" : "s"}`}</title>
            </rect>
            {i === maxIdx && d.n > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="bar-label">
                {d.n}
              </text>
            )}
            {i % 2 === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="bar-axis">
                {d.etiqueta}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
