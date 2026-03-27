import { Link, useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6">
      <section className="panel w-full max-w-md p-6 text-center">
        <h1 className="text-2xl font-bold text-white">Ruta no encontrada</h1>
        <p className="mt-3 text-sm text-slate-300">
          La p&aacute;gina que intentas abrir no existe o todav&iacute;a no est&aacute;
          disponible.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25"
            onClick={() => navigate(-1)}
            type="button"
          >
            ← Volver atrás
          </button>

          <Link
            className="touch-button border border-slate-600 bg-slate-800 text-slate-200"
            to="/login"
          >
            Ir al Login
          </Link>

          <Link
            className="touch-button border border-slate-700 bg-slate-900 text-slate-300"
            to="/juez/reglamentos"
          >
            Ver Lista de Reglamentos
          </Link>
        </div>
      </section>
    </main>
  );
}
