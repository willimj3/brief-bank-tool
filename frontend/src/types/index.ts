// Types matching the backend models

export type ProceduralPosture =
  | 'motion_to_dismiss'
  | 'summary_judgment'
  | 'preliminary_injunction'
  | 'motion_to_compel'
  | 'motion_in_limine'
  | 'opposition'
  | 'reply'
  | 'appeal_brief'
  | 'other';

export type SectionType =
  | 'caption'
  | 'introduction'
  | 'statement_of_facts'
  | 'procedural_history'
  | 'legal_standard'
  | 'argument'
  | 'conclusion'
  | 'other';

export interface Brief {
  id: string;
  title: string | null;
  filename: string;
  court: string | null;
  jurisdiction: string | null;
  procedural_posture: ProceduralPosture | null;
  case_name: string | null;
  case_number: string | null;
  legal_issues: string[];
  outcome: string | null;
  ingested_at: string | null;
}

export interface BriefSection {
  id: string;
  type: SectionType;
  title: string | null;
  content_preview: string;
}

export interface Chunk {
  id: string;
  heading: string | null;
  type: SectionType;
  content_preview: string;
  citation_count: number;
}

export interface SearchResult {
  chunk_id: string;
  brief_id: string;
  heading: string | null;
  content: string;
  section_type: SectionType;
  court: string | null;
  jurisdiction: string | null;
  score: number;
  match_reasons: string[];
  source_brief: string | null;
}

export interface NewMatter {
  case_name: string;
  court: string;
  jurisdiction: string;
  procedural_posture: ProceduralPosture;
  legal_issues: string[];
  fact_summary: string;
  desired_outcome: string;
}

export interface OutlineSection {
  id: string;
  heading: string;
  description: string;
  source_count: number;
  order: number;
  generated?: boolean;
}

export interface GeneratedSection {
  section_id: string;
  heading: string;
  content: string;
  citations_used: string[];
  citations_needed: string[];
  warnings: string[];
  sources: {
    chunk_id: string;
    heading: string | null;
    content_preview: string;
  }[];
  adaptations: {
    original: string;
    adapted: string;
  }[];
}

export interface Draft {
  draft_id: string;
  status: string;
  matter: {
    case_name: string;
    court: string;
    jurisdiction: string;
    procedural_posture: string;
    legal_issues: string[];
  };
  outline: OutlineSection[];
  sections: {
    section_id: string;
    heading: string;
    content: string;
    warnings: string[];
    citations_needed: string[];
  }[];
  created_at: string;
  updated_at: string;
}

export interface RetrievedSource {
  chunk_id: string;
  heading: string | null;
  content_preview: string;
  score: number;
  match_reasons: string[];
  source_brief: string | null;
}
