'use client';

/**
 * Payment Analytics Page
 * Displays payment funnel metrics, conversion rates, and revenue tracking
 * Modern UI with enhanced user experience
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  RefreshCw,
  DollarSign,
  MousePointerClick,
  CheckCircle,
  XCircle,
  TrendingUp,
  BarChart3,
  Calendar,
  Users,
  ArrowUpRight,
  Activity,
  Zap,
  Eye,
  Filter,
  Sparkles,
  Star,
  Clock,
  Shield
} from 'lucide-react';
import { PaymentFunnelData, PlanPerformance } from '@/lib/payment-analytics-types';

async function getPaymentAnalytics(filters?: { start_date?: string; end_date?: string }) {
  try {
    const params = new URLSearchParams();
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const response = await fetch(`/api/payment-analytics?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch payment analytics');
    return await response.json();
  } catch (error) {
    console.error('Payment analytics fetch error:', error);
    throw error;
  }
}

export default function PaymentAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PaymentFunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);

  // Subscription stats
  const [subStats, setSubStats] = useState<{ active: number; expiringSoon: number; total: number } | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  // Fetch subscription stats
  useEffect(() => {
    const fetchSubStats = async () => {
      try {
        const response = await fetch('/api/subscriptions?limit=1000');
        if (response.ok) {
          const data = await response.json();
          const active = data.subscriptions?.filter((s: any) => s.status === 'active') || [];
          const expiringSoon = active.filter((s: any) => s.daysRemaining !== undefined && s.daysRemaining <= 3);
          setSubStats({
            active: active.length,
            expiringSoon: expiringSoon.length,
            total: data.total || 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch subscription stats:', error);
      }
    };

    fetchSubStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchSubStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const endDate = new Date();
      const startDate = new Date();
      if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

      const data = await getPaymentAnalytics({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      });

      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch payment analytics:', err);
      setError('Failed to load payment analytics. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount / 100);
  };

  const formatDateRange = () => {
    if (!analytics) return '';
    const start = new Date(analytics.period.start);
    const end = new Date(analytics.period.end);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent border-b-indigo-500 border-l-indigo-500 animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading payment analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="relative p-3 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-indigo-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              <DollarSign className="w-6 h-6 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Payment Analytics
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 font-medium">
                Track conversions, revenue, and user behavior
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 shadow-sm">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 shadow-sm hover:shadow-md transition-shadow"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800/50 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        </Card>
      )}

      {analytics && (
        <>
          {/* Period Display */}
          <div className="mb-8 inline-flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateRange()}</span>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Button Clicks */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:shadow-blue-500/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl group-hover:from-blue-400/20 group-hover:to-purple-400/20 transition-all duration-300"></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg shadow-blue-500/25">
                    <MousePointerClick className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                    <Sparkles className="w-3 h-3" />
                    Total
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Button Clicks</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {analytics.button_clicks.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Payments Completed */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl group-hover:from-emerald-400/20 group-hover:to-teal-400/20 transition-all duration-300"></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                    <Star className="w-3 h-3" />
                    Success
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Payments</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {analytics.payments_completed.toLocaleString()}
                    </p>
                  </div>
                  {analytics.completed_payment_user_ids && analytics.completed_payment_user_ids.length > 0 && (
                    <button
                      onClick={() => setShowAllUsersModal(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                      title={`View all ${analytics.completed_payment_user_ids.length} users`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {analytics.completed_payment_user_ids.length}
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Users Display */}
                {analytics.completed_payment_user_ids && analytics.completed_payment_user_ids.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 scrollbar-track-transparent">
                      {analytics.completed_payment_user_ids.slice(0, 5).map((userId, index) => (
                        <span
                          key={index}
                          className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1.5 rounded-lg whitespace-nowrap font-semibold border border-emerald-200 dark:border-emerald-800"
                        >
                          {userId}
                        </span>
                      ))}
                      {analytics.completed_payment_user_ids.length > 5 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1.5 whitespace-nowrap font-medium">
                          +{analytics.completed_payment_user_ids.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:shadow-violet-500/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-full blur-3xl group-hover:from-violet-400/20 group-hover:to-purple-400/20 transition-all duration-300"></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/25">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  {analytics.conversion_rate > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2.5 py-1 rounded-full border border-green-100 dark:border-green-800">
                      <Activity className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Conversion Rate</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {analytics.conversion_rate.toFixed(1)}
                  </p>
                  <span className="text-lg font-bold text-slate-400">%</span>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:shadow-amber-500/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-orange-400/10 rounded-full blur-3xl group-hover:from-amber-400/20 group-hover:to-orange-400/20 transition-all duration-300"></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/25">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full border border-amber-100 dark:border-amber-800">
                    <Clock className="w-3 h-3" />
                    Revenue
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {formatCurrency(analytics.total_revenue)}
                </p>
              </div>
            </div>
          </div>

          {/* Subscription Stats Card */}
          {subStats && (
            <div className="mb-8 group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-900/20 dark:via-teal-900/20 dark:to-cyan-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm hover:shadow-md hover:shadow-emerald-500/10 transition-all duration-300">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-emerald-400/10 to-cyan-400/10 rounded-full blur-3xl group-hover:from-emerald-400/20 group-hover:to-cyan-400/20 transition-all duration-300"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                      <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Subscription Overview</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active subscriptions & expiry status</p>
                    </div>
                  </div>
                  <a
                    href="/subscriptions"
                    className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all"
                  >
                    View All
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {/* Active Subscriptions */}
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{subStats.active}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">of {subStats.total} total</p>
                  </div>

                  {/* Expiring Soon */}
                  <div className="bg-white dark:bg-slate-800/80 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiring Soon</span>
                    </div>
                    <p className={`text-3xl font-bold ${subStats.expiringSoon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {subStats.expiringSoon}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">within 3 days</p>
                  </div>

                  {/* Status Indicator */}
                  <div className={`rounded-xl p-4 border ${
                    subStats.expiringSoon > 0
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                      : subStats.active > 0
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className={`w-4 h-4 ${
                        subStats.expiringSoon > 0
                          ? 'text-amber-500'
                          : subStats.active > 0
                            ? 'text-emerald-500'
                            : 'text-slate-400'
                      }`} />
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                    </div>
                    <p className={`text-sm font-bold ${
                      subStats.expiringSoon > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : subStats.active > 0
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {subStats.expiringSoon > 0
                        ? `${subStats.expiringSoon} need attention`
                        : subStats.active > 0
                          ? 'All healthy'
                          : 'No subscriptions'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conversion Funnel */}
          <Card className="mb-8 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/25">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Conversion Funnel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Track user journey from click to payment</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
                <Eye className="w-4 h-4" />
                <span className="font-semibold">Click → Pay Journey</span>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: 'Button Clicks',
                  count: analytics.button_clicks,
                  icon: MousePointerClick,
                  gradient: 'from-blue-500 to-blue-600',
                  bgLight: 'bg-blue-50',
                  bgDark: 'dark:bg-blue-900/30',
                  textLight: 'text-blue-600',
                  textDark: 'dark:text-blue-400',
                  borderLight: 'border-blue-100',
                  borderDark: 'dark:border-blue-800'
                },
                {
                  label: 'Payments Completed',
                  count: analytics.payments_completed,
                  icon: CheckCircle,
                  gradient: 'from-emerald-500 to-teal-600',
                  bgLight: 'bg-emerald-50',
                  bgDark: 'dark:bg-emerald-900/30',
                  textLight: 'text-emerald-600',
                  textDark: 'dark:text-emerald-400',
                  borderLight: 'border-emerald-100',
                  borderDark: 'dark:border-emerald-800'
                }
              ].map((step, index) => {
                const Icon = step.icon;
                const maxCount = analytics.button_clicks || 1;
                const width = Math.max((step.count / maxCount) * 100, 3);
                const percentage = analytics.button_clicks > 0
                  ? ((step.count / analytics.button_clicks) * 100).toFixed(1)
                  : '0';

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 ${step.bgLight} ${step.bgDark} rounded-xl border ${step.borderLight} ${step.borderDark}`}>
                          <Icon className={`w-5 h-5 ${step.textLight} ${step.textDark}`} />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {step.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold text-slate-900 dark:text-white">
                          {step.count.toLocaleString()}
                        </span>
                        {step.count > 0 && (
                          <span className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Bar */}
                    <div className="relative h-12 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shadow-inner">
                      <div
                        className={`absolute inset-y-0 left-0 h-full bg-gradient-to-r ${step.gradient} transition-all duration-700 ease-out rounded-xl flex items-center justify-end pr-4 shadow-lg`}
                        style={{ width: `${width}%` }}
                      >
                        {width > 25 && (
                          <span className="text-sm font-bold text-white drop-shadow">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connector Arrow */}
                    {index < 1 && analytics.payments_completed > 0 && (
                      <div className="flex justify-center my-3">
                        <div className="flex flex-col items-center">
                          <div className="text-sm font-bold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            {analytics.button_clicks > 0
                              ? `${((analytics.payments_completed / analytics.button_clicks) * 100).toFixed(1)}% convert`
                              : 'N/A'}
                          </div>
                          <ArrowUpRight className="w-5 h-5 text-slate-300 dark:text-slate-600 rotate-90 my-1" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Plan Performance & Daily Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Plan Performance */}
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg shadow-purple-500/25">
                  <Filter className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Performance by Plan</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Revenue breakdown</p>
                </div>
              </div>
              {analytics.by_plan && analytics.by_plan.length > 0 ? (
                <div className="space-y-3">
                  {analytics.by_plan.map((plan: PlanPerformance) => (
                    <div key={plan.plan_id} className="group p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {plan.plan_name}
                        </span>
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          {plan.clicks} clicks
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm mb-3">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {plan.conversions} paid
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-base">
                          {formatCurrency(plan.revenue)}
                        </span>
                      </div>
                      {plan.clicks > 0 && (
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max((plan.conversions / plan.clicks) * 100, 3)}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold">No plan data for this period</p>
                </div>
              )}
            </Card>

            {/* Daily Trend */}
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/25">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Trend</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Activity over time</p>
                </div>
              </div>
              {analytics.daily_trend && analytics.daily_trend.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {analytics.daily_trend.slice(-10).reverse().map((day, index) => {
                    const maxClicks = Math.max(...analytics.daily_trend.map(d => d.clicks), 1);
                    const clickWidth = Math.max((day.clicks / maxClicks) * 100, 5);

                    return (
                      <div key={index} className="flex items-center gap-3 group">
                        <div className="w-20 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 h-11 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden relative group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors shadow-inner">
                          <div
                            className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl transition-all duration-300 shadow-sm"
                            style={{ width: `${clickWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-sm font-bold text-white drop-shadow">
                              {day.clicks}
                            </span>
                            {day.conversions > 0 && (
                              <span className="text-sm font-bold text-emerald-200 drop-shadow">
                                ✓ {day.conversions}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-semibold">No daily trend data</p>
                </div>
              )}
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="group p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Average Order</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {formatCurrency(analytics.average_order_value)}
              </p>
            </div>
            <div className="group p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Failed Payments</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics.payments_failed}
              </p>
            </div>
            <div className="group p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Success Rate</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {analytics.payments_completed + analytics.payments_failed > 0
                  ? `${((analytics.payments_completed / (analytics.payments_completed + analytics.payments_failed)) * 100).toFixed(1)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* All Users Modal */}
      {showAllUsersModal && analytics?.completed_payment_user_ids && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowAllUsersModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/25">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Users Who Paid</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {analytics.completed_payment_user_ids.length} paying customers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllUsersModal(false)}
                  className="p-2.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <XCircle className="w-6 h-6 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {analytics.completed_payment_user_ids.map((userId, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all group"
                  >
                    <span className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/25">
                      {index + 1}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {userId}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
