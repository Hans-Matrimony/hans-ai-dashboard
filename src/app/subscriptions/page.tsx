'use client';

/**
 * Subscriptions Management Page
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
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  IndianRupee,
  Zap,
  AlertCircle
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
type SortField = 'startDate' | 'endDate' | 'daysPassed' | 'plan.name';
type SortOrder = 'asc' | 'desc';

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
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleRow = (subscriptionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(subscriptionId)) {
      newExpanded.delete(subscriptionId);
    } else {
      newExpanded.add(subscriptionId);
    }
    setExpandedRows(newExpanded);
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle },
      expired: { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
      cancelled: { label: 'Cancelled', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: XCircle },
      pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
      trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Zap }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {config.label}
      </span>
    );
  };

  // Filter and sort subscriptions
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

  const sortedSubscriptions = [...filteredSubscriptions].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'startDate':
        comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        break;
      case 'endDate':
        comparison = new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime();
        break;
      case 'daysPassed':
        comparison = (a.daysPassed || 0) - (b.daysPassed || 0);
        break;
      case 'plan.name':
        comparison = a.plan.name.localeCompare(b.plan.name);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Calculate stats
  const stats = {
    total: data?.total || 0,
    active: data?.subscriptions.filter(s => s.status === 'active').length || 0,
    expired: data?.subscriptions.filter(s => s.status === 'expired').length || 0,
    cancelled: data?.subscriptions.filter(s => s.status === 'cancelled').length || 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent border-b-indigo-500 border-l-indigo-500 animate-spin"></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">Loading subscriptions...</p>
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
            <div className="relative p-3 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg shadow-emerald-500/25">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              <Users className="w-6 h-6 text-white relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Subscriptions
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 font-medium">
                Manage user subscriptions and track expiry
              </p>
            </div>
          </div>
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

      {error && (
        <Card className="mb-6 border-red-200 dark:border-red-800/50 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-5 border border-emerald-200 dark:border-emerald-800">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Active</p>
          <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Expired</p>
          <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.expired}</p>
        </div>
        <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl p-5 border border-slate-300 dark:border-slate-600">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Cancelled</p>
          <p className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.cancelled}</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Status Filter */}
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1 shadow-sm">
          {(['all', 'active', 'expired', 'cancelled'] as StatusFilter[]).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                statusFilter === status
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by phone, name, or subscription ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        {sortedSubscriptions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">
              {searchQuery ? 'No subscriptions found matching your search' : 'No subscriptions found'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Plan</span>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => toggleSort('startDate')}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Date</span>
                      {sortField === 'startDate' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => toggleSort('endDate')}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Date</span>
                      {sortField === 'endDate' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => toggleSort('daysPassed')}>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Days</span>
                      {sortField === 'daysPassed' && (sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {sortedSubscriptions.map((sub) => (
                  <>
                    <tr key={sub.subscriptionId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{sub.user.name || sub.user.phoneNumber}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{sub.user.phoneNumber}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{sub.plan.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            {formatPrice(sub.plan.price)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(sub.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(sub.startDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{formatDate(sub.endDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {sub.daysRemaining !== null && sub.daysRemaining !== undefined ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            {sub.daysRemaining} days left
                          </span>
                        ) : sub.daysSinceExpired !== null && sub.daysSinceExpired !== undefined ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            Expired {sub.daysSinceExpired}d ago
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRow(sub.subscriptionId)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          {expandedRows.has(sub.subscriptionId) ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(sub.subscriptionId) && (
                      <tr className="bg-slate-50 dark:bg-slate-800/30">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Subscription ID</p>
                              <p className="font-mono text-slate-700 dark:text-slate-300 text-xs">{sub.subscriptionId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">User ID</p>
                              <p className="font-mono text-slate-700 dark:text-slate-300 text-xs">{sub.user.userId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created</p>
                              <p className="text-slate-700 dark:text-slate-300">{formatDate(sub.createdAt)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Duration</p>
                              <p className="text-slate-700 dark:text-slate-300">{sub.plan.durationDays ? `${sub.plan.durationDays} days` : 'N/A'}</p>
                            </div>
                            {sub.user.trialEndDate && (
                              <div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Trial Ends</p>
                                <p className="text-slate-700 dark:text-slate-300">{formatDate(sub.user.trialEndDate)}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Footer with count */}
      {sortedSubscriptions.length > 0 && (
        <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {sortedSubscriptions.length} of {stats.total} subscriptions
        </div>
      )}
    </div>
  );
}
