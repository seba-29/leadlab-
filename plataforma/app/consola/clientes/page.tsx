"use client";

import { useEffect, useState } from "react";
import { useAccount } from "../_account/AccountContext";

type Cliente = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
  model: string;
  conversaciones: number;
  leads: number;
  ganados: number;
  citas: number;
  llamadasIa: number;
  tokensIn: number;
  tokensOut: number;
  costoUsd: number;
  planClp: number;
};
type Data = {
  clientes: Cliente[];
  totales: { clientes: number; costoUsd: number; llamadasIa: number; mrrClp: number };
};

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 3,
});
const NUM = new Intl.NumberFormat("es-CL");

export default function Clientes() {
  const { isAdmin } = useAccount();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/api/admin/clientes")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div>
        <header className="con-head">
          <div>
            <h1 className="con-title">Solo administración</h1>
            <p className="con-sub">Esta sección pertenece al panel de Lead Lab.</p>
          </div>
        </header>
        <div className="panel ag-empty">
          🔒 Volvé a la cuenta <strong>Admin</strong> (arriba, en el switcher del sidebar) para ver
          clientes, consumo y márgenes.
        </div>
      </div>
    );
  }

  if (!data) return <div className="con-loading">Cargando clientes…</div>;

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Clientes & consumo</h1>
          <p className="con-sub">
            Vista de administrador: cada cliente de la plataforma, su actividad y lo que te cuesta en
            tokens de Claude. El margen de cada plan, siempre a la vista.
          </p>
        </div>
      </header>

      <div className="tiles">
        <Tile label="Clientes activos" value={String(data.totales.clientes)} hint="tenants tipo cliente" />
        <Tile label="MRR de referencia" value={CLP.format(data.totales.mrrClp)} hint="según plan por cliente" accent />
        <Tile label="Costo IA acumulado" value={USD.format(data.totales.costoUsd)} hint="todas las llamadas a Claude" />
        <Tile label="Llamadas al agente" value={NUM.format(data.totales.llamadasIa)} hint="requests a la API" />
      </div>

      <section className="panel tabla-wrap">
        <table className="tabla">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Agente</th>
              <th>Conv.</th>
              <th>Leads</th>
              <th>Ganados</th>
              <th>Citas</th>
              <th>Llamadas IA</th>
              <th>Tokens in / out</th>
              <th>Costo IA</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {data.clientes.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className="kb-dot" style={{ background: c.color }} /> {c.nombre}
                  {c.tipo === "interno" && <span className="ag-tag interno tabla-tag">interno</span>}
                </td>
                <td>
                  {c.agente}
                  <div className="tabla-sub">{c.model.replace("claude-", "")}</div>
                </td>
                <td>{c.conversaciones}</td>
                <td>{c.leads}</td>
                <td>{c.ganados}</td>
                <td>{c.citas}</td>
                <td>{c.llamadasIa}</td>
                <td>
                  {NUM.format(c.tokensIn)} / {NUM.format(c.tokensOut)}
                </td>
                <td className="tabla-costo">{USD.format(c.costoUsd)}</td>
                <td>{c.planClp ? CLP.format(c.planClp) + "/mes" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="clientes-nota">
        🔐 <strong>Subcuentas por cliente</strong> (que cada dueño entre y vea solo lo suyo) llegan con
        la autenticación de Supabase en la Fase 3 — el esquema ya contempla roles{" "}
        <code>dueño / equipo / leadlab</code>.
      </p>
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
