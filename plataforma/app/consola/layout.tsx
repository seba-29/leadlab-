"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
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
const IconBrain = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M9.5 4A2.5 2.5 0 0 0 7 6.5v11a2.5 2.5 0 0 0 5 0v-11A2.5 2.5 0 0 0 9.5 4z" />
    <path d="M14.5 4A2.5 2.5 0 0 1 17 6.5v11a2.5 2.5 0 0 1-5 0" />
    <path d="M7 9H5.5A1.5 1.5 0 0 0 4 10.5v0A1.5 1.5 0 0 0 5.5 12H7M17 9h1.5A1.5 1.5 0 0 1 20 10.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
  </svg>
);

type NavItem = { href: string; label: string; icon: ReactNode };
type NavGroup = { label?: string; items: NavItem[] };

const NAV_ADMIN: NavGroup[] = [
  { label: "General", items: [{ href: "/consola", label: "Dashboard", icon: IconDash }] },
  {
    label: "Operación",
    items: [
      { href: "/consola/inbox", label: "Inbox", icon: IconInbox },
      { href: "/consola/leads", label: "Leads", icon: IconLeads },
    ],
  },
  {
    label: "Agentes IA",
    items: [
      { href: "/consola/agentes", label: "Probar IA", icon: IconSpark },
      { href: "/consola/cerebro", label: "Cerebro", icon: IconBrain },
    ],
  },
  {
    label: "Negocio",
    items: [{ href: "/consola/clientes", label: "Clientes & consumo", icon: IconPeople }],
  },
];

const NAV_CLIENTE: NavGroup[] = [
  {
    items: [
      { href: "/consola", label: "Resumen", icon: IconDash },
      { href: "/consola/inbox", label: "Conversaciones", icon: IconInbox },
      { href: "/consola/leads", label: "Leads", icon: IconLeads },
    ],
  },
  {
    label: "Tu agente IA",
    items: [
      { href: "/consola/agentes", label: "Probar mi agente", icon: IconSpark },
      { href: "/consola/cerebro", label: "Ficha del agente", icon: IconBrain },
    ],
  },
];

function esActivo(href: string, pathname: string): boolean {
  return href === "/consola" ? pathname === "/consola" : pathname.startsWith(href);
}

function Sidebar() {
  const pathname = usePathname();
  const { isAdmin } = useAccount();
  const grupos = isAdmin ? NAV_ADMIN : NAV_CLIENTE;

  return (
    <aside className="con-sidebar">
      <Link href="/consola" className="brand con-brand">
        Lead<span className="brand-accent">Lab</span>
        <span className="brand-dot" />
      </Link>
      <nav className="con-nav">
        {grupos.map((g, gi) => (
          <div key={g.label ?? `g${gi}`} className="con-nav-group">
            {g.label && <div className="con-nav-group-label">{g.label}</div>}
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`con-nav-item ${esActivo(item.href, pathname) ? "active" : ""}`}
              >
                <span className="con-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="con-sidebar-foot">
        <AccountSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  );
}

function AccountSwitcher() {
  const { cuentaActiva, tenants, isAdmin, current, entrarComo, volverAAdmin } = useAccount();

  const ordenados = [...tenants].sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "interno" ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  return (
    <div className="con-switch">
      <div className={`con-user ${isAdmin ? "" : "is-client"}`}>
        <div
          className="con-user-avatar"
          style={isAdmin ? undefined : { background: current?.color }}
        >
          {isAdmin ? "LL" : (current?.agente?.[0] ?? "?")}
        </div>
        <div>
          <div className="con-user-name">{isAdmin ? "Lead Lab" : current?.nombre ?? "…"}</div>
          <div className="con-user-role">
            {isAdmin ? "Admin · global" : `Viendo como ${current?.agente ?? ""}`}
          </div>
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
          <option value="admin">★ Admin — toda la operación</option>
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

function ThemeToggle() {
  const { theme, setTheme } = useAccount();
  return (
    <div className="theme-toggle" role="group" aria-label="Tema de la consola">
      <button
        className={theme === "light" ? "on" : ""}
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
      >
        ☀️ Claro
      </button>
      <button
        className={theme === "dark" ? "on" : ""}
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
      >
        🌙 Oscuro
      </button>
    </div>
  );
}

function ViewAsBanner() {
  const { isAdmin, current, volverAAdmin } = useAccount();
  if (isAdmin || !current) return null;
  return (
    <div className="con-viewas" style={{ borderLeftColor: current.color }}>
      <span>
        👁 Viendo como <strong>{current.nombre}</strong> · {current.agente}
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
