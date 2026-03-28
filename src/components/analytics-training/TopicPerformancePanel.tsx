'use client';

/**
 * TopicPerformancePanel Component
 * Shows topic-wise performance breakdown
 */

import { TopicPerformance } from '@/lib/analytics-types';
import { PieChart, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

interface TopicPerformancePanelProps {
  topics: TopicPerformance[];
}

export function TopicPerformancePanel({ topics }: TopicPerformancePanelProps) {
  if (topics.length === 0) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-200 rounded-2xl p-8 text-center">
        <PieChart className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Topic Data Available</h3>
        <p className="text-slate-600">Start analyzing conversations to see topic-wise performance.</p>
      </div>
    );
  }

  const getAccuracyColor = (percentage: number) => {
    if (percentage >= 80) return 'from-green-500 to-emerald-600';
    if (percentage >= 60) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-rose-600';
  };

  const getAccuracyBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-50 border-green-200';
    if (percentage >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Topic Performance</h3>
            <p className="text-sm text-slate-600">Accuracy breakdown by topic</p>
          </div>
        </div>
      </div>

      {/* Topic Cards */}
      <div className="space-y-4">
        {topics.map((topic, index) => (
          <div
            key={index}
            className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 ${getAccuracyBg(topic.accuracy_percentage)}`}
          >
            {/* Topic Header */}
            <div className={`bg-gradient-to-r ${getAccuracyColor(topic.accuracy_percentage)} px-6 py-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">#{index + 1}</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white">{topic.topic}</h4>
                    <p className="text-white/80 text-sm">{topic.total_conversations} conversations analyzed</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-white">{topic.accuracy_percentage}%</div>
                  <div className="text-white/80 text-sm">Accuracy</div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-xs text-blue-600 font-semibold uppercase mb-1">Total</div>
                  <div className="text-2xl font-bold text-blue-700">{topic.total_conversations}</div>
                  <div className="text-xs text-blue-600">Conversations</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                  <div className="text-xs text-emerald-600 font-semibold uppercase mb-1">Accurate</div>
                  <div className="text-2xl font-bold text-emerald-700">{topic.accurate_responses}</div>
                  <div className="text-xs text-emerald-600">Responses</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                  <div className="text-xs text-amber-600 font-semibold uppercase mb-1">Avg Score</div>
                  <div className="text-2xl font-bold text-amber-700">{topic.avg_quality_score}</div>
                  <div className="text-xs text-amber-600">Quality</div>
                </div>
              </div>

              {/* Common Issues */}
              {topic.common_issues.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h5 className="font-bold text-slate-900">Common Issues</h5>
                  </div>
                  <div className="space-y-2">
                    {topic.common_issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp className="h-4 w-4 text-red-600" />
                              <span className="font-semibold text-slate-900">{issue.issue}</span>
                            </div>
                            <div className="text-xs text-slate-600">
                              Found in {issue.count} conversations ({issue.percentage}%)
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                              {issue.percentage}%
                            </div>
                          </div>
                        </div>

                        {/* Examples */}
                        {issue.examples && issue.examples.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <div className="text-xs text-slate-600 mb-2">Examples:</div>
                            <div className="space-y-1">
                              {issue.examples.slice(0, 2).map((example, exIdx) => (
                                <div
                                  key={exIdx}
                                  className="text-xs text-slate-700 bg-white/50 rounded px-2 py-1 border border-red-100"
                                >
                                  "{example}"
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200 text-center">
                  <div className="text-sm font-semibold text-green-800">No Common Issues Detected!</div>
                  <div className="text-xs text-green-600">This topic is performing well</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-900 mb-1">Performance Summary</h4>
            <p className="text-sm text-slate-600">Across {topics.length} topics</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-600">Average Accuracy</div>
            <div className="text-3xl font-bold text-slate-900">
              {Math.round(topics.reduce((sum, t) => sum + t.accuracy_percentage, 0) / topics.length)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
