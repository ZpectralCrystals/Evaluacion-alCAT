import { useEffect, useState } from "react";

interface FileViewerProps {
  url: string;
  title: string;
  onClose: () => void;
}

// Derive the server root dynamically so it works on any device/IP
function getServerRoot(): string {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
}

export default function FileViewer({ url, title, onClose }: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Build full URL - relative paths get server root prepended
  const fullUrl = url.startsWith("http") ? url : `${getServerRoot()}${url}`;

  const isPdf = fullUrl.toLowerCase().endsWith(".pdf");
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fullUrl);

  useEffect(() => {
    // Reset states when URL changes
    setIsLoading(true);
    setError("");
  }, [fullUrl]);

  function handleLoad() {
    setIsLoading(false);
  }

  function handleError() {
    setIsLoading(false);
    setError("No se pudo cargar el archivo. Verifica que la URL sea correcta.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="flex h-full max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400">
              {isPdf ? "Documento PDF" : isImage ? "Imagen" : "Archivo"}
            </p>
          </div>
          <div className="flex gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
            >
              Abrir en nueva pestaña
            </a>
            <button
              onClick={onClose}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden bg-slate-950 p-4">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500"></div>
                <p className="text-sm text-slate-400">Cargando archivo...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-center">
                <p className="text-rose-300">{error}</p>
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
                >
                  Intentar abrir en nueva pestaña
                </a>
              </div>
            </div>
          )}

          {isPdf && (
            <object
              data={fullUrl}
              type="application/pdf"
              className="h-full w-full rounded-lg border border-slate-800"
              onLoad={handleLoad}
              onError={handleError}
            >
              <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                <p className="mb-4 text-white">Tu navegador no puede mostrar el PDF directamente.</p>
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-brand-500 px-6 py-3 font-medium text-white transition hover:bg-brand-400"
                >
                  Descargar Reglamento
                </a>
              </div>
            </object>
          )}

          {isImage && (
            <div className="flex h-full items-center justify-center overflow-auto">
              <img
                src={fullUrl}
                alt={title}
                className="max-h-full max-w-full rounded-lg object-contain"
                onLoad={handleLoad}
                onError={handleError}
              />
            </div>
          )}

          {!isPdf && !isImage && (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="mb-4 text-slate-400">
                Este tipo de archivo no puede previsualizarse directamente.
              </p>
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition hover:bg-blue-500"
              >
                Descargar archivo
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 px-6 py-3">
          <p className="truncate text-xs text-slate-500">{fullUrl}</p>
        </div>
      </div>
    </div>
  );
}
