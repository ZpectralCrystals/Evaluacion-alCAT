import { useAuth } from "../../contexts/AuthContext";


export default function AdminHomePage() {
  const { logout, user } = useAuth();

  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        <header className="panel p-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-brand-200">Panel Administrador</p>
            <h1 className="text-2xl font-bold text-white">
              Bienvenido, {user?.username}
            </h1>
            <p className="text-sm text-slate-300">
              La base de autenticaci&oacute;n y rutas ya est&aacute; lista. El
              siguiente bloque conectar&aacute; participantes, usuarios y plantillas.
            </p>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            "Participantes",
            "Usuarios",
            "Plantillas",
          ].map((item) => (
            <article key={item} className="panel p-5">
              <h2 className="text-lg font-semibold text-white">{item}</h2>
              <p className="mt-2 text-sm text-slate-300">
                Vista pendiente en la siguiente etapa.
              </p>
            </article>
          ))}
        </section>

        <button
          className="touch-button border border-slate-700 bg-slate-900/70 text-slate-100"
          onClick={logout}
          type="button"
        >
          Cerrar sesi&oacute;n
        </button>
      </section>
    </main>
  );
}
