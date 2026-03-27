import unicodedata
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Category, EvaluationTemplate, JudgeAssignment, Modality, Participant, ScoreCard, User
from schemas import (
    ResultsByModalityResponse,
    ResultCategoryGroup,
    ResultParticipantBreakdown,
    ScoreCardFinalizeResponse,
    ScoreCardPartialUpdateRequest,
    ScoreCardResponseV2,
)
from utils.dependencies import get_current_judge, get_current_user


router = APIRouter(tags=["scorecards"])


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    return "".join(character for character in normalized if not unicodedata.combining(character))


def resolve_participant_modality(db: Session, participant: Participant) -> Modality:
    if participant.category_id is not None:
        category = (
            db.query(Category)
            .options(joinedload(Category.modality))
            .filter(Category.id == participant.category_id)
            .first()
        )
        if category is not None and category.modality is not None:
            return category.modality

    modality = db.query(Modality).filter(Modality.nombre == participant.modalidad).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo resolver la modalidad del participante",
        )
    return modality


def resolve_evaluation_template(db: Session, modality_id: int) -> EvaluationTemplate:
    template = (
        db.query(EvaluationTemplate)
        .filter(EvaluationTemplate.modality_id == modality_id)
        .first()
    )
    if template is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe EvaluationTemplate para la modalidad seleccionada",
        )
    return template


def resolve_assignment(db: Session, user_id: int, modality_id: int) -> JudgeAssignment:
    assignment = (
        db.query(JudgeAssignment)
        .filter(
            JudgeAssignment.user_id == user_id,
            JudgeAssignment.modality_id == modality_id,
        )
        .first()
    )
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El juez no tiene asignación para esta modalidad",
        )
    return assignment


def build_item_lookup(template_content: dict[str, Any]) -> dict[str, dict[str, Any]]:
    sections = template_content.get("sections", [])
    if not isinstance(sections, list):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La plantilla no tiene una lista de secciones válida",
        )

    lookup: dict[str, dict[str, Any]] = {}
    for section in sections:
        section_id = section.get("section_id")
        for item in section.get("items", []):
            item_id = item.get("item_id")
            if isinstance(section_id, str) and isinstance(item_id, str):
                lookup[item_id] = {
                    "section_id": section_id,
                    "is_bonification": False,
                    "definition": item,
                }

    bonifications = template_content.get("bonifications")
    if isinstance(bonifications, dict):
        section_id = bonifications.get("section_id", "bonificaciones")
        for item in bonifications.get("items", []):
            item_id = item.get("item_id")
            if isinstance(section_id, str) and isinstance(item_id, str):
                lookup[item_id] = {
                    "section_id": section_id,
                    "is_bonification": True,
                    "definition": item,
                }

    return lookup


def build_section_title_lookup(template_content: dict[str, Any]) -> dict[str, str]:
    lookup: dict[str, str] = {}

    sections = template_content.get("sections", [])
    if isinstance(sections, list):
        for section in sections:
            if not isinstance(section, dict):
                continue
            section_id = section.get("section_id")
            section_title = section.get("section_title")
            if isinstance(section_id, str) and section_id.strip():
                lookup[section_id] = (
                    section_title.strip()
                    if isinstance(section_title, str) and section_title.strip()
                    else section_id
                )

    bonifications = template_content.get("bonifications")
    if isinstance(bonifications, dict):
        section_id = bonifications.get("section_id")
        if isinstance(section_id, str) and section_id.strip():
            lookup[section_id] = "Bonificaciones"

    return lookup


def expected_item_ids(template_content: dict[str, Any]) -> set[str]:
    return set(build_item_lookup(template_content).keys())


def validate_item_permissions(
    assignment: JudgeAssignment,
    item_lookup: dict[str, dict[str, Any]],
    incoming_answers: dict[str, Any],
) -> None:
    allowed_sections = set(assignment.assigned_sections or [])
    if assignment.is_principal:
        allowed_sections.update(
            metadata["section_id"]
            for metadata in item_lookup.values()
            if metadata["is_bonification"]
        )
    unauthorized_items = []

    for item_id in incoming_answers.keys():
        item_metadata = item_lookup.get(item_id)
        if item_metadata is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"El item {item_id} no existe en la plantilla maestra",
            )

        if item_metadata["section_id"] not in allowed_sections:
            unauthorized_items.append(item_id)

    if unauthorized_items:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"El juez no puede editar los items: {', '.join(unauthorized_items)}",
        )


