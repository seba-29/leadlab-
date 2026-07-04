"use client";

import { useState } from "react";
import { useAccount } from "../_account/AccountContext";
import { PLANTILLAS, type Plantilla } from "@/lib/plantillas";

export default function Plantillas() {
  const { isAdmin } = useAccount();
  const [sel, setSel] = useState<Plantilla | null>(null);

  if (!isAdmin) {
    return (
      <div>
        <header className="con-head">
          <div>
            <h1 className="con-title">Plantillas de rubro</h1>
            <p className="con-sub">Catálogo de verticales de Lead Lab.</p>
          </div>
        </header>
        <div className="panel ag-empty">🔒 Volvé a la cuenta Admin para ver las plantillas.</div>
      </div>
    );
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Plantillas de rubro</h1>
          <p className="con-sub">
            Cerebros base por vertical. Tu diferenciador: onboardeás un cliente nuevo con su agente ya
            armado en minutos.
          </p>
        </div>
      </header>

      <div className="salud-grid">
        {PLANTILLAS.map((p) => (
          <button key={p.id} className="salud-card plantilla-card" onClick={() => setSel(p)}>
            <div className="plantilla-emoji">{p.emoji}</div>
            <div className="plantilla-label">{p.label}</div>
            <div className="sub-meta">{p.cerebro.descripcion.slice(0, 90)}…</div>
            <div className="onboard-preview-tags">
              <span className="pill">{p.cerebro.servicios.length} servicios</span>
              <span className="pill">{p.cerebro.faq.length} FAQ</span>
            </div>
          </button>
        ))}
      </div>

      {sel && <PlantillaDetalle p={sel} onClose={() => setSel(null)} />}
    </div>
  );
}

function PlantillaDetalle({ p, onClose }: { p: Plantilla; onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            {p.emoji} {p.label}
          </h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="agente-block-title">Agente sugerido</div>
        <p className="agente-cap-desc plantilla-p">
          {p.agenteSugerido} · {p.rubro}
        </p>

        <div className="agente-block-title">Descripción</div>
        <p className="agente-cap-desc plantilla-p">{p.cerebro.descripcion}</p>

        <div className="agente-block-title">Tono y horario</div>
        <p className="agente-cap-desc plantilla-p">
          {p.cerebro.tono}
          <br />
          {p.cerebro.horario}
        </p>

        <div className="agente-block-title">Servicios</div>
        <div className="agente-kv plantilla-p">
          {p.cerebro.servicios.map((s, i) => (
            <div key={i} className="agente-kv-row">
              <span className="k">
                {s.nombre}
                {s.detalle ? ` — ${s.detalle}` : ""}
              </span>
              <span className="v">{s.precio}</span>
            </div>
          ))}
        </div>

        <div className="agente-block-title">Preguntas frecuentes</div>
        <div className="agente-faq plantilla-p">
          {p.cerebro.faq.map((f, i) => (
            <details key={i}>
              <summary>{f.pregunta}</summary>
              <p>{f.respuesta}</p>
            </details>
          ))}
        </div>

        <div className="agente-block-title">Reglas del rubro</div>
        <p className="agente-cap-desc">{p.cerebro.reglas}</p>
      </div>
    </div>
  );
}
