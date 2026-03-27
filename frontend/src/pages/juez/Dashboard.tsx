import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";
import type { EventItem, ParticipantItem, ScoreCardRecord } from "../../lib/judging";


export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const eventoId = searchParams.get("evento_id") ?? "";
  const modalidad = searchParams.get("modalidad") ?? "";

  const [eventName, setEventName] = useState("");
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [completedParticipantIds, setCompletedParticipantIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const completedCount = useMemo(
    () => participants.filter((participant) => completedParticipantIds.has(participant.id)).length,
    [completedParticipantIds, participants],
  );

  useEffect(() => {
    if (!eventoId || !modalidad) {
      navigate("/juez", { replace: true });
      return;
    }

    async function loadDashboard() {
      if (!user?.token) return;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [eventsResponse, participantsResponse, scoreCardsResponse] = await Promise.all([
          api.get<EventItem[]>("/api/events", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          api.get<ParticipantItem[]>("/api/participants", {
            headers: { Authorization: `Bearer ${user.token}` },
            params: {
              evento_id: eventoId,
              modalidad,
            },
          }),
          api.get<ScoreCardRecord[]>("/api/scorecards", {
            headers: { Authorization: `Bearer ${user.token}` },
            params: {
              evento_id: eventoId,
              modalidad,
            },
          }),
        ]);

        const activeEvent = eventsResponse.data.find(
          (event) => String(event.id) === String(eventoId),
        );

        setEventName(activeEvent?.nombre ?? `Evento #${eventoId}`);
        setParticipants(participantsResponse.data);
        setCompletedParticipantIds(
          new Set(
            scoreCardsResponse.data
              .filter((scoreCard) => scoreCard.status === "completed")
              .map((scoreCard) => scoreCard.participant_id),
          ),
        );
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, "No se pudo cargar la lista de competidores."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, [eventoId, modalidad, navigate, user?.token]);

  function handleBack() {
    navigate(`/juez?${searchParams.toString()}`);
  }

  function handleOpenParticipant(participant: ParticipantItem) {
    navigate(`/juez/calificar/${participant.id}?${searchParams.toString()}`, {
      state: { participant },
    });
  }

  return (
    <section className="grid gap-4">
      <article className="panel overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                Paso 2
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Competidores filtrados
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Toca una tarjeta para abrir la hoja colaborativa del participante.
              </p>
            </div>

            <button
              className="touch-button min-h-14 rounded-3xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-base text-slate-100 sm:w-auto sm:min-w-44"
              onClick={handleBack}
              type="button"
            >
              Cambiar selección
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-800/80 bg-slate-950/40 px-4 py-4 sm:grid-cols-3 sm:px-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Evento
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{eventName}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Modalidad
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{modalidad}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Participantes
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{participants.length}</p>
          </div>
        </div>

        <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-200">
              Avance de la sala
            </p>
            <p className="mt-2 text-2xl font-bold text-white">
              {completedCount} / {participants.length}
            </p>
            <p className="mt-1 text-base text-emerald-100/90">
              participantes con hoja finalizada
            </p>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5">
          {isLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-lg text-slate-300">
              Cargando participantes...
            </div>
          ) : null}

          {!isLoading && errorMessage ? (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-base text-amber-100">
              {errorMessage}
            </div>
          ) : null}

          {!isLoading && !errorMessage && participants.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center">
              <p className="text-xl font-semibold text-white">
                No hay competidores en esta sala.
              </p>
              <p className="mt-2 text-base text-slate-300">
                Prueba con otra combinación de evento o modalidad.
              </p>
            </div>
          ) : null}

          {!isLoading && !errorMessage && participants.length > 0 ? (
            <div className="grid gap-4">
              {participants.map((participant) => {
                const isCompleted = completedParticipantIds.has(participant.id);

                return (
                  <button
                    key={participant.id}
                    className={[
                      "w-full rounded-[2rem] border p-5 text-left transition active:scale-[0.99]",
                      isCompleted
                        ? "border-emerald-400/40 bg-emerald-300 text-emerald-950 shadow-lg shadow-emerald-500/15"
                        : "border-slate-200 bg-white text-slate-950 shadow-xl shadow-slate-950/10",
                    ].join(" ")}
                    onClick={() => handleOpenParticipant(participant)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="text-2xl font-bold">{participant.nombres_apellidos}</p>
                        <p
                          className={[
                            "text-base font-medium",
                            isCompleted ? "text-emerald-900/80" : "text-slate-600",
                          ].join(" ")}
                        >
                          {participant.marca_modelo}
                        </p>
                      </div>

                      <div
                        className={[
                          "shrink-0 rounded-full px-4 py-2 text-sm font-bold uppercase tracking-[0.16em]",
                          isCompleted
                            ? "bg-emerald-900/10 text-emerald-950"
                            : "bg-slate-950 text-white",
                        ].join(" ")}
                      >
                        {isCompleted ? "✅ Completado" : "Pendiente"}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                      <span
                        className={[
                          "rounded-full px-4 py-2",
                          isCompleted
                            ? "bg-emerald-900/10 text-emerald-950"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        Placa: {participant.placa_rodaje}
                      </span>
                      <span
                        className={[
                          "rounded-full px-4 py-2",
                          isCompleted
                            ? "bg-emerald-900/10 text-emerald-950"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {participant.modalidad}
                      </span>
                      <span
                        className={[
                          "rounded-full px-4 py-2",
                          isCompleted
                            ? "bg-emerald-900/10 text-emerald-950"
                            : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        Categoría actual: {participant.categoria}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
