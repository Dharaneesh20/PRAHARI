"""
SSE Report Generator — streams AI-generated FIR/chargesheet draft tokens
using multi-provider LLM fallback (NVIDIA API primary -> Groq -> Local).
"""
import os
import sys
import logging
from typing import AsyncGenerator

# Ensure ML pipeline directory is in sys.path for llm_client
ml_pipeline_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "prahari-ai-ml", "pipeline"))
if ml_pipeline_dir not in sys.path:
    sys.path.insert(0, ml_pipeline_dir)

try:
    from llm_client import complete_chat
except ImportError:
    complete_chat = None

logger = logging.getLogger(__name__)

async def stream_report_tokens(
    case_id: str, report_type: str, notes: str
) -> AsyncGenerator[str, None]:
    """
    Yields SSE-formatted strings: `data: {"token": "..."}\n\n`
    """
    if not complete_chat:
        yield 'data: {"token": "LLM client module is unavailable."}\n\n'
        yield 'data: {"token": "[DONE]"}\n\n'
        return

    try:
        system_prompt = (
            "You are an expert Karnataka State Police officer and legal document writer. "
            "Generate a professional, formal police report or FIR draft based on the given case details. "
            "Use official police report formatting with clear sections: "
            "Case Overview, Facts of the Case, Evidence, Officer Notes, and Declaration. "
            "Be precise, factual, and maintain official government document tone."
        )
        user_prompt = (
            f"Generate a {report_type} for Case ID: {case_id}.\n"
            f"Additional Notes: {notes or 'None provided.'}\n\n"
            "Format as an official Karnataka Police document with proper sections."
        )

        stream = complete_chat(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            stream=True,
            max_tokens=2048,
            temperature=0.3,
        )

        for chunk in stream:
            if hasattr(chunk, "choices") and chunk.choices:
                delta = chunk.choices[0].delta
                if delta and getattr(delta, "content", None):
                    token = delta.content.replace('"', '\\"').replace("\n", "\\n")
                    yield f'data: {{"token": "{token}"}}\n\n'

        yield 'data: {"token": "[DONE]"}\n\n'

    except Exception as e:
        logger.exception("Report generation stream failed: %s", e)
        yield f'data: {{"token": "Error generating report: {str(e)}"}}\n\n'
        yield 'data: {"token": "[DONE]"}\n\n'

