"""
Local Archival LLM Service Bridge
Wraps llama-server with an Ollama-compatible API (/api/tags, /api/chat)
and OpenAI-compatible API (/v1/chat/completions, /models) on port 11434.

Real weights: gemma-3-1B-it-QAT-Q4_0.gguf (1B parameters, 4-bit quantized)
Runner: llama-server.exe with AVX2/Vulkan on AMD Ryzen 5 CPU
"""

import sys
import os
import time
import signal
import subprocess
import logging
from typing import Dict, Any, List, Optional
import httpx
from fastapi import FastAPI, Request, Response, HTTPException
import uvicorn

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("local_llm_service")

LLAMA_SERVER_EXE = r"C:\Users\tusha\.lmstudio\extensions\backends\llama.cpp-win-x86_64-vulkan-avx2-2.22.0\llama-server.exe"
MODEL_PATH = r"C:\Users\tusha\.lmstudio\models\lmstudio-community\gemma-3-1B-it-QAT-GGUF\gemma-3-1B-it-QAT-Q4_0.gguf"
BACKEND_PORT = 11435
BRIDGE_PORT = 11434
MODEL_NAME = "gemma-3:1b"

app = FastAPI(title="Ambedkar Archive Local LLM Service (Ollama Compatible)")
llama_process: Optional[subprocess.Popen] = None

@app.on_event("startup")
def startup_event():
    global llama_process
    if not os.path.exists(LLAMA_SERVER_EXE):
        logger.error(f"llama-server.exe not found at: {LLAMA_SERVER_EXE}")
        raise RuntimeError(f"llama-server.exe missing: {LLAMA_SERVER_EXE}")
    if not os.path.exists(MODEL_PATH):
        logger.error(f"Model file not found at: {MODEL_PATH}")
        raise RuntimeError(f"Model missing: {MODEL_PATH}")

    logger.info(f"Starting native llama-server backend on port {BACKEND_PORT}...")
    cmd = [
        LLAMA_SERVER_EXE,
        "-m", MODEL_PATH,
        "--port", str(BACKEND_PORT),
        "--host", "127.0.0.1",
        "-c", "4096",
        "-ngl", "0",
        "--alias", MODEL_NAME
    ]
    llama_process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Wait for llama-server to be ready
    url = f"http://127.0.0.1:{BACKEND_PORT}/props"
    logger.info(f"Awaiting llama-server readiness at {url}...")
    ready = False
    for i in range(30):
        try:
            resp = httpx.get(url, timeout=1.0)
            if resp.status_code == 200:
                ready = True
                logger.info("llama-server is READY.")
                break
        except Exception:
            time.sleep(0.5)

    if not ready:
        logger.error("llama-server failed to initialize within 15 seconds.")

@app.on_event("shutdown")
def shutdown_event():
    global llama_process
    if llama_process and llama_process.poll() is None:
        logger.info("Terminating llama-server process...")
        llama_process.terminate()
        try:
            llama_process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            llama_process.kill()
        logger.info("llama-server stopped.")

@app.get("/health")
def health():
    ready = False
    try:
        resp = httpx.get(f"http://127.0.0.1:{BACKEND_PORT}/props", timeout=1.0)
        ready = (resp.status_code == 200)
    except Exception:
        ready = False
    return {"status": "READY" if ready else "UNAVAILABLE", "model": MODEL_NAME}

# ================= OLLAMA COMPATIBILITY ROUTES =================

@app.get("/api/tags")
def ollama_tags():
    return {
        "models": [
            {
                "name": MODEL_NAME,
                "model": MODEL_NAME,
                "modified_at": "2026-09-21T00:00:00Z",
                "size": os.path.getsize(MODEL_PATH) if os.path.exists(MODEL_PATH) else 720425472,
                "digest": "sha256:local_gemma_3_1b_qat_q4_0",
                "details": {
                    "parent_model": "",
                    "format": "gguf",
                    "family": "gemma3",
                    "families": ["gemma3"],
                    "parameter_size": "1B",
                    "quantization_level": "Q4_0"
                }
            }
        ]
    }

@app.post("/api/chat")
async def ollama_chat(request: Request):
    t0 = time.time()
    payload = await request.json()
    messages = payload.get("messages", [])
    options = payload.get("options", {})
    temperature = options.get("temperature", 0.0)
    max_tokens = options.get("num_predict", 1024)

    # Clean system prompt / roles if needed for chat template
    openai_payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"http://127.0.0.1:{BACKEND_PORT}/v1/chat/completions",
                json=openai_payload
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            logger.error(f"Inference error calling llama-server: {e}")
            raise HTTPException(status_code=502, detail=f"LLM inference error: {str(e)}")

    duration_ns = int((time.time() - t0) * 1e9)
    content = data["choices"][0]["message"]["content"]

    return {
        "model": payload.get("model", MODEL_NAME),
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "message": {
            "role": "assistant",
            "content": content
        },
        "done": True,
        "total_duration": duration_ns,
        "eval_count": data.get("usage", {}).get("completion_tokens", 0)
    }

# ================= OPENAI COMPATIBILITY ROUTES =================

@app.get("/models")
@app.get("/v1/models")
async def openai_models():
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/v1/models")
            return resp.json()
        except Exception as e:
            return {
                "object": "list",
                "data": [{"id": MODEL_NAME, "object": "model", "owned_by": "archive-local"}]
            }

@app.post("/v1/chat/completions")
@app.post("/chat/completions")
async def openai_chat_completions(request: Request):
    body = await request.json()
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(
                f"http://127.0.0.1:{BACKEND_PORT}/v1/chat/completions",
                json=body
            )
            return Response(content=resp.content, status_code=resp.status_code, media_type="application/json")
        except Exception as e:
            logger.error(f"Proxy error: {e}")
            raise HTTPException(status_code=502, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=BRIDGE_PORT, log_level="info")
