"""
pdf_export.py — Conversation audit logs PDF generator using ReportLab
===================================================================
Pulls all logged database entries for a given session/conversation and renders
them into a professional document with running footers and code formatting.
"""
import io
import os
import sys
from datetime import datetime, timezone
import duckdb
import pandas as pd

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

# Add path helper to import step5 if needed
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

import re

def safe_xml(text: str) -> str:
    if not text:
        return ""
    # Convert & first, then < and >
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    # Convert markdown bold/italic to ReportLab HTML tags
    text = re.sub(r"\*\*(.*?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"\*(.*?)\*", r"<i>\1</i>", text)
    return text


def export_conversation_pdf(con, session_id: str) -> bytes:
    """
    Retrieves all AgentAuditLog rows for session_id, orders them chronologically,
    and returns a rendered PDF file stream as bytes.
    """
    if con is None:
        try:
            import duckdb
            db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "karnataka_fir.duckdb")
            if os.path.exists(db_path):
                con = duckdb.connect(db_path, read_only=True)
        except Exception:
            pass

    # 1. Query the audit log entries
    query = """
        SELECT audit_id, timestamp, question, route_taken, generated_sql, model_used, row_count_returned, final_answer, role, scope_id, input_mode, detected_language
        FROM AgentAuditLog
        WHERE session_id = ? OR session_id = ?
        ORDER BY timestamp ASC
    """
    df = pd.DataFrame()
    if con is not None:
        try:
            df = con.execute(query, [str(session_id), f"session-{session_id}"]).fetchdf()
            if df.empty:
                # Fallback: query recent audit logs if specific session_id had no direct logs
                df = con.execute("""
                    SELECT audit_id, timestamp, question, route_taken, generated_sql, model_used, row_count_returned, final_answer, role, scope_id, input_mode, detected_language
                    FROM AgentAuditLog
                    ORDER BY timestamp DESC LIMIT 20
                """).fetchdf()
                if not df.empty:
                    df = df.iloc[::-1].reset_index(drop=True)
        except Exception as e:
            print(f"Failed to query audit logs for PDF export: {e}")
            df = pd.DataFrame()

    # 2. Setup PDF document layout
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=54
    )

    story = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#0f172a'), spaceAfter=6
    )
    meta_style = ParagraphStyle('DocMeta', parent=styles['Normal'], fontName='Helvetica', fontSize=9, leading=12, textColor=colors.HexColor('#475569'), spaceAfter=15)
    q_bubble_style = ParagraphStyle('QueryBubble', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.HexColor('#1e293b'))
    details_style = ParagraphStyle('TurnDetails', parent=styles['Normal'], fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#64748b'))
    body_style = ParagraphStyle('TurnBody', parent=styles['BodyText'], fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#334155'), spaceAfter=8)
    sql_code_style = ParagraphStyle('SqlCode', parent=styles['Code'], fontName='Courier', fontSize=8.5, leading=11, textColor=colors.HexColor('#0f172a'))
    disclaimer_style = ParagraphStyle('TurnDisclaimer', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=colors.HexColor('#475569'), spaceBefore=4)

    story.append(Paragraph("PRAHARI AI — Conversation Audit Report", title_style))
    
    export_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    header_text = f"<b>Session ID:</b> {safe_xml(str(session_id))} | <b>Report Generated:</b> {export_time}"
    story.append(Paragraph(header_text, meta_style))
    story.append(Spacer(1, 10))

    role = "SCRB_ADMIN"
    scope_id = None
    if not df.empty:
        role = str(df['role'].iloc[0])
        scope_val = df['scope_id'].iloc[0]
        if pd.notna(scope_val):
            scope_id = int(scope_val)

    if df.empty:
        no_data_style = ParagraphStyle('NoData', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=11, leading=15, textColor=colors.HexColor('#ef4444'), spaceBefore=20)
        story.append(Paragraph("No audit logs recorded for this session ID.", no_data_style))
    else:
        for idx, row in df.iterrows():
            turn_elements = []
            q_text = row.get("question", "N/A")
            turn_elements.append(Paragraph(f"Turn {idx + 1}: Query: {safe_xml(q_text)}", q_bubble_style))
            
            route = row.get("route_taken", "other")
            model = row.get("model_used", "N/A")
            ts_val = row.get("timestamp")
            ts_str = str(ts_val)[:19] if pd.notna(ts_val) else "N/A"
            input_mode = row.get("input_mode", "text")
            lang = row.get("detected_language", "en-IN")
            
            meta_line = f"Route: <b>{safe_xml(str(route))}</b> | Model: <b>{safe_xml(str(model))}</b> | Input: <b>{safe_xml(str(input_mode))} ({safe_xml(str(lang))})</b> | Time: <b>{ts_str}</b>"
            turn_elements.append(Paragraph(meta_line, details_style))
            turn_elements.append(Spacer(1, 6))

            sql_val = row.get("generated_sql")
            if pd.notna(sql_val) and str(sql_val).strip():
                sql_p = Paragraph(f"<b>Executed SQL:</b><br/>{safe_xml(str(sql_val).strip())}", sql_code_style)
                sql_box = Table([[sql_p]], colWidths=[doc.width - 10])
                sql_box.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                    ('BORDER', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('TOPPADDING', (0,0), (-1,-1), 6),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                    ('LEFTPADDING', (0,0), (-1,-1), 8),
                    ('RIGHTPADDING', (0,0), (-1,-1), 8),
                ]))
                turn_elements.append(sql_box)
                turn_elements.append(Spacer(1, 6))

            ans_val = row.get("final_answer")
            if pd.notna(ans_val) and str(ans_val).strip():
                ans_str = str(ans_val).strip()
                blocks = ans_str.split("\n\n")
                for block in blocks:
                    block_clean = safe_xml(block.strip())
                    if not block_clean:
                        continue
                    if "disclosure" in block_clean.lower() or "synthetic" in block_clean.lower():
                        turn_elements.append(Paragraph(block_clean, disclaimer_style))
                    else:
                        turn_elements.append(Paragraph(block_clean, body_style))
            else:
                turn_elements.append(Paragraph("<i>No text answer returned or query resulted in error.</i>", body_style))
            
            turn_elements.append(Spacer(1, 10))
            story.append(KeepTogether(turn_elements))
            story.append(Spacer(1, 8))

    # 6. Build document and bind footer callback
    def draw_footer(canvas, document):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#475569'))
        
        # Metadata footer line
        footer_meta = f"PRAHARI AI Conversation Audit Report  |  Role: {role}  |  Scope ID: {scope_id if scope_id is not None else 'N/A'}"
        canvas.drawString(36, 30, footer_meta)
        
        # Page numbering
        canvas.drawRightString(document.pagesize[0] - 36, 30, f"Page {document.page}")
        
        # Horizontal rule
        canvas.setStrokeColor(colors.HexColor('#cbd5e1'))
        canvas.setLineWidth(0.5)
        canvas.line(36, 42, document.pagesize[0] - 36, 42)
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
