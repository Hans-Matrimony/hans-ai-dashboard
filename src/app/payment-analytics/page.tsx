'use client';

/**
 * Payment Analytics Page
 * Displays payment funnel metrics, conversion rates, and revenue tracking
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
  Calendar
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

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const endDate = new Date().toISOString();
      const startDate = new Date();
      if (dateRange === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (dateRange === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (dateRange === '90d') startDate.setDate(startDate.getDate() - 90);

      const data = await getPaymentAnalytics({
        start_date: startDate.toISOString(),
        end_date: endDate
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
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading payment analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-primary-600" />
            Payment Analytics
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Track payment conversions, revenue, and user behavior
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
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
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </Card>
      )}

      {analytics && (
        <>
          {/* Period Display */}
          <div className="mb-6 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDateRange()}</span>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Button Clicks */}
            <Card className="border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Button Clicks</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {analytics.button_clicks.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <MousePointerClick className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            {/* Payments Completed */}
            <Card className="border-l-4 border-l-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Payments Completed</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {analytics.payments_completed.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            {/* Conversion Rate */}
            <Card className="border-l-4 border-l-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Conversion Rate</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {analytics.conversion_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            {/* Revenue */}
            <Card className="border-l-4 border-l-amber-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Revenue</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                    {formatCurrency(analytics.total_revenue)}
                  </p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card className="mb-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
              Conversion Funnel
            </h3>
            <div className="space-y-4">
              {/* Funnel Steps */}
              {[
                {
                  label: 'Button Clicks',
                  count: analytics.button_clicks,
                  icon: MousePointerClick,
                  color: 'blue'
                },
                {
                  label: 'Payments Completed',
                  count: analytics.payments_completed,
                  icon: CheckCircle,
                  color: 'green'
                }
              ].map((step, index) => {
                const Icon = step.icon;
                const maxCount = analytics.button_clicks || 1;
                const width = Math.max((step.count / maxCount) * 100, 5);

                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 bg-${step.color}-100 dark:bg-${step.color}-900/30 rounded-lg`}>
                          <Icon className={`w-5 h-5 text-${step.color}-600 dark:text-${step.color}-400`} />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white">
                          {step.label}
                        </span>
                      </div>
                      <span className="text-lg font-bold text-slate-900 dark:text-white">
                        {step.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                      <div
                        className={`h-full bg-${step.color}-500 transition-all duration-500 rounded-lg flex items-center justify-end pr-3`}
                        style={{ width: `${width}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          {width > 15 && `${width.toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                    {index < 1 && (
                      <div className="flex justify-center my-2">
                        <div className="flex flex-col items-center">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {analytics.button_clicks > 0
                              ? `${((analytics.payments_completed / analytics.button_clicks) * 100).toFixed(1)}% convert`
                              : 'N/A'}
                          </div>
                          <div className="w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
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
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Performance by Plan
              </h3>
              {analytics.by_plan && analytics.by_plan.length > 0 ? (
                <div className="space-y-4">
                  {analytics.by_plan.map((plan: PlanPerformance) => (
                    <div key={plan.plan_id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {plan.plan_name}
                        </span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {plan.clicks} clicks
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {plan.conversions} conversions
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {formatCurrency(plan.revenue)}
                        </span>
                      </div>
                      {plan.clicks > 0 && (
                        <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${(plan.conversions / plan.clicks) * 100}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No plan data available for this period
                </p>
              )}
            </Card>

            {/* Daily Trend */}
            <Card>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Daily Trend
              </h3>
              {analytics.daily_trend && analytics.daily_trend.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {analytics.daily_trend.slice(-10).reverse().map((day, index) => {
                    const maxClicks = Math.max(...analytics.daily_trend.map(d => d.clicks), 1);
                    const clickWidth = (day.clicks / maxClicks) * 100;

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-slate-600 dark:text-slate-400 shrink-0">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="flex-1 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden relative">
                          <div
                            className="h-full bg-blue-500 absolute left-0 top-0 rounded-lg"
                            style={{ width: `${clickWidth}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3">
                            <span className="text-xs font-medium text-white mix-blend-plus-lighter">
                              {day.clicks} clicks
                            </span>
                            {day.conversions > 0 && (
                              <span className="text-xs font-medium text-green-300">
                                {day.conversions} paid
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                  No daily trend data available for this period
                </p>
              )}
            </Card>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm text-slate-600 dark:text-slate-400">Average Order Value</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(analytics.average_order_value)}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600 dark:text-slate-400">Failed Payments</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {analytics.payments_failed}
              </p>
            </Card>
            <Card>
              <p className="text-sm text-slate-600 dark:text-slate-400">Success Rate</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {analytics.payments_completed + analytics.payments_failed > 0
                  ? `${((analytics.payments_completed / (analytics.payments_completed + analytics.payments_failed)) * 100).toFixed(1)}%`
                  : 'N/A'}
              </p>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
