"""
SSE Report Generator — streams AI-generated FIR/chargesheet draft tokens
using the Groq LLM (same GROQ_API_KEY used by the NL2SQL agent).
"""
import logging
from typing import AsyncGenerator

from app.config import settings

logger = logging.getLogger(__name__)

async def stream_report_tokens(
    case_id: str, report_type: str, notes: str
) -> AsyncGenerator[str, None]:
    """
    Yields SSE-formatted strings: `data: {"token": "..."}\n\n`
    """
    if not settings.GROQ_API_KEY:
        yield 'data: {"token": "Report generation is unavailable because GROQ_API_KEY is not configured."}\n\n'
        yield 'data: {"token": "[DONE]"}\n\n'
        return

    try:
        from groq import Groq  # type: ignore
        client = Groq(api_key=settings.GROQ_API_KEY)

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

        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            stream=True,
            max_tokens=1024,
            temperature=0.3,
        )

        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                # Escape double quotes and newlines for safe JSON embedding
                token = delta.content.replace('"', '\\"').replace("\n", "\\n")
                yield f'data: {{"token": "{token}"}}\n\n'

        yield 'data: {"token": "[DONE]"}\n\n'

    except Exception as e:
        logger.exception("Report generation stream failed: %s", e)
        yield f'data: {{"token": "Error generating report: {str(e)}"}}\n\n'
        yield 'data: {"token": "[DONE]"}\n\n'
