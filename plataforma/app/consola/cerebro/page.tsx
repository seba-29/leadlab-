"use client";

import { useEffect, useState } from "react";
import { useAccount } from "../_account/AccountContext";

type Servicio = { nombre: string; precio: string; detalle?: string };
type Faq = { pregunta: string; respuesta: string };
type Cerebro = {
  descripcion: string;
  tono: string;
  horario: string;
  servicios: Servicio[];
  faq: Faq[];
  reglas: string;
};
type Tenant = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
  cerebro: Cerebro;
  promptOverride?: string;
};

export default function CerebroPage() {
  const { scope, isAdmin } = useAccount();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [cerebro, setCerebro] = useState<Cerebro | null>(null);
  const [prompt, setPrompt] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const sel = tenants.find((t) => t.id === selId) ?? null;

  useEffect(() => {
    fetch("/api/tenants")
      .then((r) => r.json())
      .then((d) => {
        const ts: Tenant[] = d.tenants ?? [];
        setTenants(ts);
        setSelId((prev) => prev || (!isAdmin && scope ? scope : ts[0]?.id ?? ""));
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Al entrar como subcuenta, fijar el cerebro a ese tenant.
  useEffect(() => {
    if (!isAdmin && scope) setSelId(scope);
  }, [isAdmin, scope]);

  useEffect(() => {
    if (!selId) return;
    fetch(`/api/tenants/${selId}`)
      .then((r) => r.json())
      .then((d) => {
        setCerebro(d.tenant?.cerebro ?? null);
        setPrompt(d.prompt ?? "");
        setOk(false);
      })
      .catch(() => {});
  }, [selId]);

  async function guardar() {
    if (!sel || !cerebro) return;
    setGuardando(true);
    const d = await fetch(`/api/tenants/${sel.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cerebro }),
    }).then((r) => r.json());
    if (d.prompt) setPrompt(d.prompt);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  function upd<K extends keyof Cerebro>(key: K, value: Cerebro[K]) {
    setCerebro((c) => (c ? { ...c, [key]: value } : c));
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">
            {isAdmin ? "Cerebro del agente" : `Ficha de ${sel?.agente ?? "tu agente"}`}
          </h1>
          <p className="con-sub">
            {isAdmin
              ? "Lo que el agente sabe de cada negocio: servicios, precios, tono y reglas. Guardás y lo usa al instante."
              : "Cómo piensa y qué puede hacer tu agente por vos, en simple."}
          </p>
        </div>
        {isAdmin && (
          <select className="con-select" value={selId} onChange={(e) => setSelId(e.target.value)}>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.agente} · {t.nombre}
              </option>
            ))}
          </select>
        )}
      </header>

      {!isAdmin ? (
        sel ? (
          <FichaAgente tenant={sel} cerebro={cerebro} />
        ) : (
          <div className="con-loading">Cargando…</div>
        )
      ) : sel?.promptOverride ? (
        <div className="panel cb-panel">
          <div className="cb-note">
            🔒 <strong>{sel.agente}</strong> es el agente interno de Lead Lab y usa un prompt curado a
            mano. Se edita en el código (<code>lib/store.ts · LIA_PROMPT</code>).
          </div>
          <details className="cb-preview" open>
            <summary>Ver su prompt</summary>
            <pre>{prompt}</pre>
          </details>
        </div>
      ) : sel && cerebro ? (
        <div className="cb-grid">
          <div className="panel cb-panel">
            <label className="field">
              <span>Descripción del negocio</span>
              <textarea
                rows={3}
                value={cerebro.descripcion}
                onChange={(e) => upd("descripcion", e.target.value)}
              />
            </label>
            <div className="cb-row">
              <label className="field">
                <span>Tono del agente</span>
                <textarea rows={2} value={cerebro.tono} onChange={(e) => upd("tono", e.target.value)} />
              </label>
              <label className="field">
                <span>Horario</span>
                <textarea
                  rows={2}
                  value={cerebro.horario}
                  onChange={(e) => upd("horario", e.target.value)}
                />
              </label>
            </div>

            <div className="cb-section">
              <div className="cb-section-head">
                <span>Servicios y precios</span>
                <button
                  className="btn-ghost-sm"
                  onClick={() =>
                    upd("servicios", [...cerebro.servicios, { nombre: "", precio: "", detalle: "" }])
                  }
                >
                  + Agregar
                </button>
              </div>
              {cerebro.servicios.map((s, i) => (
                <div key={i} className="cb-item-row">
                  <input
                    placeholder="Servicio"
                    value={s.nombre}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], nombre: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <input
                    placeholder="Precio"
                    className="cb-precio"
                    value={s.precio}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], precio: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <input
                    placeholder="Detalle (opcional)"
                    value={s.detalle ?? ""}
                    onChange={(e) => {
                      const arr = [...cerebro.servicios];
                      arr[i] = { ...arr[i], detalle: e.target.value };
                      upd("servicios", arr);
                    }}
                  />
                  <button
                    className="cb-del"
                    title="Eliminar"
                    onClick={() =>
                      upd(
                        "servicios",
                        cerebro.servicios.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="cb-section">
              <div className="cb-section-head">
                <span>Preguntas frecuentes</span>
                <button
                  className="btn-ghost-sm"
                  onClick={() => upd("faq", [...cerebro.faq, { pregunta: "", respuesta: "" }])}
                >
                  + Agregar
                </button>
              </div>
              {cerebro.faq.map((f, i) => (
                <div key={i} className="cb-item-row cb-faq-row">
                  <input
                    placeholder="Pregunta"
                    value={f.pregunta}
                    onChange={(e) => {
                      const arr = [...cerebro.faq];
                      arr[i] = { ...arr[i], pregunta: e.target.value };
                      upd("faq", arr);
                    }}
                  />
                  <input
                    placeholder="Respuesta"
                    value={f.respuesta}
                    onChange={(e) => {
                      const arr = [...cerebro.faq];
                      arr[i] = { ...arr[i], respuesta: e.target.value };
                      upd("faq", arr);
                    }}
                  />
                  <button
                    className="cb-del"
                    title="Eliminar"
                    onClick={() =>
                      upd(
                        "faq",
                        cerebro.faq.filter((_, j) => j !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <label className="field">
              <span>Reglas del negocio (qué debe y no debe hacer)</span>
              <textarea rows={3} value={cerebro.reglas} onChange={(e) => upd("reglas", e.target.value)} />
            </label>

            <div className="cb-actions">
              <button className="btn-primary-lg" onClick={guardar} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              {ok && <span className="cb-ok">✓ Guardado — el agente ya lo está usando</span>}
            </div>
          </div>

          <details className="panel cb-preview">
            <summary>Vista previa del prompt que recibe el agente</summary>
            <pre>{prompt}</pre>
          </details>
        </div>
      ) : (
        <div className="con-loading">Cargando…</div>
      )}
    </div>
  );
}

// ---- Íconos de capacidades (deben seguir a las tools de lib/agent.ts) ----
const IconCapturar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6c1 0 1.9.2 2.7.6" />
    <path d="M17 13v6M14 16h6" />
  </svg>
);
const IconAgendar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    <path d="M9.5 14.5l1.7 1.7 3.3-3.4" />
  </svg>
);
const IconDerivar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="7" cy="8" r="3" />
    <path d="M2.5 19c.5-2.8 2.4-4.3 4.5-4.3" />
    <path d="M14 8h6M17 5l3 3-3 3" />
    <circle cx="17.5" cy="17" r="2.5" />
  </svg>
);

/**
 * Cara CLIENTE de "Cerebro": ficha de lectura amable.
 * NUNCA renderiza el prompt crudo ni el JSON de tools — muestra al agente
 * como capacidades y su información como una ficha. Funciona igual si el
 * tenant usa promptOverride (Lía): capacidades genéricas, sin exponer el prompt.
 */
function FichaAgente({ tenant, cerebro }: { tenant: Tenant; cerebro: Cerebro | null }) {
  const caps = [
    {
      icon: IconCapturar,
      name: "Capturar lead",
      desc: "Guarda nombre, interés y valor estimado apenas los detecta, y lo deja en tu Kanban.",
    },
    {
      icon: IconAgendar,
      name: "Agendar",
      desc: "Reserva una hora cuando el cliente acepta y la anota en tu agenda.",
    },
    {
      icon: IconDerivar,
      name: "Derivar a una persona",
      desc: "Te pasa la conversación ante reclamos, urgencias o si piden hablar con un humano.",
    },
  ];
  const servicios = (cerebro?.servicios ?? []).filter((s) => s.nombre);
  const faq = (cerebro?.faq ?? []).filter((f) => f.pregunta);

  return (
    <div className="agente-ficha">
      <div className="panel agente-cabecera">
        <div className="agente-cab-avatar" style={{ background: tenant.color }}>
          {tenant.agente[0]}
        </div>
        <div>
          <div className="agente-cab-nombre">{tenant.agente}</div>
          <div className="agente-cab-rubro">
            {tenant.nombre} · {tenant.rubro}
          </div>
        </div>
      </div>

      <div className="panel agente-frase">
        Soy <span className="q">{tenant.agente}</span>, la asistente con IA de{" "}
        <strong>{tenant.nombre}</strong>. Atiendo por WhatsApp al instante, respondo dudas con tu
        información oficial, tomo los datos de cada interesado y agendo — 24/7, sin que se te escape
        ningún lead.
      </div>

      <div className="panel agente-block">
        <div className="agente-block-title">Lo que puede hacer</div>
        <div className="agente-caps">
          {caps.map((c) => (
            <div key={c.name} className="agente-cap">
              <div className="agente-cap-head">
                <span className="agente-cap-icon">{c.icon}</span>
                <span className="agente-cap-name">{c.name}</span>
                <span className="pill" style={{ marginLeft: "auto" }}>
                  Automático
                </span>
              </div>
              <div className="agente-cap-desc">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {(cerebro?.tono || cerebro?.horario) && (
        <div className="panel agente-block">
          <div className="agente-block-title">Cómo habla</div>
          <div className="agente-kv">
            {cerebro?.tono && (
              <div className="agente-kv-row">
                <span className="k">Tono</span>
                <span className="v">{cerebro.tono}</span>
              </div>
            )}
            {cerebro?.horario && (
              <div className="agente-kv-row">
                <span className="k">Horario</span>
                <span className="v">{cerebro.horario}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {servicios.length > 0 && (
        <div className="panel agente-block">
          <div className="agente-block-title">Lo que sabe · servicios y precios</div>
          <div className="agente-kv">
            {servicios.map((s, i) => (
              <div key={i} className="agente-kv-row">
                <span className="k">
                  {s.nombre}
                  {s.detalle ? ` — ${s.detalle}` : ""}
                </span>
                <span className="v">{s.precio}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {faq.length > 0 && (
        <div className="panel agente-block">
          <div className="agente-block-title">Preguntas que resuelve</div>
          <div className="agente-faq">
            {faq.map((f, i) => (
              <details key={i}>
                <summary>{f.pregunta}</summary>
                <p>{f.respuesta}</p>
              </details>
            ))}
          </div>
        </div>
      )}

      <div className="agente-salud">
        <span className="pill">Servicios: {servicios.length}</span>
        <span className="pill">FAQ: {faq.length}</span>
        <span className="pill">{cerebro?.reglas ? "Reglas definidas" : "Reglas base"}</span>
      </div>

      <div className="agente-nota">
        Para cambiar precios, servicios o reglas de {tenant.agente}, escribinos y lo actualizamos — la
        edición self-service llega pronto.
      </div>
    </div>
  );
}
