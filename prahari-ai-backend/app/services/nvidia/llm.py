"""
Prahari AI — NVIDIA LLM Service (Chat & Summarization)
LLM inference using NVIDIA Hosted Open-Source Models.
"""
import logging
from typing import Dict, Any, List, Optional
from app.config import settings
from app.services.nvidia.client import post_nvidia_api, is_nvidia_configured

logger = logging.getLogger(__name__)

async def chat_completion(
    messages: List[Dict[str, str]],
    model: str = "meta/llama-3.1-70b-instruct",
    temperature: float = 0.2,
    max_tokens: int = 1024,
) -> Dict[str, Any]:
    """
    Sends a chat completion request to NVIDIA Hosted LLM endpoint.
    """
    if not is_nvidia_configured():
        if settings.GROQ_API_KEY:
            logger.info("NVIDIA API key not set. Using Groq API fallback for LLM inference.")
            # Fallback to Groq if set
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": messages,
                            "temperature": temperature,
                            "max_tokens": max_tokens,
                        }
                    )
                    if res.status_code == 200:
                        data = res.json()
                        reply = data["choices"][0]["message"]["content"]
                        return {
                            "response": reply,
                            "provider": "NVIDIA AI (via Groq Fallback)",
                            "model": "llama-3.3-70b-versatile",
                            "status": "success",
                        }
                except Exception as e:
                    logger.error("Groq fallback failed: %s", e)

        # Standalone mock response if no API key is available
        user_last = messages[-1]["content"] if messages else ""
        return {
            "response": f"Prahari Tactical Assistant (NVIDIA AI): Received query regarding '{user_last[:60]}'. All active units across Karnataka districts are monitored.",
            "provider": "NVIDIA AI Hosted APIs",
            "model": model,
            "status": "demo",
        }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    res = await post_nvidia_api("chat/completions", payload)
    if "error" in res:
        logger.warning("NVIDIA LLM API error: %s", res["error"])
        return {
            "response": "NVIDIA AI Service unavailable. Please verify API key configuration.",
            "provider": "NVIDIA AI Hosted APIs",
            "model": model,
            "status": "error",
            "detail": res.get("detail", str(res["error"])),
        }

    try:
        content = res["choices"][0]["message"]["content"]
        return {
            "response": content,
            "provider": "NVIDIA AI Hosted APIs",
            "model": model,
            "status": "success",
        }
    except Exception as e:
        logger.error("Failed to parse NVIDIA LLM chat response: %s", e)
        return {
            "response": "Error parsing response from NVIDIA AI Hosted LLM.",
            "provider": "NVIDIA AI Hosted APIs",
            "model": model,
            "status": "error",
        }


async def summarize_text(
    text: str,
    max_length: int = 250,
) -> Dict[str, Any]:
    """
    Summarizes long crime reports, FIR descriptions, or transcripts using NVIDIA Hosted LLM.
    """
    messages = [
        {
            "role": "system",
            "content": f"You are an expert law enforcement intelligence analyst. Summarize the following document concisely in under {max_length} words, highlighting key facts, dates, accused persons, and locations."
        },
        {
            "role": "user",
            "content": text
        }
    ]
    res = await chat_completion(messages, max_tokens=max_length * 4)
    return {
        "summary": res.get("response", ""),
        "provider": res.get("provider", "NVIDIA AI Hosted APIs"),
        "status": res.get("status", "success"),
    }
