import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("archive.search.reranker")

class BaseRerankerProvider(ABC):
    """Abstract Cross-Encoder Reranker Interface."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        pass

    @property
    @abstractmethod
    def is_available(self) -> bool:
        pass

    @property
    @abstractmethod
    def status(self) -> str:
        pass

    @abstractmethod
    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """Reranks candidate passages. Never produces fake scores."""
        pass

    @abstractmethod
    def get_diagnostics(self) -> Dict[str, Any]:
        pass

class BGERerankerProvider(BaseRerankerProvider):
    """
    Reranker using BAAI/bge-reranker-v2-m3.
    Verifies actual model is loaded before reporting operational status.
    In degraded mode, preserves original candidate ranking without synthetic scores.
    """

    def __init__(self, model_name: Optional[str] = None):
        self._model_name = model_name or settings.RERANKER_MODEL_NAME or "BAAI/bge-reranker-v2-m3"
        self._model_instance = None
        self._backend = None
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._error_detail = None
        
        self._initialize_model()

    def _initialize_model(self):
        # 1. Try FlagEmbedding
        try:
            from FlagEmbedding import FlagReranker
            logger.info(f"Loading {self._model_name} via FlagEmbedding...")
            self._model_instance = FlagReranker(self._model_name, use_fp16=True)
            self._backend = "FlagEmbedding"
            self._is_available = True
            self._status = "READY"
            logger.info(f"BGE Reranker ({self._model_name}) operational.")
            return
        except Exception as e:
            logger.warning(f"FlagEmbedding unavailable for {self._model_name}: {e}")

        # 2. Try sentence_transformers CrossEncoder
        try:
            from sentence_transformers import CrossEncoder
            logger.info(f"Loading {self._model_name} via sentence_transformers CrossEncoder...")
            self._model_instance = CrossEncoder(self._model_name)
            self._backend = "CrossEncoder"
            self._is_available = True
            self._status = "READY"
            logger.info(f"BGE Reranker ({self._model_name}) operational.")
            return
        except Exception as e:
            logger.warning(f"CrossEncoder unavailable for {self._model_name}: {e}")

        # 3. Model unavailable in current environment
        self._model_instance = None
        self._backend = None
        self._is_available = False
        self._status = "MODEL_UNAVAILABLE"
        self._error_detail = (
            f"BGE Reranker model ('{self._model_name}') weights not found locally. "
            "System running in DEGRADED mode (preserving RRF fusion ordering without reranker scores). "
            "Never producing fake scores."
        )
        logger.warning(f"BGE Reranker Status: {self._status}. {self._error_detail}")

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Reranks the top candidates.
        If operational: computes cross-encoder logit scores.
        If degraded: returns candidate list preserving RRF order with clear diagnostics.
        """
        if not candidates:
            return []

        if not self._is_available or self._model_instance is None:
            # Condition 8: Do not claim reranking implemented unless real reranker executed.
            # Transparent degraded mode: pass through fused candidates with reranker_applied = False
            for item in candidates:
                item["reranker_score"] = None
                item["reranker_applied"] = False
                item["is_reranked"] = False
                item["reranker_status"] = "DEGRADED_MODEL_UNAVAILABLE"
            return candidates[:top_k]

        # Real cross-encoder scoring
        sentence_pairs = [[query, c.get("chunk_text", "")] for c in candidates]
        try:
            if self._backend == "FlagEmbedding":
                scores = self._model_instance.compute_score(sentence_pairs)
            elif self._backend == "CrossEncoder":
                scores = self._model_instance.predict(sentence_pairs).tolist()
            else:
                scores = None

            if scores is not None:
                for idx, c in enumerate(candidates):
                    c["reranker_score"] = round(float(scores[idx]), 4)
                    c["reranker_applied"] = True
                    c["is_reranked"] = True
                    c["reranker_status"] = "OPERATIONAL"

                candidates.sort(key=lambda x: x.get("reranker_score") or 0.0, reverse=True)
                return candidates[:top_k]
        except Exception as re:
            logger.error(f"Reranker inference error: {re}. Falling back to RRF rank.")

        # Fallback if inference failed
        for item in candidates:
            item["reranker_score"] = None
            item["reranker_applied"] = False
            item["is_reranked"] = False
            item["reranker_status"] = "ERROR_FALLBACK"
        return candidates[:top_k]

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": "BGERerankerProvider",
            "model_name": self._model_name,
            "status": self._status,
            "is_available": self._is_available,
            "backend": self._backend,
            "error_detail": self._error_detail
        }
