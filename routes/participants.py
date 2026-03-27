from io import BytesIO
import unicodedata
from typing import Optional, Union

import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from database import get_db
from models import Event, Participant, User
from schemas import (
    ParticipantCreate,
    ParticipantResponse,
    ParticipantNameUpdate,
    ParticipantUpdate,
    ParticipantUploadResponse,
)
from utils.dependencies import get_current_admin, get_current_user


router = APIRouter(prefix="/api/participants", tags=["participants"])

REQUIRED_FIELDS = {
    "nombres_apellidos": {
        "nombres_apellidos",
        "nombres y apellidos",
        "nombre completo",
        "nombre",
        "competidor",
        "participante",
        "nombre del competidor",
    },
    "marca_modelo": {
        "marca_modelo",
        "marca modelo",
        "auto_marca_modelo",
        "auto marca modelo",
        "auto",
        "vehiculo",
        "vehículo",
    },
    "modalidad": {"modalidad"},
    "categoria": {"categoria", "categoría"},
    "placa_rodaje": {
        "placa_rodaje",
        "placa rodaje",
        "placa",
        "rodaje",
        "matricula",
        "matrícula",
        "placa matrícula",
        "placa-matricula",
    },
}

OPTIONAL_FIELDS = {
    "dni": {"dni", "documento", "id", "cedula", "cédula"},
    "telefono": {"telefono", "teléfono", "tel", "phone"},
    "correo": {"correo", "email", "e-mail", "e_mail"},
    "club_team": {"club_team", "club/team", "club", "team", "equipo"},
}


def normalize_column_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.strip().lower())
    ascii_only = "".join(character for character in normalized if not unicodedata.combining(character))
    return ascii_only.replace("-", " ").replace("_", " ")


def resolve_excel_columns(columns: list[str]) -> dict[str, str]:
    normalized_map = {normalize_column_name(column): column for column in columns}
    resolved: dict[str, str] = {}

    # Requeridas: si no existe la columna, abortamos con error 400.
    for field_name, aliases in REQUIRED_FIELDS.items():
        normalized_aliases = {normalize_column_name(alias) for alias in aliases}
        match = next(
            (
                original_name
                for normalized_name, original_name in normalized_map.items()
                if normalized_name in normalized_aliases
            ),
            None,
        )
        if match is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Falta la columna requerida: {field_name}",
            )
        resolved[field_name] = match

    # Opcionales: si no existe la columna, simplemente no se incluye.
    for field_name, aliases in OPTIONAL_FIELDS.items():
        normalized_aliases = {normalize_column_name(alias) for alias in aliases}
        match = next(
            (
                original_name
                for normalized_name, original_name in normalized_map.items()
                if normalized_name in normalized_aliases
            ),
            None,
        )
        if match is not None:
            resolved[field_name] = match

    return resolved


def clean_cell(value: object) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def clean_optional_cell(value: object) -> Optional[str]:
    if pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def ensure_event_exists(evento_id: int, db: Session) -> Event:
    event = db.query(Event).filter(Event.id == evento_id).first()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado",
        )
    return event


def normalize_participant_payload(
    payload: Union[ParticipantCreate, ParticipantUpdate],
) -> dict[str, object]:
    def clean_optional_str(v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        text = v.strip()
        return text or None

    return {
        "evento_id": payload.evento_id,
        "nombres_apellidos": payload.nombres_apellidos.strip(),
        # Legacy fields: la tabla actual en SQLite aún tiene NOT NULL
        # para estas columnas. Se completan para evitar IntegrityError.
        "nombre_competidor": payload.nombres_apellidos.strip(),
        "marca_modelo": payload.marca_modelo.strip(),
        "auto_marca_modelo": payload.marca_modelo.strip(),
        "modalidad": payload.modalidad.strip(),
        "categoria": payload.categoria.strip(),
        "placa_rodaje": payload.placa_rodaje.strip(),
        "placa_matricula": payload.placa_rodaje.strip(),
        "dni": clean_optional_str(payload.dni),
        "telefono": clean_optional_str(payload.telefono),
        "correo": clean_optional_str(payload.correo),
        "club_team": clean_optional_str(payload.club_team),
    }


def ensure_unique_plate_for_event(
    evento_id: int,
    placa_rodaje: str,
    db: Session,
    exclude_participant_id: Optional[int] = None,
):
    query = db.query(Participant).filter(
        Participant.evento_id == evento_id,
        Participant.placa_rodaje == placa_rodaje,
    )
    if exclude_participant_id is not None:
        query = query.filter(Participant.id != exclude_participant_id)

    existing_participant = query.first()
    if existing_participant is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un participante con esa placa en el evento seleccionado",
        )


