"use client";

import { useEffect, useState } from "react";
import { useAccount } from "../_account/AccountContext";
import {
  Tester,
  NuevoAgente,
  FlotaAgentes,
  CerebroEditor,
  FichaAgente,
  type Cerebro,
  type TenantFull,
} from "./parts";

export default function AgentesPage() {
  const { isAdmin } = useAccount();
  return isAdmin ? <AdminAgentes /> : <ClienteAgentes />;
}

// ---- Admin: [ Agentes (flota) | Cerebros (edición) ] ----
function AdminAgentes() {
  const { refreshTenants, entrarComo } = useAccount();
  const [tab, setTab] = useState<"agentes" | "cerebros">("agentes");
  const [creando, setCreando] = useState(false);

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Agentes IA</h1>
          <p className="con-sub">
            Tu flota de agentes: estado, consumo y salud de cada uno. Y el cerebro de cada negocio —
            lo que sabe y cómo responde.
          </p>
        </div>
        <button className="btn-primary-lg" onClick={() => setCreando(true)}>
          + Nuevo agente
        </button>
      </header>

      <div className="tabbar">
        <button className={tab === "agentes" ? "on" : ""} onClick={() => setTab("agentes")}>
          Agentes
        </button>
        <button className={tab === "cerebros" ? "on" : ""} onClick={() => setTab("cerebros")}>
          Cerebros
        </button>
      </div>

      {tab === "agentes" ? <FlotaAgentes /> : <CerebroEditor />}

      {creando && (
        <NuevoAgente
          onClose={() => setCreando(false)}
          onCreated={async (t) => {
            setCreando(false);
            await refreshTenants();
            entrarComo(t.id); // aterriza en "Probar mi agente" del nuevo cliente
          }}
        />
      )}
    </div>
  );
}

// ---- Cliente: [ Probar mi agente | Ficha del agente ] ----
function ClienteAgentes() {
  const { current, scope } = useAccount();
  const [tab, setTab] = useState<"probar" | "ficha">("probar");
  const [full, setFull] = useState<TenantFull | null>(null);
  const [cerebro, setCerebro] = useState<Cerebro | null>(null);

  useEffect(() => {
    if (!scope) return;
    fetch(`/api/tenants/${scope}`)
      .then((r) => r.json())
      .then((d) => {
        setFull(d.tenant ?? null);
        setCerebro(d.tenant?.cerebro ?? null);
      })
      .catch(() => {});
  }, [scope]);

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Agentes IA</h1>
          <p className="con-sub">
            Probá tu agente en vivo y revisá su ficha: lo que sabe y lo que puede hacer por vos.
          </p>
        </div>
      </header>

      <div className="tabbar">
        <button className={tab === "probar" ? "on" : ""} onClick={() => setTab("probar")}>
          Probar mi agente
        </button>
        <button className={tab === "ficha" ? "on" : ""} onClick={() => setTab("ficha")}>
          Ficha del agente
        </button>
      </div>

      {tab === "probar" ? (
        current ? (
          <Tester tenant={current} />
        ) : (
          <div className="con-loading">Cargando…</div>
        )
      ) : full ? (
        <FichaAgente tenant={full} cerebro={cerebro} />
      ) : (
        <div className="con-loading">Cargando…</div>
      )}
    </div>
  );
}
