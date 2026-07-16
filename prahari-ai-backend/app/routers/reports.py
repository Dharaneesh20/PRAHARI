"""Reports router — list, AI draft (SSE), patch"""
from datetime import datetime, timezone
from typing import List

from app.models.user import User
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from fastapi.responses import StreamingResponse

from app.dependencies import get_current_user
from app.models.reports import Report, GenerateReportRequest, UpdateReportRequest, UpdateReportResponse
from app.services import mock_store
from app.services.report_generator import stream_report_tokens

router = APIRouter()


@router.get("", response_model=List[Report], summary="List all reports")
async def list_reports(current_user: User = Depends(get_current_user)):
    """Return all available case reports and summaries."""
    return mock_store.get_all_reports()


@router.post("/generate", summary="Generate AI FIR/report draft (SSE)")
async def generate_report(
    body: GenerateReportRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Streams AI-generated report content token-by-token as Server-Sent Events.
    Frontend should consume with `EventSource` or `fetch` with streaming.
    """
    return StreamingResponse(
        stream_report_tokens(body.caseId, body.type, body.notes or ""),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.patch("/{report_id}", response_model=UpdateReportResponse, summary="Save report revisions")
async def update_report(
    report_id: str,
    body: UpdateReportRequest,
    current_user: User = Depends(get_current_user),
):
    """Save edits to a report's title and/or sections."""
    sections_data = None
    if body.sections is not None:
        sections_data = [s.model_dump() for s in body.sections]

    report = mock_store.update_report(report_id, body.title, sections_data)
    if report is None:
        raise HTTPException(status_code=404, detail=f"Report {report_id} not found.")
    return {"status": "success", "updatedAt": datetime.now(timezone.utc)}
