import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { useState } from "react";
import { api, getApiErrorMessage } from "../../lib/api";


export default function JuezLayout() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  async function handleChangePassword() {
    if (!user?.token || !currentPassword || !newPassword) return;

    setIsSavingPassword(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      await api.put(
        "/api/users/me/password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        }
      );

      setPasswordMessage("Contraseña cambiada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMessage("");
      }, 2000);
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, "No se pudo cambiar la contraseña."));
    } finally {
      setIsSavingPassword(false);
    }
  }

  function handleCloseModal() {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setPasswordMessage("");
    setPasswordError("");
  }

  return (
    <main className="min-h-screen px-3 py-3 sm:px-4 sm:py-4">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <header className="panel overflow-hidden">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                Panel del Juez
              </p>
              <div>
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  Sala de Juzgamiento
                </h1>
                <p className="text-sm text-slate-300 sm:text-base">
                  Sesión activa: <span className="font-semibold text-white">{user?.username}</span>
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="touch-button border border-brand-500/30 bg-brand-500/10 px-4 py-3 text-base text-brand-100 sm:w-auto"
                onClick={() => setShowPasswordModal(true)}
                type="button"
              >
                Cambiar Contraseña
              </button>
              <button
                className="touch-button border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-base text-rose-100 sm:w-auto sm:min-w-56"
                onClick={handleLogout}
                type="button"
              >
                Cerrar sesión
              </button>
            </div>
          </div>

          <nav className="grid grid-cols-1 gap-3 border-t border-slate-800/80 p-4 sm:grid-cols-3 sm:p-5">
            {[
              { label: "Sala", to: "/juez" },
              { label: "Resultados", to: "/juez/resultados" },
              { label: "Reglamentos", to: "/juez/reglamentos" },
            ].map((item) => (
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
                end={item.to === "/juez"}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <Outlet />
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="mb-4 text-xl font-bold text-white">Cambiar Contraseña</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Contraseña actual
                </label>
                <input
                  className="touch-input w-full"
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña actual"
                  type="password"
                  value={currentPassword}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">
                  Nueva contraseña
                </label>
                <input
                  className="touch-input w-full"
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ingresa la nueva contraseña"
                  type="password"
                  value={newPassword}
                />
              </div>

              {passwordMessage ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {passwordMessage}
                </div>
              ) : null}

              {passwordError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {passwordError}
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 rounded-xl bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-400 disabled:opacity-60"
                  disabled={isSavingPassword || !currentPassword || !newPassword}
                  onClick={() => void handleChangePassword()}
                  type="button"
                >
                  {isSavingPassword ? "Guardando..." : "Guardar"}
                </button>
                <button
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-semibold text-slate-200 transition hover:bg-slate-700"
                  onClick={handleCloseModal}
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
