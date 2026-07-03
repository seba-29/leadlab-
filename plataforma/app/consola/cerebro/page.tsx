"use client";

import { useEffect, useState } from "react";

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
        if (ts.length) setSelId(ts[0].id);
      })
      .catch(() => {});
  }, []);

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
          <h1 className="con-title">Cerebro del agente</h1>
          <p className="con-sub">
            Lo que el agente sabe de cada negocio: servicios, precios, tono y reglas. Guardas y lo usa
            al instante.
          </p>
        </div>
        <select className="con-select" value={selId} onChange={(e) => setSelId(e.target.value)}>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.agente} · {t.nombre}
            </option>
          ))}
        </select>
      </header>

      {sel?.promptOverride ? (
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
