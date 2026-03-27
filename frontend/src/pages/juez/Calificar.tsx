import { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";
import {
  type AnswerDetail,
  type BonificationItemV2,
  type CategorizationOption,
  type EvaluationTemplateMaster,
  type EvaluationTemplateRecord,
  type JudgeAssignmentRecord,
  type ParticipantItem,
  type ScoreCardPartialUpdateRequest,
  type ScoreCardRecord,
  type TemplateItemV2,
  type TemplateSectionV2,
} from "../../lib/judging";

type LocationState = {
  participant?: ParticipantItem;
};

type ModalityFromAPI = {
  id: number;
  nombre: string;
};

type ToastState = {
  kind: "success" | "error";
  message: string;
} | null;

type InitialAnswerState = {
  answers: Record<string, AnswerDetail>;
  selectedOptionLabels: Record<string, string>;
};

type SectionSummary = {
  id: string;
  title: string;
  total: number;
};

function isCategorizationOnlyItem(item: TemplateItemV2) {
  return item.evaluation_type === "categorization_only" || getMaxScoreForItem(item) <= 0;
}

function getMaxScoreForItem(item: TemplateItemV2) {
  if (typeof item.max_score === "number" && Number.isFinite(item.max_score)) {
    return item.max_score;
  }
  const match = item.evaluation_type.match(/scale_(\d+)_(\d+)/);
  if (match) {
    return Number(match[2]);
  }
  return 5;
}

function getMinScoreForItem(item: { min_score?: number }) {
  if (typeof item.min_score === "number" && Number.isFinite(item.min_score)) {
    return item.min_score;
  }
  return 0;
}

function getDefaultLevel(item: TemplateItemV2) {
  return item.categorization_options?.[0]?.triggers_level ?? 1;
}

function getDefaultCategoryId(item: TemplateItemV2) {
  return item.categorization_options?.[0]?.category_id ?? undefined;
}

function getInitialOptionLabel(
  item: TemplateItemV2,
  selectedLevel: number,
  selectedCategoryId?: number,
) {
  const byCategoryId =
    typeof selectedCategoryId === "number"
      ? item.categorization_options?.find((option) => option.category_id === selectedCategoryId)
      : undefined;

  if (byCategoryId?.label) {
    return byCategoryId.label;
  }

  return (
    item.categorization_options?.find((option) => option.triggers_level === selectedLevel)?.label ??
    item.categorization_options?.[0]?.label ??
    ""
  );
}

function buildInitialAnswerState(
  visibleSections: TemplateSectionV2[],
  visibleBonifications: BonificationItemV2[],
  existingAnswers?: Record<string, AnswerDetail>,
): InitialAnswerState {
  const answers: Record<string, AnswerDetail> = existingAnswers ? { ...existingAnswers } : {};
  const selectedOptionLabels: Record<string, string> = {};

  visibleSections.forEach((section) => {
    section.items.forEach((item) => {
      const existingAnswer = existingAnswers?.[item.item_id];
      const selectedLevel =
        typeof existingAnswer?.category_level_selected === "number"
          ? existingAnswer.category_level_selected
          : getDefaultLevel(item);
      const selectedCategoryId =
        typeof existingAnswer?.category_id_selected === "number"
          ? existingAnswer.category_id_selected
          : getDefaultCategoryId(item);

      answers[item.item_id] = {
        score: typeof existingAnswer?.score === "number" ? existingAnswer.score : 0,
        category_level_selected: selectedLevel,
        category_id_selected: selectedCategoryId,
      };
      selectedOptionLabels[item.item_id] = getInitialOptionLabel(
        item,
        selectedLevel,
        selectedCategoryId,
      );
    });
  });

  visibleBonifications.forEach((item) => {
    const existingAnswer = existingAnswers?.[item.item_id];
    answers[item.item_id] = {
      score: typeof existingAnswer?.score === "number" ? existingAnswer.score : 0,
    };
  });

  return { answers, selectedOptionLabels };
}

function buildSectionSummaries(
  template: EvaluationTemplateMaster | null,
  answers: Record<string, AnswerDetail>,
): SectionSummary[] {
  if (!template) return [];

  const summaries = template.sections.map((section) => ({
    id: section.section_id,
    title: section.section_title,
    total: section.items.reduce((sum, item) => sum + (answers[item.item_id]?.score ?? 0), 0),
  }));

  if (template.bonifications) {
    summaries.push({
      id: template.bonifications.section_id,
      title: "Bonificaciones",
      total: template.bonifications.items.reduce(
        (sum, item) => sum + (answers[item.item_id]?.score ?? 0),
        0,
      ),
    });
  }

  return summaries;
}

function buildPartialPayload(
  visibleSections: TemplateSectionV2[],
  visibleBonifications: BonificationItemV2[],
  answers: Record<string, AnswerDetail>,
): ScoreCardPartialUpdateRequest {
  const payload: Record<string, AnswerDetail> = {};

  visibleSections.forEach((section) => {
    section.items.forEach((item) => {
      const answer = answers[item.item_id];
      if (answer) {
        payload[item.item_id] = answer;
      }
    });
  });

  visibleBonifications.forEach((item) => {
    const answer = answers[item.item_id];
    if (answer) {
      payload[item.item_id] = answer;
    }
  });

  return { answers: payload };
}

function isSelectedOption(
  answer: AnswerDetail | undefined,
  option: CategorizationOption,
  selectedLabel: string | undefined,
) {
  if (!answer) return false;
  if (typeof option.category_id === "number" && typeof answer.category_id_selected === "number") {
    return option.category_id === answer.category_id_selected;
  }
  return (
    answer.category_level_selected === option.triggers_level &&
    selectedLabel === option.label
  );
}

export default function CalificarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { participanteId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const locationState = location.state as LocationState | null;
  const participantId = Number(participanteId);
  const eventoId = searchParams.get("evento_id") ?? "";
  const modalidad = searchParams.get("modalidad") ?? "";

  const [participant, setParticipant] = useState<ParticipantItem | null>(
    locationState?.participant ?? null,
  );
  const [templateRecord, setTemplateRecord] = useState<EvaluationTemplateRecord | null>(null);
  const [assignment, setAssignment] = useState<JudgeAssignmentRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerDetail>>({});
  const [selectedOptionLabels, setSelectedOptionLabels] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPartial, setIsSavingPartial] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [scoreCardStatus, setScoreCardStatus] = useState<"draft" | "completed">("draft");
  const [isReeditMode, setIsReeditMode] = useState(false);

  useEffect(() => {
    if (!toast) return;

    const timeoutId = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const template = templateRecord?.content ?? null;
  const isCategorizationOnlyTemplate = template?.template_type === "categorization_only";

  const visibleSections = useMemo(() => {
    if (!template || !assignment) return [];
    return template.sections.filter((section) =>
      assignment.assigned_sections.includes(section.section_id),
    );
  }, [assignment, template]);

  const visibleBonifications = useMemo(() => {
    if (!template?.bonifications || !assignment) return [];
    if (!assignment.assigned_sections.includes(template.bonifications.section_id)) {
      return [];
    }
    return template.bonifications.items ?? [];
  }, [assignment, template]);

  const totalVisibleScore = useMemo(() => {
    const sectionScore = visibleSections.reduce(
      (sum, section) =>
        sum +
        section.items.reduce(
          (itemsSum, item) => itemsSum + (answers[item.item_id]?.score ?? 0),
          0,
        ),
      0,
    );

    const bonusScore = visibleBonifications.reduce((sum, item) => {
      return sum + (answers[item.item_id]?.score ?? 0);
    }, 0);

    return sectionScore + bonusScore;
  }, [answers, visibleBonifications, visibleSections]);

  const hasEditableContent = visibleSections.length > 0 || visibleBonifications.length > 0;
  const sectionSummaries = useMemo(
    () => buildSectionSummaries(template, answers),
    [answers, template],
  );
  const totalSummaryScore = useMemo(
    () => sectionSummaries.reduce((sum, section) => sum + section.total, 0),
    [sectionSummaries],
  );
  const canReeditCompleted = Boolean(
    assignment?.is_principal && user?.canEditScores && scoreCardStatus === "completed",
  );
  const showSummaryOnly = scoreCardStatus === "completed" && !isReeditMode;

  useEffect(() => {
    if (!participantId || !eventoId || !modalidad) {
      navigate("/juez", { replace: true });
      return;
    }

    async function loadEvaluationContext() {
      if (!user?.token) return;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const [participantsResponse, modalitiesResponse] = await Promise.all([
          api.get<ParticipantItem[]>("/api/participants", {
            headers: { Authorization: `Bearer ${user.token}` },
            params: {
              evento_id: eventoId,
              modalidad,
            },
          }),
          api.get<ModalityFromAPI[]>("/api/modalities", {
            headers: { Authorization: `Bearer ${user.token}` },
          }),
        ]);

        const selectedParticipant =
          locationState?.participant ??
          participantsResponse.data.find((item) => item.id === participantId) ??
          null;

        if (!selectedParticipant) {
          throw new Error("No se pudo encontrar al participante seleccionado.");
        }

        const selectedModality = modalitiesResponse.data.find(
          (item) => item.nombre === modalidad,
        );
        if (!selectedModality) {
          throw new Error(`No se encontró la modalidad '${modalidad}' en la base de datos.`);
        }

        const [templateResponse, assignmentResponse] = await Promise.all([
          api.get<EvaluationTemplateRecord>(
            `/api/evaluation-templates/by-modality/${selectedModality.id}`,
            {
              headers: { Authorization: `Bearer ${user.token}` },
            },
          ),
          api.get<JudgeAssignmentRecord>("/api/judge-assignments/me", {
            headers: { Authorization: `Bearer ${user.token}` },
            params: { modality_id: selectedModality.id },
          }),
        ]);

        let existingScoreCard: ScoreCardRecord | null = null;
        try {
          const scoreCardResponse = await api.get<ScoreCardRecord>(
            `/api/scorecards/${participantId}`,
            {
              headers: { Authorization: `Bearer ${user.token}` },
            },
          );
          existingScoreCard = scoreCardResponse.data;
        } catch (error) {
          if (!(error instanceof AxiosError) || error.response?.status !== 404) {
            throw error;
          }
        }

        const nextTemplate = templateResponse.data.content;
        const nextAssignment = assignmentResponse.data;
        const nextVisibleSections = nextTemplate.sections.filter((section) =>
          nextAssignment.assigned_sections.includes(section.section_id),
        );
        const nextVisibleBonifications =
          nextTemplate.bonifications &&
          nextAssignment.assigned_sections.includes(nextTemplate.bonifications.section_id)
            ? nextTemplate.bonifications.items ?? []
            : [];

        const initialState = buildInitialAnswerState(
          nextVisibleSections,
          nextVisibleBonifications,
          existingScoreCard?.answers,
        );

        setParticipant(selectedParticipant);
        setTemplateRecord(templateResponse.data);
        setAssignment(nextAssignment);
        setAnswers(initialState.answers);
        setSelectedOptionLabels(initialState.selectedOptionLabels);
        setScoreCardStatus(existingScoreCard?.status === "completed" ? "completed" : "draft");
        setIsReeditMode(false);
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(error, "No se pudo cargar la hoja colaborativa."),
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadEvaluationContext();
  }, [
    eventoId,
    locationState?.participant,
    modalidad,
    navigate,
    participantId,
    user?.token,
  ]);

  function handleBack() {
    navigate(`/juez/dashboard?${searchParams.toString()}`);
  }

  function updateItemScore(item: TemplateItemV2, delta: number) {
    const maxScore = getMaxScoreForItem(item);
    const minScore = getMinScoreForItem(item);

    setAnswers((current) => {
      const previous = current[item.item_id];
      const currentValue = previous?.score ?? 0;
      const nextScore = Math.min(maxScore, Math.max(minScore, currentValue + delta));

      return {
        ...current,
        [item.item_id]: {
          score: nextScore,
          category_level_selected:
            typeof previous?.category_level_selected === "number"
              ? previous.category_level_selected
              : getDefaultLevel(item),
          category_id_selected:
            typeof previous?.category_id_selected === "number"
              ? previous.category_id_selected
              : getDefaultCategoryId(item),
        },
      };
    });
  }

  function selectCategorizationOption(
    item: TemplateItemV2,
    option: NonNullable<TemplateItemV2["categorization_options"]>[number],
  ) {
    setAnswers((current) => {
      const previous = current[item.item_id];
      return {
        ...current,
        [item.item_id]: {
          score: typeof previous?.score === "number" ? previous.score : 0,
          category_level_selected: option.triggers_level,
          category_id_selected:
            typeof option.category_id === "number" ? option.category_id : undefined,
        },
      };
    });

    setSelectedOptionLabels((current) => ({
      ...current,
      [item.item_id]: option.label,
    }));
  }

  function updateBonificationScore(item: BonificationItemV2, delta: number) {
    setAnswers((current) => ({
      ...current,
      [item.item_id]: {
        score: Math.min(
          item.max_score ?? 0,
          Math.max(
            getMinScoreForItem(item),
            (current[item.item_id]?.score ?? 0) + delta,
          ),
        ),
      },
    }));
  }

  async function handleSavePartial() {
    if (!user?.token || !participant) return;

    setIsSavingPartial(true);
    setErrorMessage("");

    try {
      const payload = buildPartialPayload(visibleSections, visibleBonifications, answers);
      const response = await api.patch<ScoreCardRecord>(
        `/api/scorecards/${participant.id}/partial-update`,
        payload,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setScoreCardStatus(response.data.status === "completed" ? "completed" : "draft");
      if (response.data.status !== "completed") {
        setIsReeditMode(true);
      }

      setToast({
        kind: "success",
        message:
          scoreCardStatus === "completed"
            ? "Cambios guardados. La hoja volvió a borrador para revalidación."
            : "Progreso guardado.",
      });
    } catch (error) {
      const message = getApiErrorMessage(error, "No se pudo guardar el progreso.");
      setErrorMessage(message);
      setToast({ kind: "error", message });
    } finally {
      setIsSavingPartial(false);
    }
  }

  async function handleFinalize() {
    if (!user?.token || !participant || !assignment?.is_principal) return;

    setIsFinalizing(true);
    setErrorMessage("");

    try {
      const payload = buildPartialPayload(visibleSections, visibleBonifications, answers);
      await api.patch(`/api/scorecards/${participant.id}/partial-update`, payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      const response = await api.post<{
        current_category_name: string;
        previous_category_name: string;
      }>(
        `/api/scorecards/${participant.id}/finalize`,
        {},
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setScoreCardStatus("completed");
      setIsReeditMode(false);
      setParticipant((current) =>
        current
          ? {
              ...current,
              categoria: response.data.current_category_name,
            }
          : current,
      );
      setToast({
        kind: "success",
        message:
          response.data.previous_category_name !== response.data.current_category_name
            ? `Evaluación finalizada. Recategorizado a ${response.data.current_category_name}.`
            : "Evaluación finalizada correctamente.",
      });
    } catch (error) {
      const message = getApiErrorMessage(error, "No se pudo finalizar la evaluación.");
      setErrorMessage(message);
      setToast({ kind: "error", message });
    } finally {
      setIsFinalizing(false);
    }
  }

  return (
    <section className="grid gap-4 pb-40">
      {toast && (
        <div className="fixed inset-x-4 top-4 z-50 mx-auto max-w-lg">
          <div
            className={[
              "rounded-3xl border px-5 py-4 text-base shadow-2xl backdrop-blur",
              toast.kind === "success"
                ? "border-emerald-400/30 bg-emerald-500/90 text-white"
                : "border-rose-400/30 bg-rose-500/90 text-white",
            ].join(" ")}
          >
            {toast.message}
          </div>
        </div>
      )}

      <article className="panel overflow-hidden">
        <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
                Paso 3
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Hoja colaborativa
              </h2>
              <p className="mt-2 text-base text-slate-300">
                Solo verás las secciones asignadas a tu rol dentro de esta modalidad.
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

        <div className="border-b border-slate-800/80 bg-slate-950/40 px-4 py-4 sm:px-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
            Participante
          </p>
          <p className="mt-2 text-2xl font-bold text-white">
            {participant?.nombres_apellidos ?? "Cargando participante..."}
          </p>
          <p className="mt-1 text-base text-slate-300">
            {participant?.marca_modelo ?? "Esperando datos del vehículo"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-100">
              {modalidad}
            </span>
            {participant?.categoria && (
              <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-semibold text-slate-200">
                Categoría actual: {participant.categoria}
              </span>
            )}
            {assignment && (
              <span
                className={[
                  "rounded-full px-3 py-1 text-sm font-semibold",
                  assignment.is_principal
                    ? "bg-amber-500/15 text-amber-100"
                    : "bg-sky-500/15 text-sky-100",
                ].join(" ")}
              >
                {assignment.is_principal ? "Juez Principal" : "Juez Secundario"}
              </span>
            )}
            <span
              className={[
                "rounded-full px-3 py-1 text-sm font-semibold",
                scoreCardStatus === "completed"
                  ? "bg-emerald-500/15 text-emerald-100"
                  : "bg-slate-800 text-slate-200",
              ].join(" ")}
            >
              {scoreCardStatus === "completed" ? "Completada" : "En borrador"}
            </span>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5">
          {isLoading && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-lg text-slate-300">
              Cargando hoja colaborativa...
            </div>
          )}

          {!isLoading && errorMessage && (
            <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-base text-amber-100">
              {errorMessage}
            </div>
          )}

          {!isLoading && !errorMessage && template && assignment && (
            <div className="space-y-4">
              {visibleSections.length === 0 && visibleBonifications.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-base text-slate-300">
                  No tienes secciones asignadas para esta modalidad.
                </div>
              ) : null}

              {showSummaryOnly ? (
                <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                  <header className="mb-4 rounded-3xl bg-emerald-500/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Hoja finalizada
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-white">
                      Acumulado por sección
                    </h3>
                  </header>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {sectionSummaries.map((summary) => (
                      <article
                        key={summary.id}
                        className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                      >
                        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                          {summary.id}
                        </p>
                        <h4 className="mt-2 text-xl font-bold text-white">{summary.title}</h4>
                        <p className="mt-3 text-3xl font-black text-emerald-300">{summary.total}</p>
                      </article>
                    ))}
                  </div>

                  {canReeditCompleted && (
                    <button
                      className="touch-button mt-4 w-auto min-w-52 border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-base text-amber-100"
                      onClick={() => setIsReeditMode(true)}
                      type="button"
                    >
                      Re-editar puntajes
                    </button>
                  )}
                </section>
              ) : null}

              {!showSummaryOnly &&
                visibleSections.map((section) => (
                <section
                  key={section.section_id}
                  className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-4 sm:p-5"
                >
                  <header className="mb-4 rounded-3xl bg-brand-500/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-200">
                      {section.assigned_role}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-white">
                      {section.section_title}
                    </h3>
                  </header>

                  <div className="space-y-4">
                    {section.items.map((item) => {
                      const currentAnswer = answers[item.item_id];
                      const currentScore = currentAnswer?.score ?? 0;
                      const selectedLabel = selectedOptionLabels[item.item_id];

                      return (
                        <article
                          key={item.item_id}
                          className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="mb-4">
                            <p className="text-xl font-bold text-white">{item.label}</p>
                            <p className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-slate-400">
                              {item.item_id} ·{" "}
                              {isCategorizationOnlyItem(item)
                                ? "Solo categorización"
                                : `Rango: ${getMinScoreForItem(item)} a ${getMaxScoreForItem(item)} puntos`}
                            </p>
                          </div>

                          {!isCategorizationOnlyItem(item) ? (
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                              <button
                                className="flex min-h-16 items-center justify-center rounded-3xl bg-rose-500 px-4 py-4 text-4xl font-black text-white shadow-lg shadow-rose-500/20"
                                onClick={() => updateItemScore(item, -1)}
                                type="button"
                              >
                                -
                              </button>

                              <input
                                className="min-h-16 w-28 rounded-3xl border border-slate-700 bg-white px-4 text-center text-3xl font-black text-slate-950 outline-none"
                                readOnly
                                type="number"
                                value={currentScore}
                              />

                              <button
                                className="flex min-h-16 items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-4xl font-black text-white shadow-lg shadow-emerald-500/20"
                                onClick={() => updateItemScore(item, 1)}
                                type="button"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <div className="rounded-3xl border border-slate-700 bg-slate-900 px-4 py-4 text-center text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">
                              Este ítem solo define recategorización
                            </div>
                          )}

                          {item.categorization_options && item.categorization_options.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                                Nivel de categorización
                              </p>
                              <div className="grid gap-2">
                                {item.categorization_options.map((option) => (
                                  <button
                                    key={`${item.item_id}-${option.label}`}
                                    className={[
                                      "rounded-2xl border px-4 py-3 text-left text-sm transition",
                                      isSelectedOption(currentAnswer, option, selectedLabel)
                                        ? "border-brand-400 bg-brand-500/15 text-brand-100"
                                        : "border-slate-700 bg-slate-900 text-slate-200",
                                    ].join(" ")}
                                    onClick={() => selectCategorizationOption(item, option)}
                                    type="button"
                                  >
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="space-y-1">
                                        <span className="block font-medium">{option.label}</span>
                                        {option.category_name ? (
                                          <span className="block text-xs text-slate-300">
                                            Recategoriza a: {option.category_name}
                                          </span>
                                        ) : null}
                                      </div>
                                      <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-slate-300">
                                        Nivel {option.triggers_level}
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}

              {!showSummaryOnly && template.bonifications && visibleBonifications.length > 0 && (
                <section className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-4 sm:p-5">
                  <header className="mb-4 rounded-3xl bg-amber-500/10 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">
                      {template.bonifications.assigned_role}
                    </p>
                    <h3 className="mt-2 text-2xl font-bold text-white">Bonificaciones</h3>
                  </header>

                  <div className="space-y-3">
                    {visibleBonifications.map((item) => {
                      const currentScore = answers[item.item_id]?.score ?? 0;
                      return (
                        <article
                          key={item.item_id}
                          className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="mb-4">
                            <p className="text-lg font-bold">{item.label}</p>
                            <p className="mt-1 text-sm uppercase tracking-[0.12em] text-current/70">
                              {item.item_id} · Rango: {getMinScoreForItem(item)} a {item.max_score ?? 0} puntos
                            </p>
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <button
                              className="flex min-h-16 items-center justify-center rounded-3xl bg-rose-500 px-4 py-4 text-4xl font-black text-white shadow-lg shadow-rose-500/20"
                              onClick={() => updateBonificationScore(item, -1)}
                              type="button"
                            >
                              -
                            </button>

                            <input
                              className="min-h-16 w-28 rounded-3xl border border-slate-700 bg-white px-4 text-center text-3xl font-black text-slate-950 outline-none"
                              readOnly
                              type="number"
                              value={currentScore}
                            />

                            <button
                              className="flex min-h-16 items-center justify-center rounded-3xl bg-emerald-500 px-4 py-4 text-4xl font-black text-white shadow-lg shadow-emerald-500/20"
                              onClick={() => updateBonificationScore(item, 1)}
                              type="button"
                            >
                              +
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </article>

      {!isLoading && template && assignment && !errorMessage && (
        <div className="fixed inset-x-0 bottom-0 z-20 bg-slate-950/95 px-3 pb-3 pt-3 backdrop-blur">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[2rem] border border-slate-800 bg-slate-900/95 p-4 shadow-2xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isCategorizationOnlyTemplate
                    ? "Modalidad sin puntaje"
                    : showSummaryOnly
                      ? "Puntaje total final"
                      : "Puntaje visible de tus secciones"}
                </p>
                <p className="text-3xl font-black text-white">
                  {isCategorizationOnlyTemplate ? "Sin puntaje" : showSummaryOnly ? totalSummaryScore : totalVisibleScore}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  className="touch-button min-h-16 rounded-3xl border border-slate-700 bg-slate-900 px-6 py-4 text-lg text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-56"
                  disabled={
                    isSavingPartial ||
                    isFinalizing ||
                    showSummaryOnly ||
                    !hasEditableContent
                  }
                  onClick={() => void handleSavePartial()}
                  type="button"
                >
                  {isSavingPartial ? "Guardando..." : "Guardar Progreso"}
                </button>

                {assignment.is_principal && (
                  <button
                    className="touch-button min-h-16 rounded-3xl bg-brand-500 px-6 py-4 text-lg text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-64"
                    disabled={
                      isSavingPartial ||
                      isFinalizing ||
                      showSummaryOnly ||
                      !hasEditableContent
                    }
                    onClick={() => void handleFinalize()}
                    type="button"
                  >
                    {isFinalizing ? "Finalizando..." : "Finalizar Evaluación"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