def resolve_item_max_score(item_definition: dict[str, Any]) -> float:
    if item_definition.get("evaluation_type") == "categorization_only":
        return 0.0

    explicit_max = item_definition.get("max_score")
    if isinstance(explicit_max, (int, float)):
        return float(explicit_max)

    fallback_points = item_definition.get("points")
    if isinstance(fallback_points, (int, float)):
        return float(fallback_points)

    evaluation_type = item_definition.get("evaluation_type")
    if isinstance(evaluation_type, str):
        match = evaluation_type.split("_")
        if len(match) == 3 and match[0] == "scale":
            try:
                return float(match[2])
            except ValueError:
                pass

    return 5.0


def resolve_item_min_score(item_definition: dict[str, Any]) -> float:
    explicit_min = item_definition.get("min_score")
    if isinstance(explicit_min, (int, float)):
        return float(explicit_min)
    return 0.0


def validate_incoming_answers(
    item_lookup: dict[str, dict[str, Any]],
    incoming_answers: dict[str, Any],
) -> None:
    for item_id, raw_answer in incoming_answers.items():
        metadata = item_lookup.get(item_id)
        if metadata is None:
            continue

        if not isinstance(raw_answer, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"La respuesta para {item_id} debe ser un objeto JSON",
            )

        item_definition = metadata["definition"]
        if item_definition.get("evaluation_type") == "categorization_only":
            score = raw_answer.get("score")
            if score is not None and score not in (0, 0.0):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El item {item_id} es solo de categorización y no admite puntaje",
                )

        score = raw_answer.get("score")
        if score is not None:
            if not isinstance(score, (int, float)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El puntaje de {item_id} debe ser numérico",
                )

            min_score = resolve_item_min_score(item_definition)
            max_score = resolve_item_max_score(item_definition)
            if float(score) < min_score or float(score) > max_score:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"El puntaje de {item_id} debe estar entre "
                        f"{int(min_score) if min_score.is_integer() else min_score} y "
                        f"{int(max_score) if max_score.is_integer() else max_score}"
                    ),
                )

        category_options = item_definition.get("categorization_options")
        if isinstance(category_options, list) and category_options:
            normalized_options = [
                option
                for option in category_options
                if isinstance(option, dict)
            ]
            allowed_levels = {
                option.get("triggers_level")
                for option in normalized_options
                if isinstance(option.get("triggers_level"), int)
            }
            allowed_category_ids = {
                option.get("category_id")
                for option in normalized_options
                if isinstance(option.get("category_id"), int)
            }
            selected_level = raw_answer.get("category_level_selected")
            selected_category_id = raw_answer.get("category_id_selected")
            if selected_level is not None and selected_level not in allowed_levels:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El nivel de categorización seleccionado para {item_id} no es válido",
                )
            if selected_category_id is not None:
                if selected_category_id not in allowed_category_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"La categoría seleccionada para {item_id} no es válida",
                    )

                matching_options = [
                    option
                    for option in normalized_options
                    if option.get("category_id") == selected_category_id
                ]
                if (
                    selected_level is not None
                    and matching_options
                    and selected_level
                    not in {
                        option.get("triggers_level")
                        for option in matching_options
                        if isinstance(option.get("triggers_level"), int)
                    }
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"La categoría exacta y el nivel seleccionado para {item_id} "
                            "no coinciden"
                        ),
                    )
            elif allowed_category_ids and selected_level is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El item {item_id} requiere una categoría exacta seleccionada",
                )
        elif raw_answer.get("category_level_selected") is not None:
            selected_level = raw_answer.get("category_level_selected")
            if selected_level != 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"El item {item_id} no admite recategorización",
                )


def calculate_total_score(
    answers: dict[str, dict[str, Any]],
    item_lookup: dict[str, dict[str, Any]],
) -> tuple[float, dict[str, float]]:
    section_totals: dict[str, float] = {}
    total_score = 0.0

    for item_id, answer in answers.items():
        item_metadata = item_lookup.get(item_id)
        if item_metadata is None:
            continue

        section_id = item_metadata["section_id"]
        section_totals.setdefault(section_id, 0.0)

        score = answer.get("score", 0)
        if isinstance(score, (int, float)):
            section_totals[section_id] += float(score)
            total_score += float(score)

    return total_score, section_totals


def calculate_level(answers: dict[str, dict[str, Any]], item_lookup: dict[str, dict[str, Any]]) -> int:
    calculated_level = 1
    for item_id, answer in answers.items():
        item_metadata = item_lookup.get(item_id)
        if item_metadata is None or item_metadata["is_bonification"]:
            continue

        level = answer.get("category_level_selected")
        if isinstance(level, int):
            calculated_level = max(calculated_level, level)

    return calculated_level


def resolve_category_by_level(db: Session, modality_id: int, level: int) -> Category:
    category = (
        db.query(Category)
        .filter(Category.modality_id == modality_id, Category.level == level)
        .order_by(Category.id.asc())
        .first()
    )
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No existe una categoría con level={level} para esta modalidad",
        )
    return category


