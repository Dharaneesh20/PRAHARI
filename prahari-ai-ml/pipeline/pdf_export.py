"""
pdf_export.py — PRAHARI AI PDF Export (Enterprise Edition)
===========================================================
Public API: export_conversation_pdf(con, session_id) -> bytes

Delegates to the report-generator engine which:
  - Renders a fully branded Jinja2 HTML template
  - Converts it to PDF via Google Chrome headless
  - Returns pixel-perfect PDF bytes

Backwards compatible: same signature as the original ReportLab implementation.
"""
import os
import sys
import logging

logger = logging.getLogger(__name__)

# Ensure the report-generator renderer is importable
_RENDERER_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "report-generator", "renderer")
if _RENDERER_DIR not in sys.path:
    sys.path.insert(0, _RENDERER_DIR)


def export_conversation_pdf(con, session_id: str) -> bytes:
    """
    Generate an enterprise-grade branded PDF report for the given session.

    Args:
        con:        DuckDB connection (may be None — renderer will attempt its own connection)
        session_id: Conversation session identifier

    Returns:
        bytes: PDF file content, ready to stream as application/pdf
    """
    try:
        from pdf_renderer import render_conversation_pdf
        return render_conversation_pdf(con, str(session_id))
    except Exception as e:
        logger.exception(f"Enterprise PDF generation failed for session {session_id}: {e}")
        # Graceful fallback to legacy ReportLab if chrome isn't available
        return _legacy_fallback(con, session_id, str(e))


def _legacy_fallback(con, session_id: str, error_msg: str) -> bytes:
    """
    Minimal ReportLab fallback in case Chrome headless is unavailable.
    Returns a simple error notice PDF.
    """
    try:
        import io
        from datetime import datetime, timezone
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=36, rightMargin=36, topMargin=54, bottomMargin=54)
        styles = getSampleStyleSheet()
        story = [
            Paragraph("PRAHARI AI — Conversation Report", ParagraphStyle(
                'T', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=16,
                textColor=colors.HexColor('#0B3D91')
            )),
            Spacer(1, 12),
            Paragraph(f"Session ID: {session_id}", styles['Normal']),
            Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles['Normal']),
            Spacer(1, 20),
            Paragraph(
                f"Note: The enterprise Chrome-based PDF renderer encountered an issue: {error_msg[:200]}. "
                "Please ensure Google Chrome is installed and try again.",
                ParagraphStyle('Err', parent=styles['Normal'], textColor=colors.HexColor('#991B1B'))
            ),
        ]
        doc.build(story)
        return buffer.getvalue()
    except Exception as fe:
        logger.error(f"Fallback PDF also failed: {fe}")
        return b""
