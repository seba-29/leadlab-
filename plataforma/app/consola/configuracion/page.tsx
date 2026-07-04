"use client";

import { useEffect, useRef, useState } from "react";
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
type Usuario = { id: string; nombre: string; correo: string; rol: "Dueño" | "Equipo" };
type Tab = "empresa" | "integraciones" | "personal" | "plan";

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const COLORES = ["#FF6B2C", "#F472B6", "#93C5FD", "#FFC93F", "#A78BFA", "#C6F24E", "#5EEAD4"];
const TABS: { id: Tab; label: string }[] = [
  { id: "empresa", label: "Mi empresa" },
  { id: "integraciones", label: "Integraciones" },
  { id: "personal", label: "Mi personal" },
  { id: "plan", label: "Plan" },
];

export default function Configuracion() {
  const { scope, current, refreshTenants } = useAccount();
  const tenantId = scope;
  const [tab, setTab] = useState<Tab>("empresa");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((d) => setTenant(d.tenant ?? null))
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

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Configuración</h1>
          <p className="con-sub">Todo lo de {current?.nombre ?? "tu negocio"} en un solo lugar.</p>
        </div>
      </header>

      <div className="tabbar">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "empresa" && (
        <MiEmpresa tenant={tenant} tenantId={tenantId} onSaved={refreshTenants} />
      )}
      {tab === "integraciones" && <Integraciones tenant={tenant} />}
      {tab === "personal" && <MiPersonal tenantId={tenantId} />}
      {tab === "plan" && <PlanTab tenant={tenant} />}
    </div>
  );
}

/* ---------- Mi empresa ---------- */
function MiEmpresa({
  tenant,
  tenantId,
  onSaved,
}: {
  tenant: Tenant;
  tenantId: string;
  onSaved: () => void;
}) {
  const { logos, setLogo } = useAccount();
  const logo = logos[tenantId];
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    nombre: tenant.nombre,
    rubro: tenant.rubro,
    nicho: tenant.cerebro?.descripcion ?? "",
    horario: tenant.cerebro?.horario ?? "",
    color: tenant.color,
  });
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 600 * 1024) {
      alert("El logo debe pesar menos de 600 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(tenantId, String(reader.result));
    reader.readAsDataURL(file);
  }

  async function guardar() {
    if (!form.nombre.trim()) return;
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
        datos: { nombre: form.nombre, rubro: form.rubro, color: form.color },
        cerebro: { ...cerebroBase, descripcion: form.nicho, horario: form.horario },
      }),
    }).catch(() => {});
    setGuardando(false);
    setOk(true);
    onSaved();
    setTimeout(() => setOk(false), 2500);
  }

  return (
    <div className="panel cb-panel">
      <div className="empresa-brand">
        <div
          className="empresa-logo"
          style={{ background: logo ? "transparent" : form.color }}
          onClick={() => fileRef.current?.click()}
          role="button"
          title="Subir logo"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="logo" />
          ) : (
            <span>{tenant.nombre[0]}</span>
          )}
          <div className="empresa-logo-hover">Cambiar</div>
        </div>
        <div className="empresa-brand-side">
          <div className="agente-block-title">Logo de la marca</div>
          <p className="agente-cap-desc">PNG o JPG, cuadrado, &lt; 600 KB. Se ve en el avatar de la cuenta.</p>
          <div className="empresa-brand-actions">
            <button className="btn-ghost-sm" onClick={() => fileRef.current?.click()}>
              Subir logo
            </button>
            {logo && (
              <button className="btn-ghost-sm" onClick={() => setLogo(tenantId, null)}>
                Quitar
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={onFile}
          />
        </div>
      </div>

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
      <label className="field">
        <span>Nicho · a qué se dedica</span>
        <textarea
          rows={2}
          value={form.nicho}
          onChange={(e) => setForm({ ...form, nicho: e.target.value })}
          placeholder="Ej: Clínica estética enfocada en tratamientos faciales y depilación láser."
        />
      </label>
      <div className="cb-row">
        <label className="field">
          <span>Horario de atención</span>
          <input
            value={form.horario}
            onChange={(e) => setForm({ ...form, horario: e.target.value })}
            placeholder="Ej: Lun a Vie 9:00–19:00"
          />
        </label>
        <div className="field">
          <span>Color de marca</span>
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
      </div>
      <div className="cb-actions">
        <button className="btn-primary-lg" onClick={guardar} disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {ok && <span className="cb-ok">✓ Guardado</span>}
      </div>
    </div>
  );
}

