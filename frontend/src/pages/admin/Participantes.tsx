import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";

function buildAssignmentId(modalidad: string, categoria: string, index: number) {
  return `${modalidad}-${categoria}-${index}`;
}

function parseParticipantAssignments(participant: Pick<Participant, "modalidad" | "categoria">) {
  const modalidades = participant.modalidad
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const categorias = participant.categoria
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const parsedAssignments = categorias
    .map((value, index) => {
      const separatorIndex = value.indexOf(" - ");
      if (separatorIndex >= 0) {
        const modalidad = value.slice(0, separatorIndex).trim();
        const categoria = value.slice(separatorIndex + 3).trim();
        if (modalidad && categoria) {
          return {
            id: buildAssignmentId(modalidad, categoria, index),
            modalidad,
            categoria,
          };
        }
      }

      const fallbackModalidad = modalidades.length === 1 ? modalidades[0] : modalidades[index];
      if (fallbackModalidad && value) {
        return {
          id: buildAssignmentId(fallbackModalidad, value, index),
          modalidad: fallbackModalidad,
          categoria: value,
        };
      }

      return null;
    })
    .filter((item): item is CategoryAssignment => item !== null);

  if (parsedAssignments.length > 0) {
    return parsedAssignments;
  }

  if (modalidades.length === 1 && categorias.length === 1) {
    return [
      {
        id: buildAssignmentId(modalidades[0], categorias[0], 0),
        modalidad: modalidades[0],
        categoria: categorias[0],
      },
    ];
  }

  return [];
}

type Evento = {
  id: number;
  nombre: string;
  is_active: boolean;
};

type Participant = {
  id: number;
  nombres_apellidos: string;
  marca_modelo: string;
  dni?: string | null;
  telefono?: string | null;
  correo?: string | null;
  club_team?: string | null;
  modalidad: string;
  categoria: string;
  placa_rodaje: string;
  evento_id: number;
};

type UploadResponse = {
  created_count: number;
  skipped_count: number;
  total_rows: number;
};

type ManualParticipantForm = {
  nombres_apellidos: string;
  marca_modelo: string;
  placa_rodaje: string;
  dni: string;
  telefono: string;
  correo: string;
  club_team: string;
};

type CategoryAssignment = {
  id: string;
  modalidad: string;
  categoria: string;
};

// Type for modalities from API
type CategoryFromAPI = {
  id: number;
  nombre: string;
};

type ModalityFromAPI = {
  id: number;
  nombre: string;
  categories: CategoryFromAPI[];
};

const initialManualForm: ManualParticipantForm = {
  nombres_apellidos: "",
  marca_modelo: "",
  placa_rodaje: "",
  dni: "",
  telefono: "",
  correo: "",
  club_team: "",
};

