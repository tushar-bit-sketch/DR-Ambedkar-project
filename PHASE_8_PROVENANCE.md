# Phase 8 Provenance: 5-Tier Provenance Chain & Evidentiary Integrity

## 1. The 5-Tier Archival Audiovisual Provenance Chain

Unlike consumer video platforms, an institutional digital heritage archive must preserve an unbroken, tamper-evident audit trail linking modern web representations directly back to physical historical tapes, lacquer discs, glass plates, or celluloid reels.

Phase 8 implements the **5-Tier Audiovisual Provenance Chain**:

```
[Tier 1: Physical Heritage Source]
    └── Archival Institution, Donor Record, Physical Accession ID, Recording Venue & Year
            │
            ▼
[Tier 2: Cryptographic Master Baseline]
    └── Immutable Original File, SHA-256 Fingerprint, Read-Only Master Vault Storage
            │
            ▼
[Tier 3: Technical Inspection & Derivative Lineage]
    └── Tool Name & Version (OpenCV, Pillow, Wave, FFprobe), Technical JSON Metadata, Isolated Derivatives
            │
            ▼
[Tier 4: Linguistic & Transcription Provenance]
    └── Machine Model ID / Curator ID, Diarization Attribution, Full Versioned Transcript History (v1 -> v2)
            │
            ▼
[Tier 5: Evidentiary Knowledge Graph & Timeline Citations]
    └── Primary Source Citations in KG Edges, Timeline Milestones, RAG Timed Citations
```

---

## 2. Cryptographic Integrity Verification & Tamper Defense

The `MediaIntegrityService` enforces continuous cryptographic auditing across the master vault:

### Verification Algorithm
1. Inspects the catalog record for the expected baseline SHA-256 fingerprint $H_{\text{expected}}$.
2. Reads the file directly from `backend/storage/media/masters/` in $64\text{KB}$ streaming chunks.
3. Computes the real-time checksum $H_{\text{actual}} = \text{SHA256}(\text{chunks})$.
4. Compares $H_{\text{actual}}$ against $H_{\text{expected}}$:
   - **$H_{\text{actual}} == H_{\text{expected}}$:** Marked `INTEGRITY_VERIFIED` (`is_valid = True`).
   - **$H_{\text{actual}} \ne H_{\text{expected}}$:** Marked `INTEGRITY_FAILED` / `TAMPERED`. The asset's status is set to `CORRUPTED`, generating an audit alert.
   - **File Missing:** Marked `FILE_MISSING`. Asset status is set to `QUARANTINED`.
5. Persists a detailed `MediaIntegrityRecord` in the database capturing timestamp, operator, and status.

### Bulk Institutional Auditing (`/api/v1/media/integrity/audit`)
Curators can initiate a full institutional sweep across all archived media assets. The service returns aggregate totals (`intact_count`, `tampered_count`, `missing_count`), ensuring complete institutional visibility over physical bit-rot or unauthorized modifications.

---

## 3. Evidentiary Citations across RAG, Graph, and Timeline

### A. RAG Research Assistant Timestamped Citations
When researchers query the platform (e.g. *"What did Dr. Ambedkar state regarding constitutional morality?"*):
- The `ArchivalRAGEngine` retrieves approved transcript segments alongside document chunks.
- Evidence items are flagged with `candidate_type = "media_transcript"`, capturing `start_time` and `end_time`.
- Research citations format as:
  > `[Dr. Ambedkar National Memorial: Address on the Constitution @ 00:03:15 - 00:03:45]`
- In the public viewer, clicking the citation launches the player seekable directly to that exact second.

### B. Knowledge Graph Provenance Links
Edges in the historical Knowledge Graph (`GraphRelationship`) support direct references to audiovisual records via `media_asset_id`. A relationship such as `(Dr. B.R. Ambedkar)-[DELIVERED_SPEECH]->(Constitution Assembly)` links directly to the verified archival audio recording as evidentiary primary proof.

### C. Historical Timeline Synchronization
Events in `TimelineEvent` reference their primary media artifact via `media_asset_id`. Visitors exploring the interactive timeline can play the archival audio or film reel directly from the milestone modal without losing historical context.
