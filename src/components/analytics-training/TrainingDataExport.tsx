'use client';

/**
 * TrainingDataExport Component
 * Exports failed responses for model retraining
 */

import { DetailedResponseAnalysis } from '@/lib/analytics-types';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TrainingDataExportProps {
  responses: DetailedResponseAnalysis[];
}

export function TrainingDataExport({ responses }: TrainingDataExportProps) {
  // Filter responses that need improvement
  const problematicResponses = responses.filter(r => r.issue_type !== 'no_issue');

  const exportAsJSON = () => {
    const exportData = problematicResponses.map(r => ({
      conversation_id: r.conversation_id,
      user_query: r.user_query,
      bot_response: r.bot_response,
      quality_score: r.quality_score,
      issue_type: r.issue_type,
      severity: r.severity,
      reasoning: r.reasoning,
      improvement_suggestion: r.improvement_suggestion,
      detected_emotion: r.detected_emotion,
      emotion_match: r.emotion_match,
      topic: r.topic,
      needs_retraining: true
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = [
      'Conversation ID',
      'User Query',
      'Bot Response',
      'Quality Score',
      'Issue Type',
      'Severity',
      'Reasoning',
      'Improvement Suggestion',
      'Detected Emotion',
      'Emotion Match',
      'Topic'
    ];

    const rows = problematicResponses.map(r => [
      r.conversation_id,
      `"${r.user_query.replace(/"/g, '""')}"`,
      `"${r.bot_response.replace(/"/g, '""')}"`,
      r.quality_score,
      r.issue_type,
      r.severity,
      `"${r.reasoning.replace(/"/g, '""')}"`,
      `"${r.improvement_suggestion.replace(/"/g, '""')}"`,
      r.detected_emotion,
      r.emotion_match,
      r.topic
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportRetrainingPrompt = () => {
    const prompt = `# Training Data for Model Retraining

## Summary
- Total conversations analyzed: ${responses.length}
- Conversations needing improvement: ${problematicResponses.length}
- Critical issues: ${problematicResponses.filter(r => r.severity === 'high').length}
- Medium severity: ${problematicResponses.filter(r => r.severity === 'medium').length}
- Low severity: ${problematicResponses.filter(r => r.severity === 'low').length}

## Issue Breakdown by Type
${Object.entries(
  problematicResponses.reduce((acc, r) => {
    acc[r.issue_type] = (acc[r.issue_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
)
  .map(([issue, count]) => `- ${issue}: ${count}`)
  .join('\n')}

## Critical Issues for Retraining

${problematicResponses
  .filter(r => r.severity === 'high')
  .map((r, i) => `
### Issue ${i + 1}: ${r.topic}

**User Query:**
"${r.user_query}"

**Bot Response (Inadequate):**
"${r.bot_response}"

**What Went Wrong:**
${r.reasoning}

**How to Fix:**
${r.improvement_suggestion}

**Detected Emotion:** ${r.detected_emotion}
**Emotion Match:** ${r.emotion_match ? '✓' : '✗'}
---
`)
  .join('\n')}

## Recommendations for Model Retraining

1. **Topic-Specific Training:**
   - Focus on topics with low accuracy scores
   - Add more training examples for problematic topics

2. **Emotional Intelligence:**
   - ${problematicResponses.filter(r => !r.emotion_match).length} responses had emotional mismatches
   - Train on emotion detection and appropriate response tone

3. **Completeness:**
   - ${problematicResponses.filter(r => r.issue_type === 'incomplete').length} responses were incomplete
   - Ensure bot asks for necessary information (birth details, etc.)

4. **Accuracy:**
   - ${problematicResponses.filter(r => r.issue_type === 'inaccurate').length} responses had inaccurate information
   - Verify astrological knowledge base

5. **Context Awareness:**
   - ${problematicResponses.filter(r => r.issue_type === 'missing_context').length} responses missed important context
   - Improve conversation memory and context tracking
`;

    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retraining-prompt-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Export Training Data</h3>
          <p className="text-sm text-slate-600">
            Download {problematicResponses.length} failed responses for model retraining
          </p>
        </div>
        <div className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl">
          <div className="text-3xl font-bold">{problematicResponses.length}</div>
          <div className="text-xs opacity-80">Issues</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* JSON Export */}
        <Button
          onClick={exportAsJSON}
          disabled={problematicResponses.length === 0}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <FileJson className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-semibold">Export as JSON</div>
            <div className="text-xs opacity-80">Structured data format</div>
          </div>
          <Download className="h-5 w-5 ml-auto" />
        </Button>

        {/* CSV Export */}
        <Button
          onClick={exportAsCSV}
          disabled={problematicResponses.length === 0}
          className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <FileSpreadsheet className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-semibold">Export as CSV</div>
            <div className="text-xs opacity-80">Spreadsheet format</div>
          </div>
          <Download className="h-5 w-5 ml-auto" />
        </Button>

        {/* Retraining Prompt Export */}
        <Button
          onClick={exportRetrainingPrompt}
          disabled={problematicResponses.length === 0}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Download className="h-5 w-5 mr-2" />
          <div className="text-left">
            <div className="font-semibold">Retraining Guide</div>
            <div className="text-xs opacity-80">Detailed recommendations</div>
          </div>
          <Download className="h-5 w-5 ml-auto" />
        </Button>
      </div>

      {/* Info Box */}
      {problematicResponses.length > 0 && (
        <div className="mt-6 bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">💡 Tip:</span> Use the JSON export for automated retraining pipelines,
            CSV for spreadsheet analysis, and the Retraining Guide for manual review and improvement planning.
          </div>
        </div>
      )}
    </div>
  );
}
