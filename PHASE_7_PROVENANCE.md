# PHASE 7 PROVENANCE & ARCHIVAL VERIFIABILITY SPECIFICATION

**Project:** SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Layer:** Phase 7 Provenance Engine & Lineage Tracking  
**Status:** Production-Ready & Verified  

---

## 1. The 6-Step Unbroken Archival Lineage

Every edge in the Knowledge Graph and every milestone in the Historical Timeline must prove its archival grounding back to an immutable physical or institutional source.

```
┌────────────────────────────────────────────────────────┐
│ 1. Graph Relationship / Claim                          │
│    (e.g., Dr. Ambedkar CHAIRED Drafting Committee)     │
└───────────────────────────┬────────────────────────────┘
                            │ chunk_id
┌───────────────────────────▼────────────────────────────┐
│ 2. Search Chunk                                        │
│    (Exact text snippet, token count, content SHA-256)  │
└───────────────────────────┬────────────────────────────┘
                            │ ocr_page_id
┌───────────────────────────▼────────────────────────────┐
│ 3. OCR Folio Page                                      │
│    (Page number, image derivative, confidence score)   │
└───────────────────────────┬────────────────────────────┘
                            │ ocr_text_version_id
┌───────────────────────────▼────────────────────────────┐
│ 4. OCR Text Version                                    │
│    (Engine: Tesseract / PaddleOCR / Human correction)  │
└───────────────────────────┬────────────────────────────┘
                            │ document_version_id
┌───────────────────────────▼────────────────────────────┐
│ 5. Document Version                                    │
│    (File format, file size, master SHA-256 checksum)   │
└───────────────────────────┬────────────────────────────┘
                            │ source_document_id
┌───────────────────────────▼────────────────────────────┐
│ 6. Archival Master & Institutional Custodian           │
│    (Archive ID, Title, Physical Location, Collection)  │
└────────────────────────────────────────────────────────┘
```

---

## 2. Provenance Resolution Endpoint

Clients inspect this unbroken chain via the dedicated REST endpoint:
`GET /api/v1/provenance/relationship/{id}`

### Sample Payload Response
```json
{
  "claim_id": 1,
  "relationship": {
    "id": 1,
    "source_entity_id": 10,
    "target_entity_id": 14,
    "relationship_type": "CHAIRED",
    "confidence": 1.0,
    "confidence_label": "Direct primary source resolution",
    "provenance_type": "EXPLICIT_SOURCE_RELATION",
    "evidence_text": "On 29th August 1947, the Constituent Assembly appointed a Drafting Committee with Dr. B.R. Ambedkar as Chairman.",
    "evidence_reference": "Resolution of Constituent Assembly, Page 1",
    "verification_status": "APPROVED",
    "access_level": "PUBLIC"
  },
  "document": {
    "id": 37,
    "archive_id": "AMB-TEST-P7-001",
    "title": "Constitution Drafting Committee Resolution",
    "document_type": "HISTORICAL_RECORD",
    "verification_status": "VERIFIED",
    "source_institution": "Dr. Ambedkar Foundation"
  },
  "document_version": {
    "id": 12,
    "version_number": 1,
    "change_summary": "Original archival master ingestion"
  },
  "ocr_page": {
    "id": 45,
    "page_number": 1,
    "review_status": "APPROVED",
    "confidence_score": 0.98
  },
  "ocr_text_version": {
    "id": 50,
    "version_number": 1,
    "engine": "tesseract",
    "language": "English"
  },
  "search_chunk": {
    "id": 89,
    "chunk_index": 0,
    "token_count": 22
  },
  "physical_source": {
    "collection_name": "Constituent Assembly Debates & Resolutions",
    "source": "Institutional Master Archive",
    "archive_reference": "AMB-TEST-P7-001"
  },
  "verification_status": "APPROVED",
  "provenance_classification": "EXPLICIT_SOURCE_RELATION"
}
```

---

## 3. Strict Archival Invariants

1. **Zero Fabrication Policy:**
   - No mock entities or synthetic historical figures are generated.
   - If an entity or relationship cannot be traced to primary text or catalog metadata, it is not created.
   - The test `test_24_no_historical_fabrication_zero_invented_relations` programmatically verifies that querying non-existent historical claims returns zero invented entities or fake relationships.

2. **Machine Extraction Segregation:**
   - Any machine-extracted relation or event candidate is explicitly flagged:
     - `provenance_type = "MACHINE_EXTRACTED_RELATION"`
     - `verification_status = "PENDING_REVIEW"`
   - It is never published to public kiosk views until an archivist or reviewer approves it.

3. **Date Fidelity:**
   - Historical records with year-only dates (e.g. `1949`) are stored with precision `YEAR`.
   - The platform never synthesizes `1949-01-01` or any fake day.
