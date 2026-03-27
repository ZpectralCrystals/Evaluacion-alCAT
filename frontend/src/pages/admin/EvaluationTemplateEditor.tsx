import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { api, getApiErrorMessage } from "../../lib/api";
import type { EvaluationTemplateMaster, TemplateItemV2, CategorizationOption } from "../../lib/judging";

import {
  type MasterTemplateRecord,
  type ModalityRecord,
  type EditorTemplate,
  type EditorTemplateSection,
  type EditorTemplateItem,
  DEFAULT_EVALUATION_SCALE,
  generateShortId,
  slugify,
  scaleEvaluationType,
  parseMaxScore,
  createCategorizationOption,
  createItem,
  createBonification,
  buildBlankTemplateContent,
  createEmptySection,
  createEmptyItem,
  createEmptyBonification,
} from "../../components/template-editor";

import { TemplateSectionCard } from "../../components/template-editor/TemplateSectionCard";
import { BonificationSection } from "../../components/template-editor/BonificationSection";
import { JsonPreview } from "../../components/template-editor/JsonPreview";

// ═══════════════════════════════════════════════════════════
// Preset templates
// ═══════════════════════════════════════════════════════════

function introToProOptions(): CategorizationOption[] {
  return [
    createCategorizationOption("Original / Sin modificación", 1),
    createCategorizationOption("Personalización visible", 2),
    createCategorizationOption("Modificación completa / Pro", 3),
  ];
}

function introToMasterOptions(): CategorizationOption[] {
  return [
    createCategorizationOption("Original / Sin modificación", 1),
    createCategorizationOption("Personalización visible", 2),
    createCategorizationOption("Modificación avanzada / Pro", 3),
    createCategorizationOption("Sin restricciones / Master", 4),
  ];
}

function binaryProOptions(): CategorizationOption[] {
  return [
    createCategorizationOption("Original / No modificado", 1),
    createCategorizationOption("Modificado / Pro", 3),
  ];
}

function binaryMasterOptions(): CategorizationOption[] {
  return [
    createCategorizationOption("No instalado", 1),
    createCategorizationOption("Instalado / Master", 4),
  ];
}

