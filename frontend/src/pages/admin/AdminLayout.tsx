import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";


const navItems = [
  { label: "Eventos", to: "/admin/eventos" },
  { label: "Participantes", to: "/admin/participantes" },
  { label: "Usuarios", to: "/admin/usuarios" },
  { label: "Categorías", to: "/admin/categorias" },
  { label: "Plantillas", to: "/admin/plantillas" },
  { label: "Resultados", to: "/admin/resultados" },
  { label: "Reglamentos", to: "/admin/reglamentos" },
];

type UserRecord = {
  id: number;
  username: string;
  role: "admin" | "juez";
  can_edit_scores: boolean;
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const { logout, user, setUser } = useAuth();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function openProfileEdit() {
    setProfileUsername(user?.username ?? "");
    setProfilePassword("");
    setProfileMessage("");
    setProfileError("");
    setIsEditingProfile(true);
  }

  function closeProfileEdit() {
    setIsEditingProfile(false);
    setProfileUsername("");
    setProfilePassword("");
    setProfileMessage("");
    setProfileError("");
  }

  async function handleSaveProfile() {
    if (!user?.token) return;

    setIsSavingProfile(true);
    setProfileMessage("");
    setProfileError("");

    const payload: { username?: string; password?: string } = {};
    const trimmedUsername = profileUsername.trim();
    const trimmedPassword = profilePassword.trim();

    if (trimmedUsername && trimmedUsername !== user.username) {
      payload.username = trimmedUsername;
    }
    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }

    if (!payload.username && !payload.password) {
      setProfileError("No hay cambios para guardar.");
      setIsSavingProfile(false);
      return;
    }

    try {
      const response = await api.patch<UserRecord>("/api/users/me/credentials", payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      // Update the user in AuthContext if username changed
      if (payload.username && setUser) {
        setUser({ ...user, username: response.data.username });
      }

      setProfileMessage("Datos actualizados correctamente.");
      setTimeout(() => {
        closeProfileEdit();
      }, 1500);
    } catch (error) {
      setProfileError(getApiErrorMessage(error, "No se pudo actualizar los datos."));
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="panel overflow-hidden">
          <div className="border-b border-slate-800/80 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-brand-200">
                  Panel de Administraci&oacute;n
                </p>
                <div>
                  <h1 className="text-2xl font-bold text-white sm:text-3xl">
                    Juzgamiento Car Audio y Tuning
                  </h1>
                  <p className="mt-1 text-sm text-slate-300">
                    Gestiona participantes, jueces y plantillas desde una interfaz
                    optimizada para uso r&aacute;pido.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:min-w-60 sm:items-end">
                <div className="rounded-3xl border border-brand-400/20 bg-brand-400/10 px-4 py-3 text-sm text-brand-100">
                  <p className="font-semibold">{user?.username}</p>
                  <p className="text-brand-200/80">Administrador</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    className="touch-button border border-slate-600 bg-slate-800/80 text-slate-100 sm:w-auto sm:min-w-32"
                    onClick={openProfileEdit}
                    type="button"
                  >
                    Editar mis datos
                  </button>
                  <button
                    className="touch-button border border-slate-700 bg-slate-900/80 text-slate-100 sm:w-auto sm:min-w-32"
                    onClick={handleLogout}
                    type="button"
                  >
                    Cerrar sesi&oacute;n
                  </button>
                </div>
              </div>
            </div>
          </div>

          <nav className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  [
                    "touch-button border text-center",
                    isActive
                      ? "border-brand-400/60 bg-brand-500 text-white shadow-lg shadow-brand-500/25"
                      : "border-slate-700 bg-slate-900/60 text-slate-200",
                  ].join(" ")
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <section className="pb-4">
          <Outlet />
        </section>
      </div>

      {/* Profile Edit Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 space-y-1">
              <h2 className="text-xl font-bold text-white">Editar mis datos</h2>
              <p className="text-sm text-slate-300">
                Actualiza tu nombre de usuario o contrase&ntilde;a.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Nombre de usuario
                </label>
                <input
                  autoComplete="off"
                  className="touch-input w-full"
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Nuevo username"
                  value={profileUsername}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Contrase&ntilde;a (dejar en blanco para no cambiar)
                </label>
                <input
                  autoComplete="new-password"
                  className="touch-input w-full"
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Nueva contrase&ntilde;a"
                  type="password"
                  value={profilePassword}
                />
              </div>

              {profileMessage && (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {profileMessage}
                </div>
              )}

              {profileError && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {profileError}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={
                    isSavingProfile ||
                    (!profileUsername.trim() && !profilePassword.trim())
                  }
                  onClick={() => void handleSaveProfile()}
                  type="button"
                >
                  {isSavingProfile ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-800/70 px-4 text-sm text-slate-100"
                  onClick={closeProfileEdit}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
