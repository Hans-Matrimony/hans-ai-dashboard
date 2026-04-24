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
  Filter
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

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

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
    return `₹${(amount / 100).toFixed(0)}`;
  };

  const formatDateRange = () => {
    if (!analytics) return '';
    const start = new Date(analytics.period.start);
    const end = new Date(analytics.period.end);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Gradient backgrounds for cards
  const gradients = {
    blue: 'from-blue-500 via-blue-600 to-blue-700',
    green: 'from-emerald-500 via-emerald-600 to-teal-700',
    purple: 'from-violet-500 via-purple-600 to-indigo-700',
    amber: 'from-amber-500 via-orange-500 to-red-500',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200 dark:border-slate-700"></div>
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Payment Analytics
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                Track conversions, revenue, and user behavior
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1.5 shadow-sm">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50'
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
            className="gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </Card>
      )}

      {analytics && (
        <>
          {/* Period Display */}
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 px-4 py-2 rounded-xl w-fit">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{formatDateRange()}</span>
          </div>

          {/* Key Metrics Cards - Modern Gradient Design */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Button Clicks */}
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-blue-500/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients.blue} opacity-5`}></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <MousePointerClick className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-full">
                    Total
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Button Clicks</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {analytics.button_clicks.toLocaleString()}
                </p>
              </div>
            </Card>

            {/* Payments Completed - Enhanced with Users */}
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-emerald-500/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients.green} opacity-5`}></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                    Success
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Payments</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {analytics.payments_completed.toLocaleString()}
                    </p>
                  </div>
                  {analytics.completed_payment_user_ids && analytics.completed_payment_user_ids.length > 0 && (
                    <button
                      onClick={() => setShowAllUsersModal(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      title={`View all ${analytics.completed_payment_user_ids.length} users`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      {analytics.completed_payment_user_ids.length} users
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Compact Users Display */}
                {analytics.completed_payment_user_ids && analytics.completed_payment_user_ids.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-emerald-200 dark:scrollbar-thumb-emerald-800 scrollbar-track-transparent">
                      {analytics.completed_payment_user_ids.slice(0, 5).map((userId, index) => (
                        <span
                          key={index}
                          className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg whitespace-nowrap font-medium border border-emerald-100 dark:border-emerald-800"
                        >
                          {userId}
                        </span>
                      ))}
                      {analytics.completed_payment_user_ids.length > 5 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 whitespace-nowrap">
                          +{analytics.completed_payment_user_ids.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Conversion Rate */}
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-violet-500/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients.purple} opacity-5`}></div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                    <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  {analytics.conversion_rate > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                      <Activity className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Conversion Rate</p>
                <div className="flex items-baseline gap-1">
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">
                    {analytics.conversion_rate.toFixed(1)}
                  </p>
                  <span className="text-lg text-slate-400">%</span>
                </div>
              </div>
            </Card>

            {/* Revenue */}
            <Card className="relative overflow-hidden border-0 shadow-lg shadow-amber-500/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients.amber} opacity-5`}</div>
              <div className="relative p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-full">
                    Revenue
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-1">Total Earnings</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(analytics.total_revenue)}
                </p>
              </div>
            </Card>
          </div>

          {/* Conversion Funnel - Modern Design */}
          <Card className="mb-8 border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Conversion Funnel</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Eye className="w-4 h-4" />
                <span>Click → Pay Journey</span>
              </div>
            </div>

            <div className="space-y-5">
              {[
                {
                  label: 'Button Clicks',
                  count: analytics.button_clicks,
                  icon: MousePointerClick,
                  color: 'blue',
                  gradient: 'from-blue-500 to-blue-600'
                },
                {
                  label: 'Payments Completed',
                  count: analytics.payments_completed,
                  icon: CheckCircle,
                  color: 'emerald',
                  gradient: 'from-emerald-500 to-teal-600'
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
                        <div className={`p-2 bg-${step.color}-100 dark:bg-${step.color}-900/30 rounded-lg`}>
                          <Icon className={`w-4 h-4 text-${step.color}-600 dark:text-${step.color}-400`} />
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {step.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {step.count.toLocaleString()}
                        </span>
                        {step.count > 0 && (
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Funnel Bar */}
                    <div className="relative h-10 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 h-full bg-gradient-to-r ${step.gradient} transition-all duration-700 ease-out rounded-xl flex items-center justify-end pr-4`}
                        style={{ width: `${width}%` }}
                      >
                        {width > 20 && (
                          <span className="text-xs font-semibold text-white drop-shadow-sm">
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connector Arrow */}
                    {index < 1 && analytics.payments_completed > 0 && (
                      <div className="flex justify-center my-2">
                        <div className="flex flex-col items-center">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                            {analytics.button_clicks > 0
                              ? `${((analytics.payments_completed / analytics.button_clicks) * 100).toFixed(1)}% convert`
                              : 'N/A'}
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 rotate-90 my-1" />
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
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Filter className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Performance by Plan</h3>
              </div>
              {analytics.by_plan && analytics.by_plan.length > 0 ? (
                <div className="space-y-3">
                  {analytics.by_plan.map((plan: PlanPerformance) => (
                    <div key={plan.plan_id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {plan.plan_name}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {plan.clicks} clicks
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {plan.conversions} paid
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(plan.revenue)}
                        </span>
                      </div>
                      {plan.clicks > 0 && (
                        <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
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
                  <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No plan data for this period</p>
                </div>
              )}
            </Card>

            {/* Daily Trend */}
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Daily Trend</h3>
              </div>
              {analytics.daily_trend && analytics.daily_trend.length > 0 ? (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                  {analytics.daily_trend.slice(-10).reverse().map((day, index) => {
                    const maxClicks = Math.max(...analytics.daily_trend.map(d => d.clicks), 1);
                    const clickWidth = Math.max((day.clicks / maxClicks) * 100, 5);

                    return (
                      <div key={index} className="flex items-center gap-3 group">
                        <div className="w-20 text-xs text-slate-500 dark:text-slate-400 shrink-0 font-medium">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition-colors">
                          <div
                            className="absolute inset-y-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg transition-all duration-300"
                            style={{ width: `${clickWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-xs font-semibold text-white drop-shadow">
                              {day.clicks}
                            </span>
                            {day.conversions > 0 && (
                              <span className="text-xs font-medium text-emerald-300 drop-shadow">
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
                  <Activity className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500 dark:text-slate-400">No daily trend data</p>
                </div>
              )}
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Average Order</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {formatCurrency(analytics.average_order_value)}
                </p>
              </div>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Failed Payments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.payments_failed}
                </p>
              </div>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <div className="p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {analytics.payments_completed + analytics.payments_failed > 0
                    ? `${((analytics.payments_completed / (analytics.payments_completed + analytics.payments_failed)) * 100).toFixed(1)}%`
                    : 'N/A'}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* All Users Modal */}
      {showAllUsersModal && analytics?.completed_payment_user_ids && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAllUsersModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Users Who Paid
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {analytics.completed_payment_user_ids.length} paying customers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAllUsersModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {analytics.completed_payment_user_ids.map((userId, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <span className="flex items-center justify-center w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {userId}
                    </span>
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
