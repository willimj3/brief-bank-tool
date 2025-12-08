import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Edit3,
} from 'lucide-react';
import {
  getDraft,
  generateSection,
  regenerateSection,
  exportDraft,
} from '../services/api';

export default function DraftWorkflow() {
  const { draftId } = useParams<{ draftId: string }>();
  const queryClient = useQueryClient();
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<Record<string, any>>(
    {}
  );

  // Fetch draft
  const { data: draft, isLoading } = useQuery({
    queryKey: ['draft', draftId],
    queryFn: () => getDraft(draftId!),
    enabled: !!draftId,
    refetchInterval: 5000, // Refresh every 5s to get updates
  });

  // Generate section mutation
  const generateMutation = useMutation({
    mutationFn: ({
      draftId,
      sectionId,
    }: {
      draftId: string;
      sectionId: string;
    }) => generateSection(draftId, sectionId),
    onSuccess: (data, variables) => {
      setGeneratedContent((prev) => ({
        ...prev,
        [variables.sectionId]: data,
      }));
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
    },
  });

  // Regenerate section mutation
  const regenerateMutation = useMutation({
    mutationFn: ({
      draftId,
      sectionId,
    }: {
      draftId: string;
      sectionId: string;
    }) => regenerateSection(draftId, sectionId),
    onSuccess: (data, variables) => {
      setGeneratedContent((prev) => ({
        ...prev,
        [variables.sectionId]: data,
      }));
      queryClient.invalidateQueries({ queryKey: ['draft', draftId] });
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: () => exportDraft(draftId!),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${draft?.matter.case_name || 'draft'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  // Select first section by default
  useEffect(() => {
    if (draft?.outline.length && !selectedSection) {
      setSelectedSection(draft.outline[0].id);
    }
  }, [draft, selectedSection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500" />
        <p className="mt-4 text-gray-600">Draft not found</p>
      </div>
    );
  }

  const selectedOutline = draft.outline.find((s) => s.id === selectedSection);
  const currentGenerated =
    generatedContent[selectedSection!] ||
    draft.sections.find((s) => s.section_id === selectedSection);

  const allGenerated = draft.outline.every((o) =>
    draft.sections.some((s) => s.section_id === o.id)
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-t-lg p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {draft.matter.case_name}
          </h2>
          <p className="text-sm text-gray-500">
            {draft.matter.court} •{' '}
            {draft.matter.procedural_posture.replace(/_/g, ' ')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportMutation.mutate()}
            disabled={!allGenerated || exportMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {exportMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export DOCX
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-4 gap-0 border-x border-b border-gray-200 rounded-b-lg overflow-hidden">
        {/* Outline Panel */}
        <div className="col-span-1 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700">Outline</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {draft.outline.map((section) => {
              const isGenerated = draft.sections.some(
                (s) => s.section_id === section.id
              );
              const isSelected = selectedSection === section.id;
              const isGenerating =
                generateMutation.isPending &&
                generateMutation.variables?.sectionId === section.id;

              return (
                <div
                  key={section.id}
                  className={`p-3 border-b border-gray-100 cursor-pointer ${
                    isSelected ? 'bg-white' : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                      ) : isGenerated ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {section.heading}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Generate All Button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={async () => {
                for (const section of draft.outline) {
                  if (!draft.sections.some((s) => s.section_id === section.id)) {
                    await generateMutation.mutateAsync({
                      draftId: draftId!,
                      sectionId: section.id,
                    });
                  }
                }
              }}
              disabled={allGenerated || generateMutation.isPending}
              className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generateMutation.isPending
                ? 'Generating...'
                : allGenerated
                ? 'All Sections Generated'
                : 'Generate All Sections'}
            </button>
          </div>
        </div>

        {/* Content Panel - Side by Side */}
        <div className="col-span-3 flex flex-col bg-white">
          {selectedOutline ? (
            <>
              {/* Section Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedOutline.heading}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedOutline.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentGenerated ? (
                    <button
                      onClick={() =>
                        regenerateMutation.mutate({
                          draftId: draftId!,
                          sectionId: selectedSection!,
                        })
                      }
                      disabled={regenerateMutation.isPending}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          regenerateMutation.isPending ? 'animate-spin' : ''
                        }`}
                      />
                      Regenerate
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        generateMutation.mutate({
                          draftId: draftId!,
                          sectionId: selectedSection!,
                        })
                      }
                      disabled={generateMutation.isPending}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {generateMutation.isPending &&
                      generateMutation.variables?.sectionId ===
                        selectedSection ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Edit3 className="w-4 h-4" />
                      )}
                      Generate Section
                    </button>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-hidden flex">
                {currentGenerated ? (
                  <>
                    {/* Generated Content */}
                    <div className="flex-1 overflow-y-auto p-4 border-r border-gray-200">
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-gray-800">
                          {highlightMarkers(currentGenerated.content)}
                        </div>
                      </div>

                      {/* Warnings */}
                      {currentGenerated.warnings?.length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <h4 className="text-sm font-medium text-yellow-800 flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" />
                            Review Needed
                          </h4>
                          <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                            {currentGenerated.warnings.map(
                              (warning: string, i: number) => (
                                <li key={i}>{warning}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Citations Needed */}
                      {currentGenerated.citations_needed?.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                          <h4 className="text-sm font-medium text-blue-800">
                            Citations Needed
                          </h4>
                          <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                            {currentGenerated.citations_needed.map(
                              (need: string, i: number) => (
                                <li key={i}>{need}</li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Source Panel */}
                    <div className="w-80 overflow-y-auto bg-gray-50 p-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">
                        Source Material
                      </h4>
                      {currentGenerated.sources?.length > 0 ? (
                        <div className="space-y-3">
                          {currentGenerated.sources.map(
                            (source: any, i: number) => (
                              <div
                                key={i}
                                className="p-3 bg-white border border-gray-200 rounded-md"
                              >
                                <p className="text-xs font-medium text-gray-600 mb-1">
                                  {source.heading || 'Source chunk'}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {source.content_preview}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No source material linked to this section
                        </p>
                      )}

                      {/* Adaptations */}
                      {currentGenerated.adaptations?.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Adaptations Made
                          </h4>
                          <div className="space-y-3">
                            {currentGenerated.adaptations.map(
                              (adapt: any, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 bg-white border border-gray-200 rounded-md text-xs"
                                >
                                  <p className="text-gray-500 mb-2">
                                    <span className="font-medium">
                                      Original:
                                    </span>{' '}
                                    {adapt.original}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">
                                      Adapted:
                                    </span>{' '}
                                    {adapt.adapted}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto text-gray-300" />
                      <p className="mt-4">
                        Click "Generate Section" to create content
                      </p>
                      <p className="text-sm">
                        Content will be based on your brief bank
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a section from the outline
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to highlight [CITATION NEEDED] and [FACT PLACEHOLDER] markers
function highlightMarkers(text: string): React.ReactNode {
  if (!text) return null;

  const parts = text.split(/(\[CITATION NEEDED\]|\[FACT PLACEHOLDER:[^\]]+\])/g);

  return parts.map((part, i) => {
    if (part === '[CITATION NEEDED]') {
      return (
        <span key={i} className="citation-needed font-medium">
          {part}
        </span>
      );
    }
    if (part.startsWith('[FACT PLACEHOLDER:')) {
      return (
        <span key={i} className="fact-placeholder font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}