function buildTuningTemplateContent(): EditorTemplate {
  return {
    template_name: "Ficha Técnica: Categorización y Evaluación alCAT - Tuning 2025",
    modality: "Tuning",
    version: "2025",
    evaluation_scale: DEFAULT_EVALUATION_SCALE,
    sections: [
      {
        section_id: "apariencia_externa",
        section_title: "Apariencia Externa",
        assigned_role: "juez_externo",
        items: [
          createItem("ext_01", "Parachoques Delantero", 5, introToProOptions()),
          createItem("ext_02", "Parachoques Trasero", 5, introToProOptions()),
          createItem("ext_03", "Spoylers Laterales", 5, introToProOptions()),
          createItem("ext_04", "Capot", 5, introToProOptions()),
          createItem("ext_05", "Alerón ABS o fibra de vidrio", 5, introToProOptions()),
          createItem("ext_06", "Espejos retrovisores", 5, introToProOptions()),
          createItem("ext_07", "Pintura, aerografía, hidrografía y/o cromado de piezas", 5, introToMasterOptions()),
          createItem("ext_08", "Aros y llantas", 5, introToProOptions()),
          createItem("ext_09", "Tuercas y espárragos", 5),
          createItem("ext_10", "Modificación sistema de apertura de puertas", 5, binaryProOptions()),
          createItem("ext_11", "Modificación sistema de apertura de capot", 5, binaryProOptions()),
          createItem("ext_12", "Modificación sistema de apertura de maletera", 5, binaryProOptions()),
          createItem("ext_13", "Accesorios en fibra de carbono", 5, introToProOptions()),
          createItem("ext_14", "Ergonomía, creatividad y estética", 5),
        ],
      },
      {
        section_id: "apariencia_interna",
        section_title: "Apariencia Interna",
        assigned_role: "juez_interno",
        items: [
          createItem("int_01", "Sinóptico / relojería estándar en perfecto estado", 5),
          createItem("int_02", "Tacómetro externo", 5, introToProOptions()),
          createItem("int_03", "Otra relojería adicional", 5, introToProOptions()),
          createItem("int_04", "Timón", 5, introToProOptions()),
          createItem("int_05", "Quick Release", 5, introToProOptions()),
          createItem("int_06", "Pedales", 5, introToProOptions()),
          createItem("int_07", "Perilla de cambios", 5, introToProOptions()),
          createItem("int_08", "Freno de mano", 5, introToProOptions()),
          createItem("int_09", "Butacas", 5, introToMasterOptions()),
          createItem("int_10", "Arneses", 5, introToMasterOptions()),
          createItem("int_11", "Equipo de sonido", 5),
          createItem("int_12", "Accesorios instalados en habitáculo", 5, introToProOptions()),
          createItem("int_13", "Accesorios instalados en zona de carga", 5, introToProOptions()),
          createItem("int_14", "Alfombras", 5),
          createItem("int_15", "Botonería adicional", 5, introToProOptions()),
          createItem("int_16", "Tapiz de puertas personalizado", 5, introToProOptions()),
          createItem("int_17", "Pintura y/o acabados internos personalizados", 5, introToMasterOptions()),
          createItem("int_18", "Accesorios de fibra de carbono", 5, introToProOptions()),
          createItem("int_19", "Ergonomía, creatividad y estética interior", 5),
        ],
      },
      {
        section_id: "motor_performance",
        section_title: "Motor y Performance",
        assigned_role: "juez_motor",
        items: [
          createItem("mot_01", "Presurizador de gasolina / inyección programable", 5, introToMasterOptions()),
          createItem("mot_02", "Poleas de alto desempeño", 5, introToProOptions()),
          createItem("mot_03", "Óxido Nitroso", 5, binaryMasterOptions()),
          createItem("mot_04", "ECU", 5, introToMasterOptions()),
          createItem("mot_05", "Radiador de aceite", 5, introToProOptions()),
          createItem("mot_06", "Personalización de mangueras y cables", 5, introToProOptions()),
          createItem("mot_07", "Pintura y acabados del motor", 5),
          createItem("mot_08", "Barra estabilizadora delantera", 5, introToProOptions()),
          createItem("mot_09", "Barra estabilizadora posterior", 5, introToProOptions()),
          createItem("mot_10", "Suspensión - resortes", 5, introToProOptions()),
          createItem("mot_11", "Suspensión - amortiguadores", 5, introToProOptions()),
          createItem("mot_12", "Suspensión de aire", 5, introToMasterOptions()),
          createItem("mot_13", "Filtro de aire", 5, introToProOptions()),
          createItem("mot_14", "Intake", 5, introToProOptions()),
          createItem("mot_15", "Oil Catch Tank", 5, introToProOptions()),
          createItem("mot_16", "Cables de bujía de alta", 5, introToProOptions()),
          createItem("mot_17", "Bobina de alta performance", 5, introToProOptions()),
          createItem("mot_18", "Radiador de alta performance", 5, introToProOptions()),
          createItem("mot_19", "Header", 5, introToProOptions()),
          createItem("mot_20", "Línea de escape", 5, introToMasterOptions()),
          createItem("mot_21", "Perforación de discos", 5, introToProOptions()),
          createItem("mot_22", "Calipers o tambores delanteros", 5, introToProOptions()),
          createItem("mot_23", "Calipers o tambores posteriores", 5, introToProOptions()),
          createItem("mot_24", "Camber kit", 5, introToProOptions()),
          createItem("mot_25", "Ergonomía, creatividad y estética", 5),
        ],
      },
      {
        section_id: "limpieza",
        section_title: "Limpieza",
        assigned_role: "juez_estetica",
        items: [
          createItem("clean_01", "Limpieza externa", 5),
          createItem("clean_02", "Limpieza interna (salón)", 5),
          createItem("clean_03", "Limpieza de zona de carga", 5),
          createItem("clean_04", "Limpieza de motor", 5),
          createItem("clean_05", "Limpieza interna de guardafangos y suspensión", 5),
          createItem("clean_06", "Limpieza de discos, calipers, aros y llantas", 5),
          createItem("clean_07", "Limpieza de parte baja de carrocería", 5),
        ],
      },
      {
        section_id: "iluminacion",
        section_title: "Iluminación",
        assigned_role: "juez_estetica",
        items: [
          createItem("light_01", "Faros delanteros", 5),
          createItem("light_02", "Faros posteriores", 5),
          createItem("light_03", "Zona de carga (Sistema Car Audio)", 5),
          createItem("light_04", "Salón", 5),
          createItem("light_05", "Motor", 5),
          createItem("light_06", "Luces LED inferior", 5, introToProOptions()),
        ],
      },
      {
        section_id: "otros",
        section_title: "Otros",
        assigned_role: "juez_principal",
        items: [
          createItem("other_01", "Presentación general del proyecto", 5),
          createItem("other_02", "Coherencia de modificaciones", 5),
          createItem("other_03", "Impacto visual del montaje", 5),
        ],
      },
    ],
    bonifications: {
      section_id: "bonificaciones",
      assigned_role: "juez_principal",
      items: [
        createBonification("bono_01", "Ficha técnica del vehículo", 2),
        createBonification("bono_02", "Pedestal para ficha técnica", 2),
        createBonification("bono_03", "Registro gráfico de transformaciones", 5),
        createBonification("bono_04", "Sticker o sello de la competencia", 2),
        createBonification("bono_05", "Sticker o sello del organizador local", 2),
        createBonification("bono_06", "Sticker o sello de alCAT", 2),
      ],
    },
  };
}

