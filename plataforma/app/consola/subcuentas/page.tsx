"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "../_account/AccountContext";
import { PLANTILLAS } from "@/lib/plantillas";

type TenantMin = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
};

const COLORES = ["#FF6B2C", "#F472B6", "#93C5FD", "#FFC93F", "#A78BFA", "#C6F24E", "#5EEAD4"];

export default function Subcuentas() {
  const router = useRouter();
  const { isAdmin, tenants, entrarComo, refreshTenants } = useAccount();
  const [nuevo, setNuevo] = useState(false);

  if (!isAdmin) {
    return (
      <div>
        <header className="con-head">
          <div>
            <h1 className="con-title">Subcuentas</h1>
            <p className="con-sub">Gestión de clientes de Lead Lab.</p>
          </div>
        </header>
        <div className="panel ag-empty">🔒 Volvé a la cuenta Admin para gestionar subcuentas.</div>
      </div>
    );
  }

  const ordenados = [...tenants].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "interno" ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  function entrar(id: string) {
    entrarComo(id);
    router.push("/consola");
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Subcuentas</h1>
          <p className="con-sub">Tus clientes. Creá uno nuevo o entrá a su consola.</p>
        </div>
        <button className="btn-primary-lg btn-md" onClick={() => setNuevo(true)}>
          + Nuevo cliente
        </button>
      </header>

      <div className="salud-grid">
        {ordenados.map((t) => (
          <div key={t.id} className="salud-card sub-card">
            <div className="salud-top">
              <span className="kb-dot" style={{ background: t.color }} />
              <span className="salud-nombre">{t.nombre}</span>
              <span className={`ag-tag ${t.tipo}`}>{t.tipo === "interno" ? "interno" : "cliente"}</span>
            </div>
            <div className="sub-meta">
              {t.agente} · {t.rubro}
            </div>
            <div className="sub-actions">
              <button className="btn-primary-lg btn-md" onClick={() => entrar(t.id)}>
                Entrar como
              </button>
            </div>
          </div>
        ))}
      </div>

      {nuevo && (
        <OnboardingModal
          onClose={() => setNuevo(false)}
          onCreated={async (t) => {
            setNuevo(false);
            await refreshTenants(); // esperar a que el nuevo tenant esté en la lista
            entrar(t.id); // antes de entrar como él (si no, la validación cae a admin)
          }}
        />
      )}
    </div>
  );
}

function OnboardingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (t: TenantMin) => void;
}) {
  const [form, setForm] = useState({
    nombre: "",
    agente: "",
    plantillaId: PLANTILLAS[0].id,
    color: COLORES[0],
  });
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);
  const plantilla = PLANTILLAS.find((p) => p.id === form.plantillaId);

  async function crear() {
    if (!form.nombre.trim()) {
      setError("El nombre del negocio es obligatorio.");
      return;
    }
    setGuardando(true);
    setError("");
    const d = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: form.nombre,
        agente: form.agente || plantilla?.agenteSugerido,
        rubro: plantilla?.rubro,
        plantillaId: form.plantillaId,
        color: form.color,
      }),
    }).then((r) => r.json());
    setGuardando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    onCreated(d.tenant);
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Nuevo cliente</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="cb-row">
          <label className="field">
            <span>Negocio *</span>
            <input
              placeholder="Ej: Clínica Aurora"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Nombre del agente</span>
            <input
              placeholder={plantilla?.agenteSugerido}
              value={form.agente}
              onChange={(e) => setForm({ ...form, agente: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Vertical / rubro</span>
          <select
            className="con-select drawer-select"
            value={form.plantillaId}
            onChange={(e) => setForm({ ...form, plantillaId: e.target.value })}
          >
            {PLANTILLAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Color del agente</span>
          <div className="swatches">
            {COLORES.map((c) => (
              <button
                key={c}
                className={`swatch ${form.color === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setForm({ ...form, color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        </div>

        {plantilla && (
          <div className="onboard-preview">
            <div className="onboard-preview-title">
              {plantilla.emoji} Cerebro base que se instala
            </div>
            <p>{plantilla.cerebro.descripcion}</p>
            <div className="onboard-preview-tags">
              <span className="pill">{plantilla.cerebro.servicios.length} servicios</span>
              <span className="pill">{plantilla.cerebro.faq.length} FAQ</span>
              <span className="pill">reglas del rubro</span>
            </div>
          </div>
        )}

        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={crear} disabled={guardando}>
            {guardando ? "Creando…" : "Crear e instalar cerebro"}
          </button>
          <span className="modal-hint">Queda con servicios, FAQ y reglas del rubro listos.</span>
        </div>
      </div>
    </div>
  );
}
