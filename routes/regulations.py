import os
import shutil
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from database import get_db
from models import Regulation, User
from schemas import RegulationResponse
from utils.dependencies import get_current_admin, get_current_user


router = APIRouter(prefix="/api/regulations", tags=["regulations"])

UPLOAD_DIR = "uploads"


@router.post("", response_model=RegulationResponse, status_code=status.HTTP_201_CREATED)
async def create_regulation(
    titulo: str = Form(...),
    modalidad: str = Form(...),
    file: UploadFile = File(...),
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Upload a new regulation PDF file."""
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos PDF",
        )

    # Generate unique filename
    file_extension = ".pdf"
    unique_filename = f"{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Save file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error al guardar el archivo: {exc}",
        ) from exc
    finally:
        file.file.close()

    # Create database record
    archivo_url = f"/uploads/{unique_filename}"
    regulation = Regulation(
        titulo=titulo.strip(),
        modalidad=modalidad.strip(),
        archivo_url=archivo_url,
    )
    db.add(regulation)
    db.commit()
    db.refresh(regulation)

    return regulation


@router.get("", response_model=list[RegulationResponse])
def list_regulations(
    modalidad: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all regulations. Optionally filter by modalidad."""
    query = db.query(Regulation)

    if modalidad:
        query = query.filter(Regulation.modalidad.ilike(f"%{modalidad.strip()}%"))

    return query.order_by(Regulation.modalidad.asc(), Regulation.titulo.asc()).all()


@router.delete("/{regulation_id}", status_code=status.HTTP_200_OK)
def delete_regulation(
    regulation_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a regulation and its associated file."""
    regulation = db.query(Regulation).filter(Regulation.id == regulation_id).first()
    if regulation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reglamento no encontrado",
        )

    # Delete physical file
    try:
        file_path = regulation.archivo_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception:
        # Log error but continue with database deletion
        pass

    # Delete database record
    db.delete(regulation)
    db.commit()

    return {"message": "Reglamento eliminado correctamente"}