function buildCategorizationOnlyTemplate(modalityName: string): EditorTemplate {
  return {
    template_name: `Categorización ${modalityName}`,
    modality: modalityName,
    version: "2025",
    evaluation_scale: {},
    sections: [
      {
        section_id: "categorizacion",
        section_title: "Categorización del Vehículo",
        assigned_role: "juez_principal",
        items: [
          createItem("cat_01", "Nivel de modificación general", 0, [
            createCategorizationOption("Original / Stock", 1),
            createCategorizationOption("Modificación básica", 2),
            createCategorizationOption("Modificación avanzada", 3),
            createCategorizationOption("Pro / Competencia", 4),
          ]),
        ],
      },
    ],
    bonifications: {
      section_id: "bonificaciones",
      assigned_role: "juez_principal",
      items: [],
    },
  };
}

function buildDefaultTemplateContent(modalityName: string): EditorTemplate {
  const normalizedName = modalityName.trim().toLowerCase();
  if (normalizedName === "tuning" || normalizedName === "tuning vw") {
    return buildTuningTemplateContent();
  }
  return buildCategorizationOnlyTemplate(modalityName);
}

// ═══════════════════════════════════════════════════════════
// Normalization / Serialization helpers
// ═══════════════════════════════════════════════════════════

function normalizeOptions(options: unknown): CategorizationOption[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((option, index) => {
      if (!option || typeof option !== "object") {
        return createCategorizationOption(`Nivel ${index + 1}`, 1);
      }

      const typedOption = option as Partial<CategorizationOption>;
      return createCategorizationOption(
        typedOption.label?.trim() || `Nivel ${index + 1}`,
        typeof typedOption.triggers_level === "number" ? typedOption.triggers_level : 1,
        typeof typedOption.category_id === "number" ? typedOption.category_id : null,
        typeof typedOption.category_name === "string" ? typedOption.category_name.trim() : null
      );
    })
    .filter((option) => option.label.trim());
}

