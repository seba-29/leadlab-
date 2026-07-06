"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccountProvider, useAccount } from "./_account/AccountContext";

// ---- Íconos (line-art, heredan currentColor) ----
const IconDash = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);
const IconSpark = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" />
    <path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
  </svg>
);
const IconInbox = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M21 12h-5l-2 3h-4l-2-3H3" />
    <path d="M5.5 5h13L21 12v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6l2.5-7z" />
  </svg>
);
const IconLeads = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3" y="4" width="5" height="16" rx="1.2" />
    <rect x="10" y="4" width="5" height="10" rx="1.2" />
    <rect x="17" y="4" width="5" height="13" rx="1.2" />
  </svg>
);
const IconPeople = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.5 14.7c2.5.1 4.3 1.5 4.9 3.8" />
  </svg>
);
const IconAgenda = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
  </svg>
);
const IconConfig = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.4M12 18.6V21M4.5 7l2 1.2M17.5 15.8l2 1.2M4.5 17l2-1.2M17.5 8.2l2-1.2" />
  </svg>
);
const IconLayers = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M12 3l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5M3 16.5l9 5 9-5" />
  </svg>
);
const IconBuilding = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M8 7h2M14 7h2M8 11h2M14 11h2M10 21v-3h4v3" />
  </svg>
);
const IconUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M5 20c.8-3.6 3.4-5.5 7-5.5s6.2 1.9 7 5.5" />
  </svg>
);
const IconLogout = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M15 12H4.5M12 8.5 15.5 12 12 15.5" />
    <path d="M9 5.5V4.5A1.5 1.5 0 0 1 10.5 3h7A1.5 1.5 0 0 1 19 4.5v15a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 9 19.5v-1" />
  </svg>
);

// ---- Menú principal (aplanado: los submenús viven como TABS en cada página) ----
type NavItem = { href: string; label: string; icon: ReactNode };

const NAV_ADMIN: NavItem[] = [
  { href: "/consola", label: "Dashboard", icon: IconDash },
  { href: "/consola/inbox", label: "Inbox", icon: IconInbox },
  { href: "/consola/leads", label: "Leads", icon: IconLeads },
  { href: "/consola/agentes", label: "Agentes IA", icon: IconSpark },
  { href: "/consola/plantillas", label: "Plantillas de rubro", icon: IconLayers },
  { href: "/consola/clientes", label: "Clientes & consumo", icon: IconPeople },
  { href: "/consola/subcuentas", label: "Subcuentas", icon: IconBuilding },
];

const NAV_CLIENTE: NavItem[] = [
  { href: "/consola", label: "Resumen", icon: IconDash },
  { href: "/consola/inbox", label: "Conversaciones", icon: IconInbox },
  { href: "/consola/leads", label: "Leads", icon: IconLeads },
  { href: "/consola/agenda", label: "Agenda", icon: IconAgenda },
  { href: "/consola/agentes", label: "Agentes IA", icon: IconSpark },
];

// Configuración va SIEMPRE al pie del sidebar (administración / cuenta).
const NAV_CONFIG: NavItem = {
  href: "/consola/configuracion",
  label: "Configuración",
  icon: IconConfig,
};

function esActivo(href: string, pathname: string): boolean {
  return href === "/consola" ? pathname === "/consola" : pathname.startsWith(href);
}

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  return (
    <Link
      href={item.href}
      className={`con-nav-item ${esActivo(item.href, pathname) ? "active" : ""}`}
    >
      <span className="con-nav-icon">{item.icon}</span>
      {item.label}
    </Link>
  );
}

function Sidebar() {
  const { isAdmin } = useAccount();
  const items = isAdmin ? NAV_ADMIN : NAV_CLIENTE;

  return (
    <aside className="con-sidebar">
      <Link href="/consola" className="brand con-brand">
        Lead<span className="brand-accent">Lab</span>
        <span className="brand-dot" />
      </Link>

      {/* Admin: switcher de cuentas apenas debajo del logo. */}
      {isAdmin && <AccountSwitcher />}

      <nav className="con-nav">
        {items.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>

      {/* Pie: Configuración al fondo + (cliente) su identidad pegada. */}
      <div className="con-sidebar-tail">
        <NavLink item={NAV_CONFIG} />
        {!isAdmin && <ClientIdentity />}
      </div>
    </aside>
  );
}

function AccountSwitcher() {
  const { cuentaActiva, tenants, entrarComo, volverAAdmin } = useAccount();

  const ordenados = [...tenants].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "interno" ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  return (
    <div className="con-switch">
      <div className="con-user">
        <div className="con-user-avatar">LL</div>
        <div>
          <div className="con-user-name">Lead Lab</div>
          <div className="con-user-role">Admin · global</div>
        </div>
      </div>
      {tenants.length > 0 && (
        <select
          className="con-select con-switch-select"
          value={cuentaActiva}
          onChange={(e) =>
            e.target.value === "admin" ? volverAAdmin() : entrarComo(e.target.value)
          }
          aria-label="Cambiar de cuenta"
        >
          <option value="admin">★ Admin · vista global</option>
          <optgroup label="Entrar como subcuenta">
            {ordenados.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
                {t.tipo === "interno" ? " (interno)" : ""}
              </option>
            ))}
          </optgroup>
        </select>
      )}
    </div>
  );
}

