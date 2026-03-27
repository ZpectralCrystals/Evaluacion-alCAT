import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker


# 1. Definimos la ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent

# 2. FIX APLICADO: Ruta directa y absoluta para evitar el error 'None' de variables de entorno
DATABASE_URL = f"sqlite:///{BASE_DIR / 'app.db'}"


class Base(DeclarativeBase):
    pass


# 3. Creación del motor con la ruta ya asegurada
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def run_sqlite_migrations():
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        participant_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(participants)")).fetchall()
        }

        if participant_columns and "evento_id" not in participant_columns:
            connection.execute(
                text(
                    "ALTER TABLE participants ADD COLUMN evento_id INTEGER REFERENCES events(id)"
                )
            )
            connection.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS ix_participants_evento_id ON participants (evento_id)"
                )
            )

        # Campos nuevos de participantes (compatibilidad hacia adelante).
        # Se agregan columnas si no existen y se backfillean desde los campos viejos
        # para no romper datos previamente cargados.
        def add_column_if_missing(column_name: str, ddl: str) -> None:
            nonlocal participant_columns
            if column_name not in participant_columns:
                connection.execute(text(ddl))
                participant_columns.add(column_name)

        add_column_if_missing("nombres_apellidos", "ALTER TABLE participants ADD COLUMN nombres_apellidos TEXT")
        add_column_if_missing("dni", "ALTER TABLE participants ADD COLUMN dni TEXT")
        add_column_if_missing("telefono", "ALTER TABLE participants ADD COLUMN telefono TEXT")
        add_column_if_missing("correo", "ALTER TABLE participants ADD COLUMN correo TEXT")
        add_column_if_missing("club_team", "ALTER TABLE participants ADD COLUMN club_team TEXT")
        add_column_if_missing("marca_modelo", "ALTER TABLE participants ADD COLUMN marca_modelo TEXT")
        add_column_if_missing("placa_rodaje", "ALTER TABLE participants ADD COLUMN placa_rodaje TEXT")

        # Backfill desde columnas antiguas si existen.
        if "nombre_competidor" in participant_columns and "nombres_apellidos" in participant_columns:
            connection.execute(
                text(
                    "UPDATE participants SET nombres_apellidos = nombre_competidor WHERE nombres_apellidos IS NULL OR TRIM(nombres_apellidos) = ''"
                )
            )
        if "auto_marca_modelo" in participant_columns and "marca_modelo" in participant_columns:
            connection.execute(
                text(
                    "UPDATE participants SET marca_modelo = auto_marca_modelo WHERE marca_modelo IS NULL OR TRIM(marca_modelo) = ''"
                )
            )
        if "placa_matricula" in participant_columns and "placa_rodaje" in participant_columns:
            connection.execute(
                text(
                    "UPDATE participants SET placa_rodaje = placa_matricula WHERE placa_rodaje IS NULL OR TRIM(placa_rodaje) = ''"
                )
            )

        # Categoria real por FK.
        if "category_id" not in participant_columns:
            connection.execute(
                text(
                    "ALTER TABLE participants ADD COLUMN category_id INTEGER REFERENCES categories(id)"
                )
            )
            participant_columns.add("category_id")

        category_columns = {
            row[1]
            for row in connection.execute(text("PRAGMA table_info(categories)")).fetchall()
        }
        if category_columns and "level" not in category_columns:
            connection.execute(
                text("ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1")
            )
            category_columns.add("level")

        if "level" in category_columns:
            connection.execute(
                text(
                    """
                    UPDATE categories
                    SET level = CASE
                        WHEN LOWER(TRIM(nombre)) LIKE 'intro%' THEN 1
                        WHEN LOWER(TRIM(nombre)) LIKE 'aficionado%' THEN 2
                        WHEN LOWER(TRIM(nombre)) LIKE 'pro%' THEN 3
                        WHEN LOWER(TRIM(nombre)) LIKE 'master%' OR LOWER(TRIM(nombre)) LIKE 'máster%' THEN 4
                        ELSE COALESCE(level, 1)
                    END
                    """
                )
            )

        if "category_id" in participant_columns:
            connection.execute(
                text(
                    """
                    UPDATE participants
                    SET category_id = (
                        SELECT c.id
                        FROM categories c
                        JOIN modalities m ON m.id = c.modality_id
                        WHERE LOWER(TRIM(m.nombre)) = LOWER(TRIM(participants.modalidad))
                          AND LOWER(TRIM(c.nombre)) = LOWER(TRIM(participants.categoria))
                        LIMIT 1
                    )
                    WHERE category_id IS NULL
                    """
                )
            )

        score_card_tables = connection.execute(
            text(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'score_cards'"
            )
        ).fetchall()
        if score_card_tables:
            score_card_columns = {
                row[1]
                for row in connection.execute(text("PRAGMA table_info(score_cards)")).fetchall()
            }
            legacy_score_card_schema = (
                "judge_id" in score_card_columns
                or "status" not in score_card_columns
            )

            if legacy_score_card_schema:
                legacy_backup_exists = connection.execute(
                    text(
                        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'score_cards_legacy'"
                    )
                ).fetchall()

                if not legacy_backup_exists:
                    connection.execute(text("ALTER TABLE score_cards RENAME TO score_cards_legacy"))
                else:
                    connection.execute(text("DROP TABLE score_cards"))

                connection.execute(
                    text(
                        """
                        CREATE TABLE score_cards (
                            id INTEGER NOT NULL PRIMARY KEY,
                            participant_id INTEGER NOT NULL,
                            template_id INTEGER NOT NULL,
                            answers JSON NOT NULL,
                            status VARCHAR(20) NOT NULL DEFAULT 'draft',
                            calculated_level INTEGER NOT NULL DEFAULT 1,
                            total_score FLOAT NOT NULL DEFAULT 0,
                            CONSTRAINT uq_score_cards_participant UNIQUE (participant_id),
                            FOREIGN KEY(participant_id) REFERENCES participants (id),
                            FOREIGN KEY(template_id) REFERENCES evaluation_templates (id)
                        )
                        """
                    )
                )
