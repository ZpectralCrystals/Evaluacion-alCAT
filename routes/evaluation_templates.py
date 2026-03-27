from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import EvaluationTemplate, Modality, User
from schemas import (
    EvaluationTemplateAdminResponse,
    EvaluationTemplateCreate,
    EvaluationTemplateUpdate,
)
from utils.dependencies import get_current_admin, get_current_user


router = APIRouter(prefix="/api/evaluation-templates", tags=["evaluation-templates"])


def sanitize_template_content(content: dict, modality_name: str) -> dict:
    sanitized_content = dict(content or {})
    sanitized_content["modality"] = modality_name

    bonifications = sanitized_content.get("bonifications")
    if isinstance(bonifications, dict):
        normalized_bonifications = dict(bonifications)
        normalized_bonifications["assigned_role"] = "juez_principal"
        normalized_bonifications.setdefault("section_id", "bonificaciones")
        normalized_bonifications.setdefault("items", [])
        sanitized_content["bonifications"] = normalized_bonifications

    return sanitized_content


def build_template_response(template: EvaluationTemplate) -> EvaluationTemplateAdminResponse:
    modality_name = template.modality.nombre if template.modality is not None else ""
    return EvaluationTemplateAdminResponse(
        id=template.id,
        modality_id=template.modality_id,
        modality_name=modality_name,
        content=template.content or {},
    )


@router.get("", response_model=list[EvaluationTemplateAdminResponse])
def list_evaluation_templates(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    templates = (
        db.query(EvaluationTemplate)
        .options(joinedload(EvaluationTemplate.modality))
        .order_by(EvaluationTemplate.modality_id.asc())
        .all()
    )
    return [build_template_response(template) for template in templates]


@router.post("", response_model=EvaluationTemplateAdminResponse, status_code=status.HTTP_201_CREATED)
def create_evaluation_template(
    payload: EvaluationTemplateCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    modality = db.query(Modality).filter(Modality.id == payload.modality_id).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidad no encontrada",
        )

    existing = (
        db.query(EvaluationTemplate)
        .filter(EvaluationTemplate.modality_id == payload.modality_id)
        .first()
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una plantilla maestra para esta modalidad",
        )

    sanitized_content = sanitize_template_content(payload.content, modality.nombre)

    template = EvaluationTemplate(
        modality_id=payload.modality_id,
        content=sanitized_content,
    )
    db.add(template)
    db.commit()

    template = (
        db.query(EvaluationTemplate)
        .options(joinedload(EvaluationTemplate.modality))
        .filter(EvaluationTemplate.id == template.id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo recuperar la plantilla creada",
        )
    return build_template_response(template)


@router.get("/{template_id}", response_model=EvaluationTemplateAdminResponse)
def get_evaluation_template(
    template_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = (
        db.query(EvaluationTemplate)
        .options(joinedload(EvaluationTemplate.modality))
        .filter(EvaluationTemplate.id == template_id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla maestra no encontrada",
        )
    return build_template_response(template)


@router.get("/by-modality/{modality_id}", response_model=EvaluationTemplateAdminResponse)
def get_evaluation_template_by_modality(
    modality_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    template = (
        db.query(EvaluationTemplate)
        .options(joinedload(EvaluationTemplate.modality))
        .filter(EvaluationTemplate.modality_id == modality_id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla maestra no encontrada para la modalidad solicitada",
        )
    return build_template_response(template)


@router.put("/{template_id}", response_model=EvaluationTemplateAdminResponse)
def update_evaluation_template(
    template_id: int,
    payload: EvaluationTemplateUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    template = (
        db.query(EvaluationTemplate)
        .options(joinedload(EvaluationTemplate.modality))
        .filter(EvaluationTemplate.id == template_id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plantilla maestra no encontrada",
        )

    sanitized_content = (
        sanitize_template_content(payload.content, template.modality.nombre)
        if template.modality is not None
        else dict(payload.content or {})
    )

    template.content = sanitized_content
    db.commit()
    db.refresh(template)
    return build_template_response(template)
