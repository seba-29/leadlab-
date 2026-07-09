"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "../_account/AccountContext";
import { planClp, USD_CLP, PLANES, MARKUP_TOKENS_DEFAULT } from "@/lib/pricing";

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
  logoUrl?: string;
};
type Miembro = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolKey;
  estado: string;
};
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
  const { scope, isAdmin, current, refreshTenants } = useAccount();
  const tenantId = scope;
  const [tab, setTab] = useState<Tab>("empresa");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // El admin ve la configuración de la plataforma (marca, equipo, integraciones).
  if (isAdmin) return <ConfigAdmin />;

  const cargarTenant = useCallback(() => {
    if (!tenantId) {
      setTenant(null);
      return;
    }
    fetch(`/api/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((d) => setTenant(d.tenant ?? null))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    cargarTenant();
  }, [cargarTenant]);

  function reload() {
    cargarTenant();
    refreshTenants(); // que el switcher/banner reflejen logo/color al toque
  }

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

      {tab === "empresa" && <MiEmpresa tenant={tenant} tenantId={tenantId} reload={reload} />}
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
  reload,
}: {
  tenant: Tenant;
  tenantId: string;
  reload: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const logo = tenant.logoUrl;
  const [subiendo, setSubiendo] = useState(false);
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
    reader.onload = async () => {
      setSubiendo(true);
      await fetch(`/api/tenants/${tenantId}/logo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: String(reader.result) }),
      }).catch(() => {});
      setSubiendo(false);
      reload();
    };
    reader.readAsDataURL(file);
  }

  async function quitarLogo() {
    setSubiendo(true);
    await fetch(`/api/tenants/${tenantId}/logo`, { method: "DELETE" }).catch(() => {});
    setSubiendo(false);
    reload();
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
    reload();
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
          <div className="empresa-logo-hover">{subiendo ? "…" : "Cambiar"}</div>
        </div>
        <div className="empresa-brand-side">
          <div className="agente-block-title">Logo de la marca</div>
          <p className="agente-cap-desc">
            PNG o JPG, cuadrado, &lt; 600 KB. Se guarda en la nube y se ve en el avatar de la cuenta.
          </p>
          <div className="empresa-brand-actions">
            <button className="btn-ghost-sm" onClick={() => fileRef.current?.click()} disabled={subiendo}>
              {subiendo ? "Subiendo…" : "Subir logo"}
            </button>
            {logo && (
              <button className="btn-ghost-sm" onClick={quitarLogo} disabled={subiendo}>
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
              guiamos paso a paso — escríbenos y lo dejamos funcionando.
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

/* ---------- Roles del equipo ---------- */
const ROLES = [
  { key: "admin", label: "Admin", desc: "Acceso total a la cuenta" },
  { key: "ejecutivo", label: "Ejecutivo", desc: "Inbox, leads y agenda" },
  { key: "marketing", label: "Marketing", desc: "Campañas y métricas" },
] as const;
type RolKey = (typeof ROLES)[number]["key"];

function RolePicker({ value, onChange }: { value: RolKey; onChange: (r: RolKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const cur = ROLES.find((r) => r.key === value) ?? ROLES[1];
  return (
    <div className="gsel" ref={ref}>
      <button
        type="button"
        className={`gsel-btn${open ? " open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`gsel-badge rol-${cur.key}`} />
        <span className="gsel-cur">
          <b>{cur.label}</b>
          <small>{cur.desc}</small>
        </span>
        <svg className="gsel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="gsel-pop" role="listbox">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r.key}
              role="option"
              aria-selected={r.key === value}
              className={`gsel-opt${r.key === value ? " on" : ""}`}
              onClick={() => {
                onChange(r.key);
                setOpen(false);
              }}
            >
              <span className={`gsel-badge rol-${r.key}`} />
              <span className="gsel-optxt">
                <b>{r.label}</b>
                <small>{r.desc}</small>
              </span>
              {r.key === value && <span className="gsel-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Mi personal ---------- */
function MiPersonal({ tenantId }: { tenantId: string }) {
  const [usuarios, setUsuarios] = useState<Miembro[]>([]);
  const [form, setForm] = useState<{ nombre: string; correo: string; rol: RolKey }>({
    nombre: "",
    correo: "",
    rol: "ejecutivo",
  });
  const [error, setError] = useState("");

  const cargar = useCallback(() => {
    fetch(`/api/tenants/${tenantId}/miembros`)
      .then((r) => r.json())
      .then((d) => setUsuarios(d.miembros ?? []))
      .catch(() => {});
  }, [tenantId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function agregar() {
    if (!form.nombre.trim() || !form.correo.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setError("");
    const d = await fetch(`/api/tenants/${tenantId}/miembros`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    }).then((r) => r.json());
    if (d.error) {
      setError(d.error);
      return;
    }
    setForm({ nombre: "", correo: "", rol: "ejecutivo" });
    cargar();
  }

  async function quitar(id: string) {
    await fetch(`/api/tenants/${tenantId}/miembros?miembroId=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
    cargar();
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
                <span className={`ag-tag rol-tag rol-${u.rol}`}>
                  {ROLES.find((r) => r.key === u.rol)?.label ?? u.rol}
                </span>
                <span className="estado-pill canal-estado pendiente">
                  {u.estado === "activo" ? "Activo" : "Invitación pendiente"}
                </span>
                <button className="cb-del" title="Quitar" onClick={() => quitar(u.id)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="agente-nota" style={{ padding: "12px 0 0" }}>
          Guardado en Supabase. El envío del correo de invitación y el login se activan con la
          autenticación (próxima fase).
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
          <RolePicker value={form.rol} onChange={(r) => setForm({ ...form, rol: r })} />
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

/* ============================================================
   Configuración de ADMIN (plataforma Lead Lab)
   ============================================================ */
const ADMIN_TABS = [
  { id: "marca", label: "Marca" },
  { id: "equipo", label: "Equipo" },
  { id: "integraciones", label: "Integraciones" },
  { id: "comercial", label: "Comercial" },
] as const;
type AdminTab = (typeof ADMIN_TABS)[number]["id"];

function ConfigAdmin() {
  const { tenants, refreshTenants } = useAccount();
  const internoId = tenants.find((t) => t.tipo === "interno")?.id ?? "";
  const [tab, setTab] = useState<AdminTab>("marca");
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const cargar = useCallback(() => {
    if (!internoId) return;
    fetch(`/api/tenants/${internoId}`)
      .then((r) => r.json())
      .then((d) => setTenant(d.tenant ?? null))
      .catch(() => {});
  }, [internoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function reload() {
    cargar();
    refreshTenants();
  }

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Configuración</h1>
          <p className="con-sub">
            La administración de Lead Lab: tu marca, tu equipo interno, las integraciones y lo comercial.
          </p>
        </div>
      </header>

      <div className="tabbar">
        {ADMIN_TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "marca" &&
        (tenant && internoId ? (
          <MiEmpresa tenant={tenant} tenantId={internoId} reload={reload} />
        ) : (
          <div className="con-loading">Cargando…</div>
        ))}
      {tab === "equipo" &&
        (internoId ? (
          <MiPersonal tenantId={internoId} />
        ) : (
          <div className="con-loading">Cargando…</div>
        ))}
      {tab === "integraciones" && <EstadoIntegraciones />}
      {tab === "comercial" && <Comercial />}
    </div>
  );
}

/* ---------- Integraciones (estado de la plataforma) ---------- */
function EstadoIntegraciones() {
  const [e, setE] = useState<{
    claude: boolean;
    supabase: boolean;
    auth: boolean;
    email: boolean;
    whatsapp: boolean;
    emailFrom: string;
    model: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/estado")
      .then((r) => r.json())
      .then(setE)
      .catch(() => {});
  }, []);

  if (!e) return <div className="con-loading">Cargando estado…</div>;

  const filas = [
    { nombre: "Claude · IA de los agentes", desc: `Motor de los agentes · modelo ${e.model}`, ok: e.claude },
    { nombre: "Supabase · base de datos", desc: "Persistencia real de cuentas, leads y conversaciones.", ok: e.supabase },
    { nombre: "Login con 2FA", desc: "Acceso con clave + código al correo (Supabase Auth).", ok: e.auth },
    {
      nombre: "Correo · Resend",
      desc: e.emailFrom ? `Remitente: ${e.emailFrom}` : "Código de login y notificaciones por correo.",
      ok: e.email,
    },
    { nombre: "WhatsApp Cloud API", desc: "Recepción y envío de mensajes de WhatsApp.", ok: e.whatsapp },
  ];

  return (
    <div className="panel cb-panel">
      <div className="agente-block-title">Estado de la plataforma</div>
      <p className="agente-cap-desc" style={{ marginBottom: 14 }}>
        Qué está conectado ahora mismo. Las credenciales viven en variables de entorno del servidor —
        nunca se muestran ni se guardan acá.
      </p>
      <div className="integ-canales">
        {filas.map((f) => (
          <div key={f.nombre} className="integ-row">
            <div>
              <div className="integ-row-name">{f.nombre}</div>
              <div className="integ-row-desc">{f.desc}</div>
            </div>
            <span className={`estado-pill canal-estado ${f.ok ? "conectado" : "pendiente"}`}>
              {f.ok ? "Conectado" : "Pendiente"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Comercial (dashboard de ejecutivo) ---------- */
type ClienteRow = {
  id: string;
  nombre: string;
  color: string;
  tipo: string;
  plan?: string;
  planClp: number;
  costoUsd: number;
  salud: string;
};

function Comercial() {
  const [data, setData] = useState<{ totales: Record<string, number>; clientes: ClienteRow[] } | null>(
    null,
  );
  const [markup, setMarkup] = useState(MARKUP_TOKENS_DEFAULT);

  useEffect(() => {
    fetch("/api/admin/global")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="con-loading">Cargando datos comerciales…</div>;

  const t = data.totales;
  const clientes = (data.clientes ?? []).filter((c) => c.tipo === "cliente");
  const costoClpMes = (t.costoUsdMes ?? 0) * USD_CLP;
  const markupClp = costoClpMes * markup;
  const ingresoTotal = (t.mrrClp ?? 0) + markupClp;
  const tot = ingresoTotal || 1;
  const margenNeto = ingresoTotal - costoClpMes;
  const margenPct = ingresoTotal > 0 ? margenNeto / ingresoTotal : 0;
  const arpu = t.nClientes > 0 ? t.mrrClp / t.nClientes : 0;

  const porPlan = PLANES.map((p) => {
    const cs = clientes.filter((c) => (c.plan ?? "crm") === p.key);
    return { ...p, n: cs.length, mrr: cs.reduce((s, c) => s + c.planClp, 0) };
  });
  const maxN = Math.max(1, ...porPlan.map((p) => p.n));

  const topCosto = [...clientes].sort((a, b) => b.costoUsd - a.costoUsd).slice(0, 6);
  const maxCosto = Math.max(0.01, ...topCosto.map((c) => c.costoUsd));

  const kpis = [
    { label: "MRR", value: CLP.format(t.mrrClp ?? 0), sub: `${t.nClientes ?? 0} clientes · +${t.nuevos30d ?? 0} este mes`, tone: "accent" },
    { label: "Ingreso extra · tokens", value: CLP.format(Math.round(markupClp)), sub: `markup ${Math.round(markup * 100)}% sobre IA`, tone: "money" },
    { label: "Ingreso total / mes", value: CLP.format(Math.round(ingresoTotal)), sub: "planes + recarga de tokens", tone: "" },
    { label: "ARPU", value: CLP.format(Math.round(arpu)), sub: "ingreso promedio por cliente", tone: "" },
    { label: "Margen neto", value: `${Math.round(margenPct * 100)}%`, sub: `${CLP.format(Math.round(margenNeto))} / mes`, tone: "" },
  ];

  return (
    <div className="dash">
      <div className="dash-kpis">
        {kpis.map((k) => (
          <div key={k.label} className={`dash-kpi ${k.tone}`}>
            <div className="dash-kpi-label">{k.label}</div>
            <div className="dash-kpi-value">{k.value}</div>
            <div className="dash-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="panel dash-card dash-wide">
          <div className="dash-card-head">
            <div className="agente-block-title">Composición de ingresos</div>
            <div className="dash-total">
              {CLP.format(Math.round(ingresoTotal))}
              <span>/mes</span>
            </div>
          </div>
          <div className="stackbar">
            <div className="stackbar-seg base" style={{ width: `${((t.mrrClp ?? 0) / tot) * 100}%` }} />
            <div className="stackbar-seg markup" style={{ width: `${(markupClp / tot) * 100}%` }} />
          </div>
          <div className="stackbar-legend">
            <span>
              <i className="dot base" /> Planes · {CLP.format(t.mrrClp ?? 0)}
            </span>
            <span>
              <i className="dot markup" /> Recarga tokens · {CLP.format(Math.round(markupClp))}
            </span>
          </div>
          <div className="markup-ctl">
            <div className="markup-ctl-head">
              <span>Recargo de tokens al cliente</span>
              <strong>{Math.round(markup * 100)}%</strong>
            </div>
            <input
              type="range"
              min={0}
              max={0.6}
              step={0.05}
              value={markup}
              onChange={(e) => setMarkup(Number(e.target.value))}
            />
            <p className="agente-cap-desc" style={{ marginTop: 8 }}>
              Le cobras a cada cliente su consumo de IA + {Math.round(markup * 100)}%. Costo real del mes:{" "}
              {CLP.format(Math.round(costoClpMes))} → <strong>{CLP.format(Math.round(markupClp))}</strong> extra
              para ti, sin trabajo adicional.
            </p>
          </div>
        </div>

        <div className="panel dash-card">
          <div className="agente-block-title">Clientes por plan</div>
          <div className="planbars">
            {porPlan.map((p) => (
              <div key={p.key} className="planbar">
                <div className="planbar-top">
                  <span className="planbar-name">
                    <i className="dot" style={{ background: p.color }} /> {p.corto}
                  </span>
                  <span className="planbar-n">{p.n}</span>
                </div>
                <div className="planbar-track">
                  <div className="planbar-fill" style={{ width: `${(p.n / maxN) * 100}%`, background: p.color }} />
                </div>
                <div className="planbar-foot">
                  {CLP.format(p.clp)}/mes · aporta {CLP.format(p.mrr)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel dash-card">
          <div className="dash-card-head">
            <div className="agente-block-title">Costo de IA por cliente</div>
            <div className="dash-total">
              {CLP.format(Math.round(costoClpMes))}
              <span>/mes</span>
            </div>
          </div>
          <div className="costlist">
            {topCosto.map((c) => (
              <div key={c.id} className="costrow">
                <span className="costrow-dot" style={{ background: c.color }} />
                <span className="costrow-name">{c.nombre}</span>
                <span className="costrow-bar">
                  <i style={{ width: `${(c.costoUsd / maxCosto) * 100}%`, background: c.color }} />
                </span>
                <span className="costrow-val">{CLP.format(Math.round(c.costoUsd * USD_CLP))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel dash-card">
          <div className="agente-block-title">Cartera</div>
          <div className="agente-kv">
            <div className="agente-kv-row">
              <span className="k">Clientes activos</span>
              <span className="v">{t.nClientes ?? 0}</span>
            </div>
            <div className="agente-kv-row">
              <span className="k">Nuevos (30 días)</span>
              <span className="v" style={{ color: "var(--t-green)" }}>+{t.nuevos30d ?? 0}</span>
            </div>
            <div className="agente-kv-row">
              <span className="k">En riesgo</span>
              <span className="v" style={{ color: (t.enRiesgo ?? 0) > 0 ? "var(--t-orange)" : undefined }}>
                {t.enRiesgo ?? 0}
              </span>
            </div>
            <div className="agente-kv-row">
              <span className="k">Leads ganados</span>
              <span className="v">{t.ganadosTotales ?? 0}</span>
            </div>
            <div className="agente-kv-row">
              <span className="k">Tipo de cambio</span>
              <span className="v">USD 1 = {CLP.format(USD_CLP)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
