import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import models  # noqa: F401
from database import Base, engine, run_sqlite_migrations
from routes.auth import router as auth_router
from routes.evaluation_templates import router as evaluation_templates_router
from routes.events import router as events_router
from routes.judge_assignments import router as judge_assignments_router
from routes.modalities import router as modalities_router
from routes.participants import router as participants_router
from routes.regulations import router as regulations_router
from routes.scorecards import router as scorecards_router
from routes.users import router as users_router


# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)

Base.metadata.create_all(bind=engine)
run_sqlite_migrations()

app = FastAPI(title="Juzgamiento Car Audio y Tuning")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(evaluation_templates_router)
app.include_router(events_router)
app.include_router(judge_assignments_router)
app.include_router(modalities_router)
app.include_router(participants_router)
app.include_router(users_router)
app.include_router(scorecards_router)
app.include_router(regulations_router)

# Mount uploads directory for static file serving
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "ok"}
