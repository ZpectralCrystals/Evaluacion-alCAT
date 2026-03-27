from datetime import date
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


RoleType = Literal["admin", "juez"]


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: RoleType
    username: str
    can_edit_scores: bool = False


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=128)
    role: RoleType
    can_edit_scores: bool = False
    modalidades_asignadas: list[str] = Field(default_factory=list)


class UserResponse(BaseModel):
    id: int
    username: str
    role: RoleType
    can_edit_scores: bool
    modalidades_asignadas: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class UserPermissionUpdate(BaseModel):
    can_edit_scores: bool


class UserModalidadesUpdate(BaseModel):
    modalidades_asignadas: list[str] = Field(default_factory=list)


class UserCredentialsUpdate(BaseModel):
    username: Optional[str] = Field(default=None, min_length=3, max_length=100)
    password: Optional[str] = Field(default=None, min_length=4, max_length=128)


class EventCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=150)
    fecha: date
    is_active: bool = True


class EventResponse(BaseModel):
    id: int
    nombre: str
    fecha: date
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class EventUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=150)
    fecha: Optional[date] = None
    is_active: Optional[bool] = None


class ParticipantResponse(BaseModel):
    id: int
    evento_id: Optional[int] = None
    category_id: Optional[int] = None
    nombres_apellidos: str
    dni: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    club_team: Optional[str] = None
    marca_modelo: str
    modalidad: str
    categoria: str
    placa_rodaje: str

    model_config = ConfigDict(from_attributes=True)


class ParticipantCreate(BaseModel):
    evento_id: int
    category_id: Optional[int] = None
    nombres_apellidos: str = Field(..., min_length=1, max_length=150)
    dni: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    club_team: Optional[str] = None
    marca_modelo: str = Field(..., min_length=1, max_length=150)
    modalidad: str = Field(..., min_length=1, max_length=100)
    categoria: str = Field(..., min_length=1, max_length=100)
    placa_rodaje: str = Field(..., min_length=1, max_length=50)


class ParticipantUpdate(ParticipantCreate):
    pass


class ParticipantNameUpdate(BaseModel):
    nombres_apellidos: str = Field(..., min_length=1, max_length=150)


class ParticipantUploadSkippedItem(BaseModel):
    row: str
    reason: str


class ParticipantUploadResponse(BaseModel):
    created_count: int
    skipped_count: int
    total_rows: int
    created_items: list[ParticipantResponse]
    skipped_items: list[ParticipantUploadSkippedItem]


class RegulationResponse(BaseModel):
    id: int
    titulo: str
    modalidad: str
    archivo_url: str

    model_config = ConfigDict(from_attributes=True)


# Modality and Category schemas


class CategoryCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    level: int = Field(default=1, ge=1)


class CategoryUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    level: Optional[int] = Field(default=None, ge=1)


class CategoryResponse(BaseModel):
    id: int
    nombre: str
    level: int
    modality_id: int

    model_config = ConfigDict(from_attributes=True)


class ModalityCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)


class ModalityResponse(BaseModel):
    id: int
    nombre: str
    categories: list[CategoryResponse] = []

    model_config = ConfigDict(from_attributes=True)


class EvaluationTemplateResponse(BaseModel):
    id: int
    modality_id: int
    content: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class EvaluationTemplateAdminResponse(BaseModel):
    id: int
    modality_id: int
    modality_name: str
    content: dict[str, Any]


class EvaluationTemplateCreate(BaseModel):
    modality_id: int
    content: dict[str, Any] = Field(default_factory=dict)


class EvaluationTemplateUpdate(BaseModel):
    content: dict[str, Any] = Field(default_factory=dict)


class JudgeAssignmentCreate(BaseModel):
    user_id: int
    modality_id: int
    assigned_sections: list[str] = Field(default_factory=list)
    is_principal: bool = False


class JudgeAssignmentUpsertRequest(BaseModel):
    user_id: int
    modality_id: int
    assigned_sections: list[str] = Field(default_factory=list)
    is_principal: bool = False


class JudgeAssignmentResponse(BaseModel):
    id: int
    user_id: int
    user_username: Optional[str] = None
    modality_id: int
    modality_name: Optional[str] = None
    assigned_sections: list[str]
    is_principal: bool

    model_config = ConfigDict(from_attributes=True)


class ScoreCardPartialUpdateRequest(BaseModel):
    answers: dict[str, dict[str, Any]] = Field(default_factory=dict)


class ScoreCardResponseV2(BaseModel):
    id: int
    participant_id: int
    template_id: int
    answers: dict[str, Any]
    status: str
    calculated_level: int
    total_score: float

    model_config = ConfigDict(from_attributes=True)


class ScoreCardFinalizeResponse(BaseModel):
    score_card: ScoreCardResponseV2
    previous_category_id: Optional[int] = None
    previous_category_name: str
    current_category_id: Optional[int] = None
    current_category_name: str
    calculated_level: int
    total_score: float


class ResultParticipantBreakdown(BaseModel):
    participant_id: int
    nombres_apellidos: str
    marca_modelo: str
    placa_rodaje: str
    total_score: float
    section_subtotals: dict[str, float]


class ResultCategoryGroup(BaseModel):
    category_id: int
    category_name: str
    participants: list[ResultParticipantBreakdown]


class ResultsByModalityResponse(BaseModel):
    modality_id: int
    modality_name: str
    grouped_results: list[ResultCategoryGroup]
