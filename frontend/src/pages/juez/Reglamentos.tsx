import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import FileViewer from "../../components/FileViewer";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL, api, getApiErrorMessage } from "../../lib/api";

type Regulation = {
  id: number;
  titulo: string;
  modalidad: string;
  archivo_url: string;
};

export default function JudgeReglamentosPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modalidad = searchParams.get("modalidad") ?? "";

  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [viewingRegulation, setViewingRegulation] = useState<Regulation | null>(null);

  useEffect(() => {
    if (user?.token) {
      void loadRegulations();
    }
  }, [modalidad, user?.token]);

  async function loadRegulations() {
    if (!user?.token) return;

    setIsLoading(true);
    setErrorMessage("");

    try {
      const params: Record<string, string> = {};
      if (modalidad) {
        params.modalidad = modalidad;
      }

      const response = await api.get<Regulation[]>("/api/regulations", {
        headers: { Authorization: `Bearer ${user.token}` },
        params,
      });
      setRegulations(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo cargar los reglamentos."));
    } finally {
      setIsLoading(false);
    }
  }

  function getFullUrl(url: string): string {
    if (url.startsWith("http")) return url;
    // Use API_BASE_URL to construct the full URL, removing /api suffix if present
    const baseUrl = API_BASE_URL.replace(/\/api\/?$/, "");
    const cleanUrl = url.replace(/^\//, "");
    return `${baseUrl}/${cleanUrl}`;
  }

  function handleView(regulation: Regulation) {
    setViewingRegulation(regulation);
  }

  function handleCloseViewer() {
    setViewingRegulation(null);
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-slate-800/80 px-4 py-4 sm:px-5">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-brand-200">
              Documentación
            </p>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Reglamentos
            </h2>
            <p className="text-base text-slate-300">
              Consulta los reglamentos oficiales para tu modalidad.
            </p>
          </div>

          <button
            className="touch-button border border-slate-700 bg-slate-900/70 text-slate-100 sm:w-auto sm:min-w-44"
            onClick={() => navigate("/juez")}
            type="button"
          >
            Volver al Panel
          </button>
        </div>
      </div>

      <div className="px-4 py-5 sm:px-5">
        {modalidad && (
          <div className="mb-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Modalidad seleccionada
            </p>
            <p className="mt-2 text-lg font-semibold text-white">{modalidad}</p>
          </div>
        )}

        {isLoading && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center text-lg text-slate-300">
            Cargando reglamentos...
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-base text-amber-100">
            {errorMessage}
          </div>
        )}

        {!isLoading && !errorMessage && regulations.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-8 text-center">
            <p className="text-xl font-semibold text-white">
              No hay reglamentos disponibles
            </p>
            <p className="mt-2 text-base text-slate-300">
              {modalidad
                ? `No se encontraron reglamentos para la modalidad ${modalidad}.`
                : "No se encontraron reglamentos en el sistema."}
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && regulations.length > 0 && (
          <div className="grid gap-4">
            {regulations.map((reg) => (
              <article
                key={reg.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-white">{reg.titulo}</h3>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-100">
                      {reg.modalidad}
                    </span>
                  </div>
                </div>

                <button
                  className="touch-button w-full border border-blue-600/50 bg-blue-500/10 px-6 py-3 text-base text-blue-200 hover:bg-blue-500/20 sm:w-auto sm:min-w-40"
                  onClick={() => handleView(reg)}
                  type="button"
                >
                  Ver Reglamento
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewingRegulation && (
        <FileViewer
          url={getFullUrl(viewingRegulation.archivo_url)}
          title={viewingRegulation.titulo}
          onClose={handleCloseViewer}
        />
      )}
    </section>
  );
}
