import type { CategorizationOption, TemplateItemV2 } from "../../lib/judging";
import type {
  EditorBonificationItem,
  EditorTemplate,
  EditorTemplateItem,
  EditorTemplateSection,
} from "./types";

export const DEFAULT_EVALUATION_SCALE: Record<string, string> = {
  "0": "Original y/o no presenta",
  "1": "Original presentado en perfecto estado",
  "2": "Accesorio personalizado",
  "3": "Accesorio reemplazado por uno superior",
  "4": "Accesorio cambiado perfectamente instalado",
  "5": "Accesorio con homologación internacional",
};

export function generateShortId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().split("-")[0];
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function scaleEvaluationType(maxScore: number): string {
  const num = Number(maxScore);
  const safeMax = Number.isFinite(num) ? Math.max(0, Math.round(num)) : 5;
  return `scale_0_${safeMax}`;
}

export function parseMaxScore(
  item: Partial<TemplateItemV2> & { max_score?: unknown }
): number {
  if (typeof item.max_score === "number" && Number.isFinite(item.max_score)) {
    return Math.max(0, Math.round(item.max_score));
  }

  if (typeof item.evaluation_type === "string") {
    const match = item.evaluation_type.match(/scale_(\d+)_(\d+)/);
    if (match) {
      return Math.max(0, Number(match[2]));
    }
  }

  return 5;
}

export function createCategorizationOption(
  label: string,
  triggersLevel: number,
  categoryId?: number | null,
  categoryName?: string | null
): CategorizationOption {
  return {
    label,
    triggers_level: triggersLevel,
    category_id: categoryId ?? null,
    category_name: categoryName ?? null,
  };
}

export function createItem(
  itemId: string,
  label: string,
  maxScore = 5,
  categorizationOptions: CategorizationOption[] = []
): EditorTemplateItem {
  return {
    item_id: itemId,
    label,
    evaluation_type: scaleEvaluationType(maxScore),
    max_score: maxScore,
    categorization_options: categorizationOptions,
  };
}

export function createBonification(
  itemId: string,
  label: string,
  maxScore: number
): EditorBonificationItem {
  return { item_id: itemId, label, max_score: maxScore };
}

export function createEmptySection(index: number): EditorTemplateSection {
  return {
    section_id: `section_${generateShortId()}`,
    section_title: `Nueva sección ${index}`,
    assigned_role: "juez_secundario",
    items: [],
  };
}

export function createEmptyItem(
  sectionId: string,
  index: number
): EditorTemplateItem {
  return createItem(
    `${sectionId}_item_${generateShortId()}`,
    `Nuevo ítem ${index}`,
    5,
    []
  );
}

export function createEmptyBonification(index: number): EditorBonificationItem {
  return createBonification(
    `bono_${generateShortId()}`,
    `Nueva bonificación ${index}`,
    1
  );
}

export function buildBlankTemplateContent(modalityName: string): EditorTemplate {
  return {
    template_name: `Ficha Técnica ${modalityName}`,
    modality: modalityName,
    version: "2025",
    evaluation_scale: DEFAULT_EVALUATION_SCALE,
    sections: [],
    bonifications: {
      section_id: "bonificaciones",
      assigned_role: "juez_principal",
      items: [],
    },
  };
}
