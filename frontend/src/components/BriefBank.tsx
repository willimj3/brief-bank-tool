import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { listBriefs, uploadBrief, deleteBrief, getBrief } from '../services/api';
import type { Brief } from '../types';

export default function BriefBank() {
  const queryClient = useQueryClient();
  const [selectedBrief, setSelectedBrief] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  // Fetch briefs
  const { data: briefsData, isLoading } = useQuery({
    queryKey: ['briefs'],
    queryFn: listBriefs,
  });

  // Fetch selected brief details
  const { data: briefDetails } = useQuery({
    queryKey: ['brief', selectedBrief],
    queryFn: () => (selectedBrief ? getBrief(selectedBrief) : null),
    enabled: !!selectedBrief,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: uploadBrief,
    onSuccess: (data) => {
      setUploadStatus({
        status: 'success',
        message: `Uploaded "${data.title || 'Brief'}": ${data.chunks_count} chunks, ${data.citations_count} citations`,
      });
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      setTimeout(() => setUploadStatus({ status: 'idle' }), 5000);
    },
    onError: (error: Error) => {
      setUploadStatus({
        status: 'error',
        message: error.message || 'Upload failed',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteBrief,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      if (selectedBrief) {
        setSelectedBrief(null);
      }
    },
  });

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find(
        (f) => f.name.endsWith('.docx') || f.name.endsWith('.pdf')
      );
      if (validFile) {
        setUploadStatus({ status: 'uploading' });
        uploadMutation.mutate(validFile);
      }
    },
    [uploadMutation]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setUploadStatus({ status: 'uploading' });
        uploadMutation.mutate(file);
      }
    },
    [uploadMutation]
  );

  return (
    <div className="grid grid-cols-3 gap-6 h-[calc(100vh-140px)]">
      {/* Left Panel: Brief List */}
      <div className="col-span-1 bg-white rounded-lg border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Brief Bank</h2>
          <p className="text-sm text-gray-500">
            {briefsData?.total || 0} briefs indexed
          </p>
        </div>

        {/* Upload Area */}
        <div
          className="m-4 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 transition-colors cursor-pointer"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            accept=".docx,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {uploadStatus.status === 'uploading' ? (
              <Loader2 className="w-8 h-8 mx-auto text-blue-500 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
            )}
            <p className="mt-2 text-sm text-gray-600">
              Drop DOCX or PDF files here
            </p>
            <p className="text-xs text-gray-400">or click to browse</p>
          </label>
        </div>

        {/* Upload Status */}
        {uploadStatus.status !== 'idle' && uploadStatus.status !== 'uploading' && (
          <div
            className={`mx-4 mb-4 p-3 rounded-md flex items-start gap-2 ${
              uploadStatus.status === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {uploadStatus.status === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <p className="text-sm">{uploadStatus.message}</p>
          </div>
        )}

        {/* Brief List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="w-6 h-6 mx-auto animate-spin" />
            </div>
          ) : briefsData?.briefs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-2">No briefs uploaded yet</p>
              <p className="text-sm">Upload your first brief to get started</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {briefsData?.briefs.map((brief) => (
                <li
                  key={brief.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    selectedBrief === brief.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedBrief(brief.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {brief.title || brief.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {brief.court || 'Unknown court'} •{' '}
                      {brief.procedural_posture?.replace(/_/g, ' ') || 'Unknown type'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Panel: Brief Details */}
      <div className="col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col">
        {selectedBrief && briefDetails ? (
          <>
            <div className="p-4 border-b border-gray-200 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {briefDetails.brief.title || briefDetails.brief.filename}
                </h2>
                <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                  <span>{briefDetails.brief.court}</span>
                  <span>•</span>
                  <span>
                    {briefDetails.brief.procedural_posture?.replace(/_/g, ' ')}
                  </span>
                  {briefDetails.brief.case_number && (
                    <>
                      <span>•</span>
                      <span>Case {briefDetails.brief.case_number}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm('Delete this brief from the brief bank?')) {
                    deleteMutation.mutate(selectedBrief);
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Sections */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Sections ({briefDetails.sections.length})
                </h3>
                <div className="space-y-2">
                  {briefDetails.sections.map((section) => (
                    <div
                      key={section.id}
                      className="p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                          {section.type}
                        </span>
                        {section.title && (
                          <span className="text-sm font-medium text-gray-900">
                            {section.title}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {section.content_preview}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chunks */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Retrievable Chunks ({briefDetails.chunks.length})
                </h3>
                <div className="space-y-2">
                  {briefDetails.chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-3 border border-gray-200 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          {chunk.type}
                        </span>
                        {chunk.heading && (
                          <span className="text-sm font-medium text-gray-900">
                            {chunk.heading}
                          </span>
                        )}
                        {chunk.citation_count > 0 && (
                          <span className="text-xs text-gray-500">
                            {chunk.citation_count} citations
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {chunk.content_preview}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-gray-300" />
              <p className="mt-4">Select a brief to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
