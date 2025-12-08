# Brief Bank Tool

A web-based application that transforms a law firm's brief bank into an intelligent drafting assistant. Upload existing briefs, search for relevant arguments, and generate new brief drafts by adapting past work product.

## Features

- **Document Ingestion**: Upload DOCX and PDF briefs with automatic parsing
- **Semantic Search**: Find relevant argument sections by legal issue, jurisdiction, and procedural posture
- **Draft Generation**: AI-powered section-by-section brief drafting based on your brief bank
- **Citation Safety**: Never hallucinated citations - marks gaps as `[CITATION NEEDED]`
- **DOCX Export**: Export drafts with proper legal document formatting

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- Anthropic API key

### Setup

1. **Clone and install backend dependencies:**

```bash
cd brief-bank-tool/backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Set your Anthropic API key:**

```bash
export ANTHROPIC_API_KEY="your-api-key-here"
```

3. **Start the backend:**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

4. **Install and start the frontend (new terminal):**

```bash
cd brief-bank-tool/frontend
npm install
npm run dev
```

5. **Open http://localhost:3000 in your browser**

## Usage Workflow

### 1. Build Your Brief Bank

Upload existing briefs (DOCX or PDF) through the Brief Bank page. The system will:
- Extract sections (introduction, facts, arguments, conclusion)
- Identify citations
- Create searchable chunks for retrieval

### 2. Start a New Draft

Fill out the new matter form:
- Case name and court
- Procedural posture (motion to dismiss, summary judgment, etc.)
- Legal issues (statute of limitations, personal jurisdiction, etc.)
- Brief fact summary

### 3. Review and Generate

The system proposes an outline based on retrieved source material. For each section:
- Generate content drawing from your brief bank
- Review source material in the side panel
- See warnings for old citations or jurisdiction mismatches
- Regenerate sections as needed

### 4. Export

Download the completed draft as a DOCX file for further editing.

## Architecture

```
brief-bank-tool/
├── backend/
│   └── app/
│       ├── main.py           # FastAPI endpoints
│       ├── models.py         # Data models
│       ├── document_parser.py # DOCX/PDF parsing
│       ├── embeddings.py     # Storage and retrieval
│       ├── generator.py      # AI draft generation
│       └── exporter.py       # DOCX export
├── frontend/
│   └── src/
│       ├── components/       # React components
│       ├── services/         # API client
│       └── types/           # TypeScript types
└── data/
    ├── briefs/              # Uploaded files
    ├── embeddings/          # Brief bank storage
    └── exports/             # Generated DOCX files
```

## Key Design Decisions

### Citation Integrity

The system NEVER generates or hallucinates legal citations. All citations must come from source material. Points needing citations are marked `[CITATION NEEDED]`.

### Transparent Sourcing

Every generated section shows:
- What source material influenced it
- How language was adapted
- Warnings for potential issues

### Jurisdiction Awareness

Search and retrieval prioritize:
- Same jurisdiction matches
- Same procedural posture
- Recent briefs over older ones

## API Endpoints

- `POST /api/briefs/upload` - Upload a brief
- `GET /api/briefs` - List all briefs
- `GET /api/briefs/{id}` - Get brief details
- `POST /api/search` - Search chunks
- `POST /api/drafts/create` - Start a new draft
- `POST /api/drafts/{id}/generate/{section}` - Generate a section
- `POST /api/drafts/{id}/export` - Export to DOCX

## Development

### Backend

```bash
cd backend
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm run dev
```

## License

Internal tool - not for distribution.
