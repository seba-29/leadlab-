"use client";

import { useEffect, useState } from "react";
import { useAccount } from "../_account/AccountContext";
import { planClp } from "@/lib/pricing";

type Cerebro = {
  descripcion: string;
  tono: string;
  horario: string;
  servicios: { nombre: string; precio: string; detalle?: string }[];
  faq: { pregunta: string; respuesta: string }[];
  reglas: string;
};
type Tenant = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
  cerebro?: Cerebro;
  phoneNumberId?: string;
};

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

export default function Configuracion() {
  const { scope, current } = useAccount();
  const tenantId = scope;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ nombre: "", rubro: "", agente: "", horario: "" });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((d) => {
        const t: Tenant | undefined = d.tenant;
        setTenant(t ?? null);
        if (t)
          setForm({
            nombre: t.nombre,
            rubro: t.rubro,
            agente: t.agente,
            horario: t.cerebro?.horario ?? "",
          });
      })
      .catch(() => {});
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div>
        <header className="con-head">
          <div>
            <h1 className="con-title">Configuración</h1>
            <p className="con-sub">Los datos del negocio de una subcuenta.</p>
          </div>
        </header>
        <div className="panel ag-empty">
          👆 Entrá como una subcuenta (arriba, en el switcher) para configurar su negocio.
        </div>
      </div>
    );
  }
  if (!tenant) return <div className="con-loading">Cargando…</div>;

  async function guardar() {
    if (!form.nombre.trim() || !tenant) return;
    setGuardando(true);
    const cerebroBase: Cerebro = tenant.cerebro ?? {
      descripcion: "",
      tono: "",
      horario: "",
      servicios: [],
      faq: [],
      reglas: "",
    };
    await fetch(`/api/tenants/${tenantId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        datos: { nombre: form.nombre, rubro: form.rubro, agente: form.agente },
        cerebro: { ...cerebroBase, horario: form.horario },
      }),
    }).catch(() => {});
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2500);
  }

  const waConectado = Boolean(tenant.phoneNumberId);
  const canales = [
    {
      nombre: "WhatsApp",
      estado: waConectado ? "conectado" : "pendiente",
      detalle: waConectado ? tenant.phoneNumberId : "Conectá tu número para que el agente atienda.",
    },
    { nombre: "Instagram", estado: "proximamente", detalle: "Mensajes directos — muy pronto." },
    { nombre: "Facebook", estado: "proximamente", detalle: "Messenger — muy pronto." },
  ];

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Configuración</h1>
          <p className="con-sub">Los datos de {current?.nombre ?? "tu negocio"} y sus canales.</p>
        </div>
      </header>

      <div className="cb-grid">
        <div className="panel cb-panel">
          <div className="agente-block-title">Tu negocio</div>
          <div className="cb-row">
            <label className="field">
              <span>Nombre del negocio</span>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </label>
            <label className="field">
              <span>Rubro</span>
              <input value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} />
            </label>
          </div>
          <div className="cb-row">
            <label className="field">
              <span>Nombre del agente</span>
              <input value={form.agente} onChange={(e) => setForm({ ...form, agente: e.target.value })} />
            </label>
            <label className="field">
              <span>Horario de atención</span>
              <input
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                placeholder="Ej: Lun a Vie 9:00–19:00"
              />
            </label>
          </div>
          <div className="cb-actions">
            <button className="btn-primary-lg" onClick={guardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
            {ok && <span className="cb-ok">✓ Guardado</span>}
          </div>
        </div>

        <div className="panel cb-panel">
          <div className="agente-block-title">Canales conectados</div>
          <div className="canal-grid">
            {canales.map((c) => (
              <div key={c.nombre} className="canal-card">
                <div className="canal-card-top">
                  <span className="canal-nombre">{c.nombre}</span>
                  <span className={`estado-pill canal-estado ${c.estado}`}>
                    {c.estado === "conectado"
                      ? "Conectado"
                      : c.estado === "pendiente"
                        ? "Pendiente"
                        : "Próximamente"}
                  </span>
                </div>
                <div className="canal-detalle">{c.detalle}</div>
                {c.estado === "pendiente" && (
                  <a className="btn-ghost-sm" href="mailto:hola@leadlab.cl?subject=Conectar%20WhatsApp">
                    Conectar
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="panel cb-panel plan-card">
          <div className="agente-block-title">Tu plan</div>
          <div className="plan-row">
            <div>
              <div className="plan-nombre">
                {tenant.tipo === "interno" ? "Interno · Lead Lab" : "Plan Lead Lab"}
              </div>
              <div className="plan-sub">Agente IA 24/7 + consola + soporte</div>
            </div>
            <div className="plan-precio">
              {tenant.tipo === "interno" ? "—" : `${CLP.format(planClp(tenant.tipo))}/mes`}
            </div>
          </div>
          <a
            className="btn-ghost-sm"
            href="mailto:hola@leadlab.cl?subject=Mi%20plan%20Lead%20Lab"
          >
            Hablar de mi plan
          </a>
        </div>
      </div>
    </div>
  );
}
