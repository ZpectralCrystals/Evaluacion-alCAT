import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";

type Category = {
  id: number;
  nombre: string;
  level: number;
  modality_id: number;
};

type Modality = {
  id: number;
  nombre: string;
  categories: Category[];
};

export default function CategoriasPage() {
  const { user } = useAuth();

  const [modalities, setModalities] = useState<Modality[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const sortedModalities = useMemo(
    () =>
      modalities.map((modality) => ({
        ...modality,
        categories: [...modality.categories].sort((left, right) => {
          if (left.level !== right.level) {
            return left.level - right.level;
          }
          return left.nombre.localeCompare(right.nombre);
        }),
      })),
    [modalities],
  );

  useEffect(() => {
    if (user?.token) {
      void loadModalities();
    }
  }, [user?.token]);

  async function loadModalities() {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await api.get<Modality[]>("/api/modalities", {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setModalities(response.data);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudieron cargar las modalidades."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddModality() {
    if (!user?.token) return;
    const nombre = window.prompt("Nombre de la nueva modalidad:");
    if (!nombre || !nombre.trim()) return;

    try {
      await api.post(
        "/api/modalities",
        { nombre: nombre.trim() },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      await loadModalities();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo crear la modalidad."));
    }
  }

  async function handleAddCategory(modalityId: number) {
    if (!user?.token) return;
    const nombre = window.prompt("Nombre de la nueva categoría:");
    if (!nombre || !nombre.trim()) return;
    const levelInput = window.prompt(
      "Nivel de la categoría dentro de esta modalidad (1, 2, 3... según tu reglamento):",
      "1",
    );
    if (!levelInput) return;

    const parsedLevel = Number(levelInput);
    const level = Number.isFinite(parsedLevel) ? Math.max(1, Math.round(parsedLevel)) : 1;

    try {
      await api.post(
        `/api/modalities/${modalityId}/categories`,
        { nombre: nombre.trim(), level },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );
      await loadModalities();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo crear la categoría."));
    }
  }

  async function handleDeleteModality(modalityId: number) {
    if (!user?.token) return;
    const confirmed = window.confirm("¿Eliminar esta modalidad? Se eliminarán todas sus categorías.");
    if (!confirmed) return;

    try {
      await api.delete(`/api/modalities/${modalityId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      await loadModalities();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar la modalidad."));
    }
  }

  async function handleDeleteCategory(categoryId: number) {
    if (!user?.token) return;
    const confirmed = window.confirm("¿Eliminar esta categoría?");
    if (!confirmed) return;

    // Save scroll position
    const scrollY = window.scrollY;

    try {
      await api.delete(`/api/modalities/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      // Update local state without reloading
      setModalities((prevModalities) =>
        prevModalities.map((modality) => ({
          ...modality,
          categories: modality.categories.filter((cat) => cat.id !== categoryId),
        }))
      );

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo eliminar la categoría."));
    }
  }

  async function handleEditCategory(category: Category) {
    if (!user?.token) return;

    const newNombre = window.prompt("Nuevo nombre de la categoría:", category.nombre);
    if (newNombre === null) return; // User cancelled
    if (!newNombre.trim()) {
      setErrorMessage("El nombre no puede estar vacío.");
      return;
    }

    const newLevelInput = window.prompt(
      `Nivel de la categoría (actual: ${category.level}):`,
      String(category.level),
    );
    if (newLevelInput === null) return; // User cancelled

    const parsedLevel = Number(newLevelInput);
    const newLevel = Number.isFinite(parsedLevel) ? Math.max(1, Math.round(parsedLevel)) : category.level;

    // Check if anything changed
    if (newNombre.trim() === category.nombre && newLevel === category.level) {
      return; // No changes
    }

    // Save scroll position
    const scrollY = window.scrollY;

    try {
      const response = await api.put<Category>(
        `/api/modalities/categories/${category.id}`,
        { nombre: newNombre.trim(), level: newLevel },
        { headers: { Authorization: `Bearer ${user.token}` } },
      );

      // Update local state without reloading
      setModalities((prevModalities) =>
        prevModalities.map((modality) =>
          modality.id === category.modality_id
            ? {
                ...modality,
                categories: modality.categories.map((cat) =>
                  cat.id === category.id ? response.data : cat
                ),
              }
            : modality
        )
      );

      // Restore scroll position after state update
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo editar la categoría."));
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-blue-400">
            Estructura del campeonato
          </p>
          <h2 className="text-2xl font-bold text-white">Modalidades y Categorías</h2>
          <p className="mt-1 text-sm text-slate-400">
            Define las categorías reales por modalidad y el nivel que usarán para recategorización.
          </p>
        </div>
        <button
          className="touch-button bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 sm:w-auto sm:min-w-56"
          onClick={handleAddModality}
          type="button"
        >
          + Añadir Nueva Modalidad
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
          <div className="text-center">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500"></div>
            <p className="text-sm text-slate-400">Cargando...</p>
          </div>
        </div>
      )}

      {!isLoading && sortedModalities.length === 0 && !errorMessage && (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center">
          <p className="mb-2 text-lg font-semibold text-slate-300">Sin modalidades</p>
          <p className="mb-6 text-sm text-slate-500">
            Comienza creando una modalidad usando el botón superior.
          </p>
          <button
            className="touch-button bg-blue-600 text-white hover:bg-blue-500 sm:w-auto sm:min-w-56"
            onClick={handleAddModality}
            type="button"
          >
            + Añadir Nueva Modalidad
          </button>
        </div>
      )}

      {!isLoading && sortedModalities.length > 0 && (
        <div className="space-y-4">
          {sortedModalities.map((modality) => (
            <article key={modality.id} className="panel overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                    M
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-white">{modality.nombre}</h3>
                    <p className="text-xs text-slate-500">
                      {modality.categories.length} categoría{modality.categories.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border border-emerald-600/40 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-600/30"
                    onClick={() => handleAddCategory(modality.id)}
                    type="button"
                  >
                    + Añadir Categoría
                  </button>
                  <button
                    className="rounded-xl border border-rose-600/40 bg-rose-600/20 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-600/30"
                    onClick={() => handleDeleteModality(modality.id)}
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="p-5">
                {modality.categories.length === 0 ? (
                  <p className="text-sm italic text-slate-500">
                    Sin categorías. Haz clic en "+ Añadir Categoría" para comenzar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {modality.categories.map((category) => (
                      <div key={category.id} className="rounded-xl bg-slate-950/50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-sm font-semibold text-slate-200">
                              C
                            </span>
                            <h4 className="text-lg font-semibold text-white">{category.nombre}</h4>
                            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                              Nivel {category.level}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="rounded-lg border border-blue-600/30 bg-blue-600/10 px-3 py-1.5 text-xs font-medium text-blue-300 transition hover:bg-blue-600/20"
                              onClick={() => handleEditCategory(category)}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-lg border border-rose-600/30 bg-rose-600/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition hover:bg-rose-600/20"
                              onClick={() => handleDeleteCategory(category.id)}
                              type="button"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>

                        <p className="mt-3 pl-10 text-xs italic text-slate-500">
                          El nivel es dinámico y depende del reglamento de esta modalidad. Puedes
                          usar 1, 2, 3, 4, 5 o más según cuántas categorías existan.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
