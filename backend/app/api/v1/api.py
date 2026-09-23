from fastapi import APIRouter
from app.api.v1.endpoints import (
    health, documents, collections, timeline, media, auth, admin, research, files, search, import_pipeline, ocr,
    translations, audio, languages, entities, graph, provenance, kiosk, admin_kiosks, demo, system_status
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(system_status.router, prefix="/system", tags=["System Status"])
api_router.include_router(demo.router, prefix="/demo", tags=["SIH Demo Mode"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents & Ingestion"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["OCR & Manuscript Digitization"])
api_router.include_router(collections.router, prefix="/collections", tags=["Collections"])
api_router.include_router(files.router, prefix="/files", tags=["Archival File Storage"])
api_router.include_router(search.router, prefix="/search", tags=["Archival Metadata Search"])
api_router.include_router(import_pipeline.router, prefix="/import", tags=["Batch Import Pipeline"])
api_router.include_router(timeline.router, prefix="/timeline", tags=["Timeline"])
api_router.include_router(media.router, prefix="/media", tags=["Media"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & RBAC"])
api_router.include_router(admin.router, prefix="/admin", tags=["Archival Administration"])
api_router.include_router(admin_kiosks.router, prefix="/admin/kiosks", tags=["Admin Kiosk Management"])
api_router.include_router(kiosk.router, prefix="/kiosk", tags=["Kiosk Terminals"])
api_router.include_router(research.router, prefix="/research", tags=["AI Research Assistant"])
api_router.include_router(translations.router, prefix="/translations", tags=["Multilingual Translations"])
api_router.include_router(audio.router, prefix="/audio", tags=["Audio Narration & Voice"])
api_router.include_router(languages.router, prefix="/languages", tags=["Languages & System Diagnostics"])
api_router.include_router(entities.router, prefix="/entities", tags=["Knowledge Graph Entities"])
api_router.include_router(graph.router, prefix="/graph", tags=["Knowledge Graph Engine"])
api_router.include_router(provenance.router, prefix="/provenance", tags=["Archival Provenance"])