function ClientIdentity() {
  const { current, logos } = useAccount();
  if (!current) return null;
  const logo = logos[current.id];
  return (
    <div className="con-user is-client">
      <div
        className="con-user-avatar"
        style={!logo ? { background: current.color } : undefined}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="con-logo-img" src={logo} alt="" />
        ) : (
          current.agente?.[0] ?? "?"
        )}
      </div>
      <div>
        <div className="con-user-name">{current.nombre}</div>
        <div className="con-user-role">{current.rubro || "Tu negocio"}</div>
      </div>
    </div>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useAccount();
  return (
    <div
      className={`theme-toggle${compact ? " compact" : ""}`}
      role="group"
      aria-label="Tema de la consola"
    >
      <button
        className={theme === "light" ? "on" : ""}
        aria-pressed={theme === "light"}
        aria-label="Tema claro"
        onClick={() => setTheme("light")}
      >
        <span aria-hidden>☀️</span>
        <span className="tt-label">Claro</span>
      </button>
      <button
        className={theme === "dark" ? "on" : ""}
        aria-pressed={theme === "dark"}
        aria-label="Tema oscuro"
        onClick={() => setTheme("dark")}
      >
        <span aria-hidden>🌙</span>
        <span className="tt-label">Oscuro</span>
      </button>
    </div>
  );
}

function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<{ nombre: string; email: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) setMe(d.user);
      })
      .catch(() => {});
  }, []);

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

  async function salir() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
    router.refresh();
  }

  const nombre = me?.nombre ?? "Mi cuenta";
  const email = me?.email ?? "";
  const iniciales = nombre.slice(0, 2).toUpperCase();

  return (
    <div className="con-usermenu" ref={ref}>
      <button
        className="con-usermenu-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de usuario"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="con-usermenu-avatar">{iniciales}</span>
        <svg
          className="con-usermenu-chev"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="con-usermenu-pop" role="menu">
          <div className="con-usermenu-head">
            <div className="con-usermenu-name">{nombre}</div>
            {email && <div className="con-usermenu-mail">{email}</div>}
          </div>
          <Link
            href="/consola/configuracion"
            role="menuitem"
            className="con-usermenu-item"
            onClick={() => setOpen(false)}
          >
            <span className="con-usermenu-ico">{IconUser}</span>
            Editar perfil
          </Link>
          <div className="con-usermenu-sep" />
          <button className="con-usermenu-item danger" role="menuitem" onClick={salir}>
            <span className="con-usermenu-ico">{IconLogout}</span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

function ConTopbar() {
  return (
    <div className="con-topbar">
      <div className="con-topbar-right">
        <ThemeToggle compact />
        <UserMenu />
      </div>
    </div>
  );
}

function ViewAsBanner() {
  const { isAdmin, current, volverAAdmin, logos } = useAccount();
  if (isAdmin || !current) return null;
  const logo = logos[current.id];
  return (
    <div className="con-viewas" style={{ borderLeftColor: current.color }}>
      <span className="con-viewas-left">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="con-viewas-logo" src={logo} alt="" />
        ) : (
          "👁"
        )}{" "}
        Viendo como <strong>{current.nombre}</strong> · {current.agente}
      </span>
      <button className="btn-ghost-sm" onClick={volverAAdmin}>
        Volver a admin
      </button>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="con-shell">
      <div className="bg-glow" aria-hidden />
      <Sidebar />
      <main className="con-main">
        <ConTopbar />
        <ViewAsBanner />
        {children}
      </main>
    </div>
  );
}

export default function ConsolaLayout({ children }: { children: ReactNode }) {
  return (
    <AccountProvider>
      <Shell>{children}</Shell>
    </AccountProvider>
  );
}
