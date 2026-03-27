from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import EvaluationTemplate, JudgeAssignment, Modality, User
from schemas import JudgeAssignmentResponse, JudgeAssignmentUpsertRequest
from utils.dependencies import get_current_admin, get_current_judge


router = APIRouter(prefix="/api/judge-assignments", tags=["judge-assignments"])


def extract_valid_sections(template: EvaluationTemplate) -> set[str]:
    valid_sections: set[str] = set()
    content = template.content or {}

    for section in content.get("sections", []):
        section_id = section.get("section_id")
        if isinstance(section_id, str) and section_id.strip():
            valid_sections.add(section_id.strip())

    bonifications = content.get("bonifications")
    if isinstance(bonifications, dict):
        section_id = bonifications.get("section_id")
        if isinstance(section_id, str) and section_id.strip():
            valid_sections.add(section_id.strip())

    return valid_sections


def extract_bonification_section_id(template: EvaluationTemplate) -> str | None:
    content = template.content or {}
    bonifications = content.get("bonifications")
    if not isinstance(bonifications, dict):
        return None

    section_id = bonifications.get("section_id")
    if isinstance(section_id, str) and section_id.strip():
        return section_id.strip()
    return None


def normalize_assigned_sections(
    template: EvaluationTemplate,
    requested_sections: list[str],
    is_principal: bool,
) -> list[str]:
    normalized_sections: list[str] = []
    seen_sections: set[str] = set()
    bonus_section_id = extract_bonification_section_id(template)

    for section_id in requested_sections:
        normalized = section_id.strip()
        if not normalized or normalized in seen_sections:
            continue
        if bonus_section_id and normalized == bonus_section_id:
            continue
        seen_sections.add(normalized)
        normalized_sections.append(normalized)

    if is_principal and bonus_section_id and bonus_section_id not in seen_sections:
        normalized_sections.append(bonus_section_id)

    return normalized_sections


def sync_user_modalities(db: Session, user: User) -> None:
    names = [
        modality_name
        for (modality_name,) in (
            db.query(Modality.nombre)
            .join(JudgeAssignment, JudgeAssignment.modality_id == Modality.id)
            .filter(JudgeAssignment.user_id == user.id)
            .order_by(Modality.nombre.asc())
            .all()
        )
    ]
    user.modalidades_asignadas = names


def build_assignment_response(
    assignment: JudgeAssignment,
    template: EvaluationTemplate | None = None,
) -> JudgeAssignmentResponse:
    assigned_sections = assignment.assigned_sections or []
    if template is not None:
        assigned_sections = normalize_assigned_sections(
            template=template,
            requested_sections=assigned_sections,
            is_principal=assignment.is_principal,
        )

    return JudgeAssignmentResponse(
        id=assignment.id,
        user_id=assignment.user_id,
        user_username=assignment.user.username if assignment.user is not None else None,
        modality_id=assignment.modality_id,
        modality_name=assignment.modality.nombre if assignment.modality is not None else None,
        assigned_sections=assigned_sections,
        is_principal=assignment.is_principal,
    )


@router.get("", response_model=list[JudgeAssignmentResponse])
def list_judge_assignments(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    templates_by_modality = {
        template.modality_id: template
        for template in db.query(EvaluationTemplate).all()
    }
    assignments = (
        db.query(JudgeAssignment)
        .options(
            joinedload(JudgeAssignment.user),
            joinedload(JudgeAssignment.modality),
        )
        .order_by(JudgeAssignment.modality_id.asc(), JudgeAssignment.user_id.asc())
        .all()
    )
    return [
        build_assignment_response(
            assignment,
            templates_by_modality.get(assignment.modality_id),
        )
        for assignment in assignments
    ]


@router.get("/me", response_model=JudgeAssignmentResponse)
def get_my_judge_assignment(
    modality_id: int,
    current_user: User = Depends(get_current_judge),
    db: Session = Depends(get_db),
):
    template = (
        db.query(EvaluationTemplate)
        .filter(EvaluationTemplate.modality_id == modality_id)
        .first()
    )
    assignment = (
        db.query(JudgeAssignment)
        .options(
            joinedload(JudgeAssignment.user),
            joinedload(JudgeAssignment.modality),
        )
        .filter(
            JudgeAssignment.user_id == current_user.id,
            JudgeAssignment.modality_id == modality_id,
        )
        .first()
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No tienes asignación configurada para esta modalidad",
        )
    return build_assignment_response(assignment, template)


@router.post("", response_model=JudgeAssignmentResponse)
def upsert_judge_assignment(
    payload: JudgeAssignmentUpsertRequest,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == payload.user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Juez no encontrado",
        )
    if user.role != "juez":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden asignar modalidades a usuarios con rol juez",
        )

    modality = db.query(Modality).filter(Modality.id == payload.modality_id).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidad no encontrada",
        )

    template = (
        db.query(EvaluationTemplate)
        .filter(EvaluationTemplate.modality_id == modality.id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La modalidad no tiene una plantilla maestra configurada",
        )

    manual_sections = []
    seen_sections: set[str] = set()
    bonus_section_id = extract_bonification_section_id(template)
    for section_id in payload.assigned_sections:
        normalized = section_id.strip()
        if not normalized or normalized in seen_sections:
            continue
        if bonus_section_id and normalized == bonus_section_id:
            continue
        seen_sections.add(normalized)
        manual_sections.append(normalized)

    if not manual_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes asignar al menos una sección al juez",
        )

    assigned_sections = normalize_assigned_sections(
        template=template,
        requested_sections=manual_sections,
        is_principal=payload.is_principal,
    )

    valid_sections = extract_valid_sections(template)
    invalid_sections = [section for section in assigned_sections if section not in valid_sections]
    if invalid_sections:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Secciones no válidas para esta modalidad: {', '.join(invalid_sections)}",
        )

    if payload.is_principal:
        (
            db.query(JudgeAssignment)
            .filter(
                JudgeAssignment.modality_id == payload.modality_id,
                JudgeAssignment.user_id != payload.user_id,
            )
            .update({"is_principal": False}, synchronize_session=False)
        )

    assignment = (
        db.query(JudgeAssignment)
        .filter(
            JudgeAssignment.user_id == payload.user_id,
            JudgeAssignment.modality_id == payload.modality_id,
        )
        .first()
    )
    if assignment is None:
        assignment = JudgeAssignment(
            user_id=payload.user_id,
            modality_id=payload.modality_id,
            assigned_sections=assigned_sections,
            is_principal=payload.is_principal,
        )
        db.add(assignment)
    else:
        assignment.assigned_sections = assigned_sections
        assignment.is_principal = payload.is_principal

    db.flush()
    sync_user_modalities(db, user)
    db.commit()

    assignment = (
        db.query(JudgeAssignment)
        .options(
            joinedload(JudgeAssignment.user),
            joinedload(JudgeAssignment.modality),
        )
        .filter(JudgeAssignment.user_id == payload.user_id, JudgeAssignment.modality_id == payload.modality_id)
        .first()
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo recuperar la asignación guardada",
        )
    return build_assignment_response(assignment, template)


@router.delete("/{assignment_id}", status_code=status.HTTP_200_OK)
def delete_judge_assignment(
    assignment_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    assignment = (
        db.query(JudgeAssignment)
        .options(joinedload(JudgeAssignment.user))
        .filter(JudgeAssignment.id == assignment_id)
        .first()
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asignación no encontrada",
        )

    user = assignment.user
    db.delete(assignment)
    if user is not None:
        db.flush()
        sync_user_modalities(db, user)
    db.commit()
    return {"message": "Asignación eliminada correctamente"}
