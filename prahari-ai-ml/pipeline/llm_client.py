"""
Multi-Provider LLM Fallback Client for PRAHARI AI
=================================================
Primary Provider: NVIDIA API (https://integrate.api.nvidia.com/v1)
Primary Models in Fallback Order:
  1. deepseek-ai/deepseek-v4-pro
  2. nvidia/nemotron-3-super-120b-a12b
  3. nvidia/nemotron-3-ultra-550b-a55b
  4. nvidia/nemotron-4-340b-instruct
  5. nvidia/llama-3.1-nemotron-70b-instruct
  6. meta/llama-3.3-70b-instruct

Secondary Fallbacks:
  7. Groq API (llama-3.3-70b-versatile, mixtral-8x7b-32768)
  8. Local Server (Ollama / LMStudio)
"""
import os
import logging
from typing import Any, List, Dict, Optional
import httpx
from dotenv import load_dotenv

# Load .env file from environment or pipeline root directory
ml_env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
load_dotenv(dotenv_path=ml_env_path)
load_dotenv()

logger = logging.getLogger(__name__)

# Fetch NVIDIA API key strictly from environment variables (.env file)
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1"

NVIDIA_MODELS = [
    "nvidia/nemotron-3-super-120b-a12b",
    "deepseek-ai/deepseek-v4-pro",
    "meta/llama-3.3-70b-instruct",
    "nvidia/nemotron-3-ultra-550b-a55b",
    "mistralai/mistral-large-2-instruct",
]

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "llama3-70b-8192",
]


class FallbackCompletionResponse:
    """Wrapper to mimic OpenAI/Groq response object structure."""
    class Choice:
        class Message:
            def __init__(self, content: str, role: str = "assistant"):
                self.content = content
                self.role = role

        def __init__(self, content: str):
            self.message = self.Message(content)

    def __init__(self, content: str, model_used: str):
        self.choices = [self.Choice(content)]
        self.model = model_used


def complete_chat(
    messages: List[Dict[str, str]],
    max_tokens: int = 4096,
    temperature: float = 0.2,
    extra_body: Optional[Dict[str, Any]] = None,
    stream: bool = False,
    timeout: float = 12.0,
    model_override: Optional[str] = None,
) -> Any:
    """
    Executes a chat completion across NVIDIA API models with fallback to Groq and local servers.
    Fast model failover via max_retries=0 and robust connect/read timeouts.

    Args:
        model_override: If set, try this specific NVIDIA model first (used for vision models in OCR).
                        Falls back to the normal chain if this model also fails.
    """
    errors = []
    
    # Configure httpx timeout: connect timeout 10s, higher read timeout (45s non-stream, 90s stream)
    read_timeout = 90.0 if stream else 45.0
    httpx_timeout = httpx.Timeout(connect=10.0, read=read_timeout, write=15.0, pool=10.0)

    # 1. Try NVIDIA API with model fallback chain
    nvidia_key = os.getenv("NVIDIA_API_KEY") or NVIDIA_API_KEY
    if nvidia_key:
        try:
            from openai import OpenAI
            client = OpenAI(base_url=NVIDIA_BASE_URL, api_key=nvidia_key, max_retries=0, timeout=httpx_timeout)

            # If a specific model is requested (e.g., vision model for OCR), try it first
            model_list = NVIDIA_MODELS[:]
            if model_override and model_override not in model_list:
                model_list = [model_override] + model_list
            elif model_override and model_override in model_list:
                model_list = [model_override] + [m for m in model_list if m != model_override]

            for model_name in model_list:
                try:
                    kwargs = {
                        "model": model_name,
                        "messages": messages,
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                        "stream": stream,
                        "timeout": httpx_timeout,
                    }
                    if extra_body and "deepseek" in model_name:
                        kwargs["extra_body"] = extra_body
                    
                    response = client.chat.completions.create(**kwargs)
                    logger.info("Successfully generated response using NVIDIA model: %s", model_name)
                    return response
                except Exception as exc:
                    err_msg = f"NVIDIA model '{model_name}' failed: {exc}"
                    logger.warning(err_msg)
                    errors.append(err_msg)
        except Exception as e:
            err_msg = f"NVIDIA OpenAI client initialization failed: {e}"
            logger.warning(err_msg)
            errors.append(err_msg)

    # 2. Try Groq API as secondary fallback
    groq_api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROQ_API_KEY1")
    if groq_api_key:
        try:
            from groq import Groq
            groq_client = Groq(api_key=groq_api_key, max_retries=0, timeout=httpx_timeout)
            for g_model in GROQ_MODELS:
                try:
                    response = groq_client.chat.completions.create(
                        model=g_model,
                        messages=messages,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stream=stream,
                        timeout=httpx_timeout,
                    )
                    logger.info("Successfully generated response using Groq model fallback: %s", g_model)
                    return response
                except Exception as exc:
                    err_msg = f"Groq model '{g_model}' failed: {exc}"
                    logger.warning(err_msg)
                    errors.append(err_msg)
        except Exception as e:
            err_msg = f"Groq client initialization failed: {e}"
            logger.warning(err_msg)
            errors.append(err_msg)

    # 3. Try Local Server (LMStudio / Ollama) as last resort
    llm_url = os.getenv("LLM_URL")
    if llm_url:
        try:
            from openai import OpenAI
            client = OpenAI(base_url=llm_url, api_key="lm-studio", max_retries=0, timeout=httpx_timeout)
            response = client.chat.completions.create(
                model="local-model",
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
                stream=stream,
                timeout=httpx_timeout,
            )
            logger.info("Successfully generated response using local server: %s", llm_url)
            return response
        except Exception as exc:
            err_msg = f"Local server '{llm_url}' failed: {exc}"
            logger.warning(err_msg)
            errors.append(err_msg)

    raise RuntimeError("All LLM providers failed:\n" + "\n".join(errors))
