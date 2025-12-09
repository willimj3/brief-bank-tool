"""
Brief draft generation using Anthropic API.

Handles:
- Outline generation from retrieved source material
- Section-by-section draft generation
- Citation preservation and [CITATION NEEDED] marking
- Transparent adaptation with source tracking
"""

import os
import re
import uuid
from typing import Optional
from anthropic import Anthropic

from .models import (
    NewMatterRequest, ArgumentChunk, RetrievalResult,
    OutlineSection, GeneratedSection, DraftBrief, Citation
)
from .embeddings import BriefBankStore


def get_anthropic_client() -> Anthropic:
    """Get Anthropic client from environment."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return Anthropic(api_key=api_key)


def generate_outline(
    matter: NewMatterRequest,
    retrieved_chunks: list[RetrievalResult],
    client: Optional[Anthropic] = None
) -> list[OutlineSection]:
    """
    Generate a proposed outline for the brief based on retrieved source material.

    This proposes a structure before generating prose, allowing the user
    to shape the argument organization.
    """
    client = client or get_anthropic_client()

    # Build context from retrieved chunks
    source_summaries = []
    for i, result in enumerate(retrieved_chunks[:10]):  # Top 10 for context
        chunk = result.chunk
        summary = f"""
Source {i+1} (Score: {result.score:.2f}):
- Heading: {chunk.heading or 'No heading'}
- Type: {chunk.section_type.value}
- From: {result.source_brief_title or 'Unknown'}
- Court: {chunk.court or 'Unknown'}
- Excerpt: {chunk.content[:500]}...
"""
        source_summaries.append(summary)

    prompt = f"""You are helping draft a legal brief. Based on the matter details and retrieved source material from the firm's brief bank, propose an outline for the brief.

MATTER DETAILS:
- Case: {matter.case_name}
- Court: {matter.court}
- Jurisdiction: {matter.jurisdiction}
- Procedural Posture: {matter.procedural_posture.value}
- Legal Issues: {', '.join(matter.legal_issues)}
- Fact Summary: {matter.fact_summary}
- Desired Outcome: {matter.desired_outcome}

RETRIEVED SOURCE MATERIAL:
{chr(10).join(source_summaries)}

INSTRUCTIONS:
1. Propose an outline with 4-7 main sections appropriate for this type of motion
2. For each section, identify which source materials (by number) would be most useful
3. Consider the standard structure for this procedural posture
4. Include Introduction, Statement of Facts placeholder, Argument sections, and Conclusion

Return the outline in this exact JSON format:
{{
  "sections": [
    {{
      "heading": "I. INTRODUCTION",
      "description": "Brief overview of the motion and relief sought",
      "source_indices": [1, 3],
      "order": 0
    }},
    ...
  ]
}}

Return ONLY valid JSON, no other text."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        import json
        # Clean up potential markdown code block wrapping around JSON
        response_text = response.content[0].text
        response_text = re.sub(r'^```\w*\s*', '', response_text.strip())
        response_text = re.sub(r'```\s*$', '', response_text.strip())
        result = json.loads(response_text)

        outline_sections = []
        for section_data in result.get("sections", []):
            # Map source indices to actual chunk IDs
            source_chunk_ids = []
            for idx in section_data.get("source_indices", []):
                if 0 < idx <= len(retrieved_chunks):
                    source_chunk_ids.append(retrieved_chunks[idx-1].chunk.id)

            section = OutlineSection(
                id=str(uuid.uuid4()),
                heading=section_data["heading"],
                description=section_data["description"],
                source_chunks=source_chunk_ids,
                order=section_data.get("order", 0)
            )
            outline_sections.append(section)

        return sorted(outline_sections, key=lambda s: s.order)

    except (json.JSONDecodeError, KeyError) as e:
        # Fallback to default outline
        return _default_outline(matter)


