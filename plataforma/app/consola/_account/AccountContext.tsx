"use client";

// ============================================================
// Lead Lab — Contexto de "cuenta activa"
// Fuente única de verdad para toda la consola: si estás como
// 'admin' (super-consola global) o dentro de un tenant (subcuenta).
// De acá derivan isAdmin / scope / current, y todas las páginas
// leen `scope` en vez de manejar su propio filtro.
//
// Hoy el scoping es de PRESENTACIÓN (sin auth real). Mañana, con
// Supabase Auth, `cuentaActiva` nacerá del JWT en vez de localStorage
// y estas mismas firmas siguen valiendo — las páginas no se reescriben.
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TenantMin = {
  id: string;
  nombre: string;
  agente: string;
  rubro: string;
  tipo: "interno" | "cliente";
  color: string;
};

type Theme = "dark" | "light";

type AccountValue = {
  cuentaActiva: string; // 'admin' | tenantId
  tenants: TenantMin[];
  cargando: boolean;
  isAdmin: boolean;
  scope: string | null; // null en admin, tenantId en subcuenta
  current: TenantMin | null;
  entrarComo: (tenantId: string) => void;
  volverAAdmin: () => void;
  refreshTenants: () => Promise<void>;
  theme: Theme;
  setTheme: (t: Theme) => void;
  logos: Record<string, string>; // tenantId → dataURL (front por ahora)
  setLogo: (tenantId: string, dataUrl: string | null) => void;
};

const Ctx = createContext<AccountValue | null>(null);

const K_CUENTA = "leadlab-cuenta";
const K_THEME = "leadlab-theme";
const K_LOGO = "leadlab-logo-";

/** Arma la URL con ?tenantId cuando hay un scope activo (subcuenta). */
export function scopedUrl(
  base: string,
  scope: string | null,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams(extra ?? {});
  if (scope) params.set("tenantId", scope);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [tenants, setTenants] = useState<TenantMin[]>([]);
  const [cuentaActiva, setCuentaActiva] = useState<string>("admin");
  const [cargando, setCargando] = useState(true);
  const [theme, setThemeState] = useState<Theme>("dark");
  const [logos, setLogos] = useState<Record<string, string>>({});

  const refreshTenants = useCallback(async () => {
    try {
      const d = await fetch("/api/tenants").then((r) => r.json());
      setTenants(d.tenants ?? []);
    } catch {
      /* red caída: mantenemos lo que haya */
    }
  }, []);

  // Montaje: leer preferencias guardadas + cargar tenants
  useEffect(() => {
    try {
      const t = localStorage.getItem(K_THEME);
      if (t === "light" || t === "dark") setThemeState(t);
      const c = localStorage.getItem(K_CUENTA);
      if (c) setCuentaActiva(c);
      const ls: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(K_LOGO)) {
          const v = localStorage.getItem(k);
          if (v) ls[k.slice(K_LOGO.length)] = v;
        }
      }
      setLogos(ls);
    } catch {
      /* localStorage no disponible */
    }
    refreshTenants().finally(() => setCargando(false));
  }, [refreshTenants]);

  const setCuenta = useCallback((v: string) => {
    setCuentaActiva(v);
    try {
      localStorage.setItem(K_CUENTA, v);
    } catch {
      /* ignore */
    }
  }, []);

  // Si la cuenta guardada apunta a un tenant que ya no existe, caer a admin
  useEffect(() => {
    if (cargando) return;
    if (cuentaActiva !== "admin" && !tenants.some((t) => t.id === cuentaActiva)) {
      setCuenta("admin");
    }
  }, [cargando, tenants, cuentaActiva, setCuenta]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(K_THEME, t);
    } catch {
      /* ignore */
    }
  }, []);

  const setLogo = useCallback((tenantId: string, dataUrl: string | null) => {
    setLogos((prev) => {
      const next = { ...prev };
      if (dataUrl) next[tenantId] = dataUrl;
      else delete next[tenantId];
      return next;
    });
    try {
      if (dataUrl) localStorage.setItem(K_LOGO + tenantId, dataUrl);
      else localStorage.removeItem(K_LOGO + tenantId);
    } catch {
      /* ignore */
    }
  }, []);

  const isAdmin = cuentaActiva === "admin";
  const scope = isAdmin ? null : cuentaActiva;
  const current = useMemo(
    () => (isAdmin ? null : tenants.find((t) => t.id === cuentaActiva) ?? null),
    [isAdmin, tenants, cuentaActiva],
  );

  const value = useMemo<AccountValue>(
    () => ({
      cuentaActiva,
      tenants,
      cargando,
      isAdmin,
      scope,
      current,
      entrarComo: (id: string) => setCuenta(id),
      volverAAdmin: () => setCuenta("admin"),
      refreshTenants,
      theme,
      setTheme,
      logos,
      setLogo,
    }),
    [cuentaActiva, tenants, cargando, isAdmin, scope, current, setCuenta, refreshTenants, theme, setTheme, logos, setLogo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountValue {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAccount debe usarse dentro de <AccountProvider>");
  return c;
}
