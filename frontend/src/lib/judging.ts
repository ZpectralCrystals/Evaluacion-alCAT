export const OFFICIAL_MODALIDADES = [
  "SPL",
  "SQ",
  "SQL",
  "Street Show",
  "Tuning",
  "Tuning VW",
] as const;

export const OFFICIAL_CATEGORIAS = [
  "Intro",
  "Aficionado",
  "Pro",
  "Master",
  "Street",
  "Custom",
] as const;

export type EventItem = {
  id: number;
  nombre: string;
  fecha: string;
  is_active: boolean;
};

export type ParticipantItem = {
  id: number;
  evento_id: number | null;
  nombres_apellidos: string;
  marca_modelo: string;
  dni?: string | null;
  telefono?: string | null;
  correo?: string | null;
  club_team?: string | null;
  modalidad: string;
  categoria: string;
  placa_rodaje: string;
};

// --- NUEVO STACK COLABORATIVO ---
export interface CategorizationOption {
  label: string;
  triggers_level: number;
  category_id?: number | null;
  category_name?: string | null;
}

export interface TemplateItemV2 {
  item_id: string;
  label: string;
  evaluation_type: string;
  min_score?: number;
  max_score?: number;
  categorization_options?: CategorizationOption[];
}

export interface TemplateSectionV2 {
  section_id: string;
  section_title: string;
  assigned_role: string;
  items: TemplateItemV2[];
}

export interface BonificationItemV2 {
  item_id: string;
  label: string;
  min_score?: number;
  max_score?: number;
}

export interface EvaluationTemplateMaster {
  template_name: string;
  modality: string;
  version: string;
  template_type?: "scored" | "categorization_only";
  evaluation_scale: Record<string, string>;
  sections: TemplateSectionV2[];
  bonifications?: {
    section_id: string;
    assigned_role: string;
    items: BonificationItemV2[];
  };
}

export interface EvaluationTemplateRecord {
  id: number;
  modality_id: number;
  modality_name: string;
  content: EvaluationTemplateMaster;
}

export interface AnswerDetail {
  score?: number;
  category_level_selected?: number;
  category_id_selected?: number;
  selected?: boolean;
}

export interface ScoreCardPartialUpdateRequest {
  answers: Record<string, AnswerDetail>;
}

export interface ScoreCardRecord {
  id: number;
  participant_id: number;
  template_id: number;
  answers: Record<string, AnswerDetail>;
  status: string;
  calculated_level: number;
  total_score: number;
}

export interface JudgeAssignmentInfo {
  is_principal: boolean;
  assigned_sections: string[];
}

export interface JudgeAssignmentRecord extends JudgeAssignmentInfo {
  id: number;
  user_id: number;
  user_username?: string | null;
  modality_id: number;
  modality_name?: string | null;
}

export interface ResultParticipantBreakdown {
  participant_id: number;
  nombres_apellidos: string;
  marca_modelo: string;
  placa_rodaje: string;
  total_score: number;
  section_subtotals: Record<string, number>;
}

export interface ResultCategoryGroup {
  category_id: number;
  category_name: string;
  participants: ResultParticipantBreakdown[];
}

export interface ResultsByModalityResponse {
  modality_id: number;
  modality_name: string;
  grouped_results: ResultCategoryGroup[];
}
