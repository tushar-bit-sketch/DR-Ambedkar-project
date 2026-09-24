from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Ambedkar Digital Heritage Archive"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    ARCHIVE_PHASE: str = os.getenv("ARCHIVE_PHASE", "PHASE_10_FINAL_INTEGRATION")

    # Database
    DATABASE_URL: str = "sqlite:///./archive_phase1.db"

    # Phase 4 Vector & Semantic Search Backend
    # Primary Production Target: "pgvector" (PostgreSQL + pgvector extension)
    # Development/Test Only Fallback: "sqlite_dev_fallback"
    VECTOR_BACKEND: str = os.getenv("VECTOR_BACKEND", "sqlite_dev_fallback")
    PGVECTOR_URL: Union[str, None] = os.getenv("PGVECTOR_URL", None)
    
    # Embedding Model (BGE-M3 Multilingual)
    EMBEDDING_MODEL_NAME: str = "BAAI/bge-m3"
    EMBEDDING_DIMENSION: int = 1024
    
    # Reranker Model (BGE-reranker-v2-m3)
    RERANKER_MODEL_NAME: str = "BAAI/bge-reranker-v2-m3"

    # Candidate Retrieval & Rerank Parameters
    SEARCH_TOP_K_RETRIEVAL: int = 20
    SEARCH_TOP_K_RERANK: int = 10
    SEARCH_FINAL_RESULTS: int = 10
    RRF_K: int = 60

    # Phase 5: Source-Grounded Archival RAG & LLM Configuration
    # Supported LLM_PROVIDER: "huggingface", "openai_compatible", "ollama", "mock_test"
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "huggingface")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    LLM_BASE_URL: Union[str, None] = os.getenv("LLM_BASE_URL", None)
    LLM_API_KEY: Union[str, None] = os.getenv("LLM_API_KEY", None)

    # Hugging Face Inference API / Router Configuration
    HF_TOKEN: Union[str, None] = os.getenv("HF_TOKEN", None)
    HF_MODEL: str = os.getenv("HF_MODEL", "meta-llama/Llama-3.1-8B-Instruct")
    HF_BASE_URL: str = os.getenv("HF_BASE_URL", "https://router.huggingface.co/v1")

    MAX_CONTEXT_TOKENS: int = 4096
    TEMPERATURE: float = 0.0 # Strict conservative temperature for factual archival RAG
    MAX_OUTPUT_TOKENS: int = 1024
    RAG_MIN_EVIDENCE_SCORE: float = 0.005
    RAG_MAX_EVIDENCE_CHUNKS: int = 5

    # Phase 6: Multilingual, Voice, and Accessibility Configuration
    TRANSLATION_PROVIDER: str = os.getenv("TRANSLATION_PROVIDER", "auto")
    INDICTRANS2_MODEL_PATH: Union[str, None] = os.getenv("INDICTRANS2_MODEL_PATH", None)
    TTS_PROVIDER: str = os.getenv("TTS_PROVIDER", "auto")
    STT_PROVIDER: str = os.getenv("STT_PROVIDER", "auto")
    AUDIO_STORAGE_DIR: str = os.getenv("AUDIO_STORAGE_DIR", "storage/audio")
    TRANSLATION_STORAGE_DIR: str = os.getenv("TRANSLATION_STORAGE_DIR", "storage/translations")

    # Production S3-Compatible Object Storage
    OBJECT_STORAGE_ENDPOINT: Union[str, None] = os.getenv("OBJECT_STORAGE_ENDPOINT", None)
    OBJECT_STORAGE_BUCKET: str = os.getenv("OBJECT_STORAGE_BUCKET", "ambedkar-archive-masters")
    OBJECT_STORAGE_ACCESS_KEY: Union[str, None] = os.getenv("OBJECT_STORAGE_ACCESS_KEY", None)
    OBJECT_STORAGE_SECRET_KEY: Union[str, None] = os.getenv("OBJECT_STORAGE_SECRET_KEY", None)
    OBJECT_STORAGE_REGION: str = os.getenv("OBJECT_STORAGE_REGION", "us-east-1")

    # Phase 7: Knowledge Graph & Intelligent Timeline Configuration
    GRAPH_BACKEND: str = os.getenv("GRAPH_BACKEND", "postgres") # "neo4j" or "postgres"
    NEO4J_URI: Union[str, None] = os.getenv("NEO4J_URI", None)
    NEO4J_USERNAME: Union[str, None] = os.getenv("NEO4J_USERNAME", None)
    NEO4J_PASSWORD: Union[str, None] = os.getenv("NEO4J_PASSWORD", None)
    NEO4J_DATABASE: str = os.getenv("NEO4J_DATABASE", "neo4j")
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
    GRAPH_MAX_NEIGHBORS: int = 50
    GRAPH_MAX_TRAVERSAL_DEPTH: int = 3

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "phase1-dev-secret-key-change-in-production")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8

    # Phase 9: Kiosk, Hardware, Deployment & Security Hardening
    KIOSK_IDLE_TIMEOUT_SECONDS: int = int(os.getenv("KIOSK_IDLE_TIMEOUT_SECONDS", "120"))
    KIOSK_WARNING_TIMEOUT_SECONDS: int = int(os.getenv("KIOSK_WARNING_TIMEOUT_SECONDS", "15"))
    SECURITY_HEADERS_ENABLED: bool = os.getenv("SECURITY_HEADERS_ENABLED", "true").lower() in ("true", "1", "yes")
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() in ("true", "1", "yes")
    OFFLINE_STORAGE_DIR: str = os.getenv("OFFLINE_STORAGE_DIR", "storage/offline")
    TLS_CERT_PATH: Union[str, None] = os.getenv("TLS_CERT_PATH", None)
    TLS_KEY_PATH: Union[str, None] = os.getenv("TLS_KEY_PATH", None)

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, str) and v.startswith("["):
            return json.loads(v)
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )

settings = Settings()
