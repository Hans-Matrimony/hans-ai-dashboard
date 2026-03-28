'use client';

/**
 * Modern Conversation Analytics Page - Light Theme Only
 * Beautiful, modern UI with charts and visualizations
 * Now includes Model Training & Feedback Dashboard
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  RefreshCw,
  Download,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Brain,
  Smile,
  Activity,
  BarChart3,
  PieChart,
  Target,
  Zap,
  GraduationCap
} from 'lucide-react';
import { ConversationAnalytics, DetailedAnalytics } from '@/lib/analytics-types';
import { WorstResponsesPanel } from '@/components/analytics-training/WorstResponsesPanel';
import { EmotionalAccuracyPanel } from '@/components/analytics-training/EmotionalAccuracyPanel';
import { TopicPerformancePanel } from '@/components/analytics-training/TopicPerformancePanel';
import { TrainingDataExport } from '@/components/analytics-training/TrainingDataExport';

// Direct API calls
async function getAnalytics() {
  try {
    const response = await fetch('/api/chat-logs/analytics');
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return await response.json();
  } catch (error) {
    console.error('Analytics fetch error:', error);
    throw error;
  }
}

async function getDetailedAnalytics() {
  try {
    const response = await fetch('/api/chat-logs/analytics/detailed?limit=50');
    if (!response.ok) throw new Error('Failed to fetch detailed analytics');
    return await response.json();
  } catch (error) {
    console.error('Detailed analytics fetch error:', error);
    throw error;
  }
}

type TabType = 'overview' | 'training';

export default function ConversationAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ConversationAnalytics | null>(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState<DetailedAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trainingLoading, setTrainingLoading] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchAnalytics(false), 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await getAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load analytics. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDetailedAnalytics = async () => {
    try {
      setTrainingLoading(true);
      const data = await getDetailedAnalytics();
      setDetailedAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch detailed analytics:', err);
      // Don't show error for training data, just log it
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(true);
    if (activeTab === 'training') {
      fetchDetailedAnalytics();
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'training' && !detailedAnalytics) {
      fetchDetailedAnalytics();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <RefreshCw className="relative h-12 w-12 animate-spin text-indigo-600" />
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Oops! Something went wrong</h3>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => fetchAnalytics(true)} className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!analytics) return null;

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-400 to-green-500';
    if (score >= 60) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-rose-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Animated Background Pattern */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(99, 102, 241, 0.15) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                    Conversation Analytics
                  </h1>
                  <p className="text-slate-600 flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    AI-powered insights
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-500 flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur rounded-xl border border-slate-200 shadow-sm">
                <Activity className="h-4 w-4" />
                Last updated: {new Date(analytics.last_updated).toLocaleString()}
                {analytics.cache_status !== 'fresh' && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                    Cached
                  </span>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshing}
                className="bg-white/80 backdrop-blur hover:bg-white border border-slate-200 shadow-lg hover:shadow-xl transition-all"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur rounded-2xl p-2 border border-slate-200 shadow-lg">
            <button
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'overview'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="h-5 w-5" />
              Overview
            </button>
            <button
              onClick={() => handleTabChange('training')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'training'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="h-5 w-5" />
              Training Feedback
              {detailedAnalytics && (
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {detailedAnalytics.detailed_responses.summary.critical + detailedAnalytics.detailed_responses.summary.needs_improvement} issues
                </span>
              )}
            </button>
          </div>

          {/* Stats Overview - Only show on Overview tab */}
          {activeTab === 'overview' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 hover:shadow-2xl hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <MessageSquare className="h-6 w-6 opacity-80" />
                <span className="text-3xl font-bold">{analytics.total_conversations}</span>
              </div>
              <div className="text-sm opacity-90">Conversations</div>
              <div className="text-xs opacity-75 mt-1">{analytics.total_messages} messages</div>
            </div>

            <div className={`bg-gradient-to-br ${getScoreGradient(analytics.quality.overall)} rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <Brain className="h-6 w-6 opacity-80" />
                <span className="text-3xl font-bold">{analytics.quality.overall}</span>
              </div>
              <div className="text-sm opacity-90">Quality Score</div>
              <div className="w-full bg-white/30 rounded-full h-2 mt-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.quality.overall}%` }}
                />
              </div>
            </div>

            <div className={`bg-gradient-to-br ${
              analytics.sentiment.positive >= 50 ? 'from-emerald-400 to-green-500' : 'from-blue-400 to-indigo-500'
            } rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <Smile className="h-6 w-6 opacity-80" />
                <span className="text-3xl font-bold">{analytics.sentiment.positive}%</span>
              </div>
              <div className="text-sm opacity-90">Positive Sentiment</div>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">+{analytics.sentiment.positive}%</span>
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">={analytics.sentiment.neutral}%</span>
                <span className="px-2 py-1 bg-white/20 rounded-full text-xs">-{analytics.sentiment.negative}%</span>
              </div>
            </div>

            <div className={`bg-gradient-to-br ${
              analytics.satisfaction.overall_satisfaction === 'high' ? 'from-green-400 to-emerald-500' :
              analytics.satisfaction.overall_satisfaction === 'medium' ? 'from-amber-400 to-orange-500' :
              'from-red-400 to-rose-500'
            } rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-6 w-6 opacity-80" />
                <span className="text-2xl font-bold capitalize">{analytics.satisfaction.overall_satisfaction}</span>
              </div>
              <div className="text-sm opacity-90">Satisfaction</div>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs">✓ {analytics.satisfaction.explicit_positive}</span>
                <span className="text-xs">✗ {analytics.satisfaction.explicit_negative}</span>
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Main Content Grid - Overview */}
        {activeTab === 'overview' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quality Score Section */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Quality Analysis</h2>
                    <p className="text-sm text-slate-500">Detailed performance metrics</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Overall Score */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-slate-200"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - analytics.quality.overall / 100)}`}
                        strokeLinecap="round"
                        transform="rotate(90)"
                        transformOrigin="center"
                      />
                    </svg>
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={
                          analytics.quality.overall >= 80 ? '#10b981' :
                          analytics.quality.overall >= 60 ? '#f59e0b' :
                          '#f87171'
                        } />
                        <stop offset="100%" stopColor={
                          analytics.quality.overall >= 80 ? '#059669' :
                          analytics.quality.overall >= 60 ? '#d97706' :
                          '#dc2626'
                        } />
                      </linearGradient>
                    </defs>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className={`text-4xl font-bold bg-gradient-to-br ${getScoreGradient(analytics.quality.overall)} bg-clip-text text-transparent`}>
                          {analytics.quality.overall}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">SCORE</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Accuracy</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.quality.accuracy}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${analytics.quality.accuracy}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Completeness</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.quality.completeness}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                          style={{ width: `${analytics.quality.completeness}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Helpfulness</span>
                        <span className="text-sm font-bold text-slate-900">{analytics.quality.helpfulness}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full transition-all duration-500"
                          style={{ width: `${analytics.quality.helpfulness}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-slate-600">
                        AI Confidence: {(analytics.quality.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Issues Card */}
          <Card className={`${getScoreBg(analytics.quality.overall)} backdrop-blur-xl border-2 shadow-2xl hover:shadow-3xl transition-all duration-300`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${
                  analytics.issues.severity === 'high' ? 'bg-red-500' :
                  analytics.issues.severity === 'medium' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`}>
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Issues Detected</h3>
                  <p className={`text-sm font-medium capitalize ${
                    analytics.issues.severity === 'high' ? 'text-red-600' :
                    analytics.issues.severity === 'medium' ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {analytics.issues.severity} Severity
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Repetitive Responses</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {analytics.issues.repetitive_responses.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(analytics.issues.repetitive_responses.length * 10, 100)}%` }} />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Misunderstandings</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {analytics.issues.misunderstandings.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(analytics.issues.misunderstandings.length * 10, 100)}%` }} />
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Incomplete Answers</span>
                    <span className="text-2xl font-bold text-slate-900">
                      {analytics.issues.incomplete_answers.length}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(analytics.issues.incomplete_answers.length * 10, 100)}%` }} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-900">{analytics.issues.total_issues}</div>
                    <div className="text-sm text-slate-500">Total Issues</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Topics Section */}
          <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Top Topics</h2>
                  <p className="text-sm text-slate-500">Most discussed subjects</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-3">
              {analytics.topics.slice(0, 6).map((topic, index) => (
                <div
                  key={index}
                  className="group relative overflow-hidden bg-gradient-to-r from-slate-50 to-white rounded-xl p-4 border border-slate-200 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-slate-900">{topic.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          index === 0 ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                          index === 1 ? 'bg-gradient-to-r from-slate-400 to-slate-500 text-white' :
                          index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500">
                        {topic.count} conversations
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        {topic.percentage}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Response Length Analysis */}
          <Card className="lg:col-span-2 bg-white/80 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Response Length Analysis</h2>
                  <p className="text-sm text-slate-500">User vs bot message length patterns</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* User Messages */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                  <div className="text-center">
                    <div className="text-sm text-blue-600 font-medium mb-3">User Messages</div>
                    <div className="text-5xl font-bold text-blue-600 mb-2">
                      {analytics.response_length.average_user_length}
                    </div>
                    <div className="text-xs text-blue-500">avg. characters</div>
                  </div>
                </div>

                {/* Bot Messages */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-200">
                  <div className="text-center">
                    <div className="text-sm text-purple-600 font-medium mb-3">Bot Messages</div>
                    <div className="text-5xl font-bold text-purple-600 mb-2">
                      {analytics.response_length.average_bot_length}
                    </div>
                    <div className="text-xs text-purple-500">avg. characters</div>
                  </div>
                </div>

                {/* Distribution */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 border border-emerald-200">
                  <div className="text-center">
                    <div className="text-sm text-emerald-600 font-medium mb-4">Distribution</div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Short (&lt;50)</span>
                          <span className="font-bold text-slate-900">{analytics.response_length.length_distribution.short}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(analytics.response_length.length_distribution.short / Math.max(analytics.total_messages, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Medium (50-200)</span>
                          <span className="font-bold text-slate-900">{analytics.response_length.length_distribution.medium}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(analytics.response_length.length_distribution.medium / Math.max(analytics.total_messages, 1)) * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600">Long (&gt;200)</span>
                          <span className="font-bold text-slate-900">{analytics.response_length.length_distribution.long}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${(analytics.response_length.length_distribution.long / Math.max(analytics.total_messages, 1)) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sentiment Analysis Footer */}
        <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-0 shadow-xl">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl">
                  <Smile className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Sentiment Breakdown</h3>
                  <p className="text-sm text-slate-500">User emotion distribution across conversations</p>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600">{analytics.sentiment.positive}%</div>
                  <div className="text-sm text-slate-500">Positive</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-600">{analytics.sentiment.neutral}%</div>
                  <div className="text-sm text-slate-500">Neutral</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-600">{analytics.sentiment.negative}%</div>
                  <div className="text-sm text-slate-500">Negative</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
        </>
        )}

        {/* Training Feedback Section */}
        {activeTab === 'training' && (
        <div className="space-y-6">
          {trainingLoading ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
              <RefreshCw className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Conversations...</h3>
              <p className="text-slate-600">This may take a few minutes as we analyze response quality and emotional accuracy.</p>
            </div>
          ) : detailedAnalytics ? (
            <>
              {/* Export Section */}
              <TrainingDataExport responses={detailedAnalytics.detailed_responses.analyses} />

              {/* Worst Responses */}
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
                <div className="p-6">
                  <WorstResponsesPanel responses={detailedAnalytics.detailed_responses.analyses} />
                </div>
              </Card>

              {/* Emotional Accuracy */}
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
                <div className="p-6">
                  <EmotionalAccuracyPanel data={detailedAnalytics.emotional_accuracy} />
                </div>
              </Card>

              {/* Topic Performance */}
              <Card className="bg-white/80 backdrop-blur-xl border-0 shadow-2xl">
                <div className="p-6">
                  <TopicPerformancePanel topics={detailedAnalytics.topic_performance} />
                </div>
              </Card>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
              <Brain className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Training Data Yet</h3>
              <p className="text-slate-600 mb-6">Click the button below to analyze conversations for training insights.</p>
              <Button
                onClick={fetchDetailedAnalytics}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                Start Analysis
              </Button>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
