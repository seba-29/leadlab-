"use client";

// ============================================================
// Lead Lab — Dropdown glass reutilizable
// Mismo lenguaje visual del switcher de cuentas: botón + panel
// glass con bordes redondeados, badges de color y check activo.
// Reemplaza a los <select> nativos en filtros y formularios.
// ============================================================

import { useEffect, useRef, useState, type ReactNode } from "react";

export type Opcion = {
  value: string;
  label: string;
  color?: string; // punto/cuadro de color a la izquierda
  hint?: string; // texto tenue a la derecha (ej: conteo)
  icon?: ReactNode;
};

export function Dropdown({
  value,
  options,
  onChange,
  placeholder = "Seleccionar",
  compact = false,
  ariaLabel,
}: {
  value: string;
  options: Opcion[];
  onChange: (v: string) => void;
  placeholder?: string;
  compact?: boolean;
  ariaLabel?: string;
}) {
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

  const cur = options.find((o) => o.value === value);

  return (
    <div className={`gsel${compact ? " compact" : ""}`} ref={ref}>
      <button
        type="button"
        className={`gsel-btn${open ? " open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {cur?.color && <span className="gsel-badge" style={{ background: cur.color }} />}
        {cur?.icon && <span className="gsel-ico">{cur.icon}</span>}
        <span className="gsel-lbl">{cur ? cur.label : placeholder}</span>
        <svg className="gsel-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="gsel-pop" role="listbox">
          {options.map((o) => (
            <button
              type="button"
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`gsel-opt${o.value === value ? " on" : ""}`}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
            >
              {o.color && <span className="gsel-badge" style={{ background: o.color }} />}
              {o.icon && <span className="gsel-ico">{o.icon}</span>}
              <span className="gsel-lbl">{o.label}</span>
              {o.hint && <span className="gsel-hint">{o.hint}</span>}
              {o.value === value && <span className="gsel-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