def _clean_markdown_artifacts(text: str) -> str:
    """
    Remove markdown formatting artifacts from generated text.

    Cleans up:
    - Code blocks (```json, ```, etc.)
    - Markdown headers (###, ##, etc.) that shouldn't appear in legal briefs
    - Extra whitespace from removed artifacts
    """
    # Remove code block markers (```json, ```python, ```, etc.)
    text = re.sub(r'```\w*\s*', '', text)
    text = re.sub(r'```', '', text)

    # Remove markdown headers that appear mid-text (### A., ## B., etc.)
    # Keep Roman numeral headers like "I. INTRODUCTION" but remove markdown #
    # Only remove # at start of lines, not # in middle of text
    text = re.sub(r'^#{1,6}\s*', '', text, flags=re.MULTILINE)

    # Clean up any leftover empty lines from removed content
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Strip leading/trailing whitespace
    text = text.strip()

    return text


def _default_outline(matter: NewMatterRequest) -> list[OutlineSection]:
    """Generate a default outline when AI fails."""
    sections = [
        OutlineSection(
            id=str(uuid.uuid4()),
            heading="I. INTRODUCTION",
            description="Overview of the motion and relief sought",
            source_chunks=[],
            order=0
        ),
        OutlineSection(
            id=str(uuid.uuid4()),
            heading="II. STATEMENT OF FACTS",
            description="Relevant factual background",
            source_chunks=[],
            order=1
        ),
        OutlineSection(
            id=str(uuid.uuid4()),
            heading="III. LEGAL STANDARD",
            description=f"Standard for {matter.procedural_posture.value}",
            source_chunks=[],
            order=2
        ),
        OutlineSection(
            id=str(uuid.uuid4()),
            heading="IV. ARGUMENT",
            description="Legal arguments supporting the motion",
            source_chunks=[],
            order=3
        ),
        OutlineSection(
            id=str(uuid.uuid4()),
            heading="V. CONCLUSION",
            description="Summary and request for relief",
            source_chunks=[],
            order=4
        ),
    ]
    return sections


