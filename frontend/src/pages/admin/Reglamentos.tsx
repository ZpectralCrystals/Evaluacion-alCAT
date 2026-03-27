import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import FileViewer from "../../components/FileViewer";
import { useAuth } from "../../contexts/AuthContext";
import { API_BASE_URL, api, getApiErrorMessage } from "../../lib/api";

type Regulation = {
  id: number;
  titulo: string;
  modalidad: string;
  archivo_url: string;
};

const OFFICIAL_MODALIDADES = [
  "SPL",
  "SQ",
  "SQL",
  "Street Show",
  "Tuning",
];

export default function ReglamentosPage() {
  const { user } = useAuth();

  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState("");

  // Upload form states
  const [titulo, setTitulo] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Viewer state
  const [viewingRegulation, setViewingRegulation] = useState<Regulation | null>(null);

  // Load regulations on mount
  useEffect(() => {
    if (user?.token) {
      void loadRegulations();
    }
  }, [user?.token]);

  async function loadRegulations() {
    if (!user?.token) return;

    setIsLoading(true);
    setListError("");

    try {
      const response = await api.get<Regulation[]>("/api/regulations", {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setRegulations(response.data);
    } catch (error) {
      setListError(getApiErrorMessage(error, "No se pudo cargar los reglamentos."));
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError("");
    setUploadMessage("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.token || !selectedFile) return;

    setIsUploading(true);
    setUploadError("");
    setUploadMessage("");

    const formData = new FormData();
    formData.append("titulo", titulo);
    formData.append("modalidad", modalidad);
    formData.append("file", selectedFile);

    try {
      await api.post("/api/regulations", formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setUploadMessage("Reglamento subido correctamente.");
      setTitulo("");
      setModalidad("");
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.getElementById("pdf-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Reload list
      await loadRegulations();
    } catch (error) {
      setUploadError(getApiErrorMessage(error, "No se pudo subir el reglamento."));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!user?.token) return;

    const confirmed = window.confirm("¿Estás seguro de eliminar este reglamento?");
    if (!confirmed) return;

    setDeletingId(id);
    try {
      await api.delete(`/api/regulations/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await loadRegulations();
    } catch (error) {
      setListError(getApiErrorMessage(error, "No se pudo eliminar el reglamento."));
    } finally {
      setDeletingId(null);
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
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      {/* Upload Section */}
      <section className="panel p-5 sm:p-6">
        <div className="mb-5 space-y-2">
          <p className="text-sm font-medium text-brand-200">Subir Reglamento</p>
          <h2 className="section-title">Nuevo PDF</h2>
          <p className="text-sm leading-6 text-slate-300">
            Sube archivos PDF de reglamentos para que los jueces puedan consultarlos.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            className="touch-input"
            placeholder="Título del reglamento"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />

          <select
            className="touch-input appearance-none"
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
            required
          >
            <option value="">Selecciona modalidad</option>
            {OFFICIAL_MODALIDADES.map((mod) => (
              <option key={mod} value={mod}>
                {mod}
              </option>
            ))}
          </select>

          <div className="rounded-3xl border border-dashed border-brand-400/40 bg-brand-400/5 px-5 py-6 text-center transition hover:border-brand-300 hover:bg-brand-400/10">
            <label className="flex cursor-pointer flex-col items-center justify-center">
              <span className="text-base font-semibold text-white">
                {selectedFile ? selectedFile.name : "Toca aquí para seleccionar PDF"}
              </span>
              <span className="mt-2 text-sm text-slate-300">
                Formatos permitidos: .pdf
              </span>
              <input
                id="pdf-upload"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
                type="file"
                required
              />
            </label>
          </div>

          {uploadMessage && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {uploadMessage}
            </div>
          )}

          {uploadError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {uploadError}
            </div>
          )}

          <button
            className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isUploading || !titulo.trim() || !modalidad || !selectedFile}
            type="submit"
          >
            {isUploading ? "Subiendo..." : "Subir reglamento"}
          </button>
        </form>
      </section>

      {/* List Section */}
      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-200">Biblioteca</p>
            <h2 className="section-title">Reglamentos disponibles</h2>
          </div>

          <button
            className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
            onClick={() => void loadRegulations()}
            type="button"
          >
            Recargar
          </button>
        </div>

        {listError && (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {listError}
          </div>
        )}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            Cargando reglamentos...
          </div>
        ) : regulations.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            Aún no hay reglamentos subidos.
          </div>
        ) : (
          <div className="space-y-3">
            {regulations.map((reg) => (
              <article
                key={reg.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white">{reg.titulo}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-100">
                        {reg.modalidad}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="touch-button w-auto min-w-28 border border-blue-600/50 bg-blue-500/10 px-3 py-2 text-sm text-blue-200 hover:bg-blue-500/20"
                      onClick={() => handleView(reg)}
                      type="button"
                    >
                      Ver PDF
                    </button>
                    <button
                      className="touch-button w-auto min-w-28 border border-rose-700/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200 hover:bg-rose-500/20"
                      disabled={deletingId === reg.id}
                      onClick={() => void handleDelete(reg.id)}
                      type="button"
                    >
                      {deletingId === reg.id ? "Eliminando..." : "Eliminar"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* File Viewer Modal */}
      {viewingRegulation && (
        <FileViewer
          url={getFullUrl(viewingRegulation.archivo_url)}
          title={viewingRegulation.titulo}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}
