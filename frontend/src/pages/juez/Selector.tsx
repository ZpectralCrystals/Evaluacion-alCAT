import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";
import {
  OFFICIAL_MODALIDADES,
  type EventItem,
} from "../../lib/judging";

function getModalidadSearchParams(
  eventoId: string,
  modalidad: string,
): string {
  const params = new URLSearchParams();
  if (eventoId) params.set("evento_id", eventoId);
  if (modalidad) params.set("modalidad", modalidad);
  return params.toString();
}


function formatEventLabel(event: EventItem) {
  const formattedDate = new Date(`${event.fecha}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${event.nombre} · ${formattedDate}`;
}


export default function SelectorPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get("evento_id") ?? "");
  const [selectedModalidad, setSelectedModalidad] = useState(
    searchParams.get("modalidad") ?? "",
  );
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.id) === selectedEventId) ?? null,
    [events, selectedEventId],
  );
  const availableModalidades = useMemo(() => {
    if (user?.role === "juez") {
      const assigned = user.modalidadesAsignadas.filter((value) => value.trim().length > 0);
      return assigned.length > 0 ? assigned : [];
    }
    return [...OFFICIAL_MODALIDADES];
  }, [user]);

  useEffect(() => {
    async function loadEvents() {
      if (!user?.token) {
        return;
      }

      setIsLoadingEvents(true);
      setErrorMessage("");

      try {
        const response = await api.get<EventItem[]>("/api/events", {
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
        });

        const activeEvents = response.data.filter((e) => e.is_active);
        setEvents(activeEvents);
        setSelectedEventId(
          (current) => current || String(activeEvents[0]?.id ?? ""),
        );
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, "No se pudieron cargar los eventos disponibles."),
        );
      } finally {
        setIsLoadingEvents(false);
      }
    }

    void loadEvents();
  }, [user?.token]);

  useEffect(() => {
    if (availableModalidades.length === 0) {
      setSelectedModalidad("");
      return;
    }

    setSelectedModalidad((current) =>
      current && availableModalidades.includes(current) ? current : availableModalidades[0]
    );
  }, [availableModalidades]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEventId || !selectedModalidad) {
      setErrorMessage("Selecciona evento y modalidad antes de continuar.");
      return;
    }

    const params = new URLSearchParams({
      evento_id: selectedEventId,
      modalidad: selectedModalidad,
    });

    navigate(`/juez/dashboard?${params.toString()}`);
  }

  return (
    <section className="grid gap-4">
      <article className="panel overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
            Paso 1
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Selecciona la sala de juzgamiento
          </h2>
          <p className="mt-2 text-base text-slate-300">
            Define el evento y la modalidad antes de abrir la lista de competidores.
          </p>
        </div>

        <form className="space-y-5 px-4 py-5 sm:px-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Evento
            </label>
            <select
              className="min-h-16 w-full rounded-3xl border border-slate-700 bg-white px-4 py-4 text-xl font-semibold text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingEvents || events.length === 0}
              onChange={(event) => setSelectedEventId(event.target.value)}
              value={selectedEventId}
            >
              {events.length === 0 ? (
                <option value="">
                  {isLoadingEvents ? "Cargando eventos..." : "No hay eventos disponibles"}
                </option>
              ) : null}

              {events.map((eventItem) => (
                <option key={eventItem.id} value={eventItem.id}>
                  {formatEventLabel(eventItem)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Modalidad
            </label>
            <select
              className="min-h-16 w-full rounded-3xl border border-slate-700 bg-white px-4 py-4 text-xl font-semibold text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/30"
              disabled={availableModalidades.length === 0}
              onChange={(event) => setSelectedModalidad(event.target.value)}
              value={selectedModalidad}
            >
              <option value="">
                {availableModalidades.length === 0
                  ? "No tienes modalidades asignadas"
                  : "Selecciona una modalidad"}
              </option>
              {availableModalidades.map((modalidad) => (
                <option key={modalidad} value={modalidad}>
                  {modalidad}
                </option>
              ))}
            </select>
          </div>

          {errorMessage ? (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-base text-amber-100">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-3xl border border-brand-400/20 bg-brand-500/10 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">
              Selección actual
            </p>
            <p className="mt-2 text-lg font-semibold text-white">
              {selectedEvent?.nombre ?? "Evento pendiente"}
            </p>
            <p className="mt-1 text-base text-slate-200">
              {selectedModalidad || "Modalidad pendiente"}
            </p>
          </div>

          <button
            className="touch-button min-h-16 rounded-3xl bg-brand-500 px-6 py-4 text-xl text-white shadow-lg shadow-brand-500/25"
            disabled={isLoadingEvents || events.length === 0 || availableModalidades.length === 0}
            type="submit"
          >
            Ver Participantes
          </button>

          {/* Regulations Link */}
          {selectedModalidad && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <button
                className="w-full rounded-2xl border border-blue-600/30 bg-blue-500/10 px-4 py-3 text-base text-blue-200 transition hover:bg-blue-500/20"
                onClick={() =>
                  navigate(
                    `/juez/reglamentos?${getModalidadSearchParams(
                      selectedEventId,
                      selectedModalidad,
                    )}`
                  )
                }
                type="button"
              >
                📄 Ver Reglamento de {selectedModalidad}
              </button>
            </div>
          )}
        </form>
      </article>
    </section>
  );
}