def generate_section(
    section: OutlineSection,
    matter: NewMatterRequest,
    store: BriefBankStore,
    client: Optional[Anthropic] = None
) -> GeneratedSection:
    """
    Generate a single section of the brief.

    Key behaviors:
    - Only uses citations from source material (never hallucinate)
    - Marks points needing citations as [CITATION NEEDED]
    - Shows what was adapted from which source
    - Flags any safety concerns
    """
    client = client or get_anthropic_client()

    # Gather source chunks
    source_chunks = []
    source_texts = []
    all_citations = []

    for chunk_id in section.source_chunks:
        chunk = store.get_chunk(chunk_id)
        if chunk:
            brief = store.get_brief(chunk.brief_id)

            result = RetrievalResult(
                chunk=chunk,
                score=1.0,
                match_reasons=["Selected for this section"],
                source_brief_title=brief.title if brief else None,
                source_brief_outcome=brief.outcome if brief else None
            )
            source_chunks.append(result)

            source_texts.append(f"""
SOURCE (from {brief.title if brief else 'Unknown'}):
Heading: {chunk.heading or 'No heading'}
Content:
{chunk.content}
""")

            # Collect citations from this chunk
            for cit_id in chunk.citations:
                cit = store.store.citations.get(cit_id)
                if cit:
                    all_citations.append(cit)

    # Build citation reference
    citation_ref = "\n".join([
        f"- {cit.full_text}" for cit in all_citations
    ]) if all_citations else "No citations available from source material."

    prompt = f"""You are drafting a section of a legal brief. Generate content for the following section using ONLY the provided source material.

SECTION TO DRAFT:
Heading: {section.heading}
Description: {section.description}

MATTER CONTEXT:
- Case: {matter.case_name}
- Court: {matter.court}
- Procedural Posture: {matter.procedural_posture.value}
- Legal Issues: {', '.join(matter.legal_issues)}
- Facts: {matter.fact_summary}

SOURCE MATERIAL TO DRAW FROM:
{chr(10).join(source_texts) if source_texts else 'No source material selected for this section.'}

AVAILABLE CITATIONS (USE ONLY THESE):
{citation_ref}

CRITICAL INSTRUCTIONS:
1. NEVER invent or hallucinate citations. Only use citations listed above.
2. If a statement needs a citation but none is available, write [CITATION NEEDED].
3. Adapt the source material to this specific case and facts.
4. Use [FACT PLACEHOLDER: description] where case-specific facts are needed.
5. Maintain professional legal writing style.
6. If this is a STATEMENT OF FACTS section, use mostly placeholders since facts are case-specific.

WARNINGS TO CHECK:
- If you reference client names from source material, note this for removal
- If citations are more than 5 years old, note they should be verified
- If using authority from a different jurisdiction, note it's persuasive only

Write the section content now. After the content, provide a JSON block with:
{{
  "citations_used": ["full citation text", ...],
  "citations_needed": ["description of what needs citation", ...],
  "warnings": ["any safety warnings", ...],
  "adaptations": [
    {{"original": "original text excerpt", "adapted": "how you adapted it"}}
  ]
}}

Section content:"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = response.content[0].text

    # Parse response - split content from JSON metadata
    content = response_text
    citations_used = []
    citations_needed = []
    warnings = []
    adaptations = []

    # Try to extract JSON block at the end
    json_match = re.search(r'\{[\s\S]*"citations_used"[\s\S]*\}', response_text)
    if json_match:
        try:
            import json
            metadata = json.loads(json_match.group())
            content = response_text[:json_match.start()].strip()
            citations_used = metadata.get("citations_used", [])
            citations_needed = metadata.get("citations_needed", [])
            warnings = metadata.get("warnings", [])
            adaptations = metadata.get("adaptations", [])
        except json.JSONDecodeError:
            pass

    # Clean up markdown artifacts from the content
    content = _clean_markdown_artifacts(content)

    # Map citation texts to Citation objects
    used_citation_objects = []
    for cit_text in citations_used:
        for cit in all_citations:
            if cit.full_text in cit_text or cit_text in cit.full_text:
                used_citation_objects.append(cit)
                break

    # Check for old citations
    from datetime import datetime
    current_year = datetime.now().year
    for cit in used_citation_objects:
        if cit.year and (current_year - cit.year) > 5:
            warnings.append(f"Citation may be outdated (>5 years): {cit.full_text}")

    return GeneratedSection(
        section_id=section.id,
        heading=section.heading,
        content=content,
        source_chunks=source_chunks,
        citations_used=used_citation_objects,
        citations_needed=citations_needed,
        warnings=warnings,
        original_sources=[
            {"original": a.get("original", ""), "adapted": a.get("adapted", "")}
            for a in adaptations
        ]
    )


def create_draft(
    matter: NewMatterRequest,
    store: BriefBankStore,
    client: Optional[Anthropic] = None
) -> DraftBrief:
    """
    Create a new draft brief with outline.

    This is the entry point for the generation workflow.
    It retrieves relevant source material and proposes an outline.
    """
    client = client or get_anthropic_client()

    # Build search query from matter
    query = f"{matter.procedural_posture.value} {' '.join(matter.legal_issues)} {matter.fact_summary}"

    # Retrieve relevant chunks
    search_results = store.search_chunks(
        query=query,
        jurisdiction=matter.jurisdiction,
        procedural_posture=matter.procedural_posture.value,
        limit=15
    )

    # Convert to RetrievalResult objects
    retrieved = []
    for chunk, score, reasons in search_results:
        brief = store.get_brief(chunk.brief_id)
        result = RetrievalResult(
            chunk=chunk,
            score=score,
            match_reasons=reasons,
            source_brief_title=brief.title if brief else None,
            source_brief_outcome=brief.outcome if brief else None
        )
        retrieved.append(result)

    # Generate outline
    outline = generate_outline(matter, retrieved, client)

    # Create draft
    draft = DraftBrief(
        id=str(uuid.uuid4()),
        matter=matter,
        outline=outline,
        status="outline"
    )

    return draft, retrieved


def regenerate_section(
    draft: DraftBrief,
    section_id: str,
    store: BriefBankStore,
    additional_sources: Optional[list[str]] = None,
    client: Optional[Anthropic] = None
) -> GeneratedSection:
    """
    Regenerate a single section, optionally with additional source chunks.
    """
    # Find the section in the outline
    section = None
    for s in draft.outline:
        if s.id == section_id:
            section = s
            break

    if not section:
        raise ValueError(f"Section {section_id} not found in outline")

    # Add additional sources if provided
    if additional_sources:
        section.source_chunks.extend(additional_sources)

    return generate_section(section, draft.matter, store, client)
