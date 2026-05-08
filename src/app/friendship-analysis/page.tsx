'use client';

import { useState, useEffect } from 'react';
import { Heart, Users, TrendingUp, AlertCircle, CheckCircle, Sparkles, Target, Zap, Brain, Loader2 } from 'lucide-react';
import { FriendshipPositioning } from '@/lib/analytics-types';

interface AnalysisStats {
  total: number;
  analyzed: number;
  average: number;
  high: number;
  medium: number;
  low: number;
}

interface SystemInsight {
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  recommendation: string;
}

export default function FriendshipAnalysisPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [friendshipScores, setFriendshipScores] = useState<Map<string, FriendshipPositioning>>(new Map());
  const [calculating, setCalculating] = useState(false);
  const [calculatingType, setCalculatingType] = useState<'single' | 'batch' | null>(null);
  const [progress, setProgress] = useState<{current: number; total: number; userId: string} | null>(null);
  const [batchStats, setBatchStats] = useState<AnalysisStats | null>(null);
  const [insights, setInsights] = useState<SystemInsight[]>([]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Generate insights when scores change
  useEffect(() => {
    if (friendshipScores.size > 0) {
      generateInsights();
    }
  }, [friendshipScores]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat-logs/messages?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = () => {
    const scores = Array.from(friendshipScores.values());
    if (scores.length === 0) return;

    // Calculate averages
    const avgEmpathy = scores.reduce((sum, s) => sum + s.empathy, 0) / scores.length;
    const avgPersonalization = scores.reduce((sum, s) => sum + s.personalization, 0) / scores.length;
    const avgWarmth = scores.reduce((sum, s) => sum + s.warmth, 0) / scores.length;
    const avgListening = scores.reduce((sum, s) => sum + s.supportive_listening, 0) / scores.length;
    const avgRapport = scores.reduce((sum, s) => sum + s.rapport, 0) / scores.length;

    const newInsights: SystemInsight[] = [];

    // Empathy insight
    if (avgEmpathy < 5) {
      newInsights.push({
        category: 'Empathy',
        title: 'Low Emotional Connection',
        description: `Average empathy score is ${avgEmpathy.toFixed(1)}/10. The bot may not be acknowledging user emotions adequately.`,
        impact: 'high',
        recommendation: 'Add emotional validation phrases like "I understand how you feel" before giving predictions.'
      });
    } else if (avgEmpathy >= 7) {
      newInsights.push({
        category: 'Empathy',
        title: 'Strong Emotional Connection',
        description: `Average empathy score is ${avgEmpathy.toFixed(1)}/10. Great job at validating user emotions!`,
        impact: 'low',
        recommendation: 'Continue this approach. Consider sharing best practices with other channels.'
      });
    }

    // Personalization insight
    if (avgPersonalization < 5) {
      newInsights.push({
        category: 'Personalization',
        title: 'Generic Responses Detected',
        description: `Average personalization is ${avgPersonalization.toFixed(1)}/10. Responses may feel generic rather than tailored.`,
        impact: 'high',
        recommendation: 'Add memory references like "As we discussed earlier" to build continuity.'
      });
    }

    // Warmth insight
    if (avgWarmth < 6) {
      newInsights.push({
        category: 'Tone',
        title: 'Formal/Robotic Tone',
        description: `Average warmth is ${avgWarmth.toFixed(1)}/10. Language may feel too formal or robotic.`,
        impact: 'medium',
        recommendation: "Use more conversational openers like \"I'm glad you reached out!\" instead of \"I will now analyze.\""
      });
    }

    // Rapport insight
    if (avgRapport < 5) {
      newInsights.push({
        category: 'Rapport Building',
        title: 'Weak Partnership Connection',
        description: `Average rapport is ${avgRapport.toFixed(1)}/10. Users may not feel supported through their journey.`,
        impact: 'high',
        recommendation: "Add partnership language like \"Let's work on this together\" and \"I'm here for you through this.\""
      });
    }

    // High performers
    const highPerformers = scores.filter(s => s.overall >= 8).length;
    if (highPerformers > scores.length * 0.5) {
      newInsights.push({
        category: 'Overall',
        title: 'Excellent Performance',
        description: `${highPerformers}/${scores.length} users (${Math.round(highPerformers/scores.length*100)}%) have high friendship scores (8+).`,
        impact: 'low',
        recommendation: 'Great job! Maintain this level of engagement across all users.'
      });
    }

    setInsights(newInsights);
  };

  const handleSingleUserAnalysis = async (userId: string) => {
    if (calculating) return;
    setCalculatingType('single');
    setCalculating(true);
    setSelectedUser(userId);

    try {
      console.log('[Single User] Using Groq (free) for user:', userId);
      const response = await fetch(`/api/chat-logs/friendship/single?userId=${encodeURIComponent(userId)}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        setFriendshipScores(prev => new Map(prev).set(userId, result.score));
      } else {
        const error = await response.json();
        console.error('Single user analysis error:', error);
        alert(`Error: ${error.details || error.error || 'Failed to calculate score'}`);
      }
    } catch (error) {
      console.error('Single user analysis error:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to calculate score'}`);
    } finally {
      setCalculating(false);
      setCalculatingType(null);
    }
  };

  const handleBatchAnalysis = async () => {
    if (calculating || !users.length) return;
    setCalculatingType('batch');
    setCalculating(true);
    setProgress({ current: 0, total: users.length, userId: 'Starting...' });

    try {
      console.log('[Batch Analysis] Using DeepSeek V4 Flash for better quality');
      const response = await fetch('/api/chat-logs/friendship/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        const scoresMap = new Map<string, FriendshipPositioning>();
        result.results.forEach((r: any) => {
          scoresMap.set(r.userId, r.score);
        });
        setFriendshipScores(scoresMap);
        setBatchStats(result.statistics);
      }
    } catch (error) {
      console.error('Batch analysis error:', error);
    } finally {
      setCalculating(false);
      setCalculatingType(null);
      setProgress(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 7) return '🟢';
    if (score >= 5) return '🟡';
    return '🔴';
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Friendship Analysis</h1>
            <p className="text-slate-500 text-sm">Hybrid AI-powered conversation quality scoring</p>
          </div>
        </div>
      </div>

      {/* API Info Banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Brain className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Hybrid Analysis Mode</h3>
            <p className="text-blue-700 text-sm mt-1">
              <strong>Single User:</strong> Groq (Free, fast) • <strong>Batch:</strong> DeepSeek V4 Flash (Better quality, ~$0.12 for 400 users)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Users List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Users</h2>
                <p className="text-sm text-slate-500">{users.length} total users</p>
              </div>
              <button
                onClick={handleBatchAnalysis}
                disabled={calculating || !users.length}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {calculating && calculatingType === 'batch' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Analyze All Users (DeepSeek)
              </button>
            </div>

            {/* Progress */}
            {progress && calculatingType === 'batch' && (
              <div className="mt-4 bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-600">Processing...</span>
                  <span className="font-medium text-slate-900">{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Users Grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {users.map((user) => {
                const score = friendshipScores.get(user.userId);
                return (
                  <div
                    key={user.userId}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${selectedUser === user.userId ? 'bg-indigo-50' : ''}`}
                    onClick={() => setSelectedUser(user.userId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{user.userId}</p>
                        <p className="text-sm text-slate-500">
                          {user.channel} • {user.totalMessages || user.sessions?.reduce((acc: number, s: any) => acc + (s.messages?.length || 0), 0) || 0} messages
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {score ? (
                          <span className={`text-lg font-bold ${getScoreColor(score.overall).split(' ')[0]} px-3 py-1 rounded-full border ${getScoreColor(score.overall)}`}>
                            {getScoreIcon(score.overall)} {score.overall.toFixed(1)}
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSingleUserAnalysis(user.userId); }}
                            disabled={calculating}
                            className="px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50"
                          >
                            {calculating && calculatingType === 'single' && selectedUser === user.userId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Score'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Score Details & Insights */}
        <div className="space-y-6">
          {/* Batch Stats */}
          {batchStats && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Batch Results
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Average Score</span>
                  <span className="font-semibold text-slate-900">{batchStats.average.toFixed(1)}/10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">High (7+)</span>
                  <span className="font-semibold text-emerald-600">{batchStats.high}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Medium (5-7)</span>
                  <span className="font-semibold text-amber-600">{batchStats.medium}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Low (&lt;5)</span>
                  <span className="font-semibold text-red-600">{batchStats.low}</span>
                </div>
              </div>
            </div>
          )}

          {/* Selected User Score */}
          {selectedUser && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                {selectedUser}
              </h3>
              {friendshipScores.has(selectedUser) ? (() => {
                const score = friendshipScores.get(selectedUser)!;
                return (
                  <div className="space-y-3">
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${getScoreColor(score.overall).split(' ')[0]} inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${getScoreColor(score.overall)}`}>
                        {score.overall.toFixed(1)}
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Overall Score</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-500">Empathy</p>
                        <p className="font-semibold text-slate-900">{score.empathy}/10</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-500">Personal</p>
                        <p className="font-semibold text-slate-900">{score.personalization}/10</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-500">Warmth</p>
                        <p className="font-semibold text-slate-900">{score.warmth}/10</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-slate-500">Listening</p>
                        <p className="font-semibold text-slate-900">{score.supportive_listening}/10</p>
                      </div>
                    </div>
                    {score.strengths.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-emerald-700 mb-1">✓ Strengths</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {score.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    )}
                    {score.improvements.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-amber-700 mb-1">💡 To Improve</p>
                        <ul className="text-xs text-slate-600 space-y-1">
                          {score.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })() : (
                <button
                  onClick={() => handleSingleUserAnalysis(selectedUser)}
                  disabled={calculating}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {calculating && calculatingType === 'single' && selectedUser === selectedUser ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    'Calculate Score (Groq)'
                  )}
                </button>
              )}
            </div>
          )}

          {/* System Insights */}
          {insights.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                System Insights
              </h3>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${getImpactColor(insight.impact)}`}>
                    <div className="flex items-start gap-2">
                      {insight.impact === 'high' && <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      {insight.impact === 'low' && <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      {insight.impact === 'medium' && <Zap className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs mt-1 opacity-80">{insight.description}</p>
                        <p className="text-xs font-semibold mt-2">💡 {insight.recommendation}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.length === 0 && friendshipScores.size === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-slate-500">Analyze users to see insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
