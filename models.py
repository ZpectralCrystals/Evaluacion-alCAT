from datetime import date
from typing import Any, Optional

from sqlalchemy import Boolean, Date, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    can_edit_scores: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    modalidades_asignadas: Mapped[list] = mapped_column(JSON, default=list, server_default="[]")

    scores: Mapped[list["Score"]] = relationship(back_populates="judge")
    judge_assignments: Mapped[list["JudgeAssignment"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    fecha: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    participants: Mapped[list["Participant"]] = relationship(
        back_populates="event",
        cascade="all, delete-orphan",
    )


class Participant(Base):
    __tablename__ = "participants"
    __table_args__ = (
        UniqueConstraint("evento_id", "placa_rodaje", name="uq_participants_evento_placa_rodaje"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    evento_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("events.id"),
        nullable=False,
        index=True,
    )
    nombres_apellidos: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    # Campos legacy (existen en el SQLite actual con constraint NOT NULL).
    # Se mantienen para que las inserciones no fallen hasta que se reconstruya la tabla.
    nombre_competidor: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    auto_marca_modelo: Mapped[str] = mapped_column(String(150), nullable=False)
    dni: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    correo: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    club_team: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    category_id: Mapped[Optional[int]] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    marca_modelo: Mapped[str] = mapped_column(String(150), nullable=False)
    modalidad: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    placa_matricula: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    placa_rodaje: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    event: Mapped[Optional["Event"]] = relationship(back_populates="participants")
    scores: Mapped[list["Score"]] = relationship(
        back_populates="participant",
        cascade="all, delete-orphan",
    )
    category: Mapped[Optional["Category"]] = relationship(back_populates="participants")
    score_card: Mapped[Optional["ScoreCard"]] = relationship(
        back_populates="participant",
        cascade="all, delete-orphan",
        uselist=False,
    )


class FormTemplate(Base):
    __tablename__ = "form_templates"
    __table_args__ = (
        UniqueConstraint("modalidad", "categoria", name="uq_form_templates_modalidad_categoria"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    modalidad: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    categoria: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    estructura_json: Mapped[Any] = mapped_column(JSON, nullable=False)

    scores: Mapped[list["Score"]] = relationship(back_populates="template")


class Score(Base):
    __tablename__ = "scores"
    __table_args__ = (
        UniqueConstraint("juez_id", "participante_id", name="uq_scores_juez_participante"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    juez_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    participante_id: Mapped[int] = mapped_column(ForeignKey("participants.id"), nullable=False, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("form_templates.id"), nullable=False, index=True)
    puntaje_total: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    datos_calificacion: Mapped[dict] = mapped_column(JSON, nullable=False)

    judge: Mapped["User"] = relationship(back_populates="scores")
    participant: Mapped["Participant"] = relationship(back_populates="scores")
    template: Mapped["FormTemplate"] = relationship(back_populates="scores")


class EvaluationTemplate(Base):
    __tablename__ = "evaluation_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    modality_id: Mapped[int] = mapped_column(
        ForeignKey("modalities.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    content: Mapped[dict] = mapped_column(JSON, nullable=False)

    modality: Mapped["Modality"] = relationship(back_populates="evaluation_template")
    score_cards: Mapped[list["ScoreCard"]] = relationship(back_populates="template")


class JudgeAssignment(Base):
    __tablename__ = "judge_assignments"
    __table_args__ = (
        UniqueConstraint("user_id", "modality_id", name="uq_judge_assignments_user_modality"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    modality_id: Mapped[int] = mapped_column(ForeignKey("modalities.id"), nullable=False, index=True)
    assigned_sections: Mapped[list] = mapped_column(JSON, nullable=False, default=list, server_default="[]")
    is_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="judge_assignments")
    modality: Mapped["Modality"] = relationship(back_populates="judge_assignments")


class ScoreCard(Base):
    __tablename__ = "score_cards"
    __table_args__ = (
        UniqueConstraint("participant_id", name="uq_score_cards_participant"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    participant_id: Mapped[int] = mapped_column(ForeignKey("participants.id"), nullable=False, index=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("evaluation_templates.id"), nullable=False, index=True)
    answers: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft", server_default="draft")
    calculated_level: Mapped[int] = mapped_column(nullable=False, default=1)
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0)

    participant: Mapped["Participant"] = relationship(back_populates="score_card")
    template: Mapped["EvaluationTemplate"] = relationship(back_populates="score_cards")


class Regulation(Base):
    __tablename__ = "regulations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    modalidad: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    archivo_url: Mapped[str] = mapped_column(String(500), nullable=False)


class Modality(Base):
    __tablename__ = "modalities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)

    categories: Mapped[list["Category"]] = relationship(
        back_populates="modality",
        cascade="all, delete-orphan",
    )
    evaluation_template: Mapped[Optional["EvaluationTemplate"]] = relationship(
        back_populates="modality",
        cascade="all, delete-orphan",
        uselist=False,
    )
    judge_assignments: Mapped[list["JudgeAssignment"]] = relationship(
        back_populates="modality",
        cascade="all, delete-orphan",
    )


class Category(Base):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("modality_id", "nombre", name="uq_categories_modality_nombre"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    level: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
    modality_id: Mapped[int] = mapped_column(ForeignKey("modalities.id"), nullable=False, index=True)

    modality: Mapped["Modality"] = relationship(back_populates="categories")
    participants: Mapped[list["Participant"]] = relationship(back_populates="category")
    subcategories: Mapped[list["Subcategory"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
    )


class Subcategory(Base):
    __tablename__ = "subcategories"
    __table_args__ = (
        UniqueConstraint("category_id", "nombre", name="uq_subcategories_category_nombre"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False, index=True)

    category: Mapped["Category"] = relationship(back_populates="subcategories")