export default function ParticipantesPage() {
  const { user } = useAuth();

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventoId, setEventoId] = useState<string>("");

  // Modalities and categories from API
  const [modalities, setModalities] = useState<ModalityFromAPI[]>([]);
  const [isLoadingModalities, setIsLoadingModalities] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [listMessage, setListMessage] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState<ManualParticipantForm>(initialManualForm);
  const [selectedModalidad, setSelectedModalidad] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("");
  const [assignments, setAssignments] = useState<CategoryAssignment[]>([]);
  const [manualMessage, setManualMessage] = useState("");
  const [manualError, setManualError] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);

  const [editingParticipantId, setEditingParticipantId] = useState<number | null>(null);
  const [editingParticipantData, setEditingParticipantData] = useState<Partial<Participant>>({});
  const [editSelectedModalidad, setEditSelectedModalidad] = useState("");
  const [editSelectedCategoria, setEditSelectedCategoria] = useState("");
  const [editingAssignments, setEditingAssignments] = useState<CategoryAssignment[]>([]);
  const [isSavingParticipant, setIsSavingParticipant] = useState(false);
  const [participantEditError, setParticipantEditError] = useState("");

  // Search and delete states
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  // 1. Cargar la lista de eventos al entrar
  useEffect(() => {
    async function loadEventos() {
      if (!user?.token) return;
      try {
        const response = await api.get<Evento[]>("/api/events", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setEventos(response.data.filter((ev) => ev.is_active));
      } catch (error) {
        console.error("Error al cargar eventos");
      }
    }
    void loadEventos();
  }, [user]);

  // Load modalities from API
  useEffect(() => {
    async function loadModalities() {
      if (!user?.token) return;
      setIsLoadingModalities(true);
      try {
        const response = await api.get<ModalityFromAPI[]>("/api/modalities", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setModalities(response.data);
      } catch (error) {
        console.error("Error loading modalities:", error);
      } finally {
        setIsLoadingModalities(false);
      }
    }
    void loadModalities();
  }, [user]);

  // 2. Cargar participantes cuando seleccionas un evento
  useEffect(() => {
    async function loadParticipants() {
      if (!user?.token || !eventoId) {
        setParticipants([]);
        return;
      }
      setIsLoadingList(true);
      setListMessage("");
      try {
        const response = await api.get<Participant[]>(`/api/participants?evento_id=${eventoId}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setParticipants(response.data);
      } catch (error) {
        setListMessage(getApiErrorMessage(error, "No se pudo cargar el listado de participantes."));
      } finally {
        setIsLoadingList(false);
      }
    }
    void loadParticipants();
  }, [eventoId, user]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadMessage("");
    setUploadError("");
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !user?.token) {
      setUploadError("Selecciona un archivo para iniciar la carga.");
      return;
    }
    if (!eventoId) {
      setUploadError("⚠️ Debes seleccionar un Evento arriba antes de subir el archivo.");
      return;
    }

    setIsUploading(true);
    setUploadMessage("");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("evento_id", eventoId); // ¡AQUÍ ESTÁ LA MAGIA PARA QUITAR EL 422!

    try {
      const response = await api.post<UploadResponse>("/api/participants/upload", formData, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setUploadMessage(
        `Carga completada: ${response.data.created_count} creados, ${response.data.skipped_count} omitidos de ${response.data.total_rows} filas.`
      );
      setSelectedFile(null);
      // Forzar recarga de tabla
      const refresh = await api.get<Participant[]>(`/api/participants?evento_id=${eventoId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setParticipants(refresh.data);
    } catch (error) {
      setUploadError(getApiErrorMessage(error, "No se pudo subir el archivo seleccionado."));
    } finally {
      setIsUploading(false);
    }
  }

  function updateManualField(field: keyof ManualParticipantForm, value: string) {
    setManualForm((current) => ({ ...current, [field]: value }));
  }

  function addAssignment() {
    if (!selectedModalidad || !selectedCategoria) {
      setManualError("Selecciona una modalidad y una categoría antes de añadir.");
      setManualMessage("");
      return;
    }

    const alreadyExists = assignments.some(
      (item) => item.modalidad === selectedModalidad && item.categoria === selectedCategoria,
    );

    if (alreadyExists) {
      setManualError("Esa combinación ya fue agregada al competidor.");
      setManualMessage("");
      return;
    }

    setAssignments((current) => [
      ...current,
      {
        id: `${selectedModalidad}-${selectedCategoria}-${Date.now()}`,
        modalidad: selectedModalidad,
        categoria: selectedCategoria,
      },
    ]);
    setSelectedModalidad("");
    setSelectedCategoria("");
    setManualError("");
  }

  function removeAssignment(assignmentId: string) {
    setAssignments((current) => current.filter((item) => item.id !== assignmentId));
  }

  async function handleCreateManualParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.token) return;
    if (!eventoId) {
      setManualError("Selecciona un evento primero.");
      return;
    }

    setIsSavingManual(true);
    setManualMessage("");
    setManualError("");

    if (assignments.length === 0) {
      setManualError("Añade al menos una combinación de modalidad y categoría antes de guardar.");
      setIsSavingManual(false);
      return;
    }

    const uniqueModalidades = Array.from(new Set(assignments.map((item) => item.modalidad)));
    const assignmentLabels = assignments.map((item) => `${item.modalidad} - ${item.categoria}`);
    
    const payload = assignments.length === 1
      ? { ...manualForm, modalidad: assignments[0].modalidad, categoria: assignments[0].categoria, evento_id: Number(eventoId) }
      : { ...manualForm, modalidad: uniqueModalidades.join(", "), categoria: assignmentLabels.join(", "), evento_id: Number(eventoId) };

    try {
      await api.post("/api/participants", payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setManualMessage("Participante registrado correctamente.");
      setManualForm(initialManualForm);
      setAssignments([]);
      setShowManualForm(false);
      
      const refresh = await api.get<Participant[]>(`/api/participants?evento_id=${eventoId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setParticipants(refresh.data);
    } catch (error) {
      setManualError(getApiErrorMessage(error, "No se pudo registrar el participante manualmente."));
    } finally {
      setIsSavingManual(false);
    }
  }

  function startEditingParticipant(participant: Participant) {
    const nextAssignments = parseParticipantAssignments(participant);
    setEditingParticipantId(participant.id);
    setEditingParticipantData({
      nombres_apellidos: participant.nombres_apellidos,
      marca_modelo: participant.marca_modelo,
      placa_rodaje: participant.placa_rodaje,
      dni: participant.dni ?? "",
      telefono: participant.telefono ?? "",
      correo: participant.correo ?? "",
      club_team: participant.club_team ?? "",
    });
    setEditingAssignments(nextAssignments);
    setEditSelectedModalidad("");
    setEditSelectedCategoria("");
    setParticipantEditError("");
  }

  function cancelEditingParticipant() {
    setEditingParticipantId(null);
    setEditingParticipantData({});
    setEditSelectedModalidad("");
    setEditSelectedCategoria("");
    setEditingAssignments([]);
    setParticipantEditError("");
  }

  function updateEditingParticipantField(field: keyof Participant, value: string) {
    setEditingParticipantData((current) => ({ ...current, [field]: value }));
  }

  function addEditingAssignment() {
    if (!editSelectedModalidad || !editSelectedCategoria) {
      setParticipantEditError("Selecciona una modalidad y una categoría antes de añadir.");
      return;
    }

    const alreadyExists = editingAssignments.some(
      (item) => item.modalidad === editSelectedModalidad && item.categoria === editSelectedCategoria,
    );

    if (alreadyExists) {
      setParticipantEditError("Esa combinación ya fue agregada al competidor.");
      return;
    }

    setEditingAssignments((current) => [
      ...current,
      {
        id: buildAssignmentId(editSelectedModalidad, editSelectedCategoria, Date.now()),
        modalidad: editSelectedModalidad,
        categoria: editSelectedCategoria,
      },
    ]);
    setEditSelectedModalidad("");
    setEditSelectedCategoria("");
    setParticipantEditError("");
  }

  function removeEditingAssignment(assignmentId: string) {
    setEditingAssignments((current) => current.filter((item) => item.id !== assignmentId));
  }

  async function handleUpdateParticipant(participantId: number) {
    if (!user?.token) {
      return;
    }

    const trimmedName = editingParticipantData.nombres_apellidos?.trim();
    const trimmedMarca = editingParticipantData.marca_modelo?.trim();
    const trimmedPlaca = editingParticipantData.placa_rodaje?.trim();

    if (!trimmedName) {
      setParticipantEditError("El nombre no puede estar vacío.");
      return;
    }
    if (!trimmedMarca) {
      setParticipantEditError("La marca y modelo no pueden estar vacíos.");
      return;
    }
    if (!trimmedPlaca) {
      setParticipantEditError("La placa no puede estar vacía.");
      return;
    }
    if (editingAssignments.length === 0) {
      setParticipantEditError("Añade al menos una combinación de modalidad y categoría antes de guardar.");
      return;
    }

    setIsSavingParticipant(true);
    setParticipantEditError("");

    const uniqueModalidades = Array.from(new Set(editingAssignments.map((item) => item.modalidad)));
    const assignmentLabels = editingAssignments.map(
      (item) => `${item.modalidad} - ${item.categoria}`,
    );

    const payload = {
      nombres_apellidos: trimmedName,
      marca_modelo: trimmedMarca,
      placa_rodaje: trimmedPlaca,
      modalidad:
        editingAssignments.length === 1
          ? editingAssignments[0].modalidad
          : uniqueModalidades.join(", "),
      categoria:
        editingAssignments.length === 1
          ? editingAssignments[0].categoria
          : assignmentLabels.join(", "),
      dni: editingParticipantData.dni?.trim() || null,
      telefono: editingParticipantData.telefono?.trim() || null,
      correo: editingParticipantData.correo?.trim() || null,
      club_team: editingParticipantData.club_team?.trim() || null,
      evento_id: Number(eventoId),
    };

    try {
      await api.put(`/api/participants/${participantId}`, payload, {
        headers: { Authorization: `Bearer ${user.token}` },
      });

      setEditingParticipantId(null);
      setEditingParticipantData({});
      setEditSelectedModalidad("");
      setEditSelectedCategoria("");
      setEditingAssignments([]);

      // Recargar listado manteniendo el evento seleccionado
      if (eventoId) {
        setIsLoadingList(true);
        try {
          const refresh = await api.get<Participant[]>(
            `/api/participants?evento_id=${eventoId}`,
            {
              headers: { Authorization: `Bearer ${user.token}` },
            },
          );
          setParticipants(refresh.data);
        } catch (error) {
          setListMessage(getApiErrorMessage(error, "No se pudo recargar participantes."));
        } finally {
          setIsLoadingList(false);
        }
      }
    } catch (error) {
      setParticipantEditError(
        getApiErrorMessage(error, "No se pudo actualizar el participante."),
      );
    } finally {
      setIsSavingParticipant(false);
    }
  }

  // Filter participants based on search term
  const filteredParticipants = participants.filter((participant) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      participant.nombres_apellidos.toLowerCase().includes(term) ||
      participant.placa_rodaje.toLowerCase().includes(term) ||
      (participant.dni?.toLowerCase() || "").includes(term) ||
      participant.marca_modelo.toLowerCase().includes(term)
    );
  });

  async function handleDelete(id: number) {
    if (!user?.token) return;

    const confirmed = window.confirm("¿Estás seguro de eliminar este participante?");
    if (!confirmed) return;

    setIsDeleting(id);
    try {
      await api.delete(`/api/participants/${id}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      // Reload the list
      if (eventoId) {
        const refresh = await api.get<Participant[]>(
          `/api/participants?evento_id=${eventoId}`,
          { headers: { Authorization: `Bearer ${user.token}` } }
        );
        setParticipants(refresh.data);
      }
    } catch (error) {
      setListMessage(getApiErrorMessage(error, "No se pudo eliminar el participante."));
    } finally {
      setIsDeleting(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      
      {/* NUEVO: SELECTOR DE EVENTO SUPERIOR */}
      <section className="col-span-full mb-2">
        <article className="panel p-5 sm:p-6 border-b-4 border-brand-500">
          <p className="text-sm font-medium text-brand-200">Contexto del Sistema</p>
          <h2 className="section-title mb-4">Selecciona el Evento Activo</h2>
          <select
            className="touch-input w-full lg:w-1/2 bg-slate-900 border-brand-400 text-white font-bold text-lg"
            value={eventoId}
            onChange={(e) => setEventoId(e.target.value)}
          >
            <option value="">-- Por favor selecciona un evento --</option>
            {eventos.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </article>
      </section>

      <section className={`space-y-4 ${!eventoId ? 'opacity-30 pointer-events-none' : ''}`}>
        <article className="panel p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <p className="text-sm font-medium text-brand-200">Carga Masiva</p>
            <h2 className="section-title">Importar participantes</h2>
            <p className="text-sm leading-6 text-slate-300">
              Selecciona un archivo para registrar varios competidores en una sola
              acción. El backend actual procesa principalmente archivos
              <span className="font-semibold text-white"> .xlsx</span>.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleUpload}>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-brand-400/40 bg-brand-400/5 px-5 py-6 text-center transition hover:border-brand-300 hover:bg-brand-400/10">
              <span className="text-base font-semibold text-white">
                {selectedFile ? selectedFile.name : "Toca aquí para elegir un archivo"}
              </span>
              <span className="mt-2 text-sm text-slate-300">
                Formatos permitidos: .xlsx, .csv
              </span>
              <input accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} type="file" />
            </label>

            {uploadMessage && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{uploadMessage}</div>}
            {uploadError && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{uploadError}</div>}

            <button
              className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isUploading || !selectedFile}
              type="submit"
            >
              {isUploading ? "Subiendo archivo..." : "Subir archivo"}
            </button>
          </form>
        </article>

        <article className="panel p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-brand-200">Registro Manual</p>
              <h2 className="section-title">Añadir participante manual</h2>
              <p className="text-sm leading-6 text-slate-300">Registra un competidor individual desde el panel sin depender del Excel.</p>
            </div>
            <button
              className="touch-button bg-white text-slate-950 shadow-lg shadow-slate-950/20 sm:w-auto sm:min-w-56"
              onClick={() => { setShowManualForm(!showManualForm); setManualError(""); setManualMessage(""); setSelectedModalidad(""); setSelectedCategoria(""); }}
              type="button"
            >
              {showManualForm ? "Cerrar formulario" : "Añadir Participante Manual"}
            </button>
          </div>

          {showManualForm ? (
            <form className="grid gap-4" onSubmit={handleCreateManualParticipant}>
              <input
                className="touch-input"
                onChange={(e) => updateManualField("nombres_apellidos", e.target.value)}
                placeholder="Nombres y apellidos"
                value={manualForm.nombres_apellidos}
              />
              <input
                className="touch-input"
                onChange={(e) => updateManualField("marca_modelo", e.target.value)}
                placeholder="Marca y modelo"
                value={manualForm.marca_modelo}
              />

              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="mb-4">
                  <p className="text-sm font-medium text-white">Modalidades y categorías del competidor</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <select 
                    className="touch-input appearance-none" 
                    onChange={(e) => setSelectedModalidad(e.target.value)} 
                    value={selectedModalidad}
                    disabled={isLoadingModalities}
                  >
                    <option value="">{isLoadingModalities ? "Cargando..." : "Selecciona modalidad"}</option>
                    {modalities.map((mod) => <option key={mod.id} value={mod.nombre}>{mod.nombre}</option>)}
                  </select>
                  <select 
                    className="touch-input appearance-none" 
                    onChange={(e) => setSelectedCategoria(e.target.value)} 
                    value={selectedCategoria}
                    disabled={!selectedModalidad}
                  >
                    <option value="">{!selectedModalidad ? "Selecciona modalidad primero" : "Selecciona categoría"}</option>
                    {selectedModalidad && modalities
                      .find((m) => m.nombre === selectedModalidad)?.categories.map((cat) => (
                        <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                      ))}
                  </select>
                  <button className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 sm:w-auto sm:min-w-56" onClick={addAssignment} type="button">Añadir</button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {assignments.length === 0 ? <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">Sin categorías añadidas</span> : assignments.map((item) => (
                    <button key={item.id} className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-xs font-semibold text-brand-100" onClick={() => removeAssignment(item.id)} type="button">
                      <span>{item.modalidad} - {item.categoria}</span><span className="text-brand-200">x</span>
                    </button>
                  ))}
                </div>
              </div>

              <input
                className="touch-input"
                onChange={(e) => updateManualField("placa_rodaje", e.target.value)}
                placeholder="Placa de rodaje"
                value={manualForm.placa_rodaje}
              />

              <input
                className="touch-input"
                onChange={(e) => updateManualField("dni", e.target.value)}
                placeholder="DNI (opcional)"
                value={manualForm.dni}
              />
              <input
                className="touch-input"
                onChange={(e) => updateManualField("telefono", e.target.value)}
                placeholder="Teléfono (opcional)"
                value={manualForm.telefono}
              />
              <input
                className="touch-input"
                onChange={(e) => updateManualField("correo", e.target.value)}
                placeholder="Correo (opcional)"
                value={manualForm.correo}
              />
              <input
                className="touch-input"
                onChange={(e) => updateManualField("club_team", e.target.value)}
                placeholder="Club/Team (opcional)"
                value={manualForm.club_team}
              />

              {manualMessage && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{manualMessage}</div>}
              {manualError && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{manualError}</div>}

              <button
                className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isSavingManual ||
                  !manualForm.nombres_apellidos.trim() ||
                  !manualForm.marca_modelo.trim() ||
                  !manualForm.placa_rodaje.trim()
                }
                type="submit"
              >
                {isSavingManual ? "Guardando..." : "Guardar participante"}
              </button>
            </form>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm leading-6 text-slate-300">Usa el botón superior para desplegar el formulario.</div>
          )}
        </article>
      </section>

      <section className={`panel p-5 sm:p-6 ${!eventoId ? 'opacity-30 pointer-events-none' : ''}`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-200">Base de Datos</p>
            <h2 className="section-title">Participantes registrados</h2>
          </div>
        </div>

        {/* Search input */}
        <div className="mb-4">
          <input
            className="touch-input w-full"
            placeholder="🔍 Buscar por nombre, DNI o placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {listMessage && <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{listMessage}</div>}
        {isLoadingList ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">Cargando participantes...</div>
        ) : filteredParticipants.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            {searchTerm ? "No se encontraron participantes con ese criterio de búsqueda." : "Aún no hay participantes registrados en este evento."}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredParticipants.map((participant) => (
              <article key={participant.id} className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{participant.nombres_apellidos}</h3>
                    <p className="mt-1 text-sm text-slate-300">{participant.marca_modelo}</p>
                    {participant.club_team ? (
                      <p className="mt-1 text-sm text-brand-200">Club/Team: {participant.club_team}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-100">{participant.modalidad}</span>
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">{participant.categoria}</span>
                    </div>
                    {/* Edit/Delete buttons */}
                    <div className="flex gap-2">
                      <button
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition"
                        onClick={() => startEditingParticipant(participant)}
                        type="button"
                      >
                        Editar
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        className="text-xs font-medium text-rose-400 hover:text-rose-300 transition"
                        onClick={() => void handleDelete(participant.id)}
                        disabled={isDeleting === participant.id}
                        type="button"
                      >
                        {isDeleting === participant.id ? "Eliminando..." : "Eliminar"}
                      </button>
                    </div>
                  </div>
                </div>

                {editingParticipantId === participant.id ? (
                  <div className="mt-4 space-y-3 rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="touch-input"
                        value={editingParticipantData.nombres_apellidos || ""}
                        onChange={(e) => updateEditingParticipantField("nombres_apellidos", e.target.value)}
                        placeholder="Nombres y apellidos"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.marca_modelo || ""}
                        onChange={(e) => updateEditingParticipantField("marca_modelo", e.target.value)}
                        placeholder="Marca y modelo"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.placa_rodaje || ""}
                        onChange={(e) => updateEditingParticipantField("placa_rodaje", e.target.value)}
                        placeholder="Placa de rodaje"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.dni || ""}
                        onChange={(e) => updateEditingParticipantField("dni", e.target.value)}
                        placeholder="DNI (opcional)"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.telefono || ""}
                        onChange={(e) => updateEditingParticipantField("telefono", e.target.value)}
                        placeholder="Teléfono (opcional)"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.correo || ""}
                        onChange={(e) => updateEditingParticipantField("correo", e.target.value)}
                        placeholder="Correo (opcional)"
                      />
                      <input
                        className="touch-input"
                        value={editingParticipantData.club_team || ""}
                        onChange={(e) => updateEditingParticipantField("club_team", e.target.value)}
                        placeholder="Club/Team (opcional)"
                      />
                    </div>

                    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                      <div className="mb-4">
                        <p className="text-sm font-medium text-white">Modalidades y categorías del competidor</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                        <select
                          className="touch-input appearance-none"
                          onChange={(e) => setEditSelectedModalidad(e.target.value)}
                          value={editSelectedModalidad}
                          disabled={isLoadingModalities}
                        >
                          <option value="">{isLoadingModalities ? "Cargando..." : "Selecciona modalidad"}</option>
                          {modalities.map((mod) => <option key={mod.id} value={mod.nombre}>{mod.nombre}</option>)}
                        </select>
                        <select
                          className="touch-input appearance-none"
                          onChange={(e) => setEditSelectedCategoria(e.target.value)}
                          value={editSelectedCategoria}
                          disabled={!editSelectedModalidad}
                        >
                          <option value="">{!editSelectedModalidad ? "Selecciona modalidad primero" : "Selecciona categoría"}</option>
                          {editSelectedModalidad && modalities
                            .find((m) => m.nombre === editSelectedModalidad)?.categories.map((cat) => (
                              <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                            ))}
                        </select>
                        <button
                          className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 sm:w-auto sm:min-w-56"
                          onClick={addEditingAssignment}
                          type="button"
                        >
                          Añadir
                        </button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {editingAssignments.length === 0 ? <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">Sin categorías añadidas</span> : editingAssignments.map((item) => (
                          <button key={item.id} className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-xs font-semibold text-brand-100" onClick={() => removeEditingAssignment(item.id)} type="button">
                            <span>{item.modalidad} - {item.categoria}</span><span className="text-brand-200">x</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={
                          isSavingParticipant ||
                          !editingParticipantData.nombres_apellidos?.trim() ||
                          !editingParticipantData.marca_modelo?.trim() ||
                          !editingParticipantData.placa_rodaje?.trim() ||
                          editingAssignments.length === 0
                        }
                        onClick={() => void handleUpdateParticipant(participant.id)}
                        type="button"
                      >
                        {isSavingParticipant ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button
                        className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                        onClick={cancelEditingParticipant}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>

                    {participantEditError ? (
                      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {participantEditError}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-300">
                    <span>ID #{participant.id}</span>
                    <span className="font-medium text-slate-100">Placa: {participant.placa_rodaje}</span>
                    {participant.dni && <span className="text-slate-400">DNI: {participant.dni}</span>}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}