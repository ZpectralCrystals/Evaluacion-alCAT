import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";

type MasterTemplateItem = {
  item_id?: string;
  label?: string;
  evaluation_type?: string;
  min_score?: number;
  max_score?: number;
};

type MasterTemplateSection = {
  section_id?: string;
  section_title?: string;
  items?: MasterTemplateItem[];
};

type MasterTemplateContent = {
  template_name?: string;
  version?: string;
  sections?: MasterTemplateSection[];
  bonifications?: {
    section_id?: string;
    items?: MasterTemplateItem[];
  };
};

type MasterTemplateRecord = {
  id: number;
  modality_id: number;
  modality_name: string;
  content: MasterTemplateContent;
};

type JsonPreviewState = {
  title: string;
  payload: unknown;
};

function estimateMasterItemPoints(item: MasterTemplateItem) {
  if (typeof item.max_score === "number") {
    return item.max_score;
  }
  if (item.evaluation_type === "scale_0_5") {
    return 5;
  }
  return 0;
}

function getMasterStats(template: MasterTemplateRecord) {
  const sections = template.content.sections ?? [];
  const bonusItems = template.content.bonifications?.items ?? [];
  const totalSecciones = sections.length + (bonusItems.length > 0 ? 1 : 0);
  const totalItems =
    sections.reduce((sum, section) => sum + (section.items?.length ?? 0), 0) + bonusItems.length;
  const totalPuntos =
    sections.reduce(
      (sum, section) =>
        sum +
        (section.items ?? []).reduce(
          (itemsSum, item) => itemsSum + estimateMasterItemPoints(item),
          0,
        ),
      0,
    ) + bonusItems.reduce((sum, item) => sum + estimateMasterItemPoints(item), 0);

  return { totalSecciones, totalItems, totalPuntos };
}

export default function TemplatesListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<MasterTemplateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewState, setPreviewState] = useState<JsonPreviewState | null>(null);

  useEffect(() => {
    if (user?.token) {
      void loadTemplates();
    }
  }, [user?.token]);

  async function loadTemplates() {
    if (!user?.token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await api.get<MasterTemplateRecord[]>("/api/evaluation-templates", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setTemplates(response.data);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, "No se pudieron cargar las plantillas por modalidad."),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Gestión de plantillas
          </p>
          <h2 className="text-2xl font-bold text-white">Plantillas por modalidad</h2>
          <p className="mt-1 text-sm text-slate-400">
            Cada modalidad tiene una sola plantilla maestra compartida por todos los jueces.
          </p>
        </div>
        <button
          className="touch-button bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 sm:w-auto sm:min-w-52"
          onClick={() => navigate("/admin/plantillas/nueva")}
          type="button"
        >
          + Nueva plantilla por modalidad
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
            <p className="text-sm text-slate-400">Cargando plantillas...</p>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
          <p className="text-lg font-semibold text-white">Sin plantillas maestras</p>
          <p className="mt-2 text-sm text-slate-400">
            Crea la primera plantilla maestra y asígnala a una modalidad.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const { totalSecciones, totalItems, totalPuntos } = getMasterStats(template);

            return (
              <article
                key={template.id}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-lg bg-amber-600/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        {template.modality_name}
                      </span>
                      <span className="inline-block rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                        Modalidad única
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-lg font-bold text-white">
                      {template.content.template_name || `Plantilla ${template.modality_name}`}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      Versión {template.content.version || "sin versión"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                    #{template.id}
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-xl font-bold text-white">{totalSecciones}</p>
                    <p className="text-xs text-slate-500">Secciones</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-xl font-bold text-white">{totalItems}</p>
                    <p className="text-xs text-slate-500">Items</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-2 text-center">
                    <p className="text-xl font-bold text-emerald-400">{totalPuntos}</p>
                    <p className="text-xs text-slate-500">Pts. ref</p>
                  </div>
                </div>

                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button
                    className="rounded-xl border border-slate-700 bg-slate-800 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
                    onClick={() =>
                      setPreviewState({
                        title: template.content.template_name || template.modality_name,
                        payload: template.content,
                      })
                    }
                    type="button"
                  >
                    Ver JSON
                  </button>
                  <button
                    className="rounded-xl border border-amber-600/40 bg-amber-600/20 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-600/30"
                    onClick={() => navigate(`/admin/plantillas/maestra/${template.id}`)}
                    type="button"
                  >
                    Editar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previewState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-blue-400">
                  Vista JSON
                </p>
                <h3 className="text-lg font-bold text-white">{previewState.title}</h3>
              </div>
              <button
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-700"
                onClick={() => setPreviewState(null)}
                type="button"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-950 p-5">
              <pre className="text-xs leading-relaxed text-slate-300">
                <code>{JSON.stringify(previewState.payload, null, 2)}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
