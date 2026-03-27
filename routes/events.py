from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Event, User
from schemas import EventCreate, EventResponse, EventUpdate
from utils.dependencies import get_current_admin, get_current_user


router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=list[EventResponse])
def list_events(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(Event).order_by(Event.id.desc()).all()


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = Event(
        nombre=payload.nombre.strip(),
        fecha=payload.fecha,
        is_active=payload.is_active,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.patch(
    "/{event_id}",
    response_model=EventResponse,
)
def update_event(
    event_id: int,
    payload: EventUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado",
        )

    updated = False
    if payload.nombre is not None:
        event.nombre = payload.nombre.strip()
        updated = True
    if payload.fecha is not None:
        event.fecha = payload.fecha
        updated = True
    if payload.is_active is not None:
        event.is_active = payload.is_active
        updated = True

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar al menos uno de los campos: nombre, fecha, is_active",
        )
    db.commit()
    db.refresh(event)
    return event


@router.put("/{event_id}", response_model=EventResponse)
def full_update_event(
    event_id: int,
    payload: EventCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Full update of an event (nombre, fecha, is_active)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado",
        )

    event.nombre = payload.nombre.strip()
    event.fecha = payload.fecha
    event.is_active = payload.is_active
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_200_OK)
def delete_event(
    event_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete an event and all its participants and scores (cascade)."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento no encontrado",
        )

    db.delete(event)
    db.commit()
    return {"message": "Evento y todos sus participantes/scores eliminados correctamente"}
