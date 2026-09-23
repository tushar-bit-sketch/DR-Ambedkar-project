from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from app.db.session import get_db
from app.db.models import User
from app.api.v1.endpoints.auth import require_role
from app.schemas.import_schema import ImportReportOut
from app.services.importer import ArchivalImporter

router = APIRouter()

class JsonImportPayload(BaseModel):
    documents: List[Dict[str, Any]]

@router.post("", response_model=ImportReportOut)
async def import_archival_dataset(
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    if not file:
        raise HTTPException(status_code=400, detail="Import dataset file (CSV or JSON) required.")

    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content_bytes.decode("latin-1")

    try:
        items = ArchivalImporter.parse_payload(content_str, file.filename or "import.json")
    except ValueError as parse_err:
        raise HTTPException(status_code=400, detail=str(parse_err))

    report = ArchivalImporter.process_import(items, db=db, user_id=current_user.id)
    return report

@router.post("/json", response_model=ImportReportOut)
def import_archival_json(
    payload: JsonImportPayload,
    current_user: User = Depends(require_role(["SUPER_ADMIN", "ARCHIVIST"])),
    db: Session = Depends(get_db)
):
    report = ArchivalImporter.process_import(payload.documents, db=db, user_id=current_user.id)
    return report