def resolve_category_from_answers(
    db: Session,
    modality_id: int,
    answers: dict[str, dict[str, Any]],
    item_lookup: dict[str, dict[str, Any]],
) -> Category:
    selected_category_ids: set[int] = set()

    for item_id, answer in answers.items():
        item_metadata = item_lookup.get(item_id)
        if item_metadata is None or item_metadata["is_bonification"]:
            continue

        selected_category_id = answer.get("category_id_selected")
        if isinstance(selected_category_id, int):
            selected_category_ids.add(selected_category_id)

    if selected_category_ids:
        categories = (
            db.query(Category)
            .filter(
                Category.modality_id == modality_id,
                Category.id.in_(selected_category_ids),
            )
            .all()
        )
        categories_by_id = {category.id: category for category in categories}

        best_category: Category | None = None
        for answer in answers.values():
            selected_category_id = answer.get("category_id_selected")
            if not isinstance(selected_category_id, int):
                continue

            category = categories_by_id.get(selected_category_id)
            if category is None:
                continue

            if (
                best_category is None
                or category.level > best_category.level
                or (category.level == best_category.level and category.id > best_category.id)
            ):
                best_category = category

        if best_category is not None:
            return best_category

    calculated_level = calculate_level(answers, item_lookup)
    return resolve_category_by_level(db, modality_id, calculated_level)


@router.get("/api/scorecards", response_model=list[ScoreCardResponseV2])
def list_scorecards(
    evento_id: Optional[int] = None,
    modalidad: Optional[str] = None,
    categoria: Optional[str] = None,
    status_filter: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ScoreCard).join(Participant, Participant.id == ScoreCard.participant_id)

    if evento_id is not None:
        query = query.filter(Participant.evento_id == evento_id)
    if modalidad:
        query = query.filter(Participant.modalidad == modalidad.strip())
    if categoria:
        query = query.filter(Participant.categoria == categoria.strip())
    if status_filter:
        query = query.filter(ScoreCard.status == status_filter.strip())

    return query.order_by(ScoreCard.id.desc()).all()


@router.patch("/api/scorecards/{participant_id}/partial-update", response_model=ScoreCardResponseV2)
def partial_update_scorecard(
    participant_id: int,
    payload: ScoreCardPartialUpdateRequest,
    current_user: User = Depends(get_current_judge),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    modality = resolve_participant_modality(db, participant)
    template = resolve_evaluation_template(db, modality.id)
    assignment = resolve_assignment(db, current_user.id, modality.id)
    item_lookup = build_item_lookup(template.content)

    validate_item_permissions(assignment, item_lookup, payload.answers)
    validate_incoming_answers(item_lookup, payload.answers)

    score_card = (
        db.query(ScoreCard)
        .filter(ScoreCard.participant_id == participant.id)
        .first()
    )
    if score_card is None:
        score_card = ScoreCard(
            participant_id=participant.id,
            template_id=template.id,
            answers={},
            status="draft",
            calculated_level=1,
            total_score=0,
        )
        db.add(score_card)
        db.flush()

    if score_card.status == "completed":
        if not assignment.is_principal or not current_user.can_edit_scores:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "La hoja ya fue finalizada y solo el juez principal "
                    "autorizado por el administrador puede re-editar puntajes"
                ),
            )
        score_card.status = "draft"

    merged_answers = dict(score_card.answers or {})
    merged_answers.update(payload.answers)
    score_card.answers = merged_answers
    score_card.calculated_level = calculate_level(merged_answers, item_lookup)
    score_card.total_score, _ = calculate_total_score(merged_answers, item_lookup)

    db.commit()
    db.refresh(score_card)
    return score_card


@router.get("/api/scorecards/{participant_id}", response_model=ScoreCardResponseV2)
def get_scorecard_for_participant(
    participant_id: int,
    current_user: User = Depends(get_current_judge),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    modality = resolve_participant_modality(db, participant)
    resolve_assignment(db, current_user.id, modality.id)

    score_card = (
        db.query(ScoreCard)
        .filter(ScoreCard.participant_id == participant.id)
        .first()
    )
    if score_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una hoja de evaluación para este participante",
        )
    return score_card


