"""
Embedding generation and storage for semantic search.

Uses Anthropic's API for generating embeddings and stores them
in a simple JSON format for the MVP.
"""

import json
import os
from pathlib import Path
from typing import Optional
import numpy as np
from anthropic import Anthropic

from .models import ArgumentChunk, BriefStore


# We'll use a simple approach: generate embeddings using Claude
# by asking it to create a semantic summary, then use that for matching.
# For production, you'd want to use a dedicated embedding model.

DATA_DIR = Path(__file__).parent.parent.parent / "data"
STORE_FILE = DATA_DIR / "embeddings" / "brief_store.json"


def get_anthropic_client() -> Anthropic:
    """Get Anthropic client from environment."""
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY environment variable not set")
    return Anthropic(api_key=api_key)


def generate_embedding_text(chunk: ArgumentChunk) -> str:
    """
    Generate a text representation optimized for semantic matching.

    This creates a structured summary that captures:
    - The legal issues addressed
    - The type of argument
    - Key legal concepts
    - Jurisdiction context
    """
    parts = []

    # Section type context
    if chunk.is_legal_standard:
        parts.append("LEGAL STANDARD:")
    elif chunk.is_factual:
        parts.append("FACTUAL BACKGROUND:")
    elif chunk.section_type.value == "argument":
        parts.append("LEGAL ARGUMENT:")

    # Heading if present
    if chunk.heading:
        parts.append(f"Topic: {chunk.heading}")

    # Jurisdiction context
    if chunk.jurisdiction:
        parts.append(f"Jurisdiction: {chunk.jurisdiction}")
    if chunk.court:
        parts.append(f"Court: {chunk.court}")

    # Procedural posture
    if chunk.procedural_posture:
        parts.append(f"Procedural posture: {chunk.procedural_posture.value}")

    # The actual content (truncated for embedding)
    content = chunk.content[:2000]  # Limit for embedding
    parts.append(f"Content: {content}")

    return "\n".join(parts)


