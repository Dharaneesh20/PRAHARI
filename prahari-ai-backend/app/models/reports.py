"""Reports endpoint schemas."""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ReportSection(BaseModel):
    heading: str
    content: str


class VersionEntry(BaseModel):
    version: int
    editedAt: datetime
    editedBy: str
    note: str


class Report(BaseModel):
    id: str
    title: str
    caseId: str
    type: str
    status: str
    createdAt: datetime
    updatedAt: datetime
    lastEditedBy: str
    sections: List[ReportSection]
    versionHistory: List[VersionEntry] = []


class GenerateReportRequest(BaseModel):
    caseId: str
    type: str
    notes: Optional[str] = ""


class UpdateReportRequest(BaseModel):
    title: Optional[str] = None
    sections: Optional[List[ReportSection]] = None


class UpdateReportResponse(BaseModel):
    status: str
    updatedAt: datetime
