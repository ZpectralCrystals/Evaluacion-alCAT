#!/usr/bin/env python3
"""
Script de inicialización de base de datos.
Crea el Super Admin y carga las Modalidades/Categorías oficiales.
Ejecutar: python seed_init.py
"""

from database import SessionLocal
from models import User, Modality, Category
from utils.security import hash_password


def seed_database():
    """Initialize database with admin user and official modalities/categories."""
    db = SessionLocal()

    try:
        # ============================================
        # 1. CREAR SUPER ADMIN
        # ============================================
        admin_username = "admin"
        existing_admin = db.query(User).filter(User.username == admin_username).first()

        if existing_admin is None:
            admin_user = User(
                username=admin_username,
                password_hash=hash_password("admin1234"),
                role="admin",
                can_edit_scores=True,
                modalidades_asignadas=[],
            )
            db.add(admin_user)
            db.commit()
            print(f"✓ Super Admin creado: {admin_username} / admin1234")
        else:
            print(f"✓ Super Admin ya existe: {admin_username}")

        # ============================================
        # 2. CARGAR MODALIDADES Y CATEGORÍAS
        # ============================================
        data = {
            "SPL": ["Intro 1", "Intro 2", "Aficionado 1", "Aficionado 2", "Pro 1", "Pro 2", "Master"],
            "SQ": ["Intro", "Aficionado", "Pro", "Master"],
            "SQL": ["Intro", "Aficionado", "Pro", "Master"],
            "Street Show": ["Intro 1", "Intro 2", "Aficionado 1", "Aficionado 2", "Pro 1", "Pro 2", "Master", "Constructor"],
            "Tuning": ["Intro 1", "Intro 2", "Aficionado 1", "Aficionado 2", "Pro 1", "Pro 2", "Máster", "Clasico Tuning", "Clasico"],
            "Tuning VW": ["Clasico hasta el '73", "Contemporaneo > '73", "Intro VW", "Pro VW"],
        }

        for modality_name, categories in data.items():
            # Verificar si la modalidad ya existe
            existing_modality = (
                db.query(Modality).filter(Modality.nombre == modality_name).first()
            )

            if existing_modality is None:
                # Crear la modalidad
                modality = Modality(nombre=modality_name)
                db.add(modality)
                db.commit()
                db.refresh(modality)
                print(f"✓ Modalidad creada: {modality_name}")
            else:
                modality = existing_modality
                print(f"✓ Modalidad ya existe: {modality_name}")

            # Crear las categorías asociadas
            for category_name in categories:
                existing_category = (
                    db.query(Category)
                    .filter(
                        Category.nombre == category_name,
                        Category.modality_id == modality.id,
                    )
                    .first()
                )

                if existing_category is None:
                    category = Category(
                        nombre=category_name,
                        modality_id=modality.id,
                    )
                    db.add(category)
                    db.commit()
                    print(f"  ✓ Categoría creada: {category_name}")
                else:
                    print(f"  ✓ Categoría ya existe: {category_name}")

        print("\n" + "=" * 50)
        print("¡Base de datos inicializada con Admin y Modalidades!")
        print("=" * 50)
        print("\nCredenciales de acceso:")
        print("  Username: admin")
        print("  Password: admin1234")
        print("\nModalidades cargadas:", len(data))

    except Exception as e:
        db.rollback()
        print(f"\n✗ Error durante la inicialización: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    print("Inicializando base de datos...\n")
    seed_database()
