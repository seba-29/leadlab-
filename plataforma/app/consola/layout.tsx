"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/consola",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/consola/agentes",
    label: "Probar agentes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" />
        <path d="M18.5 14.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1z" />
      </svg>
    ),
  },
  {
    href: "/consola/inbox",
    label: "Inbox",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 12h-5l-2 3h-4l-2-3H3" />
        <path d="M5.5 5h13L21 12v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18v-6l2.5-7z" />
      </svg>
    ),
  },
  {
    href: "/consola/leads",
    label: "Leads",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="5" height="16" rx="1.2" />
        <rect x="10" y="4" width="5" height="10" rx="1.2" />
        <rect x="17" y="4" width="5" height="13" rx="1.2" />
      </svg>
    ),
  },
  {
    href: "/consola/clientes",
    label: "Clientes",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3 2.8-4.5 5.5-4.5S13.9 16 14.5 19" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M15.5 14.7c2.5.1 4.3 1.5 4.9 3.8" />
      </svg>
    ),
  },
  {
    href: "/consola/cerebro",
    label: "Cerebro",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9.5 4A2.5 2.5 0 0 0 7 6.5v11a2.5 2.5 0 0 0 5 0v-11A2.5 2.5 0 0 0 9.5 4z" />
        <path d="M14.5 4A2.5 2.5 0 0 1 17 6.5v11a2.5 2.5 0 0 1-5 0" />
        <path d="M7 9H5.5A1.5 1.5 0 0 0 4 10.5v0A1.5 1.5 0 0 0 5.5 12H7M17 9h1.5A1.5 1.5 0 0 1 20 10.5v0a1.5 1.5 0 0 1-1.5 1.5H17" />
      </svg>
    ),
  },
];

export default function ConsolaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="con-shell">
      <div className="bg-glow" aria-hidden />
      <aside className="con-sidebar">
        <Link href="/consola" className="brand con-brand">
          Lead<span className="brand-accent">Lab</span>
          <span className="brand-dot" />
        </Link>
        <nav className="con-nav">
          {NAV.map((item) => {
            const active =
              item.href === "/consola" ? pathname === "/consola" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`con-nav-item ${active ? "active" : ""}`}>
                <span className="con-nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="con-sidebar-foot">
          <div className="con-user">
            <div className="con-user-avatar">S</div>
            <div>
              <div className="con-user-name">Seba</div>
              <div className="con-user-role">Operador · Lead Lab</div>
            </div>
          </div>
        </div>
      </aside>
      <main className="con-main">{children}</main>
    </div>
  );
}
