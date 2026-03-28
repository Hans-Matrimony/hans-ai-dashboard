'use client';

/**
 * WorstResponsesPanel Component
 * Shows specific examples of bad responses for model training feedback
 */

import { DetailedResponseAnalysis } from '@/lib/analytics-types';
import { AlertTriangle, MessageSquare, TrendingDown, ThumbsDown } from 'lucide-react';

interface WorstResponsesPanelProps {
  responses: DetailedResponseAnalysis[];
}

export function WorstResponsesPanel({ responses }: WorstResponsesPanelProps) {
  // Filter to show only responses with issues
  const problematicResponses = responses.filter(r => r.issue_type !== 'no_issue')
    .sort((a, b) => {
      // Sort by severity (high > medium > low) and then by quality score
      const severityOrder = { high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.quality_score - b.quality_score;
    })
    .slice(0, 10); // Show top 10 worst

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'from-red-500 to-rose-600 border-red-300';
      case 'medium': return 'from-amber-500 to-orange-600 border-amber-300';
      case 'low': return 'from-yellow-500 to-yellow-600 border-yellow-300';
      default: return 'from-slate-500 to-slate-600 border-slate-300';
    }
  };

  const getIssueTypeLabel = (issueType: string) => {
    const labels: Record<string, string> = {
      incomplete: 'Incomplete Answer',
      inaccurate: 'Inaccurate Information',
      irrelevant: 'Irrelevant Response',
      vague: 'Too Vague',
      missing_context: 'Missing Context',
      no_issue: 'Good Response'
    };
    return labels[issueType] || issueType;
  };

  const getIssueTypeColor = (issueType: string) => {
    const colors: Record<string, string> = {
      incomplete: 'bg-blue-100 text-blue-800 border-blue-200',
      inaccurate: 'bg-red-100 text-red-800 border-red-200',
      irrelevant: 'bg-purple-100 text-purple-800 border-purple-200',
      vague: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      missing_context: 'bg-orange-100 text-orange-800 border-orange-200',
      no_issue: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[issueType] || 'bg-slate-100 text-slate-800';
  };

  if (problematicResponses.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsDown className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">All Responses Are Good!</h3>
          <p className="text-green-700">No critical issues detected in the analyzed conversations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl shadow-lg">
            <TrendingDown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Worst Responses</h3>
            <p className="text-sm text-slate-600">Top {problematicResponses.length} critical issues for retraining</p>
          </div>
        </div>
      </div>

      {/* Response Cards */}
      <div className="space-y-4">
        {problematicResponses.map((response, index) => (
          <div
            key={response.conversation_id}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200"
          >
            {/* Severity Header */}
            <div className={`bg-gradient-to-r ${getSeverityColor(response.severity)} px-6 py-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-bold text-lg">#{index + 1}</span>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-white" />
                    <span className="text-white font-semibold capitalize">{response.severity} Severity</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 backdrop-blur rounded-full px-4 py-1.5">
                    <span className="text-white font-bold text-lg">{response.quality_score}</span>
                    <span className="text-white/80 text-sm ml-1">/100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Issue Type Badge */}
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getIssueTypeColor(response.issue_type)}`}>
                  {getIssueTypeLabel(response.issue_type)}
                </span>
              </div>

              {/* User Query */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-600 uppercase">User Query</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{response.user_query}</p>
              </div>

              {/* Bot Response */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-start gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-purple-600 uppercase">Bot Response</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{response.bot_response}</p>
              </div>

              {/* Analysis */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-amber-600 uppercase">What Went Wrong</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed">{response.reasoning}</p>
              </div>

              {/* Improvement Suggestion */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                <div className="flex items-start gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <span className="text-xs font-semibold text-emerald-600 uppercase">How to Fix</span>
                </div>
                <p className="text-slate-800 text-sm leading-relaxed font-medium">{response.improvement_suggestion}</p>
              </div>

              {/* Metadata */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span>Topic: <span className="font-semibold text-slate-700">{response.topic}</span></span>
                  <span>Emotion: <span className={`font-semibold ${response.emotion_match ? 'text-green-600' : 'text-red-600'}`}>
                    {response.detected_emotion} {response.emotion_match ? '✓' : '✗'}
                  </span></span>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(response.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
