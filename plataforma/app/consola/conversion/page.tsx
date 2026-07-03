"use client";

import { useEffect, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";

type Metricas = {
  embudo: { etapa: string; n: number }[];
  perdidos: number;
  tasaCierre: number;
  tasaAgenda: number;
  derivPct: number;
  tiempoRespuestaSeg: number | null;
  pipeline: number;
  porTenant: {
    id: string;
    nombre: string;
    color: string;
    tasaCierre: number;
    derivPct: number;
    tiempoRespuestaSeg: number | null;
  }[];
};

const PCT = (x: number) => `${Math.round(x * 100)}%`;
function fmtSeg(s: number | null): string {
  if (s == null) return "—";
  if (s < 60) return `${s} s`;
  return `${Math.round(s / 60)} min`;
}
const ETAPA_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  agendado: "Agendado",
  ganado: "Ganado",
};

export default function Conversion() {
  const { scope, isAdmin, tenants } = useAccount();
  const [filtro, setFiltro] = useState("");
  const [m, setM] = useState<Metricas | null>(null);

  const tid = isAdmin ? filtro || null : scope;
  useEffect(() => {
    setM(null);
    fetch(scopedUrl("/api/admin/conversion", tid))
      .then((r) => r.json())
      .then(setM)
      .catch(() => {});
  }, [tid]);

  if (!m) return <div className="con-loading">Cargando conversión…</div>;

  const totalLeads = m.embudo.reduce((s, e) => s + e.n, 0) + m.perdidos;

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Conversión</h1>
          <p className="con-sub">Cuánto convierten tus agentes: del primer mensaje al cierre.</p>
        </div>
        {isAdmin && (
          <select className="con-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Toda la plataforma</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        )}
      </header>

      {totalLeads === 0 ? (
        <div className="panel ag-empty">Aún no hay leads suficientes para medir conversión.</div>
      ) : (
        <>
          <div className="tiles">
            <Tile label="Tasa de cierre" value={PCT(m.tasaCierre)} hint="ganados vs perdidos" accent />
            <Tile
              label="Tiempo de respuesta IA"
              value={fmtSeg(m.tiempoRespuestaSeg)}
              hint="promedio bot→cliente"
            />
            <Tile label="% derivación a humano" value={PCT(m.derivPct)} hint="conversaciones escaladas" />
            <Tile label="Leads en pipeline" value={String(m.pipeline)} hint="abiertos" />
          </div>

          <section className="panel dash-panel-pad">
            <div className="panel-title">Embudo de conversión</div>
            <EmbudoChart embudo={m.embudo} perdidos={m.perdidos} />
          </section>

          {isAdmin && !filtro && m.porTenant.length > 0 && (
            <section className="panel tabla-wrap">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tasa de cierre</th>
                    <th>Tiempo IA</th>
                    <th>% derivación</th>
                  </tr>
                </thead>
                <tbody>
                  {m.porTenant.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="kb-dot" style={{ background: t.color }} /> {t.nombre}
                      </td>
                      <td>{PCT(t.tasaCierre)}</td>
                      <td>{fmtSeg(t.tiempoRespuestaSeg)}</td>
                      <td>{PCT(t.derivPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
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

const EMBUDO_COLOR: Record<string, string> = {
  nuevo: "#FF6B2C",
  contactado: "#FF8A52",
  agendado: "#CC785C",
  ganado: "#C6F24E",
};

function EmbudoChart({
  embudo,
  perdidos,
}: {
  embudo: { etapa: string; n: number }[];
  perdidos: number;
}) {
  const max = Math.max(1, ...embudo.map((e) => e.n));
  return (
    <div className="embudo">
      {embudo.map((e, i) => {
        const w = (e.n / max) * 100;
        const prev = i > 0 ? embudo[i - 1].n : e.n;
        const conv = prev > 0 ? Math.round((e.n / prev) * 100) : 100;
        return (
          <div key={e.etapa} className="embudo-row">
            <div className="embudo-label">{ETAPA_LABEL[e.etapa]}</div>
            <div className="embudo-track">
              <div
                className="embudo-bar"
                style={{ width: `${Math.max(w, 4)}%`, background: EMBUDO_COLOR[e.etapa] }}
              >
                <span className="embudo-n">{e.n}</span>
              </div>
            </div>
            <div className="embudo-conv">{i > 0 ? `${conv}%` : ""}</div>
          </div>
        );
      })}
      <div className="embudo-row embudo-perdido">
        <div className="embudo-label">Perdido</div>
        <div className="embudo-track">
          <div className="embudo-bar perdido-bar" style={{ width: `${Math.max((perdidos / max) * 100, 4)}%` }}>
            <span className="embudo-n">{perdidos}</span>
          </div>
        </div>
        <div className="embudo-conv" />
      </div>
    </div>
  );
}
