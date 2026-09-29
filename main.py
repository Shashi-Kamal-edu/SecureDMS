from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.middleware.response_envelope import register_exception_handlers
from app.routes import audit, auth, cases, dashboard, documents, reports, search, users

app = FastAPI(
    title=settings.APP_NAME,
    description="Secure Digital Document Management System for Legal and Investigation Documents.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(users.router, prefix=settings.API_PREFIX)
app.include_router(cases.router, prefix=settings.API_PREFIX)
app.include_router(documents.router, prefix=settings.API_PREFIX)
app.include_router(search.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(reports.router, prefix=settings.API_PREFIX)


@app.on_event("startup")
def on_startup() -> None:
    os.makedirs(settings.STORAGE_DIRECTORY, exist_ok=True)
    # For local/dev convenience only. In production, use:
    #   alembic upgrade head
    if settings.ENVIRONMENT == "development" or settings.TESTING:
        init_db()


@app.get("/")
def root():
    return {
        "success": True,
        "message": f"{settings.APP_NAME} API is running.",
        "data": {"docs": "/docs"},
    }


@app.get("/health")
def health():
    return {"success": True, "message": "healthy", "data": None}
