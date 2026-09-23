# PHASE 7 GRAPH ONTOLOGY & DATA MODEL

**Project:** SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Layer:** Phase 7 Ontology, Database Models & Schemas  
**Status:** Production-Ready & Verified  

---

## 1. Entity Ontology

Every entity represents a historically authenticated actor, organization, location, concept, event, or archival publication.

### Core Entity Types
| Entity Type | Description | Historical Example |
| :--- | :--- | :--- |
| `Person` | Historical figures, authors, legislators, correspondents. | Dr. B. R. Ambedkar, Mahatma Gandhi, Jawaharlal Nehru |
| `Organization` | Committees, political bodies, publishers, universities. | Drafting Committee of Constituent Assembly, Bahishkrit Hitakarini Sabha |
| `Location` | Geographical places of historical significance. | Mhow, Columbia University, Mahad, New Delhi, London |
| `Event` | Significant historical occurrences, conferences, satyagrahas. | Mahad Satyagraha, Round Table Conferences, Poona Pact |
| `Concept` | Legal principles, philosophical ideas, constitutional doctrines. | Annihilation of Caste, Constitutional Morality, Social Democracy |
| `Document` | Primary archival treatises, gazettes, speeches, letters. | Castes in India, The Problem of the Rupee, Speech on 25 Nov 1949 |
| `Collection` | Archival record groups and manuscript series. | CAD Debates, Ministry of Social Justice & Empowerment Records |
| `Institution` | Archival custodians and preservation bodies. | Dr. Ambedkar Foundation, National Archives of India |

### Database Schema: `graph_entities`
```sql
CREATE TABLE graph_entities (
    id SERIAL PRIMARY KEY,
    canonical_name VARCHAR(500) NOT NULL UNIQUE,
    entity_type VARCHAR(100) NOT NULL,
    description TEXT,
    birth_date VARCHAR(50),
    death_date VARCHAR(50),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    date_precision VARCHAR(30) DEFAULT 'EXACT_DAY',
    location VARCHAR(500),
    attributes_json TEXT DEFAULT '{}',
    verification_status VARCHAR(50) DEFAULT 'UNVERIFIED', -- UNVERIFIED, PENDING_REVIEW, VERIFIED, REJECTED
    access_level VARCHAR(20) DEFAULT 'PUBLIC',            -- PUBLIC, RESTRICTED, INTERNAL
    is_canonical BOOLEAN DEFAULT TRUE,
    canonical_entity_id INTEGER REFERENCES graph_entities(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_graph_entities_canonical_name ON graph_entities(canonical_name);
CREATE INDEX ix_graph_entities_entity_type ON graph_entities(entity_type);
CREATE INDEX ix_graph_entities_access_level ON graph_entities(access_level);
```

### Entity Aliases: `graph_entity_aliases`
Stores alternative spellings, honorifics, vernacular transliterations, and historical nicknames to prevent duplicate entity generation.
```sql
CREATE TABLE graph_entity_aliases (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    alias_name VARCHAR(500) NOT NULL,
    language VARCHAR(50) DEFAULT 'English',
    is_primary BOOLEAN DEFAULT FALSE,
    source VARCHAR(255) DEFAULT 'CURATOR_ASSERTION',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_graph_entity_aliases_alias_name ON graph_entity_aliases(alias_name);
```

---

## 2. Relationship Ontology

Relationships capture directed, evidence-backed connections between historical entities.

### Permitted Relationship Types
- `AUTHORED`: Person -> Document / Speech / Letter
- `SPOKE_AT`: Person -> Speech / Event
- `CHAIRED`: Person -> Organization / Committee
- `FOUNDED`: Person -> Organization / Periodical
- `PARTICIPATED_IN`: Person -> Event / Assembly
- `CORRESPONDED_WITH`: Person -> Person
- `OPPOSED`: Person -> Concept / Policy / Entity
- `DISCUSSES`: Document -> Topic / Concept / Entity
- `PART_OF_COLLECTION`: Document -> Collection
- `HELD_BY`: Document -> Institution

### Provenance Classification
1. `EXPLICIT_SOURCE_RELATION`: Derived directly from primary archival metadata with 1.0 confidence.
2. `MACHINE_EXTRACTED_RELATION`: Extracted via rule-based patterns or NLP. Requires human review (`PENDING_REVIEW`).
3. `MACHINE_INFERRED_RELATION`: Inferred via multi-hop logic or LLM. Clearly labeled and non-canonical until verified.
4. `HUMAN_VERIFIED_RELATION`: Approved by an institutional archivist or scholar.

### Database Schema: `graph_relationships`
```sql
CREATE TABLE graph_relationships (
    id SERIAL PRIMARY KEY,
    source_entity_id INTEGER NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    target_entity_id INTEGER NOT NULL REFERENCES graph_entities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(100) NOT NULL,
    description TEXT,
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    date_precision VARCHAR(30) DEFAULT 'EXACT_DAY',
    confidence FLOAT DEFAULT 1.0,
    confidence_label VARCHAR(100),
    provenance_type VARCHAR(50) DEFAULT 'EXPLICIT_SOURCE_RELATION',
    verification_status VARCHAR(50) DEFAULT 'APPROVED', -- PENDING_REVIEW, APPROVED, REJECTED
    evidence_reference VARCHAR(500),
    evidence_text TEXT,
    source_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL,
    document_version_id INTEGER REFERENCES document_versions(id) ON DELETE SET NULL,
    ocr_text_version_id INTEGER REFERENCES ocr_text_versions(id) ON DELETE SET NULL,
    page_id INTEGER REFERENCES ocr_pages(id) ON DELETE SET NULL,
    chunk_id INTEGER REFERENCES search_chunks(id) ON DELETE SET NULL,
    access_level VARCHAR(20) DEFAULT 'PUBLIC',
    attributes_json TEXT DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_graph_relationships_source_target ON graph_relationships(source_entity_id, target_entity_id);
CREATE INDEX ix_graph_relationships_type ON graph_relationships(relationship_type);
CREATE INDEX ix_graph_relationships_verification ON graph_relationships(verification_status);
```

---

## 3. Entity Merge Proposal & Audit Trail

To resolve duplicates without destructive data loss, the platform uses an entity merge review workflow:
- `GraphEntityMerge`: Records `source_entity_id` and `target_entity_id`, reason, and approval status.
- When approved:
  - Source entity is marked `is_canonical=False` and `canonical_entity_id=target_entity_id`.
  - All aliases of source are reassigned to target.
  - All inbound and outbound relationships of source are re-pointed to target.
  - A comprehensive audit entry is created in `graph_audit_logs`.
