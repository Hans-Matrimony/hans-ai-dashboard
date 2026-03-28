'use client';

/**
 * EmotionalAccuracyPanel Component
 * Shows emotional accuracy analysis and mismatches
 */

import { EmotionalAccuracy } from '@/lib/analytics-types';
import { Smile, Frown, Meh, Target, TrendingUp, AlertCircle } from 'lucide-react';

interface EmotionalAccuracyPanelProps {
  data: EmotionalAccuracy;
}

export function EmotionalAccuracyPanel({ data }: EmotionalAccuracyPanelProps) {
  const accuracyColor = data.accuracy_percentage >= 80
    ? 'from-green-500 to-emerald-600'
    : data.accuracy_percentage >= 60
    ? 'from-yellow-500 to-orange-600'
    : 'from-red-500 to-rose-600';

  const accuracyBg = data.accuracy_percentage >= 80
    ? 'bg-green-50 border-green-200'
    : data.accuracy_percentage >= 60
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-red-50 border-red-200';

  const getEmotionEmoji = (emotion: string) => {
    const emojiMap: Record<string, string> = {
      anxious: '😰',
      hopeful: '🌟',
      confused: '😕',
      frustrated: '😤',
      curious: '🤔',
      happy: '😊',
      sad: '😢',
      angry: '😠',
      worried: '😟',
      excited: '🎉'
    };
    return emojiMap[emotion.toLowerCase()] || '😐';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg">
            <Smile className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Emotional Accuracy</h3>
            <p className="text-sm text-slate-600">How well the bot detects user emotions</p>
          </div>
        </div>
      </div>

      {/* Accuracy Score Card */}
      <div className={`bg-gradient-to-br ${accuracyColor} rounded-2xl p-8 text-white shadow-xl`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Target className="h-12 w-12 opacity-80" />
            <div>
              <div className="text-sm opacity-90 mb-1">Emotional Detection Accuracy</div>
              <div className="text-6xl font-bold">{data.accuracy_percentage}%</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Total Analyzed</div>
            <div className="text-3xl font-bold">{data.total_analyzed}</div>
          </div>
        </div>

        {/* Stats Breakdown */}
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="h-5 w-5" />
              <span className="text-sm font-medium">Correct</span>
            </div>
            <div className="text-3xl font-bold">{data.correct_detections}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Frown className="h-5 w-5" />
              <span className="text-sm font-medium">Incorrect</span>
            </div>
            <div className="text-3xl font-bold">{data.incorrect_detections}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Meh className="h-5 w-5" />
              <span className="text-sm font-medium">Mismatches</span>
            </div>
            <div className="text-3xl font-bold">{data.mismatches.length}</div>
          </div>
        </div>
      </div>

      {/* Emotional Mismatches */}
      {data.mismatches.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-amber-600" />
            <h4 className="text-xl font-bold text-slate-900">Emotional Mismatches</h4>
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              {data.mismatches.length} cases
            </span>
          </div>

          {data.mismatches.map((mismatch, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200"
            >
              <div className="p-6 space-y-4">
                {/* User Message */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getEmotionEmoji(mismatch.actual_emotion)}</span>
                      <span className="text-xs font-semibold text-blue-600 uppercase">User Message</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {mismatch.actual_emotion}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed">"{mismatch.user_message}"</p>
                </div>

                {/* Bot Response (Inappropriate) */}
                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Frown className="h-4 w-4 text-red-600" />
                      <span className="text-xs font-semibold text-red-600 uppercase">Bot Response (Inappropriate)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                        Detected as: {mismatch.detected_emotion}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed">"{mismatch.bot_response}"</p>
                </div>

                {/* What Should Have Been Said */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-600 uppercase">Should Have Said</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                        Emotion: {mismatch.actual_emotion}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-800 text-sm leading-relaxed font-medium">"{mismatch.appropriate_response}"</p>
                </div>

                {/* Conversation ID */}
                <div className="pt-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Conversation ID: <span className="font-mono font-semibold text-slate-700">{mismatch.conversation_id}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Smile className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-green-900 mb-2">Perfect Emotional Accuracy!</h3>
          <p className="text-green-700">All user emotions were detected correctly.</p>
        </div>
      )}
    </div>
  );
}