function normalizeTemplateContent(rawContent: unknown, modalityName: string): EditorTemplate {
  const fallback = buildDefaultTemplateContent(modalityName);

  if (!rawContent || typeof rawContent !== "object" || Array.isArray(rawContent)) {
    return fallback;
  }

  const content = rawContent as Record<string, unknown>;
  const rawSections = Array.isArray(content.sections) ? content.sections : [];
  if (rawSections.length === 0 && Object.keys(content).length <= 1) {
    return fallback;
  }

  const sections: EditorTemplateSection[] = rawSections.map((section, sectionIndex) => {
    const typedSection = section && typeof section === "object" ? (section as Record<string, unknown>) : {};
    const sectionId =
      typeof typedSection.section_id === "string" && typedSection.section_id.trim()
        ? typedSection.section_id.trim()
        : `section_${generateShortId()}`;

    const rawItems = Array.isArray(typedSection.items) ? typedSection.items : [];
    return {
      section_id: sectionId,
      section_title:
        typeof typedSection.section_title === "string" && typedSection.section_title.trim()
          ? typedSection.section_title.trim()
          : `Sección ${sectionIndex + 1}`,
      assigned_role:
        typeof typedSection.assigned_role === "string" && typedSection.assigned_role.trim()
          ? typedSection.assigned_role.trim()
          : "juez_secundario",
      items: rawItems.map((item, itemIndex) => {
        const typedItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const maxScore = parseMaxScore(typedItem as Partial<TemplateItemV2> & { max_score?: unknown });
        return createItem(
          typeof typedItem.item_id === "string" && typedItem.item_id.trim()
            ? typedItem.item_id.trim()
            : `${sectionId}_item_${generateShortId()}`,
          typeof typedItem.label === "string" && typedItem.label.trim()
            ? typedItem.label.trim()
            : `Ítem ${itemIndex + 1}`,
          maxScore,
          normalizeOptions(typedItem.categorization_options)
        );
      }),
    };
  });

  const rawBonifications =
    content.bonifications && typeof content.bonifications === "object"
      ? (content.bonifications as Record<string, unknown>)
      : {};
  const rawBonusItems = Array.isArray(rawBonifications.items) ? rawBonifications.items : [];

  return {
    template_name:
      typeof content.template_name === "string" && content.template_name.trim()
        ? content.template_name.trim()
        : fallback.template_name,
    modality: modalityName,
    version:
      typeof content.version === "string" && content.version.trim() ? content.version.trim() : "2025",
    evaluation_scale:
      content.evaluation_scale && typeof content.evaluation_scale === "object"
        ? (content.evaluation_scale as Record<string, string>)
        : DEFAULT_EVALUATION_SCALE,
    sections,
    bonifications: {
      section_id:
        typeof rawBonifications.section_id === "string" && rawBonifications.section_id.trim()
          ? rawBonifications.section_id.trim()
          : "bonificaciones",
      assigned_role: "juez_principal",
      items: rawBonusItems.map((item, index) => {
        const typedItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return createBonification(
          typeof typedItem.item_id === "string" && typedItem.item_id.trim()
            ? typedItem.item_id.trim()
            : `bono_${generateShortId()}`,
          typeof typedItem.label === "string" && typedItem.label.trim()
            ? typedItem.label.trim()
            : `Bonificación ${index + 1}`,
          typeof typedItem.max_score === "number"
            ? typedItem.max_score
            : typeof typedItem.points === "number"
              ? typedItem.points
              : 1
        );
      }),
    },
  };
}

