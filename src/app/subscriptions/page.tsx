'use client';

/**
 * Subscriptions Management Page - Ultra Compact List
 * Single row per subscription, minimal height, full width
 */

import { useState, useEffect } from 'react';
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
  Filter,
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

  const getStatusConfig = (status: string) => {
    const configs = {
      active: {
        label: 'Active',
        bg: 'bg-emerald-50 dark:bg-emerald-950',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      },
      expired: {
        label: 'Expired',
        bg: 'bg-red-50 dark:bg-red-950',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
        dot: 'bg-red-500'
      },
      cancelled: {
        label: 'Cancelled',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-500'
      },
      pending: {
        label: 'Pending',
        bg: 'bg-amber-50 dark:bg-amber-950',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
      },
      trial: {
        label: 'Trial',
        bg: 'bg-blue-50 dark:bg-blue-950',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-800',
        dot: 'bg-blue-500'
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
    cancelled: data?.subscriptions.filter(s => s.status === 'cancelled').length || 0
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="relative w-14 h-14 mx-auto mb-4">
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-400/10 dark:bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl blur-lg opacity-40"></div>
              <div className="relative p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                <Crown className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-violet-700 dark:from-white dark:to-violet-300 bg-clip-text text-transparent">
                Subscriptions
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-xs flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-500" />
                Manage subscriptions & track expiry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats Pills */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-xs text-slate-500 dark:text-slate-400">Total: </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.total}</span>
              </div>
              <div className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/50 backdrop-blur rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Active: </span>
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</span>
              </div>
              <div className="px-3 py-1.5 bg-red-50/80 dark:bg-red-950/50 backdrop-blur rounded-lg border border-red-200/50 dark:border-red-800/50">
                <span className="text-xs text-red-600 dark:text-red-400">Expired: </span>
                <span className="text-sm font-bold text-red-700 dark:text-red-300">{stats.expired}</span>
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
        </div>

        {/* Mobile Stats */}
        <div className="sm:hidden flex items-center gap-2 mb-4">
          <div className="px-3 py-1.5 bg-white/70 dark:bg-slate-800/70 backdrop-blur rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Total: </span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.total}</span>
          </div>
          <div className="px-3 py-1.5 bg-emerald-50/80 dark:bg-emerald-950/50 backdrop-blur rounded-lg border border-emerald-200/50 dark:border-emerald-800/50">
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Active: </span>
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</span>
          </div>
          <div className="px-3 py-1.5 bg-red-50/80 dark:bg-red-950/50 backdrop-blur rounded-lg border border-red-200/50 dark:border-red-800/50">
            <span className="text-xs text-red-600 dark:text-red-400">Expired: </span>
            <span className="text-sm font-bold text-red-700 dark:text-red-300">{stats.expired}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="inline-flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-lg p-1 shadow-md border border-slate-200/50 dark:border-slate-700/50">
            {(['all', 'active', 'expired', 'cancelled'] as StatusFilter[]).map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-sm'
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

        {/* Subscription List - Ultra Compact */}
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {searchQuery ? 'No subscriptions found' : 'No subscriptions yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
              <div className="col-span-3 text-xs font-semibold text-slate-500 dark:text-slate-400">USER</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">PLAN</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">STATUS</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">END DATE</div>
              <div className="col-span-2 text-xs font-semibold text-slate-500 dark:text-slate-400">DAYS</div>
              <div className="col-span-1"></div>
            </div>

            {filteredSubscriptions.map((sub) => {
              const statusConfig = getStatusConfig(sub.status);
              const isExpanded = expandedCards.has(sub.subscriptionId);

              return (
                <div
                  key={sub.subscriptionId}
                  className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Status Indicator Line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-0.5 ${statusConfig.dot}`}></div>

                  {/* Main Content - Single Row */}
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
                        {getInitials(sub.user.name || sub.user.phoneNumber)}
                      </div>

                      {/* User Info */}
                      <div className="min-w-0 flex-1 sm:w-auto flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{sub.user.name || 'User'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{sub.user.phoneNumber}</p>
                      </div>

                      {/* Plan */}
                      <div className="hidden sm:block min-w-[100px]">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{sub.plan.name}</p>
                        <p className="text-xs text-slate-400">{formatPrice(sub.plan.price)}</p>
                      </div>

                      {/* Status */}
                      <div className="hidden sm:block min-w-[90px]">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                          <span className={`w-1 h-1 rounded-full ${statusConfig.dot} mr-1.5`}></span>
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* End Date */}
                      <div className="hidden md:block min-w-[100px]">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sub.endDate)}
                        </div>
                      </div>

                      {/* Days */}
                      <div className="hidden md:block min-w-[70px]">
                        {sub.daysRemaining !== undefined && sub.daysRemaining !== null ? (
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            {sub.daysRemaining}
                            <span className="text-xs font-normal text-slate-400">d left</span>
                          </span>
                        ) : sub.daysSinceExpired !== undefined && sub.daysSinceExpired !== null ? (
                          <span className="text-sm font-bold text-red-600 dark:text-red-400">
                            {sub.daysSinceExpired}
                            <span className="text-xs font-normal text-slate-400">d ago</span>
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </div>

                      {/* Mobile Only Info */}
                      <div className="sm:hidden flex items-center gap-3 flex-1 justify-end">
                        <div className="text-right">
                          <p className="text-xs text-slate-500">{sub.plan.name}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                            <span className={`w-1 h-1 rounded-full ${statusConfig.dot} mr-1`}></span>
                            {statusConfig.label}
                          </span>
                        </div>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleCard(sub.subscriptionId)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors shrink-0 ml-auto"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
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
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl text-xs text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
              Showing {filteredSubscriptions.length} of {stats.total} subscriptions
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
