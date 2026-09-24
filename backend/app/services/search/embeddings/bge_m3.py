import os
import logging
from typing import List, Dict, Any, Optional
import numpy as np

from app.services.search.embeddings.base import BaseEmbeddingProvider
from app.core.config import settings

logger = logging.getLogger("archive.search.embeddings")

class BGE_M3_EmbeddingProvider(BaseEmbeddingProvider):
    """
    Multilingual Dense Embedding Provider using BAAI/bge-m3.
    Strictly verifies actual embedding dimension at runtime.
    If model weights or neural backends are missing, reports MODEL_UNAVAILABLE.
    ABSOLUTELY NEVER produces random or fake vectors.
    """

    def __init__(self, model_path_or_name: Optional[str] = None):
        self._model_name = model_path_or_name or settings.EMBEDDING_MODEL_NAME or "BAAI/bge-m3"
        self._model_version = "1.0"
        self._model_instance = None
        self._backend = None
        self._dimension: Optional[int] = None
        self._is_available = False
        self._status = "UNINITIALIZED"
        self._error_detail: Optional[str] = None
        
        self._initialize_model()

    def _initialize_model(self):
        """Attempts to load BAAI/bge-m3 via available inference engines."""
        # 1. Check local environment or sentence_transformers
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading {self._model_name} via sentence-transformers...")
            self._model_instance = SentenceTransformer(self._model_name)
            self._backend = "sentence-transformers"
            
            # Runtime dimension verification (Condition 5)
            sample_emb = self._model_instance.encode(["Dr. B.R. Ambedkar archival index"])
            self._dimension = int(sample_emb.shape[1])
            self._is_available = True
            self._status = "READY"
            self._error_detail = None
            logger.info(f"BGE-M3 model initialized successfully. Verified runtime dimension: {self._dimension}")
            return
        except Exception as e:
            logger.warning(f"sentence-transformers backend unavailable for {self._model_name}: {e}")

        # 2. Check transformers AutoModel + AutoTokenizer
        try:
            from transformers import AutoTokenizer, AutoModel
            import torch
            logger.info(f"Loading {self._model_name} via transformers...")
            tokenizer = AutoTokenizer.from_pretrained(self._model_name)
            model = AutoModel.from_pretrained(self._model_name)
            model.eval()
            self._model_instance = {"tokenizer": tokenizer, "model": model}
            self._backend = "transformers"

            # Runtime verification
            with torch.no_grad():
                inputs = tokenizer(["Dr. B.R. Ambedkar archival index"], return_tensors="pt", padding=True, truncation=True)
                outputs = model(**inputs)
                sample_vec = outputs.last_hidden_state[:, 0, :].cpu().numpy()
                self._dimension = int(sample_vec.shape[1])

            self._is_available = True
            self._is_available = True
            self._status = "READY"
            self._error_detail = None
            logger.info(f"BGE-M3 model initialized via transformers. Verified runtime dimension: {self._dimension}")
            return
        except Exception as e:
            logger.warning(f"transformers backend unavailable for {self._model_name}: {e}")

        # 3. Check Hugging Face Inference API feature-extraction if token configured
        if settings.HF_TOKEN:
            try:
                import httpx
                hf_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self._model_name}"
                headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
                resp = httpx.post(
                    hf_url,
                    headers=headers,
                    json={"inputs": ["Dr. B.R. Ambedkar archival index"], "options": {"wait_for_model": False}},
                    timeout=4.0
                )
                if resp.status_code == 200:
                    vec = resp.json()
                    if isinstance(vec, list) and len(vec) > 0:
                        dim = len(vec[0]) if isinstance(vec[0], list) else len(vec)
                        self._model_instance = {"api_url": hf_url, "headers": headers}
                        self._backend = "huggingface_inference_api"
                        self._dimension = int(dim)
                        self._is_available = True
                        self._status = "READY"
                        self._error_detail = None
                        logger.info(f"BGE-M3 model initialized via Hugging Face Inference API. Dimension: {self._dimension}")
                        return
            except Exception as hf_err:
                logger.warning(f"Hugging Face embedding API probe unavailable: {hf_err}")

        # 4. Model unavailable in current execution environment
        self._model_instance = None
        self._backend = None
        self._dimension = None
        self._is_available = False
        self._status = "MODEL_UNAVAILABLE"
        self._error_detail = (
            f"BGE-M3 model weights ('{self._model_name}') could not be loaded into memory. "
            "Model dependencies (sentence-transformers / transformers + torch) or weights are uninitialized, "
            "and Hugging Face feature extraction endpoint is unauthenticated or unreachable. "
            "System strictly operating in DEGRADED mode without vector generation. Fake vectors are forbidden."
        )
        logger.warning(f"BGE-M3 Provider Status: {self._status}. Detail: {self._error_detail}")

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def model_version(self) -> str:
        return self._model_version

    @property
    def dimension(self) -> Optional[int]:
        """Returns the actual verified dimension at runtime, or None if uninitialized."""
        return self._dimension

    @property
    def is_available(self) -> bool:
        return self._is_available

    @property
    def status(self) -> str:
        return self._status

    def embed_text(self, text: str) -> List[float]:
        """Embeds a single passage string. Never produces fake vectors."""
        if not self._is_available or self._model_instance is None:
            raise RuntimeError(
                f"Cannot generate embedding: BGE-M3 is {self._status}. "
                f"Error: {self._error_detail}. Archival integrity forbids synthetic vector generation."
            )
        
        batch_results = self.embed_batch([text])
        return batch_results[0]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a list of passage strings with L2 normalization."""
        if not self._is_available or self._model_instance is None:
            raise RuntimeError(
                f"Cannot generate batch embeddings: BGE-M3 is {self._status}. "
                f"Error: {self._error_detail}. Archival integrity forbids synthetic vector generation."
            )

        if not texts:
            return []

        if self._backend == "sentence-transformers":
            raw_embeddings = self._model_instance.encode(texts, normalize_embeddings=True)
            return [vec.tolist() for vec in raw_embeddings]

        elif self._backend == "transformers":
            import torch
            tokenizer = self._model_instance["tokenizer"]
            model = self._model_instance["model"]
            with torch.no_grad():
                inputs = tokenizer(texts, padding=True, truncation=True, max_length=8192, return_tensors="pt")
                outputs = model(**inputs)
                # CLS token representation + L2 norm
                embeddings = outputs.last_hidden_state[:, 0, :]
                normalized = torch.nn.functional.normalize(embeddings, p=2, dim=1)
        elif self._backend == "huggingface_inference_api":
            import httpx
            resp = httpx.post(
                self._model_instance["api_url"],
                headers=self._model_instance["headers"],
                json={"inputs": texts, "options": {"wait_for_model": True}},
                timeout=30.0
            )
            if resp.status_code == 200:
                raw = resp.json()
                results = []
                for vec in raw:
                    arr = np.array(vec, dtype=np.float32)
                    norm = np.linalg.norm(arr)
                    if norm > 0:
                        arr = arr / norm
                    results.append(arr.tolist())
                return results
            else:
                raise RuntimeError(f"Hugging Face feature extraction returned HTTP {resp.status_code}: {resp.text}")

        raise RuntimeError(f"Unknown neural backend: {self._backend}")

    def get_diagnostics(self) -> Dict[str, Any]:
        return {
            "provider": "BGE_M3_EmbeddingProvider",
            "model_name": self._model_name,
            "model_version": self._model_version,
            "status": self._status,
            "is_available": self._is_available,
            "runtime_dimension": self._dimension,
            "backend": self._backend,
            "error_detail": self._error_detail,
            "normalization": "L2"
        }
