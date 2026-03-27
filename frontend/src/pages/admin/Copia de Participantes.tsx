import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";


type Participant = {
  id: number;
  nombre_competidor: string;
  auto_marca_modelo: string;
  modalidad: string;
  categoria: string;
  placa_matricula: string;
};

type UploadResponse = {
  created_count: number;
  skipped_count: number;
  total_rows: number;
};

type ManualParticipantForm = {
  nombre_competidor: string;
  auto_marca_modelo: string;
  placa_matricula: string;
};

type CategoryAssignment = {
  id: string;
  modalidad: string;
  categoria: string;
};


const OFFICIAL_MODALIDADES = [
  "SPL",
  "SQ",
  "SQL",
  "Street Show",
  "Tuning",
];

const OFFICIAL_CATEGORIAS = [
  "Intro",
  "Aficionado",
  "Pro",
  "Master",
  "Street",
  "Custom",
];


const initialManualForm: ManualParticipantForm = {
  nombre_competidor: "",
  auto_marca_modelo: "",
  placa_matricula: "",
};


export default function ParticipantesPage() {
  const { user } = useAuth();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
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

  useEffect(() => {
    void loadParticipants();
  }, []);

  async function loadParticipants() {
    if (!user?.token) {
      return;
    }

    setIsLoadingList(true);
    setListMessage("");

    try {
      const response = await api.get<Participant[]>("/api/participants", {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });
      setParticipants(response.data);
    } catch (error) {
      setListMessage(
        getApiErrorMessage(error, "No se pudo cargar el listado de participantes."),
      );
    } finally {
      setIsLoadingList(false);
    }
  }

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

    setIsUploading(true);
    setUploadMessage("");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await api.post<UploadResponse>("/api/participants/upload", formData, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      setUploadMessage(
        `Carga completada: ${response.data.created_count} creados, ${response.data.skipped_count} omitidos de ${response.data.total_rows} filas.`,
      );
      setSelectedFile(null);
      await loadParticipants();
    } catch (error) {
      setUploadError(
        getApiErrorMessage(error, "No se pudo subir el archivo seleccionado."),
      );
    } finally {
      setIsUploading(false);
    }
  }

  function updateManualField(
    field: keyof ManualParticipantForm,
    value: string,
  ) {
    setManualForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function addAssignment() {
    if (!selectedModalidad || !selectedCategoria) {
      setManualError("Selecciona una modalidad y una categor&iacute;a antes de a&ntilde;adir.");
      setManualMessage("");
      return;
    }

    const alreadyExists = assignments.some(
      (item) =>
        item.modalidad === selectedModalidad && item.categoria === selectedCategoria,
    );

    if (alreadyExists) {
      setManualError("Esa combinaci&oacute;n ya fue agregada al competidor.");
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
    if (!user?.token) {
      return;
    }

    setIsSavingManual(true);
    setManualMessage("");
    setManualError("");

    if (assignments.length === 0) {
      setManualError(
        "A&ntilde;ade al menos una combinaci&oacute;n de modalidad y categor&iacute;a antes de guardar.",
      );
      setIsSavingManual(false);
      return;
    }

    const uniqueModalidades = Array.from(
      new Set(assignments.map((item) => item.modalidad)),
    );
    const assignmentLabels = assignments.map(
      (item) => `${item.modalidad} - ${item.categoria}`,
    );
    const payload =
      assignments.length === 1
        ? {
            ...manualForm,
            modalidad: assignments[0].modalidad,
            categoria: assignments[0].categoria,
          }
        : {
            ...manualForm,
            modalidad: uniqueModalidades.join(", "),
            categoria: assignmentLabels.join(", "),
          };

    try {
      await api.post("/api/participants", payload, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      setManualMessage("Participante registrado correctamente.");
      setManualForm(initialManualForm);
      setAssignments([]);
      setSelectedModalidad("");
      setSelectedCategoria("");
      setShowManualForm(false);
      await loadParticipants();
    } catch (error) {
      setManualError(
        getApiErrorMessage(error, "No se pudo registrar el participante manualmente."),
      );
    } finally {
      setIsSavingManual(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-4">
        <article className="panel p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <p className="text-sm font-medium text-brand-200">Carga Masiva</p>
            <h2 className="section-title">Importar participantes</h2>
            <p className="text-sm leading-6 text-slate-300">
              Selecciona un archivo para registrar varios competidores en una sola
              acci&oacute;n. El backend actual procesa principalmente archivos
              <span className="font-semibold text-white"> .xlsx</span>.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleUpload}>
            <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-brand-400/40 bg-brand-400/5 px-5 py-6 text-center transition hover:border-brand-300 hover:bg-brand-400/10">
              <span className="text-base font-semibold text-white">
                {selectedFile ? selectedFile.name : "Toca aqu&iacute; para elegir un archivo"}
              </span>
              <span className="mt-2 text-sm text-slate-300">
                Formatos permitidos: .xlsx, .csv
              </span>
              <input
                accept=".xlsx,.csv"
                className="hidden"
                onChange={handleFileChange}
                type="file"
              />
            </label>

            {uploadMessage ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {uploadMessage}
              </div>
            ) : null}

            {uploadError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {uploadError}
              </div>
            ) : null}

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
              <h2 className="section-title">A&ntilde;adir participante manual</h2>
              <p className="text-sm leading-6 text-slate-300">
                Registra un competidor individual desde el panel sin depender del
                archivo Excel.
              </p>
            </div>

            <button
              className="touch-button bg-white text-slate-950 shadow-lg shadow-slate-950/20 sm:w-auto sm:min-w-56"
              onClick={() => {
                setShowManualForm((current) => !current);
                setManualError("");
                setManualMessage("");
                setSelectedModalidad("");
                setSelectedCategoria("");
              }}
              type="button"
            >
              {showManualForm ? "Cerrar formulario" : "A&ntilde;adir Participante Manual"}
            </button>
          </div>

          {showManualForm ? (
            <form className="grid gap-4" onSubmit={handleCreateManualParticipant}>
              <input
                className="touch-input"
                onChange={(event) => updateManualField("nombre_competidor", event.target.value)}
                placeholder="Nombre del competidor"
                value={manualForm.nombre_competidor}
              />
              <input
                className="touch-input"
                onChange={(event) => updateManualField("auto_marca_modelo", event.target.value)}
                placeholder="Marca y modelo del auto"
                value={manualForm.auto_marca_modelo}
              />

              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="mb-4">
                  <p className="text-sm font-medium text-white">
                    Modalidades y categor&iacute;as del competidor
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Selecciona una modalidad y una categor&iacute;a oficial, luego
                    a&ntilde;&aacute;dela a la lista antes de guardar.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <select
                    className="touch-input appearance-none"
                    onChange={(event) => setSelectedModalidad(event.target.value)}
                    value={selectedModalidad}
                  >
                    <option value="">Selecciona modalidad</option>
                    {OFFICIAL_MODALIDADES.map((modalidad) => (
                      <option key={modalidad} value={modalidad}>
                        {modalidad}
                      </option>
                    ))}
                  </select>

                  <select
                    className="touch-input appearance-none"
                    onChange={(event) => setSelectedCategoria(event.target.value)}
                    value={selectedCategoria}
                  >
                    <option value="">Selecciona categor&iacute;a</option>
                    {OFFICIAL_CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>

                  <button
                    className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 sm:w-auto sm:min-w-56"
                    onClick={addAssignment}
                    type="button"
                  >
                    A&ntilde;adir a sus categor&iacute;as
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {assignments.length === 0 ? (
                    <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                      A&uacute;n no hay categor&iacute;as a&ntilde;adidas
                    </span>
                  ) : (
                    assignments.map((item) => (
                      <button
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full border border-brand-400/30 bg-brand-400/10 px-3 py-2 text-xs font-semibold text-brand-100"
                        onClick={() => removeAssignment(item.id)}
                        type="button"
                      >
                        <span>{item.modalidad} - {item.categoria}</span>
                        <span className="text-brand-200">x</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <input
                className="touch-input"
                onChange={(event) => updateManualField("placa_matricula", event.target.value)}
                placeholder="Placa"
                value={manualForm.placa_matricula}
              />

              {manualMessage ? (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {manualMessage}
                </div>
              ) : null}

              {manualError ? (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {manualError}
                </div>
              ) : null}

              <button
                className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={
                  isSavingManual ||
                  Object.values(manualForm).some((value) => !value.trim())
                }
                type="submit"
              >
                {isSavingManual ? "Guardando..." : "Guardar participante"}
              </button>
            </form>
          ) : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm leading-6 text-slate-300">
              Usa el bot&oacute;n superior para desplegar el formulario y registrar
              un nuevo participante manualmente.
            </div>
          )}
        </article>
      </section>

      <section className="panel p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-200">Base de Datos</p>
            <h2 className="section-title">Participantes registrados</h2>
          </div>

          <button
            className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
            onClick={() => void loadParticipants()}
            type="button"
          >
            Recargar
          </button>
        </div>

        {listMessage ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {listMessage}
          </div>
        ) : null}

        {isLoadingList ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            Cargando participantes...
          </div>
        ) : participants.length === 0 ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-300">
            A&uacute;n no hay participantes registrados.
          </div>
        ) : (
          <div className="space-y-3">
            {participants.map((participant) => (
              <article
                key={participant.id}
                className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {participant.nombre_competidor}
                    </h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {participant.auto_marca_modelo}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-brand-500/15 px-3 py-1 text-xs font-semibold text-brand-100">
                      {participant.modalidad}
                    </span>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
                      {participant.categoria}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 text-sm text-slate-300">
                  <span>ID #{participant.id}</span>
                  <span className="font-medium text-slate-100">
                    Placa: {participant.placa_matricula}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
