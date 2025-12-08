"""
FastAPI application for the Brief Bank tool.

Provides REST API endpoints for:
- Document ingestion (upload briefs)
- Brief bank browsing and search
- Draft generation workflow
- DOCX export
"""

import os
import uuid
import shutil
from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .models import (
    Brief, ArgumentChunk, NewMatterRequest, ProceduralPosture,
    OutlineSection, GeneratedSection, DraftBrief, RetrievalResult
)
from .document_parser import parse_document, chunk_brief
from .embeddings import BriefBankStore
from .generator import create_draft, generate_section, regenerate_section
from .exporter import export_draft


# Initialize FastAPI app
app = FastAPI(
    title="Brief Bank Tool",
    description="Legal brief generation workflow using AI-powered retrieval",
    version="0.1.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize store
store = BriefBankStore()

# Temporary storage for uploads
UPLOAD_DIR = Path(__file__).parent.parent.parent / "data" / "briefs"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# In-memory storage for active drafts
active_drafts: dict[str, tuple[DraftBrief, list[RetrievalResult]]] = {}


# ============ Health Check ============

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


# ============ Brief Ingestion ============

@app.post("/api/briefs/upload")
async def upload_brief(file: UploadFile = File(...)):
    """
    Upload and ingest a brief (DOCX or PDF).

    The brief is parsed, chunked, and indexed for retrieval.
    """
    # Validate file type
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    suffix = Path(file.filename).suffix.lower()
    if suffix not in [".docx", ".pdf"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Use .docx or .pdf"
        )

    # Save uploaded file
    file_path = UPLOAD_DIR / f"{uuid.uuid4()}{suffix}"
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    # Parse the document
    try:
        brief = parse_document(file_path)
        chunks, citations = chunk_brief(brief)

        # Store in the brief bank
        store.add_brief(brief, chunks, citations)

        return {
            "status": "success",
            "brief_id": brief.id,
            "title": brief.title,
            "sections_count": len(brief.sections),
            "chunks_count": len(chunks),
            "citations_count": len(citations),
            "metadata": {
                "court": brief.court,
                "jurisdiction": brief.jurisdiction,
                "procedural_posture": brief.procedural_posture.value if brief.procedural_posture else None,
                "case_name": brief.case_name,
                "case_number": brief.case_number,
            }
        }

    except Exception as e:
        # Clean up file on failure
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {e}")


@app.get("/api/briefs")
async def list_briefs():
    """List all briefs in the brief bank."""
    briefs = store.get_all_briefs()
    return {
        "briefs": [
            {
                "id": b.id,
                "title": b.title,
                "filename": b.filename,
                "court": b.court,
                "jurisdiction": b.jurisdiction,
                "procedural_posture": b.procedural_posture.value if b.procedural_posture else None,
                "case_name": b.case_name,
                "ingested_at": b.ingested_at.isoformat() if b.ingested_at else None,
            }
            for b in briefs
        ],
        "total": len(briefs)
    }


@app.get("/api/briefs/{brief_id}")
async def get_brief(brief_id: str):
    """Get details for a specific brief."""
    brief = store.get_brief(brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    # Get chunks for this brief
    chunk_ids = store.store.chunks_by_brief.get(brief_id, [])
    chunks = [store.get_chunk(cid) for cid in chunk_ids]

    return {
        "brief": {
            "id": brief.id,
            "title": brief.title,
            "filename": brief.filename,
            "court": brief.court,
            "jurisdiction": brief.jurisdiction,
            "procedural_posture": brief.procedural_posture.value if brief.procedural_posture else None,
            "case_name": brief.case_name,
            "case_number": brief.case_number,
            "legal_issues": brief.legal_issues,
            "outcome": brief.outcome,
            "ingested_at": brief.ingested_at.isoformat() if brief.ingested_at else None,
        },
        "sections": [
            {
                "id": s.id,
                "type": s.section_type.value,
                "title": s.title,
                "content_preview": s.content[:500] + "..." if len(s.content) > 500 else s.content,
            }
            for s in brief.sections
        ],
        "chunks": [
            {
                "id": c.id,
                "heading": c.heading,
                "type": c.section_type.value,
                "content_preview": c.content[:300] + "..." if len(c.content) > 300 else c.content,
                "citation_count": len(c.citations),
            }
            for c in chunks if c
        ]
    }


@app.delete("/api/briefs/{brief_id}")
async def delete_brief(brief_id: str):
    """Delete a brief from the brief bank."""
    brief = store.get_brief(brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found")

    store.delete_brief(brief_id)
    return {"status": "deleted", "brief_id": brief_id}


# ============ Search & Retrieval ============

class SearchRequest(BaseModel):
    query: str
    jurisdiction: Optional[str] = None
    procedural_posture: Optional[str] = None
    limit: int = 10


@app.post("/api/search")
async def search_chunks(request: SearchRequest):
    """
    Search the brief bank for relevant chunks.

    Returns chunks ranked by relevance with match explanations.
    """
    results = store.search_chunks(
        query=request.query,
        jurisdiction=request.jurisdiction,
        procedural_posture=request.procedural_posture,
        limit=request.limit
    )

    return {
        "results": [
            {
                "chunk_id": chunk.id,
                "brief_id": chunk.brief_id,
                "heading": chunk.heading,
                "content": chunk.content,
                "section_type": chunk.section_type.value,
                "court": chunk.court,
                "jurisdiction": chunk.jurisdiction,
                "score": score,
                "match_reasons": reasons,
                "source_brief": store.get_brief(chunk.brief_id).title if store.get_brief(chunk.brief_id) else None,
            }
            for chunk, score, reasons in results
        ],
        "total": len(results)
    }


# ============ Draft Generation ============

@app.post("/api/drafts/create")
async def create_new_draft(matter: NewMatterRequest):
    """
    Create a new draft brief.

    Returns an outline based on retrieved source material.
    """
    try:
        draft, retrieved = create_draft(matter, store)

        # Store for later use
        active_drafts[draft.id] = (draft, retrieved)

        return {
            "draft_id": draft.id,
            "status": draft.status,
            "outline": [
                {
                    "id": s.id,
                    "heading": s.heading,
                    "description": s.description,
                    "source_count": len(s.source_chunks),
                    "order": s.order,
                }
                for s in draft.outline
            ],
            "retrieved_sources": [
                {
                    "chunk_id": r.chunk.id,
                    "heading": r.chunk.heading,
                    "content_preview": r.chunk.content[:300],
                    "score": r.score,
                    "match_reasons": r.match_reasons,
                    "source_brief": r.source_brief_title,
                }
                for r in retrieved[:10]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create draft: {e}")


class UpdateOutlineRequest(BaseModel):
    sections: list[dict]  # [{id, heading, description, source_chunks, order}]


@app.put("/api/drafts/{draft_id}/outline")
async def update_outline(draft_id: str, request: UpdateOutlineRequest):
    """Update the outline for a draft."""
    if draft_id not in active_drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft, retrieved = active_drafts[draft_id]

    # Update outline sections
    new_outline = []
    for section_data in request.sections:
        section = OutlineSection(
            id=section_data.get("id", str(uuid.uuid4())),
            heading=section_data["heading"],
            description=section_data["description"],
            source_chunks=section_data.get("source_chunks", []),
            order=section_data["order"]
        )
        new_outline.append(section)

    draft.outline = sorted(new_outline, key=lambda s: s.order)
    draft.updated_at = datetime.now()

    return {"status": "updated", "outline_sections": len(draft.outline)}


@app.post("/api/drafts/{draft_id}/generate/{section_id}")
async def generate_draft_section(draft_id: str, section_id: str):
    """Generate content for a specific section."""
    if draft_id not in active_drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft, _ = active_drafts[draft_id]

    # Find the section
    section = None
    for s in draft.outline:
        if s.id == section_id:
            section = s
            break

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    try:
        generated = generate_section(section, draft.matter, store)

        # Update draft
        # Remove existing version if regenerating
        draft.sections = [s for s in draft.sections if s.section_id != section_id]
        draft.sections.append(generated)
        draft.sections.sort(key=lambda s: next(
            (o.order for o in draft.outline if o.id == s.section_id), 0
        ))
        draft.updated_at = datetime.now()

        return {
            "section_id": generated.section_id,
            "heading": generated.heading,
            "content": generated.content,
            "citations_used": [c.full_text for c in generated.citations_used],
            "citations_needed": generated.citations_needed,
            "warnings": generated.warnings,
            "sources": [
                {
                    "chunk_id": src.chunk.id,
                    "heading": src.chunk.heading,
                    "content_preview": src.chunk.content[:200],
                }
                for src in generated.source_chunks
            ],
            "adaptations": generated.original_sources,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")


class RegenerateRequest(BaseModel):
    additional_sources: Optional[list[str]] = None


@app.post("/api/drafts/{draft_id}/regenerate/{section_id}")
async def regenerate_draft_section(
    draft_id: str,
    section_id: str,
    request: RegenerateRequest
):
    """Regenerate a section with optional additional sources."""
    if draft_id not in active_drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft, _ = active_drafts[draft_id]

    try:
        generated = regenerate_section(
            draft,
            section_id,
            store,
            additional_sources=request.additional_sources
        )

        # Update draft
        draft.sections = [s for s in draft.sections if s.section_id != section_id]
        draft.sections.append(generated)
        draft.updated_at = datetime.now()

        return {
            "section_id": generated.section_id,
            "heading": generated.heading,
            "content": generated.content,
            "citations_needed": generated.citations_needed,
            "warnings": generated.warnings,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Regeneration failed: {e}")


@app.get("/api/drafts/{draft_id}")
async def get_draft(draft_id: str):
    """Get the current state of a draft."""
    if draft_id not in active_drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft, retrieved = active_drafts[draft_id]

    return {
        "draft_id": draft.id,
        "status": draft.status,
        "matter": {
            "case_name": draft.matter.case_name,
            "court": draft.matter.court,
            "jurisdiction": draft.matter.jurisdiction,
            "procedural_posture": draft.matter.procedural_posture.value,
            "legal_issues": draft.matter.legal_issues,
        },
        "outline": [
            {
                "id": s.id,
                "heading": s.heading,
                "description": s.description,
                "order": s.order,
                "generated": any(gs.section_id == s.id for gs in draft.sections),
            }
            for s in draft.outline
        ],
        "sections": [
            {
                "section_id": s.section_id,
                "heading": s.heading,
                "content": s.content,
                "warnings": s.warnings,
                "citations_needed": s.citations_needed,
            }
            for s in draft.sections
        ],
        "created_at": draft.created_at.isoformat(),
        "updated_at": draft.updated_at.isoformat(),
    }


# ============ Export ============

@app.post("/api/drafts/{draft_id}/export")
async def export_draft_to_docx(draft_id: str):
    """Export the draft to a DOCX file."""
    if draft_id not in active_drafts:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft, _ = active_drafts[draft_id]

    if not draft.sections:
        raise HTTPException(
            status_code=400,
            detail="No sections generated yet. Generate sections before exporting."
        )

    try:
        output_path = export_draft(draft)

        return FileResponse(
            path=output_path,
            filename=output_path.name,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")


# ============ Static Files & SPA Fallback ============

# Check if we have a static directory (production build)
STATIC_DIR = Path(__file__).parent.parent / "static"
if STATIC_DIR.exists():
    # Serve static files
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the SPA for all non-API routes."""
        # Don't intercept API routes
        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404)

        # Serve index.html for SPA routing
        index_path = STATIC_DIR / "index.html"
        if index_path.exists():
            return HTMLResponse(content=index_path.read_text())
        raise HTTPException(status_code=404)


# ============ Startup ============

@app.on_event("startup")
async def startup():
    """Initialize on startup."""
    # Ensure data directories exist
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # Log API key status (not the key itself!)
    if os.environ.get("ANTHROPIC_API_KEY"):
        print("✓ ANTHROPIC_API_KEY is set")
    else:
        print("⚠ WARNING: ANTHROPIC_API_KEY not set - generation will fail")

    # Log static file status
    if STATIC_DIR.exists():
        print(f"✓ Serving static files from {STATIC_DIR}")
    else:
        print("ℹ No static directory - running in API-only mode")
