import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getApiErrorMessage } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";


type LocationState = {
  from?: {
    pathname?: string;
  };
};


export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.role === "admin") {
      navigate("/admin", { replace: true });
      return;
    }

    navigate("/juez", { replace: true });
  }, [navigate, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const session = await login(username.trim(), password);
      const state = location.state as LocationState | null;
      const fromPath = state?.from?.pathname;

      if (session.role === "admin") {
        navigate(fromPath?.startsWith("/admin") ? fromPath : "/admin", { replace: true });
        return;
      }

      navigate(fromPath?.startsWith("/juez") ? fromPath : "/juez", { replace: true });
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "No se pudo iniciar sesión. Intenta nuevamente."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="panel w-full max-w-md p-6 sm:p-8">
        <div className="mb-8 space-y-3 text-center">
          <span className="inline-flex rounded-full border border-brand-400/30 bg-brand-400/10 px-4 py-2 text-sm font-semibold text-brand-200">
            Sistema de Juzgamiento
          </span>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Car Audio y Tuning
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              Ingresa con tu cuenta para acceder al panel de administraci&oacute;n o
              juzgamiento.
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Usuario</span>
            <input
              autoComplete="username"
              className="touch-input"
              inputMode="text"
              placeholder="Ingresa tu usuario"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Contrase&ntilde;a</span>
            <input
              autoComplete="current-password"
              className="touch-input"
              placeholder="Ingresa tu contrase&ntilde;a"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <button
            className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || !username.trim() || !password}
            type="submit"
          >
            {isSubmitting ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
