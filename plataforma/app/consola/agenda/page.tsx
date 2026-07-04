"use client";

import { useEffect, useState } from "react";
import { useAccount, scopedUrl } from "../_account/AccountContext";

type CitaItem = {
  id: string;
  tenantNombre: string;
  tenantColor: string;
  fechaHora: string;
  contacto: string;
  conversacionId: string | null;
  canal: string | null;
};

type Vista = "mes" | "semana" | "lista";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fmtHora(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}
function fmtDiaLargo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
}
function nombreCanal(c: string | null): string {
  return c === "whatsapp" ? "WhatsApp" : c === "playground" ? "Prueba" : "Agente IA";
}

function weekStart(d: Date): Date {
  const x = new Date(d);
  const off = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - off);
  x.setHours(0, 0, 0, 0);
  return x;
}
function monthMatrix(cursor: Date): Date[][] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const d = weekStart(first);
  const weeks: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

// Enlace a Google Calendar (evento pre-llenado, sin OAuth) + .ics
function gcalUrl(c: CitaItem): string | null {
  const s = new Date(c.fechaHora);
  if (isNaN(s.getTime())) return null;
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const text = `Cita: ${c.contacto || "Cliente"}${c.tenantNombre ? ` · ${c.tenantNombre}` : ""}`;
  const details = "Agendado por tu agente IA (Lead Lab).";
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    text,
  )}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(details)}`;
}
function icsHref(c: CitaItem): string | null {
  const s = new Date(c.fechaHora);
  if (isNaN(s.getTime())) return null;
  const e = new Date(s.getTime() + 60 * 60 * 1000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lead Lab//Agenda//ES",
    "BEGIN:VEVENT",
    `DTSTART:${f(s)}`,
    `DTEND:${f(e)}`,
    `SUMMARY:Cita: ${c.contacto || "Cliente"}`,
    "DESCRIPTION:Agendado por tu agente IA (Lead Lab).",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
}

export default function Agenda() {
  const { scope, isAdmin, current } = useAccount();
  const [citas, setCitas] = useState<CitaItem[] | null>(null);
  const [vista, setVista] = useState<Vista>("mes");
  const [cursor, setCursor] = useState<Date | null>(null);
  const [selDia, setSelDia] = useState<string | null>(null);

  useEffect(() => {
    setCursor(new Date());
  }, []);
  useEffect(() => {
    setCitas(null);
    fetch(scopedUrl("/api/citas", scope))
      .then((r) => r.json())
      .then((d) => setCitas(d.citas ?? []))
      .catch(() => setCitas([]));
  }, [scope]);

  if (!citas || !cursor) return <div className="con-loading">Cargando agenda…</div>;

  const porDia = new Map<string, CitaItem[]>();
  const sinFecha: CitaItem[] = [];
  for (const c of citas) {
    const d = new Date(c.fechaHora);
    if (isNaN(d.getTime())) {
      sinFecha.push(c);
      continue;
    }
    const k = ymd(d);
    if (!porDia.has(k)) porDia.set(k, []);
    porDia.get(k)!.push(c);
  }
  for (const arr of porDia.values()) arr.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));

  const hoyKey = ymd(new Date());

  function nav(dir: number) {
    const d = new Date(cursor!);
    if (vista === "mes") d.setMonth(d.getMonth() + dir);
    else d.setDate(d.getDate() + dir * 7);
    setCursor(d);
  }
  function titulo(): string {
    if (vista === "mes") return `${MESES[cursor!.getMonth()]} ${cursor!.getFullYear()}`;
    const ws = weekStart(cursor!);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    return `${ws.getDate()} ${MESES[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MESES[we.getMonth()].slice(0, 3)}`;
  }

  const semana = weekStart(cursor);
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semana);
    d.setDate(semana.getDate() + i);
    return d;
  });

  return (
    <div>
      <header className="con-head">
        <div>
          <h1 className="con-title">Agenda</h1>
          <p className="con-sub">
            {isAdmin
              ? "Las citas de todos tus agentes, en calendario."
              : `Las citas que ${current?.agente ?? "tu agente"} agendó por ti.`}
          </p>
        </div>
        <div className="cal-toggle">
          {(["mes", "semana", "lista"] as Vista[]).map((v) => (
            <button key={v} className={vista === v ? "on" : ""} onClick={() => setVista(v)}>
              {v === "mes" ? "Mes" : v === "semana" ? "Semana" : "Lista"}
            </button>
          ))}
        </div>
      </header>

      {vista !== "lista" && (
        <div className="cal-toolbar">
          <button className="btn-ghost-sm cal-nav" onClick={() => nav(-1)} aria-label="Anterior">
            ‹
          </button>
          <button className="btn-ghost-sm" onClick={() => setCursor(new Date())}>
            Hoy
          </button>
          <button className="btn-ghost-sm cal-nav" onClick={() => nav(1)} aria-label="Siguiente">
            ›
          </button>
          <span className="cal-label">{titulo()}</span>
        </div>
      )}

      {vista === "mes" && (
        <section className="panel cal-panel">
          <div className="cal-dow-row">
            {DOW.map((d) => (
              <div key={d} className="cal-dow">
                {d}
              </div>
            ))}
          </div>
          <div className="cal-grid">
            {monthMatrix(cursor).map((week, wi) =>
              week.map((date) => {
                const key = ymd(date);
                const items = porDia.get(key) ?? [];
                const otro = date.getMonth() !== cursor.getMonth();
                return (
                  <button
                    key={`${wi}-${key}`}
                    className={`cal-cell ${otro ? "otro" : ""} ${key === hoyKey ? "today" : ""} ${
                      items.length ? "tiene" : ""
                    }`}
                    onClick={() => setSelDia(key)}
                  >
                    <span className="cal-daynum">{date.getDate()}</span>
                    <span className="cal-chips">
                      {items.slice(0, 3).map((c) => (
                        <span
                          key={c.id}
                          className="cal-chip"
                          style={{ borderLeftColor: isAdmin ? c.tenantColor : "var(--orange)" }}
                        >
                          {fmtHora(c.fechaHora)} {c.contacto || "Cita"}
                        </span>
                      ))}
                      {items.length > 3 && <span className="cal-more">+{items.length - 3} más</span>}
                    </span>
                  </button>
                );
              }),
            )}
          </div>
        </section>
      )}

      {vista === "semana" && (
        <section className="panel cal-week">
          {diasSemana.map((date) => {
            const key = ymd(date);
            const items = porDia.get(key) ?? [];
            return (
              <div key={key} className={`cal-week-col ${key === hoyKey ? "today" : ""}`}>
                <button className="cal-week-head" onClick={() => setSelDia(key)}>
                  <span className="cal-week-dow">{DOW[(date.getDay() + 6) % 7]}</span>
                  <span className="cal-week-num">{date.getDate()}</span>
                </button>
                <div className="cal-week-body">
                  {items.length === 0 ? (
                    <span className="cal-week-empty">—</span>
                  ) : (
                    items.map((c) => (
                      <button
                        key={c.id}
                        className="cal-wchip"
                        style={{ borderLeftColor: isAdmin ? c.tenantColor : "var(--orange)" }}
                        onClick={() => setSelDia(key)}
                      >
                        <strong>{fmtHora(c.fechaHora)}</strong>
                        <span>{c.contacto || "Cita"}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      {vista === "lista" && <ListaView citas={citas} sinFecha={sinFecha} isAdmin={isAdmin} />}

      {vista !== "lista" && sinFecha.length > 0 && (
        <section className="panel dash-panel-pad">
          <div className="panel-title">Sin fecha exacta · {sinFecha.length}</div>
          <div className="mini-leads">
            {sinFecha.map((c) => (
              <CitaRow key={c.id} c={c} admin={isAdmin} sinFecha />
            ))}
          </div>
        </section>
      )}

      {citas.length === 0 && (
        <div className="panel ag-empty" style={{ marginTop: 14 }}>
          📅 Aún no hay citas agendadas. En cuanto tu agente cierre una, aparece acá.
        </div>
      )}

      {selDia && (
        <DiaDetalle
          diaKey={selDia}
          items={porDia.get(selDia) ?? []}
          admin={isAdmin}
          onClose={() => setSelDia(null)}
        />
      )}
    </div>
  );
}

function CitaRow({ c, admin, sinFecha }: { c: CitaItem; admin: boolean; sinFecha?: boolean }) {
  return (
    <div className="mini-lead">
      <div>
        <div className="mini-lead-name">{sinFecha ? c.fechaHora : fmtDiaLargo(c.fechaHora)}</div>
        <div className="mini-lead-int">
          {c.contacto || "Contacto sin nombre"}
          {admin && c.tenantNombre ? ` · ${c.tenantNombre}` : ""}
        </div>
      </div>
      <div className="mini-lead-right">
        <span className="ib-canal">{nombreCanal(c.canal)}</span>
      </div>
    </div>
  );
}

function ListaView({
  citas,
  sinFecha,
  isAdmin,
}: {
  citas: CitaItem[];
  sinFecha: CitaItem[];
  isAdmin: boolean;
}) {
  const now = Date.now();
  const proximas = citas
    .filter((c) => {
      const t = new Date(c.fechaHora).getTime();
      return !isNaN(t) && t >= now;
    })
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
  const pasadas = citas
    .filter((c) => {
      const t = new Date(c.fechaHora).getTime();
      return !isNaN(t) && t < now;
    })
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  return (
    <div className="dash-grid">
      <section className="panel dash-side">
        <div className="panel-title">Próximas · {proximas.length + sinFecha.length}</div>
        <div className="mini-leads">
          {sinFecha.map((c) => (
            <CitaRow key={c.id} c={c} admin={isAdmin} sinFecha />
          ))}
          {proximas.map((c) => (
            <CitaRow key={c.id} c={c} admin={isAdmin} />
          ))}
          {proximas.length + sinFecha.length === 0 && <p className="empty">Sin citas próximas.</p>}
        </div>
      </section>
      <section className="panel dash-side">
        <div className="panel-title">Pasadas · {pasadas.length}</div>
        <div className="mini-leads">
          {pasadas.map((c) => (
            <CitaRow key={c.id} c={c} admin={isAdmin} />
          ))}
          {pasadas.length === 0 && <p className="empty">Sin citas pasadas aún.</p>}
        </div>
      </section>
    </div>
  );
}

function DiaDetalle({
  diaKey,
  items,
  admin,
  onClose,
}: {
  diaKey: string;
  items: CitaItem[];
  admin: boolean;
  onClose: () => void;
}) {
  const [y, mo, d] = diaKey.split("-").map(Number);
  const fecha = new Date(y, mo - 1, d);
  const titulo = fecha.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="drawer panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ textTransform: "capitalize" }}>{titulo}</h2>
          <button className="cb-del" onClick={onClose}>
            ×
          </button>
        </div>
        {items.length === 0 ? (
          <p className="empty">Sin citas este día.</p>
        ) : (
          <div className="dia-citas">
            {items.map((c) => {
              const g = gcalUrl(c);
              const ics = icsHref(c);
              return (
                <div key={c.id} className="dia-cita">
                  <div className="dia-cita-top">
                    <span className="dia-hora">{fmtHora(c.fechaHora)}</span>
                    <span className="ib-canal">{nombreCanal(c.canal)}</span>
                  </div>
                  <div className="dia-contacto">
                    {admin && (
                      <span className="kb-dot" style={{ background: c.tenantColor }} />
                    )}
                    {c.contacto || "Contacto sin nombre"}
                    {admin && c.tenantNombre ? ` · ${c.tenantNombre}` : ""}
                  </div>
                  <div className="dia-cita-acciones">
                    {g && (
                      <a className="btn-ghost-sm" href={g} target="_blank" rel="noreferrer">
                        📅 Google Calendar
                      </a>
                    )}
                    {ics && (
                      <a className="btn-ghost-sm" href={ics} download="cita.ics">
                        .ics
                      </a>
                    )}
                    {c.conversacionId && (
                      <a className="btn-ghost-sm" href="/consola/inbox">
                        Ver chat
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
