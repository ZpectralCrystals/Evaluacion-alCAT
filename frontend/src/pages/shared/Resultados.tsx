import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";
import type { EventItem, ResultsByModalityResponse } from "../../lib/judging";

type ModalityRecord = {
  id: number;
  nombre: string;
};

export default function ResultadosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedModalityId, setSelectedModalityId] = useState("");
  const [results, setResults] = useState<ResultsByModalityResponse | null>(null);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedModality = useMemo(
    () => modalities.find((item) => String(item.id) === selectedModalityId) ?? null,
    [modalities, selectedModalityId],
  );

  useEffect(() => {
    async function loadFilters() {
      if (!user?.token) return;

      setIsLoadingFilters(true);
      setErrorMessage("");

      try {
        const [eventsResponse, modalitiesResponse] = await Promise.all([
          api.get<EventItem[]>("/api/events", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
          api.get<ModalityRecord[]>("/api/modalities", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        setEvents(eventsResponse.data);
        setModalities(modalitiesResponse.data);
        setSelectedEventId(String(eventsResponse.data[0]?.id ?? ""));
        setSelectedModalityId(String(modalitiesResponse.data[0]?.id ?? ""));
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudieron cargar los filtros de resultados."));
      } finally {
        setIsLoadingFilters(false);
      }
    }

    void loadFilters();
  }, [user?.token]);

  useEffect(() => {
    async function loadResults() {
      if (!user?.token || !selectedModalityId) return;

      setIsLoadingResults(true);
      setErrorMessage("");

      try {
        const response = await api.get<ResultsByModalityResponse>(
          `/api/results/${selectedModalityId}`,
          {
            headers: { Authorization: `Bearer ${user.token}` },
            params: selectedEventId ? { evento_id: selectedEventId } : undefined,
          },
        );
        setResults(response.data);
      } catch (error) {
        setResults(null);
        setErrorMessage(getApiErrorMessage(error, "No se pudieron cargar los resultados."));
      } finally {
        setIsLoadingResults(false);
      }
    }

    void loadResults();
  }, [selectedEventId, selectedModalityId, user?.token]);

  function handleBack() {
    navigate(user?.role === "admin" ? "/admin" : "/juez");
  }

  return (
    <section className="grid gap-4">
      <article className="panel overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                Resultados
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Leaderboard por modalidad
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Visible para administradores y jueces principales.
              </p>
            </div>

            <button
              className="touch-button min-h-14 rounded-3xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-base text-slate-100 sm:w-auto sm:min-w-40"
              onClick={handleBack}
              type="button"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-800/80 bg-slate-950/40 px-4 py-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Evento</label>
            <select
              className="touch-input"
              disabled={isLoadingFilters}
              onChange={(event) => setSelectedEventId(event.target.value)}
              value={selectedEventId}
            >
              <option value="">Todos los eventos</option>
              {events.map((eventItem) => (
                <option key={eventItem.id} value={eventItem.id}>
                  {eventItem.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Modalidad</label>
            <select
              className="touch-input"
              disabled={isLoadingFilters}
              onChange={(event) => setSelectedModalityId(event.target.value)}
              value={selectedModalityId}
            >
              <option value="">Selecciona una modalidad</option>
              {modalities.map((modality) => (
                <option key={modality.id} value={modality.id}>
                  {modality.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5">
          {errorMessage && (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-base text-amber-100">
              {errorMessage}
            </div>
          )}

          {(isLoadingFilters || isLoadingResults) && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-lg text-slate-300">
              Cargando resultados...
            </div>
          )}

          {!isLoadingFilters && !isLoadingResults && !errorMessage && results && (
            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Modalidad activa
                </p>
                <p className="mt-2 text-xl font-bold text-white">
                  {selectedModality?.nombre ?? results.modality_name}
                </p>
              </div>

              {results.grouped_results.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center">
                  <p className="text-xl font-semibold text-white">Sin resultados finalizados</p>
                  <p className="mt-2 text-base text-slate-300">
                    Todavía no hay hojas completadas para este filtro.
                  </p>
                </div>
              ) : (
                results.grouped_results.map((group) => (
                  <section
                    key={group.category_id}
                    className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4"
                  >
                    <header className="mb-4 rounded-3xl bg-brand-500/10 px-4 py-4">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">
                        Categoría final
                      </p>
                      <h3 className="mt-2 text-2xl font-bold text-white">{group.category_name}</h3>
                    </header>

                    <div className="space-y-3">
                      {group.participants.map((participant, index) => (
                        <article
                          key={participant.participant_id}
                          className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                                Puesto #{index + 1}
                              </p>
                              <h4 className="mt-2 text-xl font-bold text-white">
                                {participant.nombres_apellidos}
                              </h4>
                              <p className="mt-1 text-base text-slate-300">
                                {participant.marca_modelo} · {participant.placa_rodaje}
                              </p>
                            </div>

                            <div className="rounded-3xl bg-emerald-500/10 px-4 py-3 text-right">
                              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-200">
                                Puntaje total
                              </p>
                              <p className="mt-1 text-3xl font-black text-emerald-300">
                                {participant.total_score}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {Object.entries(participant.section_subtotals).map(([sectionId, total]) => (
                              <div
                                key={sectionId}
                                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
                              >
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                                  {sectionId}
                                </p>
                                <p className="mt-2 text-2xl font-bold text-white">{total}</p>
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
