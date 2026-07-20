"""
pdf_renderer.py — PRAHARI AI Enterprise PDF Report Engine
==========================================================
Renders conversation audit log data into a fully branded, print-quality
PDF using Jinja2 HTML templates and Google Chrome headless.

Architecture:
  1. load_data()       — pull from DuckDB AgentAuditLog + SQLite chat_messages
  2. render_html()     — Jinja2 template → HTML string
  3. generate_pdf()    — Chrome headless subprocess → PDF bytes
"""

import io
import os
import sys
import re
import base64
import subprocess
import tempfile
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ── Paths ──────────────────────────────────────────────────────────────────────
RENDERER_DIR  = Path(__file__).parent
REPORT_GEN    = RENDERER_DIR.parent
TEMPLATES_DIR = REPORT_GEN / "templates"
STYLES_DIR    = REPORT_GEN / "styles"
LOGOS_DIR     = REPORT_GEN / "assets" / "logos"

KARNATAKA_LOGO = LOGOS_DIR / "karnataka_emblem.png"
PRAHARI_LOGO   = LOGOS_DIR / "prahari_logo.png"

CHROME_CANDIDATES = [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "google-chrome",
    "chromium",
]


# ── Markdown → HTML ────────────────────────────────────────────────────────────

def _escape_html(text: str) -> str:
    """Minimal HTML escaping (not for user-trusted content — add full escaping)."""
    return (text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))


def _md_to_html(md: str) -> str:
    """
    Convert LLM Markdown output to clean HTML.
    Handles: headings, bold/italic, bullets, numbered lists,
             tables, hr, blockquotes, code blocks, inline code.
    No raw markdown symbols will appear in the output.
    """
    if not md or not md.strip():
        return ""

    lines = md.split("\n")
    html_parts: List[str] = []
    i = 0
    in_ul = False
    in_ol = False
    in_code_block = False
    code_lang = ""
    code_lines: List[str] = []

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            html_parts.append("</ul>")
            in_ul = False
        if in_ol:
            html_parts.append("</ol>")
            in_ol = False

    def inline_format(text: str) -> str:
        """Handle bold, italic, inline code."""
        # inline code first
        text = re.sub(r'`([^`]+)`', lambda m: f'<code>{_escape_html(m.group(1))}</code>', text)
        text = re.sub(r'\*\*\*(.+?)\*\*\*', r'<strong><em>\1</em></strong>', text)
        text = re.sub(r'\*\*(.+?)\*\*',     r'<strong>\1</strong>', text)
        text = re.sub(r'\*(.+?)\*',          r'<em>\1</em>', text)
        text = re.sub(r'~~(.+?)~~',           r'<del>\1</del>', text)
        # links
        text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
        return text

    def detect_callout(heading: str):
        """Detect special callout box headings."""
        lower = heading.lower()
        if "executive summary" in lower or "summary" in lower:
            return "executive-summary", "📊 Executive Summary"
        if "insight" in lower or "key finding" in lower:
            return "insights", "💡 Intelligence Insights"
        if "recommendation" in lower or "action" in lower:
            return "recommendations", "✅ Recommendations"
        if "warning" in lower or "alert" in lower:
            return "warning", "⚠ Warning"
        if "important" in lower:
            return "important", "❗ Important"
        return None, None

    while i < len(lines):
        line = lines[i]
        raw = line

        # ── Fenced code block ──────────────────────────────────────────────
        if raw.startswith("```"):
            if not in_code_block:
                in_code_block = True
                code_lang = raw[3:].strip()
                code_lines = []
                close_lists()
            else:
                in_code_block = False
                code_text = "\n".join(code_lines)
                html_parts.append(
                    f'<pre><code class="language-{code_lang or "text"}">'
                    f'{_escape_html(code_text)}</code></pre>'
                )
                code_lines = []
                code_lang = ""
            i += 1
            continue

        if in_code_block:
            code_lines.append(raw)
            i += 1
            continue

        stripped = raw.rstrip()

        # ── HR ────────────────────────────────────────────────────────────
        if re.match(r'^(-{3,}|\*{3,}|_{3,})$', stripped):
            close_lists()
            html_parts.append("<hr/>")
            i += 1
            continue

        # ── Headings ──────────────────────────────────────────────────────
        h_match = re.match(r'^(#{1,6})\s+(.*)', stripped)
        if h_match:
            close_lists()
            level = len(h_match.group(1))
            heading_text = inline_format(h_match.group(2).strip())

            if level == 2:
                callout_cls, callout_title = detect_callout(h_match.group(2).strip())
                if callout_cls:
                    # Collect following paragraph lines as callout body
                    body_lines = []
                    j = i + 1
                    while j < len(lines) and lines[j].strip() and not lines[j].startswith("#") and not lines[j].startswith("```"):
                        body_lines.append(inline_format(lines[j].strip()))
                        j += 1
                    body = " ".join(body_lines) if body_lines else ""
                    html_parts.append(
                        f'<div class="callout {callout_cls}">'
                        f'<div class="callout-title">{callout_title}</div>'
                        f'<div class="callout-body">{body}</div>'
                        f'</div>'
                    )
                    i = j
                    continue

            html_parts.append(f'<h{level}>{heading_text}</h{level}>')
            i += 1
            continue

        # ── Blockquote ────────────────────────────────────────────────────
        if stripped.startswith("> "):
            close_lists()
            bq_text = inline_format(stripped[2:])
            html_parts.append(f'<blockquote>{bq_text}</blockquote>')
            i += 1
            continue

        # ── Markdown table ────────────────────────────────────────────────
        if "|" in stripped and stripped.startswith("|"):
            close_lists()
            table_rows = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip().startswith("|"):
                table_rows.append(lines[i].strip())
                i += 1
            if len(table_rows) >= 2:
                html_parts.append('<table>')
                # header
                header_cells = [c.strip() for c in table_rows[0].strip("|").split("|")]
                html_parts.append("<thead><tr>")
                for cell in header_cells:
                    html_parts.append(f"<th>{inline_format(cell)}</th>")
                html_parts.append("</tr></thead>")
                # body (skip separator row)
                html_parts.append("<tbody>")
                for row_str in table_rows[2:]:
                    cells = [c.strip() for c in row_str.strip("|").split("|")]
                    html_parts.append("<tr>")
                    for cell in cells:
                        html_parts.append(f"<td>{inline_format(cell)}</td>")
                    html_parts.append("</tr>")
                html_parts.append("</tbody></table>")
            continue

        # ── Unordered list ────────────────────────────────────────────────
        ul_match = re.match(r'^[\*\-\+]\s+(.*)', stripped)
        if ul_match:
            if not in_ul:
                close_lists()
                html_parts.append("<ul>")
                in_ul = True
            html_parts.append(f'<li>{inline_format(ul_match.group(1))}</li>')
            i += 1
            continue

        # ── Ordered list ──────────────────────────────────────────────────
        ol_match = re.match(r'^\d+\.\s+(.*)', stripped)
        if ol_match:
            if not in_ol:
                close_lists()
                html_parts.append("<ol>")
                in_ol = True
            html_parts.append(f'<li>{inline_format(ol_match.group(1))}</li>')
            i += 1
            continue

        # ── Empty line ────────────────────────────────────────────────────
        if not stripped:
            close_lists()
            html_parts.append("")
            i += 1
            continue

        # ── Paragraph ─────────────────────────────────────────────────────
        close_lists()
        html_parts.append(f'<p>{inline_format(stripped)}</p>')
        i += 1

    close_lists()
    return "\n".join(html_parts)


