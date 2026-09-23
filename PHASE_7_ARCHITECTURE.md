# PHASE 7 ARCHITECTURE — KNOWLEDGE GRAPH, INTELLIGENT TIMELINE & ENTITY RELATIONSHIPS

**Project:** SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar  
**Layer:** Phase 7 Graph, Timeline & Provenance Infrastructure  
**Status:** Production-Ready & Verified  

---

## 1. Architectural Overview

Phase 7 introduces an institutional-grade, provenance-first Knowledge Graph and Intelligent Historical Timeline to the SIH26096 archival platform.

```
                  ┌────────────────────────────────────────┐
                  │          Interactive UI Layer          │
                  │   Kiosk Graph / Timeline / Entity View  │
                  │    Curator Knowledge Graph & Timeline   │
                  └───────────────────┬────────────────────┘
                                      │ REST API
                  ┌───────────────────▼────────────────────┐
                  │           FastAPI Gateway              │
                  │ /graph, /entities, /timeline,          │
                  │ /provenance/relationship, /search      │
                  └─────────┬───────────────────┬──────────┘
                            │                   │
             ┌──────────────▼─────┐       ┌─────▼───────────────┐
             │ Graph Extraction   │       │ Canonical Entity    │
             │ Pipeline           │       │ Resolution Service  │
             │ - Deterministic    │       │ - Alias Indexing    │
             │ - Rule-Based       │       │ - Merge Review      │
             │ - LLM Extractor    │       │ - Soundex/Levenshtein│
             └──────────────┬─────┘       └─────┬───────────────┘
                            │                   │
             ┌──────────────▼───────────────────▼──────────┐
             │            Graph Repository Factory         │
             │ - get_graph_repository(db)                  │
             │ - PostgreSQLGraphRepository (Operational)   │
             │ - Neo4jGraphRepository (Degraded Fallback)  │
             └──────────────┬──────────────────────────────┘
                            │
             ┌──────────────▼──────────────────────────────┐
             │     Relational & Graph Storage Layer        │
             │ - PostgreSQL / SQLite (Adjacency + CTEs)    │
             │ - GraphEntity, GraphRelationship,           │
             │   TimelineEvent, GraphAuditLog              │
             └─────────────────────────────────────────────┘
```

---

## 2. Dual Graph Backend Strategy & Honest Fallback

A core architectural invariant of the platform is **radical honesty**: the system never fakes or simulates a database or AI service.

1. **Active Primary Backend: PostgreSQL Graph Repository (`PostgreSQLGraphRepository`)**
   - Implemented via relational adjacency tables (`graph_entities`, `graph_relationships`, `graph_entity_aliases`).
   - Bidirectional and directed graph traversals executed via recursive Common Table Expressions (CTEs) or in-memory breadth-first search (BFS).
   - Shortest pathfinding executed via bidirectional BFS with cycle detection and depth bounds.
   - Status reported:
     ```json
     {
       "backend": "postgres_fallback",
       "is_operational": true,
       "status": "OPERATIONAL",
       "neo4j_installed": false,
       "message": "Operational using PostgreSQL recursive graph traversal fallback."
     }
     ```

2. **Neo4j Backend Provider (`Neo4jGraphRepository`)**
   - When the `neo4j` Python driver or bolt connection is absent, it cleanly catches `ImportError` or connection refusal.
   - Transparently reports:
     ```json
     {
       "backend": "neo4j",
       "is_operational": false,
       "status": "GRAPH_BACKEND_DEGRADED",
       "error": "neo4j Python driver not installed or Neo4j service unreachable."
     }
     ```
   - Never crashes the application or fabricates dummy nodes.

---

## 3. Extraction Architecture

The extraction pipeline supports three complementary mechanisms:

1. **Deterministic Archival Extractor (`DeterministicArchivalExtractor`)**
   - Operates on cataloged metadata (title, author, collection, topics, archival custodian).
   - Produces 100% confidence relationships classified as `EXPLICIT_SOURCE_RELATION`.
   - Never hallucinates entities; strictly anchors to catalog entries.

2. **Rule-Based Archival Extractor (`RuleBasedArchivalExtractor`)**
   - High-precision regular expression patterns tailored to historical phrasing in Dr. Ambedkar's writings and legislative speeches.
   - Recognizes patterns such as:
     - `"<Person> was appointed Chairman of <Org>"` -> `CHAIRED`
     - `"<Person> founded <Org>"` -> `FOUNDED`
     - `"<Person> opposed/criticized <Concept/Policy>"` -> `OPPOSED`
     - `"<Person> participated in <Event>"` -> `PARTICIPATED_IN`
   - Classifies relationships as `MACHINE_EXTRACTED_RELATION` with initial status `PENDING_REVIEW`.

3. **LLM Archival Extractor (`LLMArchivalExtractor`)**
   - Connects to local Ollama inference (`gemma-3:1b` or `qwen2.5:1.5b`).
   - If Ollama is unavailable, fails fast with structured error reporting without synthetic hallucinations.
   - When available, returns JSON-structured claims strictly constrained to provided text passages.

---

## 4. Intelligent Timeline Engine & Date Precision

Historical archival timelines cannot assume modern ISO-8601 timestamps for all historical records. Many documents only specify a year, a month, a decade, or approximate era.

### Strict Date Precision Hierarchy
- `EXACT_DAY`: e.g. `"1947-08-29"` -> Parsed as Year `1947`, Exact Date `"1947-08-29"`, Precision `EXACT_DAY`.
- `MONTH`: e.g. `"October 1956"` -> Parsed as Year `1956`, Formatted `"1956-10"`, Precision `MONTH`.
- `YEAR`: e.g. `"1949"` -> Parsed as Year `1949`, Formatted `"1949"`, Precision `YEAR`. **Zero synthesis of fake day 01 (`1949-01-01` is strictly forbidden).**
- `DECADE`: e.g. `"1930s"` -> Parsed as Year `1930`, Formatted `"1930s"`, Precision `DECADE`.
- `APPROXIMATE`: e.g. `"circa 1920"`, `"c. 1920"` -> Parsed as Year `1920`, Formatted `"circa 1920"`, Precision `APPROXIMATE`.
- `UNKNOWN`: Text retained verbatim without inventing temporal data.

### Curator Review Workflow
- Extracted timeline milestones begin as `verification_status="PENDING_REVIEW"`.
- Curators can review, approve (`"VERIFIED"`), or reject candidates.
- Only verified milestones appear in public Kiosk timelines unless explicitly queried with curator privileges.

---

## 5. Unified Archival Search Integration

The unified search endpoint (`/api/v1/search/unified`) federates across all archival dimensions:
1. **Documents / Manuscripts:** Hybrid BM25 full-text + vector chunk retrieval.
2. **Entities:** Canonical name and alias search across people, organizations, locations, events, and concepts.
3. **Relationships:** Direct archival connections linked to entities.
4. **Timeline Events:** Filtered by historical era, date range, or participant entity.

All search results enforce **server-side RBAC access control** (`PUBLIC` vs `RESTRICTED`) before returning data to the client.
