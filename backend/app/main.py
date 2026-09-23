from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.api.v1.api import api_router
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.seed import seed_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ambedkar-archive")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)

    # Seed initial demo data
    logger.info("Seeding initial archive collections and documents...")
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Database initialized and verified successfully.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Digital Heritage Archive for Memorials, Manuscripts & Ambedkar — Phase 10 Institutional Archive and Audio-Visual Knowledge Platform",
    version="2.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

from app.core.security_middleware import SecurityHeadersMiddleware

# Security headers, rate limiting, and request size middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level orchestrator health probes (compatible with standard Docker/K8s ingress)
from app.api.v1.endpoints.health import health_live, health_ready, health_dependencies, system_version

@app.get("/health/live", tags=["Probes"])
def top_health_live():
    return health_live()

@app.get("/health/ready", tags=["Probes"])
def top_health_ready():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        return health_ready(db=db)
    finally:
        db.close()

@app.get("/health/dependencies", tags=["Probes"])
def top_health_dependencies():
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        return health_dependencies(db=db)
    finally:
        db.close()

@app.get("/api/system/version", tags=["Probes"])
def top_system_version():
    return system_version()

@app.get("/system-status", tags=["Probes"])
def top_system_status():
    from app.api.v1.endpoints.system_status import get_system_subsystems_status
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        return get_system_subsystems_status(db=db)
    finally:
        db.close()

@app.get("/")

def root():
    return {
        "platform": settings.PROJECT_NAME,
        "phase": settings.ARCHIVE_PHASE,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_url": f"{settings.API_V1_STR}/health",
        "institutional_notice": "SIH26096 Institutional Digital Heritage Archive Foundation. Unauthorized commercial scraping prohibited."
    }

