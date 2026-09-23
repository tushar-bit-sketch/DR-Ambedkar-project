import os
import csv
import json
import io
import re
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from datetime import datetime

from app.db.models import Document, Collection, Author, Language, ArchivalFile, DocumentVersion, DocumentMetadata, AuditLog
from app.schemas.import_schema import ImportItem, ImportReportOut
from app.services.storage import StorageService

def generate_archive_id(doc_type: str, year: Any) -> str:
    y = str(year) if year else "HIST"
    clean_type = re.sub(r'[^A-Z]', '', str(doc_type).upper())[:4] or "DOC"
    import uuid
    uid = uuid.uuid4().hex[:6].upper()
    return f"AMB-{clean_type}-{y}-{uid}"

def slugify(text: str) -> str:
    slug = re.sub(r'[^\w\s-]', '', text.lower())
    slug = re.sub(r'[-\s]+', '-', slug).strip('-')
    return slug[:100]

class ArchivalImporter:
    @staticmethod
    def parse_payload(content: str, filename: str) -> List[Dict[str, Any]]:
        """Parses CSV or JSON text into a list of document dicts."""
        is_json = filename.lower().endswith(".json") or content.strip().startswith("[")
        if is_json:
            try:
                data = json.loads(content)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict) and "documents" in data:
                    return data["documents"]
                else:
                    return [data]
            except Exception as e:
                raise ValueError(f"Invalid JSON format: {str(e)}")
        else:
            # Assume CSV
            try:
                reader = csv.DictReader(io.StringIO(content))
                rows = [row for row in reader]
                return rows
            except Exception as e:
                raise ValueError(f"Invalid CSV format: {str(e)}")

    @staticmethod
    def process_import(items: List[Dict[str, Any]], db: Session, user_id: int = 1) -> ImportReportOut:
        report = ImportReportOut(
            total_processed=len(items),
            imported_count=0,
            skipped_count=0,
            failed_count=0,
            duplicates_count=0,
            duplicate_identifiers=[],
            duplicate_checksums=[],
            errors=[],
            imported_documents=[]
        )

        for idx, item in enumerate(items):
            try:
                title = str(item.get("title", "")).strip()
                if not title:
                    report.failed_count += 1
                    report.errors.append(f"Row {idx + 1}: Missing required 'title' field.")
                    continue

                source_id = str(item.get("source_identifier", "")).strip() or None
                # Check duplicate source_identifier
                if source_id:
                    existing = db.query(Document).filter(
                        Document.source_identifier == source_id,
                        Document.is_deleted == False
                    ).first()
                    if existing:
                        report.duplicates_count += 1
                        report.skipped_count += 1
                        report.duplicate_identifiers.append(source_id)
                        report.errors.append(f"Row {idx + 1}: Duplicate source identifier '{source_id}' already exists as Document #{existing.id}.")
                        continue

                # File check if file_path specified
                file_record = None
                file_path = item.get("file_path")
                if file_path:
                    abs_path = StorageService.get_absolute_path(file_path)
                    if os.path.exists(abs_path):
                        import hashlib
                        sha = hashlib.sha256()
                        with open(abs_path, "rb") as f:
                            while chunk := f.read(65536):
                                sha.update(chunk)
                        file_checksum = sha.hexdigest()
                        
                        # Check duplicate checksum
                        dup_file = db.query(ArchivalFile).filter(ArchivalFile.checksum == file_checksum).first()
                        if dup_file:
                            report.duplicates_count += 1
                            report.duplicate_checksums.append(file_checksum)
                            report.errors.append(f"Row {idx + 1}: File checksum {file_checksum[:12]} already registered with ArchivalFile #{dup_file.id}.")
                        else:
                            size = os.path.getsize(abs_path)
                            file_record = ArchivalFile(
                                filename=os.path.basename(abs_path),
                                original_filename=os.path.basename(abs_path),
                                mime_type="application/pdf" if abs_path.endswith(".pdf") else "text/plain",
                                file_size_bytes=size,
                                storage_path=file_path,
                                checksum=file_checksum,
                                uploaded_by=user_id,
                                integrity_status="VALID",
                                last_integrity_check=datetime.utcnow()
                            )
                            db.add(file_record)
                            db.flush()

                # Find or create collection
                coll_id = None
                coll_name = item.get("collection_name") or item.get("collection")
                if coll_name:
                    coll = db.query(Collection).filter(Collection.name.ilike(coll_name.strip())).first()
                    if not coll:
                        coll = Collection(
                            name=coll_name.strip(),
                            title=coll_name.strip(),
                            slug=slugify(coll_name.strip()),
                            source=item.get("source_name", "Dr. Ambedkar Foundation"),
                            description=f"Curated collection for {coll_name.strip()}"
                        )
                        db.add(coll)
                        db.flush()
                    coll_id = coll.id

                # Year parse
                year_val = None
                raw_year = item.get("year")
                if raw_year and str(raw_year).isdigit():
                    year_val = int(raw_year)

                doc_type = str(item.get("document_type", "BOOK")).upper()
                archive_id = item.get("archive_id") or generate_archive_id(doc_type, year_val)
                slug_val = slugify(title) + f"-{archive_id.split('-')[-1].lower()}"

                new_doc = Document(
                    archive_id=archive_id,
                    title=title,
                    subtitle=item.get("subtitle"),
                    slug=slug_val,
                    description=item.get("description"),
                    document_type=doc_type,
                    collection_id=coll_id,
                    creator=item.get("creator") or item.get("author") or "Dr. B. R. Ambedkar",
                    date=str(item.get("date")) if item.get("date") else None,
                    date_created=str(item.get("date")) if item.get("date") else None,
                    date_precision=str(item.get("date_precision", "EXACT")),
                    year=year_val,
                    language=str(item.get("language", "English")),
                    original_language=item.get("original_language"),
                    location=item.get("location"),
                    publisher=item.get("publisher"),
                    source_name=str(item.get("source_name", "Dr. Ambedkar Foundation")),
                    source_url=item.get("source_url"),
                    source_identifier=source_id,
                    rights=str(item.get("rights", "Public Domain / Institutional Heritage Access")),
                    access_level=str(item.get("access_level", "PUBLIC")),
                    keywords=item.get("keywords"),
                    status="PUBLISHED" if item.get("verified", True) else "UNDER_REVIEW",
                    verification_status="VERIFIED" if item.get("verified", True) else "UNVERIFIED",
                    is_demo_data=bool(item.get("is_demo_data", False)),
                    checksum=file_record.checksum if file_record else None
                )
                db.add(new_doc)
                db.flush()

                # Add version
                version_record = DocumentVersion(
                    document_id=new_doc.id,
                    version_number=1,
                    file_id=file_record.id if file_record else None,
                    file_path=file_record.storage_path if file_record else None,
                    file_format="PDF" if file_path and file_path.endswith(".pdf") else "TXT",
                    file_size_bytes=file_record.file_size_bytes if file_record else None,
                    checksum=file_record.checksum if file_record else None,
                    change_description="Initial accession via institutional batch import",
                    created_by=user_id
                )
                db.add(version_record)

                # Add Dublin Core metadata entries
                dc_entries = [
                    ("dc.title", new_doc.title),
                    ("dc.creator", new_doc.creator or "Dr. B. R. Ambedkar"),
                    ("dc.date", str(new_doc.date or new_doc.year or "")),
                    ("dc.identifier", new_doc.archive_id),
                    ("dc.source", str(new_doc.source_name)),
                    ("dc.rights", str(new_doc.rights)),
                    ("dc.language", new_doc.language)
                ]
                for k, v in dc_entries:
                    if v:
                        db.add(DocumentMetadata(document_id=new_doc.id, key=k, value=str(v)))

                # Add Audit Log
                audit = AuditLog(
                    user_id=user_id,
                    action="IMPORT_EXECUTED",
                    entity="DOCUMENT",
                    entity_id=new_doc.archive_id,
                    description=f"Batch imported document '{new_doc.title}' from source '{new_doc.source_name}'.",
                    result="SUCCESS"
                )
                db.add(audit)
                db.commit()

                report.imported_count += 1
                report.imported_documents.append({
                    "id": new_doc.id,
                    "archive_id": new_doc.archive_id,
                    "title": new_doc.title,
                    "document_type": new_doc.document_type,
                    "source_identifier": new_doc.source_identifier
                })

            except Exception as row_err:
                db.rollback()
                report.failed_count += 1
                report.errors.append(f"Row {idx + 1} processing error: {str(row_err)}")

        return report