function serializeTemplateContent(content: EditorTemplate): EvaluationTemplateMaster {
  return {
    template_name: content.template_name.trim() || "Plantilla sin nombre",
    modality: content.modality,
    version: content.version.trim() || "2025",
    evaluation_scale: content.evaluation_scale,
    sections: content.sections.map((section) => ({
      section_id: section.section_id.trim() || slugify(section.section_title) || "seccion",
      section_title: section.section_title.trim() || "Sección sin título",
      assigned_role: section.assigned_role.trim() || "juez_secundario",
      items: section.items.map((item) => ({
        item_id: item.item_id.trim() || slugify(item.label) || "item",
        label: item.label.trim() || "Ítem sin nombre",
        evaluation_type: scaleEvaluationType(item.max_score),
        max_score: Math.max(0, Math.round(item.max_score ?? 5)),
        categorization_options: item.categorization_options
          .map((option) => ({
            label: option.label.trim(),
            triggers_level: option.triggers_level,
            category_id: typeof option.category_id === "number" ? option.category_id : undefined,
            category_name:
              typeof option.category_name === "string" && option.category_name.trim()
                ? option.category_name.trim()
                : undefined,
          }))
          .filter((option) => option.label),
      })),
    })),
    bonifications: {
      section_id: content.bonifications.section_id.trim() || "bonificaciones",
      assigned_role: "juez_principal",
      items: content.bonifications.items.map((item) => ({
        item_id: item.item_id.trim() || slugify(item.label) || "bono",
        label: item.label.trim() || "Bonificación",
        max_score: Math.max(0, Math.round(item.max_score ?? 1)),
      })),
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function EvaluationTemplateEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isCreateMode = !id || id === "nueva";

  const [template, setTemplate] = useState<MasterTemplateRecord | null>(null);
  const [modalities, setModalities] = useState<ModalityRecord[]>([]);
  const [selectedModalityId, setSelectedModalityId] = useState("");
  const [content, setContent] = useState<EditorTemplate>(buildBlankTemplateContent("Modalidad"));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedModality = useMemo(
    () => modalities.find((m) => String(m.id) === selectedModalityId) ?? null,
    [modalities, selectedModalityId]
  );

  const sortedCategories = useMemo(() => {
    if (!selectedModality?.categories) return [];
    return [...selectedModality.categories].sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [selectedModality]);

  const previewJson = useMemo(
    () => JSON.stringify(serializeTemplateContent(content), null, 2),
    [content]
  );

  // ─────────────────────────────────────────────────────────
  // Data loading
  // ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadContext() {
      if (!user?.token) return;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const modalitiesResponse = await api.get<ModalityRecord[]>("/api/modalities", {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setModalities(modalitiesResponse.data);

        if (isCreateMode) {
          const initialModality = modalitiesResponse.data[0];
          if (initialModality) {
            setSelectedModalityId(String(initialModality.id));
            setContent(buildDefaultTemplateContent(initialModality.nombre));
          }
          setTemplate(null);
          return;
        }

        const response = await api.get<MasterTemplateRecord>(`/api/evaluation-templates/${id}`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        setTemplate(response.data);
        setSelectedModalityId(String(response.data.modality_id));
        setContent(normalizeTemplateContent(response.data.content, response.data.modality_name));
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, "No se pudo cargar la plantilla maestra."));
      } finally {
        setIsLoading(false);
      }
    }

    void loadContext();
  }, [id, isCreateMode, user?.token]);

  // ─────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────

  function applyPresetForSelectedModality() {
    if (!selectedModality) return;
    setContent(buildDefaultTemplateContent(selectedModality.nombre));
    setSuccessMessage("");
    setErrorMessage("");
  }

  function handleModalityChange(nextId: string) {
    setSelectedModalityId(nextId);
    if (!isCreateMode) return;

    const nextModality = modalities.find((m) => String(m.id) === nextId);
    if (nextModality) {
      setContent(buildDefaultTemplateContent(nextModality.nombre));
    }
  }

  function updateSection(
    sectionIndex: number,
    updater: (section: EditorTemplateSection) => EditorTemplateSection
  ) {
    setContent((current) => ({
      ...current,
      sections: current.sections.map((section, index) =>
        index === sectionIndex ? updater(section) : section
      ),
    }));
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    updater: (item: EditorTemplateItem) => EditorTemplateItem
  ) {
    updateSection(sectionIndex, (section) => ({
      ...section,
      items: section.items.map((item, index) => (index === itemIndex ? updater(item) : item)),
    }));
  }

  function addSection() {
    setContent((current) => ({
      ...current,
      sections: [...current.sections, createEmptySection(current.sections.length + 1)],
    }));
  }

  function addItem(sectionIndex: number) {
    updateSection(sectionIndex, (section) => ({
      ...section,
      items: [
        ...section.items,
        createEmptyItem(section.section_id || `section_${generateShortId()}`, section.items.length + 1),
      ],
    }));
  }

  function addOption(sectionIndex: number, itemIndex: number) {
    const defaultCategory = selectedModality?.categories?.[0];
    updateItem(sectionIndex, itemIndex, (item) => ({
      ...item,
      categorization_options: [
        ...item.categorization_options,
        createCategorizationOption(
          `Condición ${item.categorization_options.length + 1}`,
          defaultCategory?.level ?? 1,
          defaultCategory?.id ?? null,
          defaultCategory?.nombre ?? null
        ),
      ],
    }));
  }

  function addBonification() {
    setContent((current) => ({
      ...current,
      bonifications: {
        ...current.bonifications,
        items: [
          ...current.bonifications.items,
          createEmptyBonification(current.bonifications.items.length + 1),
        ],
      },
    }));
  }

  async function handleSave() {
    if (!user?.token) return;

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!selectedModalityId) {
        throw new Error("Selecciona una modalidad antes de guardar.");
      }

      const payload = serializeTemplateContent({
        ...content,
        modality: selectedModality?.nombre ?? content.modality,
      });

      if (isCreateMode) {
        const response = await api.post<MasterTemplateRecord>(
          "/api/evaluation-templates",
          { modality_id: Number(selectedModalityId), content: payload },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        setTemplate(response.data);
        setSuccessMessage("Plantilla maestra creada correctamente.");
        navigate(`/admin/plantillas/maestra/${response.data.id}`, { replace: true });
      } else {
        const response = await api.put<MasterTemplateRecord>(
          `/api/evaluation-templates/${id}`,
          { content: payload },
          { headers: { Authorization: `Bearer ${user.token}` } }
        );

        setTemplate(response.data);
        setContent(normalizeTemplateContent(response.data.content, response.data.modality_name));
        setSuccessMessage("Plantilla maestra actualizada correctamente.");
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "No se pudo guardar la plantilla maestra."));
    } finally {
      setIsSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <p className="text-slate-300">Cargando plantilla maestra...</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-amber-300">
              Plantilla maestra
            </p>
            <h2 className="text-2xl font-bold text-white">
              {isCreateMode
                ? "Nueva plantilla por modalidad"
                : template?.content.template_name || template?.modality_name || "Editor visual"}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              La plantilla vive por modalidad. El juez principal recibe bonificaciones y finaliza la
              hoja.
            </p>
          </div>

          <button
            className="touch-button w-auto min-w-40 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
            onClick={() => navigate("/admin/plantillas")}
            type="button"
          >
            Volver a plantillas
          </button>
        </div>

        {/* Metadata form */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Modalidad</label>
              <select
                className="touch-input"
                disabled={!isCreateMode}
                onChange={(e) => handleModalityChange(e.target.value)}
                value={selectedModalityId}
              >
                <option value="">Selecciona una modalidad</option>
                {modalities.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Versión</label>
              <input
                className="touch-input"
                onChange={(e) => setContent((c) => ({ ...c, version: e.target.value }))}
                placeholder="2025"
                value={content.version}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Nombre del formato
            </label>
            <input
              className="touch-input"
              onChange={(e) => setContent((c) => ({ ...c, template_name: e.target.value }))}
              placeholder="Ficha técnica de evaluación"
              value={content.template_name}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="touch-button w-auto min-w-52 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
              disabled={!selectedModality}
              onClick={applyPresetForSelectedModality}
              type="button"
            >
              {selectedModality?.nombre === "Tuning"
                ? "Restaurar preset Tuning 2025"
                : "Generar formato base"}
            </button>
            {!isCreateMode && (
              <button
                className="touch-button w-auto min-w-44 border border-slate-700 bg-slate-900/70 px-4 text-sm text-slate-100"
                onClick={() =>
                  setContent(
                    normalizeTemplateContent(
                      template?.content,
                      template?.modality_name || selectedModality?.nombre || "Modalidad"
                    )
                  )
                }
                type="button"
              >
                Revertir cambios
              </button>
            )}
          </div>
        </div>

        {/* Sections & Items */}
        <div className="mt-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-200">Evaluación</p>
              <h3 className="text-xl font-bold text-white">Secciones e ítems</h3>
            </div>
            <button
              className="touch-button w-auto min-w-36 bg-brand-500 px-4 py-3 text-sm text-white"
              onClick={addSection}
              type="button"
            >
              + Añadir sección
            </button>
          </div>

          {content.sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-400">
              Esta plantilla todavía no tiene secciones. Crea una o carga el preset de la modalidad.
            </div>
          ) : (
            content.sections.map((section, sectionIndex) => (
              <TemplateSectionCard
                key={`${section.section_id}-${sectionIndex}`}
                section={section}
                sectionIndex={sectionIndex}
                categories={sortedCategories}
                onTitleChange={(value) =>
                  updateSection(sectionIndex, (s) => ({ ...s, section_title: value }))
                }
                onRoleChange={(value) =>
                  updateSection(sectionIndex, (s) => ({ ...s, assigned_role: value }))
                }
                onRemoveSection={() =>
                  setContent((c) => ({
                    ...c,
                    sections: c.sections.filter((_, i) => i !== sectionIndex),
                  }))
                }
                onAddItem={() => addItem(sectionIndex)}
                onUpdateItem={(itemIndex, updater) => updateItem(sectionIndex, itemIndex, updater)}
                onRemoveItem={(itemIndex) =>
                  updateSection(sectionIndex, (s) => ({
                    ...s,
                    items: s.items.filter((_, i) => i !== itemIndex),
                  }))
                }
                onAddOption={(itemIndex) => addOption(sectionIndex, itemIndex)}
              />
            ))
          )}

          {/* Bonifications */}
          <BonificationSection
            items={content.bonifications.items}
            onAdd={addBonification}
            onUpdateLabel={(itemIndex, value) =>
              setContent((c) => ({
                ...c,
                bonifications: {
                  ...c.bonifications,
                  items: c.bonifications.items.map((entry, i) =>
                    i === itemIndex ? { ...entry, label: value } : entry
                  ),
                },
              }))
            }
            onUpdateMaxScore={(itemIndex, value) =>
              setContent((c) => ({
                ...c,
                bonifications: {
                  ...c.bonifications,
                  items: c.bonifications.items.map((entry, i) =>
                    i === itemIndex ? { ...entry, max_score: value as number } : entry
                  ),
                },
              }))
            }
            onRemove={(itemIndex) =>
              setContent((c) => ({
                ...c,
                bonifications: {
                  ...c.bonifications,
                  items: c.bonifications.items.filter((_, i) => i !== itemIndex),
                },
              }))
            }
          />
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {errorMessage}
          </div>
        )}

        {/* Save button */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            className="touch-button bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || (isCreateMode && !selectedModalityId)}
            onClick={() => void handleSave()}
            type="button"
          >
            {isSaving
              ? "Guardando..."
              : isCreateMode
                ? "Crear plantilla maestra"
                : "Guardar plantilla maestra"}
          </button>
        </div>
      </section>

      {/* JSON Preview */}
      <JsonPreview json={previewJson} />
    </div>
  );
}
