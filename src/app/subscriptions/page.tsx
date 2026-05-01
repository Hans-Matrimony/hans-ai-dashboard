'use client';

/**
 * Subscriptions Management Page - Compact Modern UI
 * Displays all users with subscriptions, their status, days remaining, etc.
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Zap,
  AlertCircle,
  Crown,
  Sparkles,
  TrendingUp,
  Filter,
  Eye,
  Calendar
} from 'lucide-react';

interface Subscription {
  subscriptionId: string;
  userId: string;
  planId: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  user: {
    userId: string;
    phoneNumber: string;
    name?: string;
    trialEndDate?: string;
  };
  plan: {
    planId: string;
    name: string;
    price?: number;
    durationDays?: number;
  };
  daysRemaining?: number;
  daysSinceExpired?: number;
  daysPassed?: number;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  total: number;
  limit: number;
  offset: number;
}

type StatusFilter = 'all' | 'active' | 'expired' | 'cancelled';

async function getSubscriptions(filters?: { status?: string; limit?: number; offset?: number }) {
  try {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const response = await fetch(`/api/subscriptions?${params.toString()}`);
    if (!response.ok) throw new Error('Failed to fetch subscriptions');
    return await response.json();
  } catch (error) {
    console.error('Subscriptions fetch error:', error);
    throw error;
  }
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<SubscriptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const fetchSubscriptions = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const result = await getSubscriptions({
        status: statusFilter,
        limit: 100
      });

      setData(result);
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSubscriptions(false);
  };

  const toggleCard = (subscriptionId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(subscriptionId)) {
      newExpanded.delete(subscriptionId);
    } else {
      newExpanded.add(subscriptionId);
    }
    setExpandedCards(newExpanded);
  };

  const formatPrice = (priceInPaise?: number) => {
    if (!priceInPaise) return 'N/A';
    return `₹${(priceInPaise / 100).toFixed(0)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-600',
      'from-emerald-500 to-teal-600',
      'from-orange-500 to-pink-600',
      'from-rose-500 to-red-600',
      'from-amber-500 to-yellow-600',
      'from-indigo-500 to-blue-600',
      'from-pink-500 to-rose-600'
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const getStatusConfig = (status: string) => {
    const configs = {
      active: {
        label: 'Active',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-700 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        icon: CheckCircle
      },
      expired: {
        label: 'Expired',
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500',
        icon: XCircle
      },
      cancelled: {
        label: 'Cancelled',
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-500',
        icon: XCircle
      },
      pending: {
        label: 'Pending',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-700 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500',
        icon: Clock
      },
      trial: {
        label: 'Trial',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500',
        icon: Zap
      }
    };

    return configs[status as keyof typeof configs] || configs.pending;
  };

  // Filter subscriptions
  const filteredSubscriptions = data?.subscriptions.filter(sub => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.user.phoneNumber?.toLowerCase().includes(query) ||
      sub.user.name?.toLowerCase().includes(query) ||
      sub.subscriptionId.toLowerCase().includes(query) ||
      sub.plan.name.toLowerCase().includes(query)
    );
  }) || [];

  // Calculate stats
  const stats = {
    total: data?.total || 0,
    active: data?.subscriptions.filter(s => s.status === 'active').length || 0,
    expired: data?.subscriptions.filter(s => s.status === 'expired').length || 0,
    cancelled: data?.subscriptions.filter(s => s.status === 'cancelled').length || 0,
    revenue: data?.subscriptions
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + (s.plan.price || 0), 0) || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent border-b-violet-500 border-l-violet-500 animate-spin"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium">Loading subscriptions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-400/10 dark:bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl blur-lg opacity-40"></div>
              <div className="relative p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-violet-700 dark:from-white dark:to-violet-300 bg-clip-text text-transparent">
                Subscriptions
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                Manage subscriptions & track expiry
              </p>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 border-0 px-4 py-2 rounded-xl font-semibold text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Users className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">TOTAL</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 border border-emerald-200/50 dark:border-emerald-800/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">ACTIVE</span>
            </div>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.active}</p>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 border border-red-200/50 dark:border-red-800/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">EXPIRED</span>
            </div>
            <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats.expired}</p>
          </div>

          <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <XCircle className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">CANCELLED</span>
            </div>
            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{stats.cancelled}</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 backdrop-blur-xl rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/50 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <IndianRupee className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">REVENUE</span>
            </div>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">{formatPrice(stats.revenue)}</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="inline-flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-xl p-1 shadow-lg border border-slate-200/50 dark:border-slate-700/50">
            {(['all', 'active', 'expired', 'cancelled'] as StatusFilter[]).map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-md'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 shadow-lg"
            />
          </div>
        </div>

        {/* Subscription List - Compact Cards */}
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? 'No subscriptions found' : 'No subscriptions yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSubscriptions.map((sub) => {
              const statusConfig = getStatusConfig(sub.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedCards.has(sub.subscriptionId);

              return (
                <div
                  key={sub.subscriptionId}
                  className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  {/* Status indicator line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusConfig.bg.replace('bg-', 'bg-').split(' ')[0]}`}></div>

                  {/* Main Card Content */}
                  <div className="p-4 pl-5">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(sub.user.name || sub.user.phoneNumber)} flex items-center justify-center text-white font-bold text-sm shadow-lg shrink-0`}>
                        {getInitials(sub.user.name || sub.user.phoneNumber)}
                      </div>

                      {/* User Info - Compact */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {sub.user.name || 'User'}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} mr-1.5`}></span>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{sub.user.phoneNumber}</p>
                      </div>

                      {/* Plan - Compact */}
                      <div className="hidden sm:block text-center px-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">PLAN</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{sub.plan.name}</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(sub.plan.price)}</p>
                      </div>

                      {/* Days - Compact */}
                      <div className="hidden sm:block text-center px-4 min-w-[100px]">
                        {sub.daysRemaining !== undefined && sub.daysRemaining !== null ? (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">REMAINING</p>
                            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                              {sub.daysRemaining}
                              <span className="text-xs font-normal text-slate-400">d</span>
                            </p>
                          </>
                        ) : sub.daysSinceExpired !== undefined && sub.daysSinceExpired !== null ? (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">EXPIRED</p>
                            <p className="text-lg font-black text-red-600 dark:text-red-400">
                              {sub.daysSinceExpired}
                              <span className="text-xs font-normal text-slate-400">d ago</span>
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">STATUS</p>
                            <p className="text-sm text-slate-400">N/A</p>
                          </>
                        )}
                      </div>

                      {/* Dates - Compact */}
                      <div className="hidden md:block text-center px-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sub.endDate)}
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleCard(sub.subscriptionId)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Mobile Only Plan Info */}
                    <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Plan: <span className="font-semibold text-slate-700 dark:text-slate-300">{sub.plan.name}</span></p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ends: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(sub.endDate)}</span></p>
                      </div>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatPrice(sub.plan.price)}</p>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Subscription ID</p>
                            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{sub.subscriptionId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">User ID</p>
                            <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{sub.user.userId}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Started</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(sub.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                            <p className="font-semibold text-slate-700 dark:text-slate-300">{sub.plan.durationDays ? `${sub.plan.durationDays} days` : 'N/A'}</p>
                          </div>
                          {sub.user.trialEndDate && (
                            <div className="col-span-2">
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trial Ends</p>
                              <p className="font-semibold text-slate-700 dark:text-slate-300">{formatDate(sub.user.trialEndDate)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filteredSubscriptions.length > 0 && (
          <div className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl text-sm text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              Showing {filteredSubscriptions.length} of {stats.total} subscriptions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
