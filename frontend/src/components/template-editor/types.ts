import type {
  BonificationItemV2,
  CategorizationOption,
  TemplateItemV2,
} from "../../lib/judging";

export type MasterTemplateRecord = {
  id: number;
  modality_id: number;
  modality_name: string;
  content: import("../../lib/judging").EvaluationTemplateMaster;
};

export type ModalityRecord = {
  id: number;
  nombre: string;
  categories: Array<{
    id: number;
    nombre: string;
    level: number;
  }>;
};

export type CategoryRecord = {
  id: number;
  nombre: string;
  level: number;
};

export type EditorTemplateItem = TemplateItemV2 & {
  max_score: number;
  categorization_options: CategorizationOption[];
};

export type EditorTemplateSection = {
  section_id: string;
  section_title: string;
  assigned_role: string;
  items: EditorTemplateItem[];
};

export type EditorBonificationItem = BonificationItemV2 & {
  max_score: number;
};

export type EditorTemplate = {
  template_name: string;
  modality: string;
  version: string;
  template_type: "scored" | "categorization_only";
  evaluation_scale: Record<string, string>;
  sections: EditorTemplateSection[];
  bonifications: {
    section_id: string;
    assigned_role: string;
    items: EditorBonificationItem[];
  };
};
