from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import Category, Modality, User
from schemas import CategoryCreate, CategoryResponse, CategoryUpdate, ModalityCreate, ModalityResponse
from utils.dependencies import get_current_admin, get_current_user

router = APIRouter(prefix="/api/modalities", tags=["categories"])


@router.get("", response_model=list[ModalityResponse])
def list_modalities(
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all modalities with their nested categories."""
    modalities = (
        db.query(Modality)
        .options(joinedload(Modality.categories))
        .order_by(Modality.nombre.asc())
        .all()
    )
    return modalities


@router.post("", response_model=ModalityResponse, status_code=status.HTTP_201_CREATED)
def create_modality(
    payload: ModalityCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new modality."""
    existing = db.query(Modality).filter(Modality.nombre == payload.nombre.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una modalidad con ese nombre",
        )

    modality = Modality(nombre=payload.nombre.strip())
    db.add(modality)
    db.commit()
    db.refresh(modality)
    return modality


@router.post(
    "/{modality_id}/categories",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    modality_id: int,
    payload: CategoryCreate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Create a new category within a modality."""
    modality = db.query(Modality).filter(Modality.id == modality_id).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidad no encontrada",
        )

    existing = (
        db.query(Category)
        .filter(
            Category.modality_id == modality_id,
            Category.nombre == payload.nombre.strip(),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una categoría con ese nombre en esta modalidad",
        )

    category = Category(
        nombre=payload.nombre.strip(),
        level=payload.level,
        modality_id=modality_id,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put(
    "/categories/{category_id}",
    response_model=CategoryResponse,
)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update an existing category (name and/or level)."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
        )

    # Check for name uniqueness if changing name
    if payload.nombre is not None:
        nombre_stripped = payload.nombre.strip()
        existing = (
            db.query(Category)
            .filter(
                Category.modality_id == category.modality_id,
                Category.nombre == nombre_stripped,
                Category.id != category_id,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una categoría con ese nombre en esta modalidad",
            )
        category.nombre = nombre_stripped

    # Update level if provided
    if payload.level is not None:
        category.level = payload.level

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=status.HTTP_200_OK)
def delete_category(
    category_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a category by ID."""
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Categoría no encontrada",
        )

    db.delete(category)
    db.commit()
    return {"message": "Categoría eliminada correctamente"}


@router.delete("/{modality_id}", status_code=status.HTTP_200_OK)
def delete_modality(
    modality_id: int,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Delete a modality and all its categories (cascade)."""
    modality = db.query(Modality).filter(Modality.id == modality_id).first()
    if modality is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modalidad no encontrada",
        )

    db.delete(modality)
    db.commit()
    return {"message": "Modalidad y sus categorías eliminadas correctamente"}
