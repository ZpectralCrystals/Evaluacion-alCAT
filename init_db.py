#!/usr/bin/env python3
"""
Script para crear todas las tablas en la base de datos.
Ejecutar: python init_db.py
"""

from database import engine, Base

# Importar todos los modelos para que SQLAlchemy los registre
from models import (
    User,
    Event,
    Participant,
    FormTemplate,
    Score,
    Regulation,
    Modality,
    Category,
    Subcategory,
)


def create_tables():
    """Create all database tables."""
    print("Creando tablas en la base de datos...")
    Base.metadata.create_all(bind=engine)
    print("✓ Tablas creadas exitosamente")


if __name__ == "__main__":
    create_tables()
