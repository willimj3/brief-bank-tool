import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, AlertCircle, Plus, X } from 'lucide-react';
import { createDraft } from '../services/api';
import type { ProceduralPosture, NewMatter } from '../types';

const PROCEDURAL_POSTURES: { value: ProceduralPosture; label: string }[] = [
  { value: 'motion_to_dismiss', label: 'Motion to Dismiss' },
  { value: 'summary_judgment', label: 'Summary Judgment' },
  { value: 'preliminary_injunction', label: 'Preliminary Injunction' },
  { value: 'motion_to_compel', label: 'Motion to Compel' },
  { value: 'motion_in_limine', label: 'Motion in Limine' },
  { value: 'opposition', label: 'Opposition' },
  { value: 'reply', label: 'Reply' },
  { value: 'appeal_brief', label: 'Appeal Brief' },
  { value: 'other', label: 'Other' },
];

const COMMON_ISSUES = [
  'Statute of limitations',
  'Personal jurisdiction',
  'Standing',
  'Failure to state a claim',
  'Breach of contract',
  'Negligence',
  'Fraud',
  'Preemption',
  'Summary judgment standard',
];

export default function NewDraft() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<NewMatter>({
    case_name: '',
    court: '',
    jurisdiction: '',
    procedural_posture: 'motion_to_dismiss',
    legal_issues: [],
    fact_summary: '',
    desired_outcome: '',
  });
  const [newIssue, setNewIssue] = useState('');

  const createMutation = useMutation({
    mutationFn: createDraft,
    onSuccess: (data) => {
      navigate(`/draft/${data.draft_id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.legal_issues.length === 0) {
      alert('Please add at least one legal issue');
      return;
    }
    createMutation.mutate(formData);
  };

  const addIssue = (issue: string) => {
    if (issue && !formData.legal_issues.includes(issue)) {
      setFormData({
        ...formData,
        legal_issues: [...formData.legal_issues, issue],
      });
      setNewIssue('');
    }
  };

  const removeIssue = (issue: string) => {
    setFormData({
      ...formData,
      legal_issues: formData.legal_issues.filter((i) => i !== issue),
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Start a New Brief Draft
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Case Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Name
            </label>
            <input
              type="text"
              value={formData.case_name}
              onChange={(e) =>
                setFormData({ ...formData, case_name: e.target.value })
              }
              placeholder="Plaintiff v. Defendant"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Court and Jurisdiction */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Court
              </label>
              <input
                type="text"
                value={formData.court}
                onChange={(e) =>
                  setFormData({ ...formData, court: e.target.value })
                }
                placeholder="e.g., Northern District of California"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jurisdiction
              </label>
              <input
                type="text"
                value={formData.jurisdiction}
                onChange={(e) =>
                  setFormData({ ...formData, jurisdiction: e.target.value })
                }
                placeholder="e.g., federal, california"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Procedural Posture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Procedural Posture
            </label>
            <select
              value={formData.procedural_posture}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  procedural_posture: e.target.value as ProceduralPosture,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PROCEDURAL_POSTURES.map((posture) => (
                <option key={posture.value} value={posture.value}>
                  {posture.label}
                </option>
              ))}
            </select>
          </div>

          {/* Legal Issues */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Issues
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.legal_issues.map((issue) => (
                <span
                  key={issue}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {issue}
                  <button
                    type="button"
                    onClick={() => removeIssue(issue)}
                    className="hover:text-blue-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newIssue}
                onChange={(e) => setNewIssue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addIssue(newIssue);
                  }
                }}
                placeholder="Add a legal issue..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => addIssue(newIssue)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Common issues:</p>
              <div className="flex flex-wrap gap-1">
                {COMMON_ISSUES.filter(
                  (i) => !formData.legal_issues.includes(i)
                ).map((issue) => (
                  <button
                    key={issue}
                    type="button"
                    onClick={() => addIssue(issue)}
                    className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                  >
                    + {issue}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fact Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fact Summary
            </label>
            <textarea
              value={formData.fact_summary}
              onChange={(e) =>
                setFormData({ ...formData, fact_summary: e.target.value })
              }
              placeholder="Brief description of the relevant facts..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Desired Outcome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Desired Outcome
            </label>
            <textarea
              value={formData.desired_outcome}
              onChange={(e) =>
                setFormData({ ...formData, desired_outcome: e.target.value })
              }
              placeholder="What relief are you seeking? e.g., Dismissal of all claims with prejudice"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Error Display */}
          {createMutation.isError && (
            <div className="p-4 bg-red-50 text-red-800 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Failed to create draft</p>
                <p className="text-sm">
                  {(createMutation.error as Error).message}
                </p>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Draft...
                </>
              ) : (
                'Create Draft & Generate Outline'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
