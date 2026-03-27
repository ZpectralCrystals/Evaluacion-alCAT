import { Fragment, FormEvent, useEffect, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";


type EventoRow = {
  id: number;
  nombre: string;
  fecha: string;
  is_active: boolean;
};


function formatFecha(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return isoDate;
  }
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


export default function EventosPage() {
  const { user } = useAuth();

  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState("");
  const [eventos, setEventos] = useState<EventoRow[]>([]);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [listError, setListError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState("");

  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [editingFecha, setEditingFecha] = useState("");
  const [editingIsActive, setEditingIsActive] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [deletingEvent, setDeletingEvent] = useState<EventoRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void loadEventos();
  }, [user?.token]);

  async function loadEventos() {
    if (!user?.token) {
      return;
    }

    setIsLoading(true);
    setListError("");

    try {
      const response = await api.get<EventoRow[]>("/api/events", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setEventos(response.data);
    } catch (error) {
      setListError(getApiErrorMessage(error, "No se pudo cargar el listado de eventos."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(eventId: number, nextValue: boolean) {
    if (!user?.token) {
      return;
    }

    setUpdatingEventId(eventId);
    setUpdateMessage("");
    setUpdateError("");

    try {
      const response = await api.patch<EventoRow>(
        `/api/events/${eventId}`,
        { is_active: nextValue },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setEventos((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setUpdateMessage(
        nextValue ? "Evento activado correctamente." : "Evento desactivado correctamente.",
      );
    } catch (error) {
      setUpdateError(getApiErrorMessage(error, "No se pudo actualizar el evento."));
    } finally {
      setUpdatingEventId(null);
    }
  }

  function handleStartEdit(row: EventoRow) {
    setEditingEventId(row.id);
    setEditingNombre(row.nombre);
    setEditingFecha(row.fecha);
    setEditingIsActive(row.is_active);
    setUpdateMessage("");
    setUpdateError("");
  }

  function handleCancelEdit() {
    setEditingEventId(null);
    setEditingNombre("");
    setEditingFecha("");
    setEditingIsActive(true);
  }

  async function handleDelete(eventId: number) {
    if (!user?.token) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setDeletingEvent(null);
      await loadEventos();
    } catch (error) {
      setUpdateError(getApiErrorMessage(error, "No se pudo eliminar el evento."));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveEdit(eventId: number) {
    if (!user?.token) {
      return;
    }

    const nextNombre = editingNombre.trim();
    if (!nextNombre || !editingFecha) {
      setUpdateError("Nombre y fecha son obligatorios.");
      return;
    }

    setIsSavingEdit(true);
    setUpdateMessage("");
    setUpdateError("");

    try {
      const payload = {
        nombre: nextNombre,
        fecha: editingFecha,
        is_active: editingIsActive,
      };

      const response = await api.patch<EventoRow>(`/api/events/${eventId}`, payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setEventos((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );

      setUpdateMessage("Evento actualizado correctamente.");
      handleCancelEdit();
    } catch (error) {
      setUpdateError(getApiErrorMessage(error, "No se pudo actualizar el evento."));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.token) {
      return;
    }

    setIsSaving(true);
    setFormMessage("");
    setFormError("");

    try {
      await api.post(
        "/api/events",
        {
          nombre: nombre.trim(),
          fecha,
          is_active: true,
        },
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        },
      );

      setFormMessage("Evento creado correctamente.");
      setNombre("");
      setFecha("");
      await loadEventos();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo crear el evento."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="panel p-5 sm:p-6">
        <div className="mb-5 space-y-2">
          <p className="text-sm font-medium text-brand-200">Nuevo evento</p>
          <h2 className="section-title">Registrar evento</h2>
          <p className="text-sm leading-6 text-slate-300">
            Los participantes deben asociarse a un evento. Crea uno antes de cargar
            participantes.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleCreate}>
          <input
            autoComplete="off"
            className="touch-input"
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del evento"
            value={nombre}
          />
          <input
            className="touch-input"
            onChange={(e) => setFecha(e.target.value)}
            type="date"
            value={fecha}
          />

          {formMessage ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {formMessage}
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {formError}
            </div>
          ) : null}

          <button
            className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || !nombre.trim() || !fecha}
            type="submit"
          >
            {isSaving ? "Creando evento..." : "Crear evento"}
          </button>
        </form>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-200">Cat&aacute;logo</p>
            <h2 className="section-title">Eventos registrados</h2>
          </div>

          <button
            className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
            onClick={() => void loadEventos()}
            type="button"
          >
            Recargar
          </button>
        </div>

        {listError ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {listError}
          </div>
        ) : null}

        {updateMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {updateMessage}
          </div>
        ) : null}

        {updateError ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {updateError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            Cargando eventos...
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full min-w-[320px] text-left text-sm text-slate-200">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {eventos.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-slate-400" colSpan={4}>
                      No hay eventos todav&iacute;a.
                    </td>
                  </tr>
                ) : (
                  eventos.map((row) => (
                    <Fragment key={row.id}>
                      {editingEventId === row.id ? (
                        <tr className="border-b border-slate-800/80 last:border-0 odd:bg-slate-950/30">
                          <td colSpan={4} className="px-4 py-4">
                            <div className="space-y-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <div className="text-sm text-slate-400">
                                  Editando evento <span className="font-mono text-brand-200">#{row.id}</span>
                                </div>

                                <label className="flex items-center gap-2 text-sm text-slate-200">
                                  <input
                                    checked={editingIsActive}
                                    className="h-4 w-4"
                                    onChange={(e) => setEditingIsActive(e.target.checked)}
                                    type="checkbox"
                                  />
                                  Activo
                                </label>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                                <input
                                  className="touch-input"
                                  value={editingNombre}
                                  onChange={(e) => setEditingNombre(e.target.value)}
                                  placeholder="Nombre del evento"
                                />
                                <input
                                  className="touch-input"
                                  value={editingFecha}
                                  onChange={(e) => setEditingFecha(e.target.value)}
                                  type="date"
                                />
                              </div>

                              <div className="flex flex-wrap gap-3">
                                <button
                                  className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isSavingEdit}
                                  onClick={() => void handleSaveEdit(row.id)}
                                  type="button"
                                >
                                  {isSavingEdit ? "Guardando..." : "Guardar"}
                                </button>
                                <button
                                  className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-100"
                                  onClick={handleCancelEdit}
                                  type="button"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          className="border-b border-slate-800/80 last:border-0 odd:bg-slate-950/30"
                        >
                          <td className="px-4 py-3 font-mono text-brand-200">#{row.id}</td>
                          <td className="px-4 py-3 font-medium text-white">{row.nombre}</td>
                          <td className="px-4 py-3 text-slate-300">{formatFecha(row.fecha)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={[
                                  "touch-button w-auto border px-3 py-2 text-sm shadow-lg shadow-transparent/0",
                                  row.is_active
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                    : "border-slate-700 bg-slate-900/70 text-slate-200",
                                ].join(" ")}
                                disabled={updatingEventId === row.id}
                                onClick={() => void handleToggleActive(row.id, !row.is_active)}
                                type="button"
                              >
                                {updatingEventId === row.id
                                  ? "Actualizando..."
                                  : row.is_active
                                    ? "Activo"
                                    : "Inactivo"}
                              </button>

                              <button
                                className="touch-button w-auto border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100"
                                onClick={() => handleStartEdit(row)}
                                type="button"
                              >
                                Editar
                              </button>

                              <button
                                className="touch-button w-auto border border-rose-600/40 bg-rose-600/20 px-3 py-2 text-sm text-rose-300 hover:bg-rose-600/30"
                                onClick={() => setDeletingEvent(row)}
                                type="button"
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600/20">
                <svg className="h-6 w-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">¿Eliminar evento?</h3>
            </div>

            <p className="mb-2 text-lg font-semibold text-white">{deletingEvent.nombre}</p>
            <p className="mb-6 text-sm text-slate-400">
              ¿Estás seguro que deseas eliminar este evento? Esta acción es{" "}
              <strong className="text-rose-400">irreversible</strong> y{" "}
              <strong className="text-rose-400">
                ELIMINARÁ a todos los participantes y sus hojas de juzgamiento
              </strong>{" "}
              asociados a este evento.
            </p>

            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl bg-rose-600 py-3 font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void handleDelete(deletingEvent.id)}
                type="button"
              >
                {isDeleting ? "Eliminando..." : "Sí, Eliminar Todo"}
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-3 font-semibold text-slate-200 transition hover:bg-slate-700"
                disabled={isDeleting}
                onClick={() => setDeletingEvent(null)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
