import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  FileText,
  PenTool,
  Download,
  Shield,
  BookOpen,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Brief Bank Drafting Tool
        </h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Transform your firm's accumulated brief bank into an intelligent drafting assistant.
          Upload existing briefs, search for relevant arguments, and generate new drafts by
          retrieving and adapting your best past work product.
        </p>
      </div>

      {/* Core Insight */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-10">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">
          The Core Insight
        </h2>
        <p className="text-blue-800">
          Legal briefs aren't written from scratch—they're assembled from patterns, arguments,
          and language refined through prior litigation. A motion to dismiss follows recognizable
          patterns; legal standards are established, structures are predictable, and arguments on
          common issues have been made before. This tool captures that institutional knowledge and
          makes it systematically reusable.
        </p>
      </div>

      {/* How It Works */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">1. Build Your Brief Bank</h3>
            <p className="text-gray-600 text-sm">
              Upload existing briefs (DOCX or PDF). The system parses them into sections,
              extracts citations, and creates searchable chunks organized by legal issue,
              jurisdiction, and procedural posture.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">2. Describe Your Matter</h3>
            <p className="text-gray-600 text-sm">
              Enter your new case details: court, procedural posture, and legal issues.
              The system retrieves relevant argument sections from your brief bank,
              prioritizing same-jurisdiction and same-posture matches.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <PenTool className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">3. Generate & Refine</h3>
            <p className="text-gray-600 text-sm">
              Review the proposed outline, then generate each section. See source material
              side-by-side with generated content. Regenerate sections as needed, then
              export to DOCX.
            </p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Key Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900">Citation Integrity</h3>
              <p className="text-sm text-gray-600">
                The system never hallucinates citations. All citations come from your source
                material. Points needing citations are marked <code className="bg-yellow-100 px-1 rounded">[CITATION NEEDED]</code>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900">Transparent Sourcing</h3>
              <p className="text-sm text-gray-600">
                Every generated section shows what source material influenced it.
                See the original text alongside the adaptation.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <Search className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900">Smart Retrieval</h3>
              <p className="text-sm text-gray-600">
                Semantic search finds relevant arguments even when exact phrases don't match.
                Results are weighted by jurisdiction, procedural posture, and recency.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <Download className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900">DOCX Export</h3>
              <p className="text-sm text-gray-600">
                Export completed drafts as properly formatted Word documents,
                ready for further editing and filing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>Review all output carefully.</strong> This tool assists drafting but doesn't replace attorney judgment.</li>
              <li>• <strong>Verify all citations.</strong> Even citations from source material should be checked for currency and accuracy.</li>
              <li>• <strong>Adapt to your facts.</strong> Generated content includes placeholders for case-specific facts that you must fill in.</li>
              <li>• <strong>Check jurisdiction.</strong> The system warns when using non-binding authority, but always verify applicability.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gray-900 text-white rounded-lg p-8 mb-10">
        <h2 className="text-xl font-bold mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
            <div>
              <p className="font-medium">Upload your briefs</p>
              <p className="text-gray-400 text-sm">Go to Brief Bank and upload 5-10 of your firm's best briefs to seed the system.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
            <div>
              <p className="font-medium">Start a new draft</p>
              <p className="text-gray-400 text-sm">Click "New Draft" and enter your matter details: case name, court, procedural posture, and legal issues.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
            <div>
              <p className="font-medium">Generate and refine</p>
              <p className="text-gray-400 text-sm">Review the outline, generate sections one by one, and export when ready.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={() => navigate('/brief-bank')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            Go to Brief Bank
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/new-draft')}
            className="px-6 py-2 bg-white text-gray-900 rounded-md hover:bg-gray-100 flex items-center gap-2"
          >
            Start New Draft
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* What Gets Parsed */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-gray-900 mb-4">What the System Extracts</h2>
        <p className="text-gray-600 mb-4">
          When you upload a brief, the system automatically identifies and indexes:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            'Court & Jurisdiction',
            'Procedural Posture',
            'Case Information',
            'Section Structure',
            'Legal Standards',
            'Argument Sections',
            'Case Citations',
            'Legal Issues',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-gray-700">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-gray-500 text-sm py-6 border-t border-gray-200">
        <p>Brief Bank Drafting Tool • Powered by Claude AI</p>
      </div>
    </div>
  );
}