# ── SQL Syntax Highlighter ─────────────────────────────────────────────────────

_SQL_KEYWORDS = re.compile(
    r'\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|INSERT|UPDATE|DELETE|WITH|UNION|ALL|DISTINCT|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|EXISTS|BY|ASC|DESC|CROSS|FULL|SUM|COUNT|AVG|MIN|MAX|COALESCE|CAST|LOWER|UPPER|TRIM|DATE|YEAR|MONTH|DAY)\b',
    re.IGNORECASE
)


def _highlight_sql(sql: str) -> str:
    """Apply lightweight syntax highlighting to SQL for HTML output."""
    if not sql:
        return ""
    escaped = _escape_html(sql)
    # keywords
    escaped = _SQL_KEYWORDS.sub(lambda m: f'<span class="sql-kw">{m.group(0).upper()}</span>', escaped)
    # strings
    escaped = re.sub(r"'([^']*)'", lambda m: f'<span class="sql-str">\'{m.group(1)}\'</span>', escaped)
    # numbers
    escaped = re.sub(r'\b(\d+(?:\.\d+)?)\b', r'<span class="sql-num">\1</span>', escaped)
    # comments
    escaped = re.sub(r'(--[^\n]*)', r'<span class="sql-cmt">\1</span>', escaped)
    return escaped


# ── Logo → base64 data URI ─────────────────────────────────────────────────────

def _logo_data_uri(path: Path) -> str:
    try:
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        ext = path.suffix.lower().lstrip(".")
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "svg": "image/svg+xml"}.get(ext, "image/png")
        return f"data:{mime};base64,{b64}"
    except Exception as e:
        logger.warning(f"Could not load logo {path}: {e}")
        return ""


# ── Data loader ───────────────────────────────────────────────────────────────

