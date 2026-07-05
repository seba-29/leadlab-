"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [paso, setPaso] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  async function enviarCredenciales(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const d = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    })
      .then((r) => r.json())
      .catch(() => ({ error: "Error de conexión." }));
    setCargando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    setPaso(2);
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCargando(true);
    const d = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), token: codigo }),
    })
      .then((r) => r.json())
      .catch(() => ({ error: "Error de conexión." }));
    setCargando(false);
    if (d.error) {
      setError(d.error);
      return;
    }
    router.push("/consola");
    router.refresh();
  }

  async function reenviar() {
    setError("");
    setReenviado(false);
    await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    }).catch(() => {});
    setReenviado(true);
  }

  return (
    <div className="login-shell">
      <div className="bg-glow" aria-hidden />
      <div className="login-card panel">
        <div className="brand login-brand">
          Lead<span className="brand-accent">Lab</span>
          <span className="brand-dot" />
        </div>

        {paso === 1 ? (
          <form onSubmit={enviarCredenciales}>
            <h1 className="login-title">Entrá a tu consola</h1>
            <p className="login-sub">Ingresá tu correo y contraseña.</p>
            <label className="field">
              <span>Correo</span>
              <input
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.cl"
              />
            </label>
            <label className="field">
              <span>Contraseña</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {error && <div className="modal-error">⚠️ {error}</div>}
            <button className="btn-primary-lg login-btn" disabled={cargando}>
              {cargando ? "Verificando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={verificarCodigo}>
            <h1 className="login-title">Código de seguridad</h1>
            <p className="login-sub">
              Te enviamos un código de seguridad a <strong>{email}</strong>.
            </p>
            <label className="field">
              <span>Código</span>
              <input
                inputMode="numeric"
                maxLength={8}
                autoFocus
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                placeholder="Código del correo"
                className="login-code"
              />
            </label>
            {error && <div className="modal-error">⚠️ {error}</div>}
            {reenviado && !error && <div className="login-ok">✓ Código reenviado</div>}
            <button className="btn-primary-lg login-btn" disabled={cargando || codigo.length < 6}>
              {cargando ? "Entrando…" : "Entrar"}
            </button>
            <div className="login-links">
              <button type="button" className="login-link" onClick={reenviar}>
                Reenviar código
              </button>
              <button
                type="button"
                className="login-link"
                onClick={() => {
                  setPaso(1);
                  setCodigo("");
                  setError("");
                  setReenviado(false);
                }}
              >
                ← Volver
              </button>
            </div>
          </form>
        )}

        <div className="login-foot">🔒 Verificación en dos pasos</div>
      </div>
    </div>
  );
}