@router.post("/api/scorecards/{participant_id}/finalize", response_model=ScoreCardFinalizeResponse)
def finalize_scorecard(
    participant_id: int,
    current_user: User = Depends(get_current_judge),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    modality = resolve_participant_modality(db, participant)
    template = resolve_evaluation_template(db, modality.id)
    assignment = resolve_assignment(db, current_user.id, modality.id)

    if not assignment.is_principal:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el juez principal puede finalizar la hoja",
        )

    score_card = (
        db.query(ScoreCard)
        .filter(ScoreCard.participant_id == participant.id)
        .first()
    )
    if score_card is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe una hoja de evaluación en borrador para este participante",
        )

    item_lookup = build_item_lookup(template.content)
    expected_items = expected_item_ids(template.content)
    current_answers = score_card.answers or {}
    missing_items = sorted(expected_items.difference(current_answers.keys()))
    if missing_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La hoja no está completa. Faltan items: {', '.join(missing_items)}",
        )

    calculated_level = calculate_level(current_answers, item_lookup)
    total_score, _ = calculate_total_score(current_answers, item_lookup)
    final_category = resolve_category_from_answers(db, modality.id, current_answers, item_lookup)

    previous_category_id = participant.category_id
    previous_category_name = participant.categoria

    participant.category_id = final_category.id
    participant.categoria = final_category.nombre
    participant.modalidad = modality.nombre

    score_card.template_id = template.id
    score_card.status = "completed"
    score_card.calculated_level = calculated_level
    score_card.total_score = total_score

    db.commit()
    db.refresh(score_card)
    db.refresh(participant)

    return ScoreCardFinalizeResponse(
        score_card=ScoreCardResponseV2.model_validate(score_card),
        previous_category_id=previous_category_id,
        previous_category_name=previous_category_name,
        current_category_id=participant.category_id,
        current_category_name=participant.categoria,
        calculated_level=calculated_level,
        total_score=total_score,
    )


@router.get("/api/results/{modality_id}", response_model=ResultsByModalityResponse)
def get_results_by_modality(
    modality_id: int,
    evento_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    modality = db.query(Modality).filter(Modality.id == modality_id).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidad no encontrada",
        )

    template = resolve_evaluation_template(db, modality_id)
    item_lookup = build_item_lookup(template.content)
    section_titles = build_section_title_lookup(template.content)

    if current_user.role == "juez":
        assignment = resolve_assignment(db, current_user.id, modality_id)
        if not assignment.is_principal:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Solo el administrador o el juez principal pueden ver resultados",
            )

    query = (
        db.query(ScoreCard)
        .join(Participant, Participant.id == ScoreCard.participant_id)
        .outerjoin(Category, Category.id == Participant.category_id)
        .filter(
            ScoreCard.status == "completed",
        )
        .options(
            joinedload(ScoreCard.participant).joinedload(Participant.category),
        )
    )
    if evento_id is not None:
        query = query.filter(Participant.evento_id == evento_id)

    score_cards = query.order_by(ScoreCard.total_score.desc(), ScoreCard.id.asc()).all()

    # Filter by modality after loading (check participant's category modality or participant.modalidad)
    filtered_score_cards = []
    for score_card in score_cards:
        participant = score_card.participant
        if participant is None:
            continue
        # Check if participant's category belongs to this modality
        if participant.category_id is not None and participant.category:
            if participant.category.modality_id == modality_id:
                filtered_score_cards.append(score_card)
                continue
        # Fallback: check participant.modalidad field
        modality_name = modality.nombre
        if participant.modalidad and normalize_text(participant.modalidad) == normalize_text(modality_name):
            filtered_score_cards.append(score_card)

    grouped: dict[int, ResultCategoryGroup] = {}
    category_levels: dict[int, int] = {}
    for score_card in filtered_score_cards:
        participant = score_card.participant
        category = participant.category if participant else None
        if participant is None:
            continue

        _, section_totals = calculate_total_score(score_card.answers or {}, item_lookup)
        readable_section_totals = {
            section_titles.get(section_id, section_id): total
            for section_id, total in section_totals.items()
        }

        # Get category info - use participant's assigned category or find by level
        if category is None:
            # Try to find category by calculated level
            try:
                category = resolve_category_by_level(db, modality_id, score_card.calculated_level)
            except HTTPException:
                # Skip if no matching category found
                continue

        group = grouped.get(category.id)
        if group is None:
            group = ResultCategoryGroup(
                category_id=category.id,
                category_name=category.nombre,
                participants=[],
            )
            grouped[category.id] = group
            category_levels[category.id] = category.level

        group.participants.append(
            ResultParticipantBreakdown(
                participant_id=participant.id,
                nombres_apellidos=participant.nombres_apellidos,
                marca_modelo=participant.marca_modelo,
                placa_rodaje=participant.placa_rodaje,
                total_score=score_card.total_score,
                section_subtotals=readable_section_totals,
            )
        )

    grouped_results = sorted(
        grouped.values(),
        key=lambda item: (category_levels.get(item.category_id, 999), item.category_name),
    )

    for group in grouped_results:
        group.participants.sort(key=lambda participant: participant.total_score, reverse=True)

    return ResultsByModalityResponse(
        modality_id=modality.id,
        modality_name=modality.nombre,
        grouped_results=grouped_results,
    )