async def generate_semantic_keywords(chunk: ArgumentChunk, client: Anthropic) -> list[str]:
    """
    Use Claude to extract semantic keywords/concepts from a chunk.

    This helps with retrieval by identifying the legal concepts
    even when exact phrases don't match.
    """
    prompt = f"""Analyze this legal brief excerpt and extract key legal concepts, issues, and doctrines.

Excerpt:
{chunk.content[:1500]}

Return a JSON array of 5-10 key legal concepts/issues. Be specific about legal doctrines.
Examples: "personal jurisdiction", "12(b)(6) motion to dismiss", "statute of limitations",
"breach of fiduciary duty", "minimum contacts test", "purposeful availment"

Return ONLY the JSON array, no other text."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )

    try:
        keywords = json.loads(response.content[0].text)
        return keywords if isinstance(keywords, list) else []
    except json.JSONDecodeError:
        return []


def compute_similarity(query_text: str, chunk_text: str) -> float:
    """
    Compute text similarity using keyword overlap and fuzzy matching.

    For MVP, we use a simple approach:
    - Normalize both texts
    - Compute Jaccard similarity on word sets
    - Boost for exact phrase matches

    For production, use proper embeddings.
    """
    # Normalize
    query_words = set(query_text.lower().split())
    chunk_words = set(chunk_text.lower().split())

    # Remove common words
    stop_words = {
        'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'could', 'should', 'may', 'might', 'must', 'shall',
        'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
        'as', 'into', 'through', 'during', 'before', 'after', 'above',
        'below', 'between', 'under', 'again', 'further', 'then', 'once',
        'that', 'this', 'these', 'those', 'and', 'but', 'or', 'nor',
        'so', 'yet', 'both', 'each', 'few', 'more', 'most', 'other',
        'some', 'such', 'no', 'not', 'only', 'own', 'same', 'than',
    }

    query_words = query_words - stop_words
    chunk_words = chunk_words - stop_words

    if not query_words or not chunk_words:
        return 0.0

    # Jaccard similarity
    intersection = len(query_words & chunk_words)
    union = len(query_words | chunk_words)
    jaccard = intersection / union if union > 0 else 0

    # Boost for key legal terms matching
    legal_terms = {
        'jurisdiction', 'motion', 'dismiss', 'summary', 'judgment',
        'contract', 'breach', 'negligence', 'fraud', 'tort',
        'statute', 'limitations', 'standing', 'preemption',
        'discovery', 'evidence', 'damages', 'injunction', 'relief'
    }

    legal_matches = len((query_words & chunk_words) & legal_terms)
    legal_boost = legal_matches * 0.1

    return min(1.0, jaccard + legal_boost)


class BriefBankStore:
    """
    Persistent storage for the brief bank.

    Stores briefs, chunks, and citations in JSON format.
    """

    def __init__(self, store_path: Optional[Path] = None):
        self.store_path = store_path or STORE_FILE
        self.store_path.parent.mkdir(parents=True, exist_ok=True)
        self._load()

    def _load(self):
        """Load store from disk."""
        if self.store_path.exists():
            with open(self.store_path, 'r') as f:
                data = json.load(f)
                self.store = BriefStore(**data)
        else:
            self.store = BriefStore()

    def _save(self):
        """Save store to disk."""
        with open(self.store_path, 'w') as f:
            json.dump(self.store.model_dump(), f, indent=2, default=str)

    def add_brief(self, brief, chunks, citations):
        """Add a brief and its chunks to the store."""
        from .models import Brief, ArgumentChunk, Citation

        self.store.briefs[brief.id] = brief
        self.store.chunks_by_brief[brief.id] = []

        for chunk in chunks:
            self.store.chunks[chunk.id] = chunk
            self.store.chunks_by_brief[brief.id].append(chunk.id)

            # Index by jurisdiction
            if chunk.jurisdiction:
                if chunk.jurisdiction not in self.store.chunks_by_jurisdiction:
                    self.store.chunks_by_jurisdiction[chunk.jurisdiction] = []
                self.store.chunks_by_jurisdiction[chunk.jurisdiction].append(chunk.id)

            # Index by legal issues
            for issue in chunk.legal_issues:
                if issue not in self.store.chunks_by_issue:
                    self.store.chunks_by_issue[issue] = []
                self.store.chunks_by_issue[issue].append(chunk.id)

        for citation in citations:
            self.store.citations[citation.id] = citation

        self._save()

    def get_brief(self, brief_id: str):
        """Get a brief by ID."""
        return self.store.briefs.get(brief_id)

    def get_chunk(self, chunk_id: str):
        """Get a chunk by ID."""
        return self.store.chunks.get(chunk_id)

    def get_all_briefs(self):
        """Get all briefs."""
        return list(self.store.briefs.values())

    def get_all_chunks(self):
        """Get all chunks."""
        return list(self.store.chunks.values())

    def search_chunks(
        self,
        query: str,
        jurisdiction: Optional[str] = None,
        procedural_posture: Optional[str] = None,
        limit: int = 10
    ) -> list[tuple]:
        """
        Search chunks by semantic similarity.

        Returns list of (chunk, score, match_reasons) tuples.
        """
        results = []

        for chunk in self.store.chunks.values():
            # Apply filters
            if jurisdiction and chunk.jurisdiction != jurisdiction:
                continue
            if procedural_posture and chunk.procedural_posture:
                if chunk.procedural_posture.value != procedural_posture:
                    continue

            # Compute similarity
            chunk_text = generate_embedding_text(chunk)
            score = compute_similarity(query, chunk_text)

            if score > 0.05:  # Minimum threshold
                match_reasons = []

                if chunk.jurisdiction == jurisdiction:
                    match_reasons.append(f"Same jurisdiction: {jurisdiction}")
                    score *= 1.2  # Boost

                if chunk.procedural_posture and procedural_posture:
                    if chunk.procedural_posture.value == procedural_posture:
                        match_reasons.append(f"Same procedural posture: {procedural_posture}")
                        score *= 1.2  # Boost

                if chunk.heading:
                    match_reasons.append(f"Section: {chunk.heading}")

                results.append((chunk, score, match_reasons))

        # Sort by score descending
        results.sort(key=lambda x: x[1], reverse=True)

        return results[:limit]

    def delete_brief(self, brief_id: str):
        """Delete a brief and its chunks."""
        if brief_id not in self.store.briefs:
            return

        # Remove chunks
        chunk_ids = self.store.chunks_by_brief.get(brief_id, [])
        for chunk_id in chunk_ids:
            chunk = self.store.chunks.get(chunk_id)
            if chunk:
                # Remove from issue index
                for issue in chunk.legal_issues:
                    if issue in self.store.chunks_by_issue:
                        self.store.chunks_by_issue[issue] = [
                            cid for cid in self.store.chunks_by_issue[issue]
                            if cid != chunk_id
                        ]

                # Remove from jurisdiction index
                if chunk.jurisdiction and chunk.jurisdiction in self.store.chunks_by_jurisdiction:
                    self.store.chunks_by_jurisdiction[chunk.jurisdiction] = [
                        cid for cid in self.store.chunks_by_jurisdiction[chunk.jurisdiction]
                        if cid != chunk_id
                    ]

                # Remove citations
                for cit_id in chunk.citations:
                    if cit_id in self.store.citations:
                        del self.store.citations[cit_id]

                del self.store.chunks[chunk_id]

        # Remove brief
        del self.store.briefs[brief_id]
        if brief_id in self.store.chunks_by_brief:
            del self.store.chunks_by_brief[brief_id]

        self._save()
