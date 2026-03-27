import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";

type UserRecord = {
  id: number;
  username: string;
  role: "admin" | "juez";
  can_edit_scores: boolean;
  modalidades_asignadas?: string[];
};

type JudgeAssignmentRecord = {
  id: number;
  user_id: number;
  user_username?: string | null;
  modality_id: number;
  modality_name?: string | null;
  assigned_sections: string[];
  is_principal: boolean;
};

type MasterTemplateItem = {
  item_id?: string;
  label?: string;
  evaluation_type?: string;
  points?: number;
};

type MasterTemplateSection = {
  section_id?: string;
  section_title?: string;
  items?: MasterTemplateItem[];
};

type MasterTemplateRecord = {
  id: number;
  modality_id: number;
  modality_name: string;
  content: {
    sections?: MasterTemplateSection[];
    bonifications?: {
      section_id?: string;
      items?: MasterTemplateItem[];
    };
  };
};

type SectionOption = {
  id: string;
  label: string;
};

type ModalityRecord = {
  id: number;
  nombre: string;
  categories: Array<{
    id: number;
    nombre: string;
    level: number;
  }>;
};

function getBonusSectionId(template: MasterTemplateRecord | undefined): string | null {
  const sectionId = template?.content.bonifications?.section_id;
  return typeof sectionId === "string" && sectionId.trim() ? sectionId.trim() : null;
}

function extractSectionOptions(template: MasterTemplateRecord | undefined): SectionOption[] {
  if (!template) return [];

  const sections: SectionOption[] = [];

  (template.content.sections ?? []).forEach((section) => {
    if (typeof section.section_id === "string" && section.section_id.trim()) {
      sections.push({
        id: section.section_id,
        label: section.section_title?.trim() || section.section_id,
      });
    }
  });

  return sections;
}

