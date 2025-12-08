import axios from 'axios';
import type {
  Brief,
  BriefSection,
  Chunk,
  SearchResult,
  NewMatter,
  Draft,
  GeneratedSection,
  RetrievedSource,
  OutlineSection,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
});

// Brief Bank APIs

export async function uploadBrief(file: File): Promise<{
  brief_id: string;
  title: string | null;
  sections_count: number;
  chunks_count: number;
  citations_count: number;
  metadata: {
    court: string | null;
    jurisdiction: string | null;
    procedural_posture: string | null;
    case_name: string | null;
    case_number: string | null;
  };
}> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/briefs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function listBriefs(): Promise<{ briefs: Brief[]; total: number }> {
  const response = await api.get('/briefs');
  return response.data;
}

export async function getBrief(briefId: string): Promise<{
  brief: Brief;
  sections: BriefSection[];
  chunks: Chunk[];
}> {
  const response = await api.get(`/briefs/${briefId}`);
  return response.data;
}

export async function deleteBrief(briefId: string): Promise<void> {
  await api.delete(`/briefs/${briefId}`);
}

// Search APIs

export async function searchChunks(
  query: string,
  options?: {
    jurisdiction?: string;
    procedural_posture?: string;
    limit?: number;
  }
): Promise<{ results: SearchResult[]; total: number }> {
  const response = await api.post('/search', {
    query,
    ...options,
  });
  return response.data;
}

// Draft APIs

export async function createDraft(matter: NewMatter): Promise<{
  draft_id: string;
  status: string;
  outline: OutlineSection[];
  retrieved_sources: RetrievedSource[];
}> {
  const response = await api.post('/drafts/create', matter);
  return response.data;
}

export async function getDraft(draftId: string): Promise<Draft> {
  const response = await api.get(`/drafts/${draftId}`);
  return response.data;
}

export async function updateOutline(
  draftId: string,
  sections: Partial<OutlineSection>[]
): Promise<void> {
  await api.put(`/drafts/${draftId}/outline`, { sections });
}

export async function generateSection(
  draftId: string,
  sectionId: string
): Promise<GeneratedSection> {
  const response = await api.post(`/drafts/${draftId}/generate/${sectionId}`);
  return response.data;
}

export async function regenerateSection(
  draftId: string,
  sectionId: string,
  additionalSources?: string[]
): Promise<GeneratedSection> {
  const response = await api.post(`/drafts/${draftId}/regenerate/${sectionId}`, {
    additional_sources: additionalSources,
  });
  return response.data;
}

export async function exportDraft(draftId: string): Promise<Blob> {
  const response = await api.post(`/drafts/${draftId}/export`, null, {
    responseType: 'blob',
  });
  return response.data;
}