def _load_turns(con, session_id: str) -> List[Dict[str, Any]]:
    """
    Load conversation turns from DuckDB AgentAuditLog.
    Falls back to recent 20 entries if session-specific rows are empty.
    """
    turns = []
    if con is None:
        return turns

    query = """
        SELECT audit_id, timestamp, question, route_taken, generated_sql,
               model_used, row_count_returned, final_answer,
               role, scope_id, input_mode, detected_language
        FROM AgentAuditLog
        WHERE session_id = ? OR session_id = ?
        ORDER BY timestamp ASC
    """
    try:
        import pandas as pd
        df = con.execute(query, [str(session_id), f"session-{session_id}"]).fetchdf()
        if df.empty:
            df = con.execute("""
                SELECT audit_id, timestamp, question, route_taken, generated_sql,
                       model_used, row_count_returned, final_answer,
                       role, scope_id, input_mode, detected_language
                FROM AgentAuditLog ORDER BY timestamp DESC LIMIT 20
            """).fetchdf()
            if not df.empty:
                df = df.iloc[::-1].reset_index(drop=True)

        for _, row in df.iterrows():
            ts_val = row.get("timestamp")
            ts_str = str(ts_val)[:19] if ts_val and str(ts_val) != "NaT" else "N/A"
            sql_raw = str(row.get("generated_sql", "") or "").strip()
            answer_raw = str(row.get("final_answer", "") or "").strip()
            turns.append({
                "timestamp":      ts_str,
                "question":       str(row.get("question", "") or ""),
                "route":          str(row.get("route_taken", "") or ""),
                "model":          str(row.get("model_used", "") or ""),
                "row_count":      int(row["row_count_returned"]) if str(row.get("row_count_returned", "nan")) not in ("nan", "None", "") else None,
                "input_mode":     str(row.get("input_mode", "") or "text"),
                "sql":            sql_raw,
                "sql_highlighted": _highlight_sql(sql_raw),
                "answer":         answer_raw,
                "answer_html":    _md_to_html(answer_raw),
            })
    except Exception as e:
        logger.error(f"Failed to load audit log turns: {e}")

    return turns


# ── HTML Renderer ─────────────────────────────────────────────────────────────

def render_html(con, session_id: str) -> str:
    """Build the full report HTML string from templates + data."""
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
    except ImportError:
        raise RuntimeError("jinja2 is required: pip install jinja2")

    turns = _load_turns(con, session_id)

    # Resolve primary model from first turn
    primary_model = "NVIDIA DeepSeek R1"
    if turns and turns[0].get("model"):
        primary_model = turns[0]["model"]

    role = "SCRB_ADMIN"
    if turns and turns[0].get("route"):
        pass  # role comes from the data
    if con:
        try:
            import pandas as pd
            r = con.execute(
                "SELECT role FROM AgentAuditLog WHERE session_id = ? OR session_id = ? LIMIT 1",
                [str(session_id), f"session-{session_id}"]
            ).fetchdf()
            if not r.empty:
                role = str(r["role"].iloc[0])
        except Exception:
            pass

    # Load CSS
    css = ""
    css_path = STYLES_DIR / "report.css"
    if css_path.exists():
        css = css_path.read_text(encoding="utf-8")

    # Logos as base64 data URIs (so Chrome headless doesn't need file:// access)
    karnataka_logo = _logo_data_uri(KARNATAKA_LOGO)
    prahari_logo   = _logo_data_uri(PRAHARI_LOGO)

    generated_time = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M UTC")

    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        autoescape=select_autoescape(["html"]),
    )
    env.globals["e"] = lambda x: x  # identity — we already escape in Python

    template = env.get_template("report.html")
    html = template.render(
        css=css,
        karnataka_logo=karnataka_logo,
        prahari_logo=prahari_logo,
        session_id=session_id,
        role=role,
        generated_time=generated_time,
        total_turns=len(turns),
        primary_model=primary_model,
        turns=turns,
    )
    return html


# ── Chrome headless PDF generator ─────────────────────────────────────────────

def _find_chrome() -> Optional[str]:
    for candidate in CHROME_CANDIDATES:
        if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
            return candidate
        result = subprocess.run(["which", candidate], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    return None


def generate_pdf(html_content: str) -> bytes:
    """
    Feed HTML string to Chrome headless and return PDF bytes.
    Writes HTML to a temp file, runs Chrome, reads the output PDF.
    """
    chrome = _find_chrome()
    if not chrome:
        raise RuntimeError(
            "Google Chrome not found. Install with: sudo apt install google-chrome-stable"
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        html_path = os.path.join(tmpdir, "report.html")
        pdf_path  = os.path.join(tmpdir, "report.pdf")

        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        cmd = [
            chrome,
            "--headless=new",
            "--no-sandbox",
            "--disable-gpu",
            "--disable-dev-shm-usage",
            "--disable-software-rasterizer",
            "--disable-extensions",
            "--run-all-compositor-stages-before-draw",
            "--print-to-pdf-no-header",
            f"--print-to-pdf={pdf_path}",
            f"file://{html_path}",
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

        if not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            logger.error(f"Chrome stdout: {result.stdout}")
            logger.error(f"Chrome stderr: {result.stderr}")
            raise RuntimeError(f"Chrome failed to generate PDF. stderr: {result.stderr[:500]}")

        with open(pdf_path, "rb") as f:
            return f.read()


# ── Public API ────────────────────────────────────────────────────────────────

def render_conversation_pdf(con, session_id: str) -> bytes:
    """
    Main entry point.
    1. Renders Jinja2 template → HTML
    2. Converts HTML → PDF via Chrome headless
    Returns PDF bytes ready to stream to client.
    """
    html = render_html(con, session_id)
    pdf_bytes = generate_pdf(html)
    logger.info(f"Generated PDF for session {session_id}: {len(pdf_bytes)} bytes")
    return pdf_bytes
