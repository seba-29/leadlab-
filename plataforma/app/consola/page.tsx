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
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

export default function Dashboard() {
  const { scope, isAdmin, current } = useAccount();
  const [data, setData] = useState<Resumen | null>(null);

  useEffect(() => {
    if (isAdmin) return; // el admin ve la Vista Global
    setData(null);
    fetch(scopedUrl("/api/resumen", scope))
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [scope, isAdmin]);

  if (isAdmin) return <VistaGlobal />;
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

// ============================================================
// Vista Global — cara ADMIN de /consola (super-consola del dueño)
// ============================================================
type ClienteGlobal = {
  id: string;
  nombre: string;
  agente: string;
  color: string;
  rubro: string;
  tipo: "interno" | "cliente";
  conv7d: number;
  leads7d: number;
  ganados: number;
  derivacionesPend: number;
  costoUsd: number;
  planClp: number;
  margenPct: number | null;
  salud: "verde" | "ambar" | "rojo";
  spark: number[];
};
type GlobalData = {
  totales: {
    mrrClp: number;
    nClientes: number;
    agentesActivos: number;
    leadsTotales: number;
    ganadosTotales: number;
    derivacionesPendientes: number;
    margenUsdMes: number;
    margenPct: number | null;
  };
  clientes: ClienteGlobal[];
};

function VistaGlobal() {
  const { entrarComo } = useAccount();
  const [g, setG] = useState<GlobalData | null>(null);

  useEffect(() => {
    fetch("/api/admin/global")
      .then((r) => r.json())
      .then(setG)
      .catch(() => {});
  }, []);

  if (!g) return <div className="con-loading">Cargando vista global…</div>;
  const t = g.totales;

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Vista global</h1>
          <p className="con-sub">El pulso de toda tu plataforma, en vivo.</p>
        </div>
      </header>

      <div className="tiles">
        <Tile label="MRR de referencia" value={CLP.format(t.mrrClp)} hint="ingreso mensual recurrente" accent />
        <Tile label="Margen mensual" value={USD.format(t.margenUsdMes)} hint="cobras − gastas en IA" />
        <Tile
          label="Clientes activos"
          value={String(t.nClientes)}
          hint={`${t.agentesActivos} agentes con actividad`}
        />
        <Tile label="Leads totales" value={String(t.leadsTotales)} hint={`${t.ganadosTotales} ganados`} />
        <Tile
          label="Requieren atención"
          value={String(t.derivacionesPendientes)}
          hint="derivaciones pendientes"
        />
      </div>

      <section className="panel dash-side dash-panel-pad">
        <div className="panel-title">Salud por cliente · toca para entrar</div>
        {g.clientes.length === 0 ? (
          <p className="empty">Aún no hay clientes. Créalos en Subcuentas.</p>
        ) : (
          <div className="salud-grid">
            {g.clientes.map((c) => (
              <ClienteSaludCard key={c.id} c={c} onEntrar={() => entrarComo(c.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const SALUD_LABEL: Record<string, string> = { verde: "Sano", ambar: "Atención", rojo: "Riesgo" };

function ClienteSaludCard({ c, onEntrar }: { c: ClienteGlobal; onEntrar: () => void }) {
  return (
    <button className="salud-card" onClick={onEntrar}>
      <div className="salud-top">
        <span className="kb-dot" style={{ background: c.color }} />
        <span className="salud-nombre">{c.nombre}</span>
        <span className={`salud-pill ${c.salud}`}>{SALUD_LABEL[c.salud]}</span>
      </div>
      <Sparkline data={c.spark} color={c.color} />
      <div className="salud-foot">
        <span className={c.margenPct != null && c.margenPct < 0 ? "margen-neg" : "margen-pos"}>
          {c.tipo === "interno"
            ? "usa su producto"
            : c.margenPct != null
              ? `margen ${Math.round(c.margenPct * 100)}%`
              : "—"}
        </span>
        <span className="salud-deriv">
          {c.derivacionesPend > 0 ? `${c.derivacionesPend} deriv.` : `${c.leads7d} leads 7d`}
        </span>
      </div>
    </button>
  );
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 200;
  const h = 34;
  const gap = 3;
  const max = Math.max(1, ...data);
  const bw = w / data.length - gap;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none" aria-hidden>
      {data.map((n, i) => {
        const bh = Math.max(n > 0 ? 3 : 1, (n / max) * (h - 4));
        const x = i * (bw + gap);
        return (
          <rect
            key={i}
            x={x}
            y={h - bh}
            width={bw}
            height={bh}
            rx="2"
            fill={n > 0 ? color : "rgba(150,150,150,0.18)"}
          />
        );
      })}
    </svg>
  );
}