/* ---------- Integraciones ---------- */
function Integraciones({ tenant }: { tenant: Tenant }) {
  const waConectado = Boolean(tenant.phoneNumberId);
  const [meta, setMeta] = useState(false);
  const canales = [
    { nombre: "WhatsApp", desc: "Responde y agenda por WhatsApp Business.", listo: waConectado },
    { nombre: "Instagram", desc: "Mensajes directos de Instagram.", listo: false },
    { nombre: "Facebook", desc: "Messenger de tu página.", listo: false },
  ];
  return (
    <div className="cb-grid">
      <div className="panel cb-panel integ-meta">
        <div className="integ-meta-head">
          <div>
            <div className="integ-meta-title">Meta Business</div>
            <p className="agente-cap-desc">
              WhatsApp, Instagram y Facebook se conectan juntos desde tu portafolio de Meta (Business
              Manager). Una sola conexión, los tres canales.
            </p>
          </div>
          <span className={`estado-pill canal-estado ${waConectado ? "conectado" : "pendiente"}`}>
            {waConectado ? "Conectado" : "Por conectar"}
          </span>
        </div>

        <div className="integ-canales">
          {canales.map((c) => (
            <div key={c.nombre} className="integ-row">
              <div>
                <div className="integ-row-name">{c.nombre}</div>
                <div className="integ-row-desc">{c.desc}</div>
              </div>
              <span className={`estado-pill canal-estado ${c.listo ? "conectado" : "proximamente"}`}>
                {c.listo ? "Listo" : "En Meta"}
              </span>
            </div>
          ))}
        </div>

        <div className="integ-actions">
          <button className="btn-primary-lg btn-md" onClick={() => setMeta((v) => !v)}>
            Conectar con Meta
          </button>
          <a className="btn-ghost-sm" href="mailto:hola@leadlab.cl?subject=Conectar%20Meta">
            Necesito ayuda
          </a>
        </div>

        {meta && (
          <div className="onboard-preview integ-nota">
            <div className="onboard-preview-title">Qué necesitamos para conectar</div>
            <p>
              Tu <strong>portafolio de Meta</strong> (Business Manager) verificado y el número de
              WhatsApp Business. Con eso enlazamos WhatsApp Cloud API y los mensajes de IG/FB. Te
              guiamos paso a paso — escribinos y lo dejamos andando.
            </p>
            <div className="onboard-preview-tags">
              <span className="pill">Meta Business</span>
              <span className="pill">WhatsApp Cloud API</span>
              <span className="pill">verificación</span>
            </div>
          </div>
        )}
      </div>

      <div className="panel cb-panel">
        <div className="agente-block-title">Próximamente</div>
        <div className="integ-canales">
          <div className="integ-row">
            <div>
              <div className="integ-row-name">Webchat en tu sitio</div>
              <div className="integ-row-desc">Un botón de chat con IA en tu página web.</div>
            </div>
            <span className="estado-pill canal-estado proximamente">Pronto</span>
          </div>
          <div className="integ-row">
            <div>
              <div className="integ-row-name">Google Calendar</div>
              <div className="integ-row-desc">Sincroniza las citas que agenda la IA.</div>
            </div>
            <span className="estado-pill canal-estado proximamente">Pronto</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mi personal ---------- */
function MiPersonal({ tenantId }: { tenantId: string }) {
  const KEY = `leadlab-equipo-${tenantId}`;
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [form, setForm] = useState<{ nombre: string; correo: string; rol: "Dueño" | "Equipo" }>({
    nombre: "",
    correo: "",
    rol: "Equipo",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUsuarios(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [KEY]);

  function persistir(next: Usuario[]) {
    setUsuarios(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function agregar() {
    if (!form.nombre.trim() || !form.correo.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    if (!/.+@.+\..+/.test(form.correo)) {
      setError("Ese correo no se ve válido.");
      return;
    }
    setError("");
    const nuevo: Usuario = {
      id: `u_${form.correo.toLowerCase()}`,
      nombre: form.nombre.trim(),
      correo: form.correo.trim(),
      rol: form.rol,
    };
    if (usuarios.some((u) => u.id === nuevo.id)) {
      setError("Ya agregaste ese correo.");
      return;
    }
    persistir([...usuarios, nuevo]);
    setForm({ nombre: "", correo: "", rol: "Equipo" });
  }

  return (
    <div className="cb-grid">
      <div className="panel cb-panel">
        <div className="agente-block-title">Equipo · {usuarios.length}</div>
        {usuarios.length === 0 ? (
          <p className="empty">
            Aún no hay usuarios. Agregá a tu equipo para que respondan y gestionen leads contigo.
          </p>
        ) : (
          <div className="equipo-lista">
            {usuarios.map((u) => (
              <div key={u.id} className="equipo-row">
                <div className="equipo-avatar">{u.nombre[0]?.toUpperCase()}</div>
                <div className="equipo-info">
                  <div className="equipo-nombre">{u.nombre}</div>
                  <div className="equipo-correo">{u.correo}</div>
                </div>
                <span className={`ag-tag ${u.rol === "Dueño" ? "interno" : "cliente"}`}>{u.rol}</span>
                <span className="estado-pill canal-estado pendiente">Invitación pendiente</span>
                <button
                  className="cb-del"
                  title="Quitar"
                  onClick={() => persistir(usuarios.filter((x) => x.id !== u.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="agente-nota" style={{ padding: "12px 0 0" }}>
          Las invitaciones por correo se activan con la autenticación (próxima fase). Por ahora quedan
          guardadas acá.
        </p>
      </div>

      <div className="panel cb-panel">
        <div className="agente-block-title">Agregar usuario</div>
        <label className="field">
          <span>Nombre</span>
          <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label className="field">
          <span>Correo</span>
          <input
            type="email"
            value={form.correo}
            onChange={(e) => setForm({ ...form, correo: e.target.value })}
            placeholder="persona@empresa.cl"
          />
        </label>
        <label className="field">
          <span>Rol</span>
          <select
            className="con-select drawer-select"
            value={form.rol}
            onChange={(e) => setForm({ ...form, rol: e.target.value as "Dueño" | "Equipo" })}
          >
            <option value="Equipo">Equipo — responde y gestiona</option>
            <option value="Dueño">Dueño — acceso total</option>
          </select>
        </label>
        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="cb-actions">
          <button className="btn-primary-lg" onClick={agregar}>
            + Agregar al equipo
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Plan ---------- */
function PlanTab({ tenant }: { tenant: Tenant }) {
  return (
    <div className="panel cb-panel plan-card">
      <div className="agente-block-title">Tu plan</div>
      <div className="plan-row">
        <div>
          <div className="plan-nombre">
            {tenant.tipo === "interno" ? "Interno · Lead Lab" : "Plan Lead Lab"}
          </div>
          <div className="plan-sub">Agente IA 24/7 · consola · soporte</div>
        </div>
        <div className="plan-precio">
          {tenant.tipo === "interno" ? "—" : `${CLP.format(planClp(tenant.tipo))}/mes`}
        </div>
      </div>
      <a className="btn-ghost-sm" href="mailto:hola@leadlab.cl?subject=Mi%20plan%20Lead%20Lab">
        Hablar de mi plan
      </a>
    </div>
  );
}
