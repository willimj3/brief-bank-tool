"""
Data models for the Brief Bank system.

These models represent the hierarchical structure of legal briefs:
- Brief: The top-level document with metadata
- BriefSection: Major sections (intro, facts, argument, conclusion)
- ArgumentChunk: Individual argument units for retrieval
- Citation: Extracted case citations with metadata
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ProceduralPosture(str, Enum):
    """Types of motions/procedural postures."""
    MOTION_TO_DISMISS = "motion_to_dismiss"
    SUMMARY_JUDGMENT = "summary_judgment"
    PRELIMINARY_INJUNCTION = "preliminary_injunction"
    MOTION_TO_COMPEL = "motion_to_compel"
    MOTION_IN_LIMINE = "motion_in_limine"
    OPPOSITION = "opposition"
    REPLY = "reply"
    APPEAL_BRIEF = "appeal_brief"
    OTHER = "other"


class SectionType(str, Enum):
    """Types of brief sections."""
    CAPTION = "caption"
    INTRODUCTION = "introduction"
    STATEMENT_OF_FACTS = "statement_of_facts"
    PROCEDURAL_HISTORY = "procedural_history"
    LEGAL_STANDARD = "legal_standard"
    ARGUMENT = "argument"
    CONCLUSION = "conclusion"
    OTHER = "other"


class Citation(BaseModel):
    """A legal citation extracted from a brief."""
    id: str
    full_text: str  # "Smith v. Jones, 123 F.3d 456 (9th Cir. 2020)"
    case_name: Optional[str] = None  # "Smith v. Jones"
    volume: Optional[str] = None
    reporter: Optional[str] = None
    page: Optional[str] = None
    court: Optional[str] = None
    year: Optional[int] = None
    pinpoint: Optional[str] = None  # Specific page cite
    parent_chunk_id: str  # Which chunk this citation appears in
    context: str  # Sentence/paragraph where citation appears


class ArgumentChunk(BaseModel):
    """
    A single retrievable argument unit.

    This is the atomic unit for semantic search - typically one
    roman numeral section or major heading's worth of argument.
    """
    id: str
    brief_id: str
    section_type: SectionType
    heading: Optional[str] = None  # The section heading if present
    content: str  # The full text of this chunk

    # Hierarchical relationships
    parent_chunk_id: Optional[str] = None  # For sub-arguments
    child_chunk_ids: list[str] = Field(default_factory=list)

    # Semantic metadata
    legal_issues: list[str] = Field(default_factory=list)  # Identified issues
    citations: list[str] = Field(default_factory=list)  # Citation IDs

    # For retrieval
    embedding: Optional[list[float]] = None

    # Classification
    is_legal_standard: bool = False  # Pure black-letter law
    is_procedural_language: bool = False  # Standard recitations
    is_factual: bool = False  # Case-specific facts (less portable)

    # Metadata from parent brief (denormalized for retrieval)
    jurisdiction: Optional[str] = None
    court: Optional[str] = None
    procedural_posture: Optional[ProceduralPosture] = None


class BriefSection(BaseModel):
    """A major section of a brief (intro, facts, argument, etc.)."""
    id: str
    brief_id: str
    section_type: SectionType
    title: Optional[str] = None
    content: str
    order: int  # Position in the brief
    chunk_ids: list[str] = Field(default_factory=list)


class Brief(BaseModel):
    """
    A complete legal brief document.

    This is the top-level container with all metadata.
    """
    id: str
    filename: str
    title: Optional[str] = None

    # Court and jurisdiction
    court: Optional[str] = None  # "N.D. Cal.", "9th Cir."
    jurisdiction: Optional[str] = None  # "federal", "california"
    judge: Optional[str] = None

    # Case information
    case_name: Optional[str] = None
    case_number: Optional[str] = None

    # Procedural information
    procedural_posture: Optional[ProceduralPosture] = None
    filing_date: Optional[datetime] = None

    # Outcome (if known)
    outcome: Optional[str] = None  # "granted", "denied", "settled", etc.
    outcome_favorable: Optional[bool] = None  # Did we win?

    # Authorship
    authors: list[str] = Field(default_factory=list)

    # Legal issues addressed
    legal_issues: list[str] = Field(default_factory=list)

    # Content structure
    sections: list[BriefSection] = Field(default_factory=list)
    full_text: str = ""

    # Processing metadata
    ingested_at: datetime = Field(default_factory=datetime.now)
    file_type: str = "docx"  # "docx" or "pdf"


class BriefStore(BaseModel):
    """The complete brief bank database."""
    briefs: dict[str, Brief] = Field(default_factory=dict)
    chunks: dict[str, ArgumentChunk] = Field(default_factory=dict)
    citations: dict[str, Citation] = Field(default_factory=dict)

    # Index for faster lookups
    chunks_by_brief: dict[str, list[str]] = Field(default_factory=dict)
    chunks_by_issue: dict[str, list[str]] = Field(default_factory=dict)
    chunks_by_jurisdiction: dict[str, list[str]] = Field(default_factory=dict)


# Request/Response models for API

class NewMatterRequest(BaseModel):
    """Request to start a new brief draft."""
    case_name: str
    court: str
    jurisdiction: str
    procedural_posture: ProceduralPosture
    legal_issues: list[str]
    fact_summary: str  # Brief description of relevant facts
    desired_outcome: str  # What relief is sought


class RetrievalResult(BaseModel):
    """A single retrieved chunk with relevance info."""
    chunk: ArgumentChunk
    score: float
    match_reasons: list[str]  # Why this was retrieved
    source_brief_title: Optional[str] = None
    source_brief_outcome: Optional[str] = None


class OutlineSection(BaseModel):
    """A proposed section in the brief outline."""
    id: str
    heading: str
    description: str  # What this section should cover
    source_chunks: list[str]  # Chunk IDs to draw from
    order: int


class GeneratedSection(BaseModel):
    """A generated section with provenance."""
    section_id: str
    heading: str
    content: str
    source_chunks: list[RetrievalResult]  # What influenced this
    citations_used: list[Citation]
    citations_needed: list[str]  # Points needing citations
    warnings: list[str]  # Any safety warnings

    # For side-by-side comparison
    original_sources: list[dict]  # {chunk_id, original_text, adapted_text}


class DraftBrief(BaseModel):
    """A complete draft brief in progress."""
    id: str
    matter: NewMatterRequest
    outline: list[OutlineSection]
    sections: list[GeneratedSection] = Field(default_factory=list)
    status: str = "outline"  # "outline", "drafting", "review", "complete"
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
