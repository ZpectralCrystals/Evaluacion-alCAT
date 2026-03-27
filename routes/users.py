from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import (
    UserCredentialsUpdate,
    UserCreate,
    UserModalidadesUpdate,
    UserPermissionUpdate,
    UserResponse,
)
from utils.dependencies import get_current_admin, get_current_user, get_optional_current_user
from utils.security import hash_password, verify_password


from pydantic import BaseModel, Field


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(..., min_length=4, max_length=128)
    new_password: str = Field(..., min_length=4, max_length=128)


router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user


@router.get("", response_model=list[UserResponse])
def list_users(
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return db.query(User).order_by(User.id.asc()).all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    users_count = db.query(User).count()

    if users_count == 0:
        if payload.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El primer usuario del sistema debe ser administrador",
            )
    elif current_user is None or current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo un administrador puede crear usuarios",
        )

    existing_user = db.query(User).filter(User.username == payload.username.strip()).first()
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El nombre de usuario ya existe",
        )

    user = User(
        username=payload.username.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        can_edit_scores=payload.can_edit_scores,
        modalidades_asignadas=[m.strip() for m in payload.modalidades_asignadas if m.strip()] if payload.modalidades_asignadas else [],
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/permissions", response_model=UserResponse)
def update_user_permissions(
    user_id: int,
    payload: UserPermissionUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    user.can_edit_scores = payload.can_edit_scores
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/modalidades", response_model=UserResponse)
def update_user_modalidades(
    user_id: int,
    payload: UserModalidadesUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """Update the list of modalities a judge is assigned to."""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    if user.role != "juez":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo los jueces pueden tener modalidades asignadas",
        )

    user.modalidades_asignadas = [m.strip() for m in payload.modalidades_asignadas if m.strip()]
    db.commit()
    db.refresh(user)
    return user


@router.patch(
    "/{user_id}/credentials",
    response_model=UserResponse,
)
def update_user_credentials(
    user_id: int,
    payload: UserCredentialsUpdate,
    _: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    if user.role != "juez":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los jueces pueden actualizar sus credenciales",
        )

    if payload.username is None and payload.password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar al menos 'username' o 'password'",
        )

    if payload.username is not None:
        desired_username = payload.username.strip()
        if not desired_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El username no puede estar vacío",
            )

        existing_user = (
            db.query(User)
            .filter(User.username == desired_username, User.id != user_id)
            .first()
        )
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya existe",
            )

        user.username = desired_username

    if payload.password is not None:
        user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/me/credentials", response_model=UserResponse)
def update_own_credentials(
    payload: UserCredentialsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow any authenticated user to update their own credentials."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden usar esta función",
        )

    if payload.username is None and payload.password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes enviar al menos 'username' o 'password'",
        )

    if payload.username is not None:
        desired_username = payload.username.strip()
        if not desired_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El username no puede estar vacío",
            )

        existing_user = (
            db.query(User)
            .filter(User.username == desired_username, User.id != current_user.id)
            .first()
        )
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El nombre de usuario ya existe",
            )

        current_user.username = desired_username

    if payload.password is not None:
        current_user.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(current_user)
    return current_user


@router.put("/me/password", response_model=UserResponse)
def change_own_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allow any authenticated user to change their own password."""
    # Verify current password
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta",
        )

    # Hash and update new password
    current_user.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(current_user)
    return current_user