export default function UsuariosPage() {
  const { user } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignmentRecord[]>([]);
  const [masterTemplates, setMasterTemplates] = useState<MasterTemplateRecord[]>([]);
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedModalidades, setSelectedModalidades] = useState<string[]>([]);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  const [listError, setListError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);

  const [editingCredentialsUserId, setEditingCredentialsUserId] = useState<number | null>(null);
  const [credentialsUsername, setCredentialsUsername] = useState("");
  const [credentialsPassword, setCredentialsPassword] = useState("");
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [credentialsMessage, setCredentialsMessage] = useState("");
  const [credentialsError, setCredentialsError] = useState("");

  const [editingModalidadesUserId, setEditingModalidadesUserId] = useState<number | null>(null);
  const [modalidadesToEdit, setModalidadesToEdit] = useState<string[]>([]);
  const [isSavingModalidades, setIsSavingModalidades] = useState(false);
  const [modalidadesMessage, setModalidadesMessage] = useState("");
  const [modalidadesError, setModalidadesError] = useState("");

  const [assignmentUser, setAssignmentUser] = useState<UserRecord | null>(null);
  const [assignmentModalityId, setAssignmentModalityId] = useState("");
  const [assignmentSections, setAssignmentSections] = useState<string[]>([]);
  const [assignmentPrincipal, setAssignmentPrincipal] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<number | null>(null);

  useEffect(() => {
    void loadUsersContext();
  }, [user?.token]);

  const assignmentTemplate = useMemo(
    () =>
      masterTemplates.find(
        (template) => template.modality_id === Number(assignmentModalityId),
      ),
    [assignmentModalityId, masterTemplates],
  );

  const availableSectionOptions = useMemo(
    () => extractSectionOptions(assignmentTemplate),
    [assignmentTemplate],
  );

  useEffect(() => {
    if (!assignmentUser || !assignmentModalityId) return;

    const existingAssignment = assignments.find(
      (item) =>
        item.user_id === assignmentUser.id &&
        item.modality_id === Number(assignmentModalityId),
    );
    const bonusSectionId = getBonusSectionId(assignmentTemplate);

    if (existingAssignment) {
      setAssignmentSections(
        existingAssignment.assigned_sections.filter((sectionId) => sectionId !== bonusSectionId),
      );
      setAssignmentPrincipal(existingAssignment.is_principal);
      return;
    }

    setAssignmentSections([]);
    setAssignmentPrincipal(false);
  }, [assignmentModalityId, assignmentTemplate, assignmentUser, assignments]);

  async function loadUsersContext() {
    if (!user?.token) return;

    setIsLoading(true);
    setListError("");

    try {
      const [usersResponse, assignmentsResponse, templatesResponse, modalitiesResponse] = await Promise.all([
        api.get<UserRecord[]>("/api/users", {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        api.get<JudgeAssignmentRecord[]>("/api/judge-assignments", {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        api.get<MasterTemplateRecord[]>("/api/evaluation-templates", {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
        api.get<ModalityRecord[]>("/api/modalities", {
          headers: { Authorization: `Bearer ${user.token}` },
        }),
      ]);

      setUsers(usersResponse.data);
      setAssignments(assignmentsResponse.data);
      setMasterTemplates(templatesResponse.data);
      setModalities(modalitiesResponse.data);
    } catch (error) {
      setListError(getApiErrorMessage(error, "No se pudo cargar la configuración de jueces."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateJudge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.token) return;

    setIsSaving(true);
    setFormMessage("");
    setFormError("");

    try {
      await api.post(
        "/api/users",
        {
          username,
          password,
          role: "juez",
          can_edit_scores: false,
          modalidades_asignadas: selectedModalidades,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setFormMessage("Juez creado correctamente.");
      setUsername("");
      setPassword("");
      setSelectedModalidades([]);
      await loadUsersContext();
    } catch (error) {
      setFormError(getApiErrorMessage(error, "No se pudo crear el nuevo juez."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePermission(targetUser: UserRecord) {
    if (!user?.token || targetUser.role !== "juez") return;

    setPendingUserId(targetUser.id);
    setListError("");

    try {
      const response = await api.put<UserRecord>(
        `/api/users/${targetUser.id}/permissions`,
        {
          can_edit_scores: !targetUser.can_edit_scores,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setUsers((current) =>
        current.map((item) => (item.id === targetUser.id ? response.data : item)),
      );
    } catch (error) {
      setListError(getApiErrorMessage(error, "No se pudo actualizar el permiso del juez."));
    } finally {
      setPendingUserId(null);
    }
  }

  async function handleUpdateJudgeCredentials(targetUser: UserRecord) {
    if (!user?.token || targetUser.role !== "juez") return;

    setIsSavingCredentials(true);
    setCredentialsMessage("");
    setCredentialsError("");

    const payload: { username?: string; password?: string } = {};
    const trimmedUsername = credentialsUsername.trim();
    const trimmedPassword = credentialsPassword.trim();

    if (trimmedUsername) payload.username = trimmedUsername;
    if (trimmedPassword) payload.password = trimmedPassword;

    try {
      const response = await api.patch<UserRecord>(
        `/api/users/${targetUser.id}/credentials`,
        payload,
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setUsers((current) =>
        current.map((item) => (item.id === response.data.id ? response.data : item)),
      );
      setCredentialsMessage("Credenciales actualizadas correctamente.");
      setEditingCredentialsUserId(null);
      setCredentialsUsername("");
      setCredentialsPassword("");
    } catch (error) {
      setCredentialsError(
        getApiErrorMessage(error, "No se pudo actualizar las credenciales del juez."),
      );
    } finally {
      setIsSavingCredentials(false);
    }
  }

  async function handleUpdateModalidades(targetUser: UserRecord) {
    if (!user?.token || targetUser.role !== "juez") return;

    setIsSavingModalidades(true);
    setModalidadesMessage("");
    setModalidadesError("");

    try {
      const response = await api.put<UserRecord>(
        `/api/users/${targetUser.id}/modalidades`,
        {
          modalidades_asignadas: modalidadesToEdit,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setUsers((current) =>
        current.map((item) => (item.id === targetUser.id ? response.data : item)),
      );
      setModalidadesMessage("Modalidades actualizadas correctamente.");
      setEditingModalidadesUserId(null);
      setModalidadesToEdit([]);
    } catch (error) {
      setModalidadesError(getApiErrorMessage(error, "No se pudo actualizar las modalidades."));
    } finally {
      setIsSavingModalidades(false);
    }
  }

  function openAssignmentModal(targetUser: UserRecord) {
    const userAssignments = assignments.filter((item) => item.user_id === targetUser.id);
    const preferredModalityId =
      userAssignments[0]?.modality_id ?? modalities[0]?.id ?? "";

    setAssignmentUser(targetUser);
    setAssignmentModalityId(preferredModalityId ? String(preferredModalityId) : "");
    setAssignmentMessage("");
    setAssignmentError("");
  }

  function closeAssignmentModal() {
    setAssignmentUser(null);
    setAssignmentModalityId("");
    setAssignmentSections([]);
    setAssignmentPrincipal(false);
    setAssignmentMessage("");
    setAssignmentError("");
  }

  function toggleAssignmentSection(sectionId: string) {
    setAssignmentSections((current) =>
      current.includes(sectionId)
        ? current.filter((item) => item !== sectionId)
        : [...current, sectionId],
    );
  }

  async function handleSaveAssignment() {
    if (!user?.token || !assignmentUser || !assignmentModalityId) return;

    setIsSavingAssignment(true);
    setAssignmentMessage("");
    setAssignmentError("");

    try {
      await api.post(
        "/api/judge-assignments",
        {
          user_id: assignmentUser.id,
          modality_id: Number(assignmentModalityId),
          assigned_sections: assignmentSections,
          is_principal: assignmentPrincipal,
        },
        {
          headers: { Authorization: `Bearer ${user.token}` },
        },
      );

      setAssignmentMessage("Asignación actualizada correctamente.");
      await loadUsersContext();
    } catch (error) {
      setAssignmentError(getApiErrorMessage(error, "No se pudo guardar la asignación."));
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: number) {
    if (!user?.token) return;

    setDeletingAssignmentId(assignmentId);
    setAssignmentMessage("");
    setAssignmentError("");

    try {
      await api.delete(`/api/judge-assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${user.token}` },
      });
      setAssignmentMessage("Asignación eliminada correctamente.");
      await loadUsersContext();
    } catch (error) {
      setAssignmentError(getApiErrorMessage(error, "No se pudo eliminar la asignación."));
    } finally {
      setDeletingAssignmentId(null);
    }
  }

  function getAssignmentsForUser(userId: number) {
    return assignments.filter((item) => item.user_id === userId);
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="panel p-5 sm:p-6">
          <div className="mb-5 space-y-2">
            <p className="text-sm font-medium text-brand-200">Crear usuario</p>
            <h2 className="section-title">Registrar juez</h2>
            <p className="text-sm leading-6 text-slate-300">
              Crea la cuenta y luego define su modalidad, secciones y rol principal o
              secundario.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleCreateJudge}>
            <input
              autoComplete="off"
              className="touch-input"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username del juez"
              value={username}
            />
            <input
              autoComplete="new-password"
              className="touch-input"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña temporal"
              type="password"
              value={password}
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Modalidades asignadas
              </label>
              {modalities.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                  No hay modalidades disponibles. Crea modalidades primero.
                </div>
              ) : (
                <div className="grid gap-2">
                  {modalities.map((modality) => (
                    <label
                      key={modality.id}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
                        selectedModalidades.includes(modality.nombre)
                          ? "border-brand-500 bg-brand-500/10 text-brand-100"
                          : "border-slate-700 bg-slate-900/70 text-slate-200",
                      ].join(" ")}
                    >
                      <input
                        checked={selectedModalidades.includes(modality.nombre)}
                        className="h-4 w-4 accent-brand-500"
                        onChange={() => {
                          setSelectedModalidades((current) =>
                            current.includes(modality.nombre)
                              ? current.filter((m) => m !== modality.nombre)
                              : [...current, modality.nombre]
                          );
                        }}
                        type="checkbox"
                      />
                      <span className="font-medium">{modality.nombre}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {formMessage && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {formMessage}
              </div>
            )}

            {formError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {formError}
              </div>
            )}

            <button
              className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSaving || !username.trim() || !password.trim()}
              type="submit"
            >
              {isSaving ? "Creando juez..." : "Crear juez"}
            </button>
          </form>
        </section>

        <section className="panel p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-brand-200">Control de acceso</p>
              <h2 className="section-title">Usuarios registrados</h2>
            </div>

            <button
              className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
              onClick={() => void loadUsersContext()}
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
              Cargando usuarios...
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((item) => {
                const userAssignments = getAssignmentsForUser(item.id);

                return (
                  <article
                    key={item.id}
                    className="rounded-3xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{item.username}</h3>
                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-semibold",
                              item.role === "admin"
                                ? "bg-amber-500/15 text-amber-100"
                                : "bg-brand-500/15 text-brand-100",
                            ].join(" ")}
                          >
                            {item.role}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">ID #{item.id}</p>

                        {item.role === "juez" && (
                          <div className="flex flex-wrap gap-2">
                            {userAssignments.length > 0 ? (
                              userAssignments.map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className={[
                                    "rounded-full border px-3 py-1 text-xs font-medium",
                                    assignment.is_principal
                                      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                      : "border-sky-500/30 bg-sky-500/10 text-sky-200",
                                  ].join(" ")}
                                >
                                  {assignment.modality_name} · {assignment.is_principal ? "Principal" : "Secundario"}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                                Sin asignaciones
                              </span>
                            )}
                          </div>
                        )}
                        
                        {item.role === "juez" && item.modalidades_asignadas && item.modalidades_asignadas.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            <span className="text-xs text-slate-500">Puede juzgar:</span>
                            {item.modalidades_asignadas.map((mod) => (
                              <span key={mod} className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                                {mod}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 md:min-w-[320px]">
                        <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">
                              Permitir re-editar puntajes
                            </p>
                            <p className="text-xs text-slate-400">
                              {item.role === "admin"
                                ? "No aplica para administradores"
                                : "Activa o bloquea la edición de calificaciones"}
                            </p>
                          </div>

                          <button
                            aria-label={`Cambiar permiso de ${item.username}`}
                            className={[
                              "relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition",
                              item.role !== "juez"
                                ? "cursor-not-allowed bg-slate-700/60 opacity-50"
                                : item.can_edit_scores
                                  ? "bg-emerald-500"
                                  : "bg-slate-700",
                            ].join(" ")}
                            disabled={item.role !== "juez" || pendingUserId === item.id}
                            onClick={() => void handleTogglePermission(item)}
                            type="button"
                          >
                            <span
                              className={[
                                "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                                item.can_edit_scores ? "translate-x-9" : "translate-x-1",
                              ].join(" ")}
                            />
                          </button>
                        </div>

                        {item.role === "juez" && (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <button
                              className="touch-button border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                              onClick={() => {
                                setEditingCredentialsUserId(item.id);
                                setCredentialsUsername(item.username);
                                setCredentialsPassword("");
                                setCredentialsMessage("");
                                setCredentialsError("");
                              }}
                              type="button"
                            >
                              Editar credenciales
                            </button>
                            <button
                              className="touch-button border border-emerald-500/40 bg-emerald-500/10 px-4 text-sm text-emerald-100"
                              onClick={() => {
                                setEditingModalidadesUserId(item.id);
                                setModalidadesToEdit(item.modalidades_asignadas || []);
                                setModalidadesMessage("");
                                setModalidadesError("");
                              }}
                              type="button"
                            >
                              Editar modalidades
                            </button>
                            <button
                              className="touch-button border border-amber-500/40 bg-amber-500/10 px-4 text-sm text-amber-100"
                              onClick={() => openAssignmentModal(item)}
                              type="button"
                            >
                              Asignar secciones
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {item.role === "juez" && editingCredentialsUserId === item.id && (
                      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
                        <div className="space-y-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                            <input
                              autoComplete="off"
                              className="touch-input"
                              placeholder="Nuevo username (opcional)"
                              value={credentialsUsername}
                              onChange={(e) => setCredentialsUsername(e.target.value)}
                            />
                            <input
                              autoComplete="new-password"
                              className="touch-input"
                              placeholder="Nueva contraseña (opcional)"
                              type="password"
                              value={credentialsPassword}
                              onChange={(e) => setCredentialsPassword(e.target.value)}
                            />
                          </div>

                          {credentialsMessage && (
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                              {credentialsMessage}
                            </div>
                          )}

                          {credentialsError && (
                            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                              {credentialsError}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <button
                              className="touch-button bg-brand-500 text-white shadow-lg shadow-brand-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={
                                isSavingCredentials ||
                                (!credentialsUsername.trim() && !credentialsPassword.trim())
                              }
                              onClick={() => void handleUpdateJudgeCredentials(item)}
                              type="button"
                            >
                              {isSavingCredentials ? "Actualizando..." : "Guardar cambios"}
                            </button>
                            <button
                              className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                              onClick={() => {
                                setEditingCredentialsUserId(null);
                                setCredentialsUsername("");
                                setCredentialsPassword("");
                                setCredentialsMessage("");
                                setCredentialsError("");
                              }}
                              type="button"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.role === "juez" && editingModalidadesUserId === item.id && (
                      <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-950/30 p-4">
                        <div className="space-y-3">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-slate-300">
                              Modalidades que puede juzgar
                            </label>
                            {modalities.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-400">
                                No hay modalidades disponibles.
                              </div>
                            ) : (
                              <div className="grid gap-2">
                                {modalities.map((modality) => (
                                  <label
                                    key={modality.id}
                                    className={[
                                      "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
                                      modalidadesToEdit.includes(modality.nombre)
                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-100"
                                        : "border-slate-700 bg-slate-900/70 text-slate-200",
                                    ].join(" ")}
                                  >
                                    <input
                                      checked={modalidadesToEdit.includes(modality.nombre)}
                                      className="h-4 w-4 accent-emerald-500"
                                      onChange={() => {
                                        setModalidadesToEdit((current) =>
                                          current.includes(modality.nombre)
                                            ? current.filter((m) => m !== modality.nombre)
                                            : [...current, modality.nombre]
                                        );
                                      }}
                                      type="checkbox"
                                    />
                                    <span className="font-medium">{modality.nombre}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>

                          {modalidadesMessage && (
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                              {modalidadesMessage}
                            </div>
                          )}

                          {modalidadesError && (
                            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                              {modalidadesError}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-3">
                            <button
                              className="touch-button bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={isSavingModalidades}
                              onClick={() => void handleUpdateModalidades(item)}
                              type="button"
                            >
                              {isSavingModalidades ? "Guardando..." : "Guardar modalidades"}
                            </button>
                            <button
                              className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                              onClick={() => {
                                setEditingModalidadesUserId(null);
                                setModalidadesToEdit([]);
                                setModalidadesMessage("");
                                setModalidadesError("");
                              }}
                              type="button"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {assignmentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
                  Asignación de juez
                </p>
                <h3 className="text-2xl font-bold text-white">{assignmentUser.username}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Define modalidad, secciones y si actúa como juez principal o secundario.
                </p>
              </div>

              <button
                className="touch-button w-auto min-w-32 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                onClick={closeAssignmentModal}
                type="button"
              >
                Cerrar
              </button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Modalidad
                  </label>
                  <select
                    className="touch-input"
                    onChange={(event) => setAssignmentModalityId(event.target.value)}
                    value={assignmentModalityId}
                  >
                    <option value="">Selecciona una modalidad</option>
                    {modalities.map((modality) => (
                      <option key={modality.id} value={modality.id}>
                        {modality.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Rol del juez
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      className={[
                        "rounded-2xl border px-4 py-4 text-left transition",
                        assignmentPrincipal
                          ? "border-amber-500 bg-amber-500/10 text-amber-100"
                          : "border-slate-700 bg-slate-900 text-slate-200",
                      ].join(" ")}
                      onClick={() => setAssignmentPrincipal(true)}
                      type="button"
                    >
                      <p className="font-semibold">Principal</p>
                      <p className="mt-1 text-sm text-current/80">
                        Puede finalizar la hoja completa.
                      </p>
                    </button>
                    <button
                      className={[
                        "rounded-2xl border px-4 py-4 text-left transition",
                        !assignmentPrincipal
                          ? "border-sky-500 bg-sky-500/10 text-sky-100"
                          : "border-slate-700 bg-slate-900 text-slate-200",
                      ].join(" ")}
                      onClick={() => setAssignmentPrincipal(false)}
                      type="button"
                    >
                      <p className="font-semibold">Secundario</p>
                      <p className="mt-1 text-sm text-current/80">
                        Completa solo las secciones que se le asignen.
                      </p>
                    </button>
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    {assignmentPrincipal
                      ? "El juez principal recibirá automáticamente la sección de bonificaciones y será el único que podrá cerrar la hoja."
                      : "El juez secundario solo verá las secciones marcadas manualmente por el administrador."}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Secciones permitidas
                  </label>
                  {availableSectionOptions.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-5 text-sm text-slate-400">
                      Esta modalidad no tiene secciones disponibles o no tiene plantilla maestra.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {availableSectionOptions.map((section) => (
                        <label
                          key={section.id}
                          className={[
                            "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-4 transition",
                            assignmentSections.includes(section.id)
                              ? "border-brand-500 bg-brand-500/10 text-brand-100"
                              : "border-slate-700 bg-slate-900/70 text-slate-200",
                          ].join(" ")}
                        >
                          <input
                            checked={assignmentSections.includes(section.id)}
                            className="mt-1 h-4 w-4 accent-brand-500"
                            onChange={() => toggleAssignmentSection(section.id)}
                            type="checkbox"
                          />
                          <div>
                            <p className="font-medium">{section.label}</p>
                            <p className="mt-1 text-xs uppercase tracking-wider text-current/70">
                              {section.id}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {assignmentMessage && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {assignmentMessage}
                  </div>
                )}

                {assignmentError && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {assignmentError}
                  </div>
                )}

                <button
                  className="touch-button bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingAssignment || !assignmentModalityId || assignmentSections.length === 0}
                  onClick={() => void handleSaveAssignment()}
                  type="button"
                >
                  {isSavingAssignment ? "Guardando..." : "Guardar asignación"}
                </button>
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <div>
                  <p className="text-sm font-medium text-brand-200">Asignaciones actuales</p>
                  <h4 className="text-xl font-bold text-white">Resumen del juez</h4>
                </div>

                {getAssignmentsForUser(assignmentUser.id).length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-5 text-sm text-slate-400">
                    Este juez todavía no tiene modalidades asignadas.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {getAssignmentsForUser(assignmentUser.id).map((assignment) => (
                      <article
                        key={assignment.id}
                        className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h5 className="font-semibold text-white">
                                {assignment.modality_name}
                              </h5>
                              <span
                                className={[
                                  "rounded-full px-3 py-1 text-xs font-semibold",
                                  assignment.is_principal
                                    ? "bg-amber-500/15 text-amber-100"
                                    : "bg-sky-500/15 text-sky-100",
                                ].join(" ")}
                              >
                                {assignment.is_principal ? "Principal" : "Secundario"}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {assignment.assigned_sections.map((sectionId) => (
                                <span
                                  key={sectionId}
                                  className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300"
                                >
                                  {sectionId}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                              onClick={() => {
                                setAssignmentModalityId(String(assignment.modality_id));
                                setAssignmentSections(
                                  assignment.assigned_sections.filter(
                                    (sectionId) =>
                                      sectionId !==
                                      getBonusSectionId(
                                        masterTemplates.find(
                                          (template) =>
                                            template.modality_id === assignment.modality_id,
                                        ),
                                      ),
                                  ),
                                );
                                setAssignmentPrincipal(assignment.is_principal);
                                setAssignmentMessage("");
                                setAssignmentError("");
                              }}
                              type="button"
                            >
                              Editar
                            </button>
                            <button
                              className="rounded-xl border border-rose-600/40 bg-rose-600/10 px-3 py-2 text-sm text-rose-200 transition hover:bg-rose-600/20 disabled:opacity-60"
                              disabled={deletingAssignmentId === assignment.id}
                              onClick={() => void handleDeleteAssignment(assignment.id)}
                              type="button"
                            >
                              {deletingAssignmentId === assignment.id ? "Quitando..." : "Quitar"}
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