@router.post("", response_model=ParticipantResponse, status_code=status.HTTP_201_CREATED)
def create_participant(
    payload: ParticipantCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    normalized_payload = normalize_participant_payload(payload)
    ensure_event_exists(payload.evento_id, db)
    ensure_unique_plate_for_event(
        evento_id=payload.evento_id,
        placa_rodaje=str(normalized_payload["placa_rodaje"]),
        db=db,
    )

    participant = Participant(**normalized_payload)
    db.add(participant)
    db.commit()
    db.refresh(participant)
    return participant


@router.put("/{participant_id}", response_model=ParticipantResponse)
def update_participant(
    participant_id: int,
    payload: ParticipantUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    # Judges can only update modalidad and categoria
    if current_user.role == "juez":
        # Only allow updating modalidad and categoria
        allowed_fields = ["modalidad", "categoria"]
        normalized_payload = {
            "modalidad": payload.modalidad.strip(),
            "categoria": payload.categoria.strip(),
        }
        # Update only allowed fields
        for field_name, value in normalized_payload.items():
            setattr(participant, field_name, value)
    else:
        # Admin can update everything
        normalized_payload = normalize_participant_payload(payload)
        ensure_event_exists(payload.evento_id, db)
        ensure_unique_plate_for_event(
            evento_id=payload.evento_id,
            placa_rodaje=str(normalized_payload["placa_rodaje"]),
            db=db,
            exclude_participant_id=participant_id,
        )
        for field_name, value in normalized_payload.items():
            setattr(participant, field_name, value)

    db.commit()
    db.refresh(participant)
    return participant


@router.patch(
    "/{participant_id}/nombre",
    response_model=ParticipantResponse,
)
def update_participant_name(
    participant_id: int,
    payload: ParticipantNameUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    new_name = payload.nombres_apellidos.strip()
    participant.nombres_apellidos = new_name
    participant.nombre_competidor = new_name

    db.commit()
    db.refresh(participant)
    return participant


@router.delete("/{participant_id}", status_code=status.HTTP_200_OK)
def delete_participant(
    participant_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    participant = db.query(Participant).filter(Participant.id == participant_id).first()
    if participant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participante no encontrado",
        )

    db.delete(participant)
    db.commit()
    return {"message": "Participante eliminado correctamente"}


@router.get("", response_model=list[ParticipantResponse])
def list_participants(
    evento_id: Optional[int] = Query(default=None),
    modalidad: Optional[str] = Query(default=None),
    categoria: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Participant)

    if evento_id is not None:
        query = query.filter(Participant.evento_id == evento_id)
    
    # If user is a judge, filter by assigned modalities
    if current_user.role == "juez":
        assigned_modalities = current_user.modalidades_asignadas or []
        if assigned_modalities:
            normalized_assigned_modalities = {
                normalize_modalidad_key(modality)
                for modality in assigned_modalities
                if modality.strip()
            }
            if modalidad and modalidad.strip():
                requested_modalidad = normalize_modalidad_key(modalidad)
                if requested_modalidad not in normalized_assigned_modalities:
                    return []
                query = query.filter(build_modalidad_match_clause(modalidad))
            else:
                query = query.filter(
                    or_(
                        *[
                            build_modalidad_match_clause(modality)
                            for modality in assigned_modalities
                            if modality.strip()
                        ]
                    )
                )
        else:
            # Judge with no modalities assigned sees no participants
            return []
    elif modalidad:
        # Admin or other roles can filter by specific modalidad
        query = query.filter(build_modalidad_match_clause(modalidad))
    
    if categoria:
        query = query.filter(Participant.categoria.ilike(f"%{categoria.strip()}%"))

    return (
        query.order_by(
            Participant.evento_id.desc(),
            Participant.modalidad.asc(),
            Participant.categoria.asc(),
            Participant.nombres_apellidos.asc(),
        ).all()
    )


@router.post("/upload", response_model=ParticipantUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_participants_excel(
    file: UploadFile = File(...),
    evento_id: int = Form(...),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    ensure_event_exists(evento_id, db)

    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos .xlsx",
        )

    file_content = await file.read()
    if not file_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo está vacío",
        )

    try:
        dataframe = pd.read_excel(BytesIO(file_content))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se pudo leer el archivo Excel: {exc}",
        ) from exc

    if dataframe.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene filas para importar",
        )

    column_map = resolve_excel_columns(dataframe.columns.tolist())

    existing_plates = {
        plate
        for (plate,) in (
            db.query(Participant.placa_rodaje)
            .filter(Participant.evento_id == evento_id)
            .all()
        )
    }

    created_items: list[Participant] = []
    skipped_items: list[dict[str, str]] = []
    pending_plates: set[str] = set()

    for row_index, row in dataframe.iterrows():
        payload: dict[str, object] = {}
        for field_name, source_column in column_map.items():
            cell_value = row[source_column]
            if field_name in REQUIRED_FIELDS:
                payload[field_name] = clean_cell(cell_value)
            else:
                payload[field_name] = clean_optional_cell(cell_value)

        missing_fields = [
            field_name
            for field_name in REQUIRED_FIELDS.keys()
            if not payload.get(field_name)
        ]
        if missing_fields:
            skipped_items.append(
                {
                    "row": str(row_index + 2),
                    "reason": f"Campos vacíos: {', '.join(missing_fields)}",
                }
            )
            continue

        # Legacy mapping: completar campos que SQLite ya tiene como NOT NULL.
        payload["nombre_competidor"] = payload["nombres_apellidos"]
        payload["auto_marca_modelo"] = payload["marca_modelo"]
        payload["placa_matricula"] = payload["placa_rodaje"]

        plate = payload["placa_rodaje"]
        if plate in existing_plates or plate in pending_plates:
            skipped_items.append(
                {
                    "row": str(row_index + 2),
                    "reason": f"Placa duplicada: {plate}",
                }
            )
            continue

        participant = Participant(**payload)
        participant.evento_id = evento_id
        created_items.append(participant)
        pending_plates.add(plate)

    if created_items:
        db.bulk_save_objects(created_items)
        db.commit()

    inserted_records = (
        db.query(Participant)
        .filter(Participant.placa_rodaje.in_(list(pending_plates)))
        .order_by(Participant.id.asc())
        .all()
        if pending_plates
        else []
    )

    return ParticipantUploadResponse(
        created_count=len(inserted_records),
        skipped_count=len(skipped_items),
        total_rows=len(dataframe.index),
        created_items=[ParticipantResponse.model_validate(item) for item in inserted_records],
        skipped_items=skipped_items,
    )
