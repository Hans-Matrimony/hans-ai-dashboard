'use client';

/**
 * Subscriptions Management Page - Modern UI
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
  Search,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Zap,
  AlertCircle,
  Crown,
  Sparkles,
  TrendingUp,
  Shield,
  Filter,
  Eye,
  MoreVertical,
  Heart,
  Star
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
        gradient: 'from-emerald-400 to-teal-500',
        bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
        textLight: 'text-emerald-700 dark:text-emerald-300',
        borderLight: 'border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle,
        glow: 'shadow-emerald-500/25'
      },
      expired: {
        label: 'Expired',
        gradient: 'from-red-400 to-rose-500',
        bgLight: 'bg-red-50 dark:bg-red-900/20',
        textLight: 'text-red-700 dark:text-red-300',
        borderLight: 'border-red-200 dark:border-red-800',
        icon: XCircle,
        glow: 'shadow-red-500/25'
      },
      cancelled: {
        label: 'Cancelled',
        gradient: 'from-slate-400 to-slate-500',
        bgLight: 'bg-slate-50 dark:bg-slate-800/50',
        textLight: 'text-slate-700 dark:text-slate-300',
        borderLight: 'border-slate-200 dark:border-slate-700',
        icon: XCircle,
        glow: 'shadow-slate-500/25'
      },
      pending: {
        label: 'Pending',
        gradient: 'from-amber-400 to-orange-500',
        bgLight: 'bg-amber-50 dark:bg-amber-900/20',
        textLight: 'text-amber-700 dark:text-amber-300',
        borderLight: 'border-amber-200 dark:border-amber-800',
        icon: Clock,
        glow: 'shadow-amber-500/25'
      },
      trial: {
        label: 'Trial',
        gradient: 'from-blue-400 to-indigo-500',
        bgLight: 'bg-blue-50 dark:bg-blue-900/20',
        textLight: 'text-blue-700 dark:text-blue-300',
        borderLight: 'border-blue-200 dark:border-blue-800',
        icon: Zap,
        glow: 'shadow-blue-500/25'
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
            <div className="relative w-20 h-20 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-r-transparent border-b-violet-500 border-l-violet-500 animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 opacity-20"></div>
            </div>
            <p className="text-slate-600 dark:text-slate-400 font-medium text-lg">Loading subscriptions...</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Please wait while we fetch your data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-violet-400/10 dark:bg-violet-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-400/10 dark:bg-emerald-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/5 dark:bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl blur-xl opacity-50 animate-pulse"></div>
                <div className="relative p-4 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 rounded-3xl shadow-2xl shadow-violet-500/30">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-3xl"></div>
                  <Crown className="w-8 h-8 text-white relative z-10" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-slate-900 via-violet-800 to-slate-900 dark:from-white dark:via-violet-200 dark:to-white bg-clip-text text-transparent tracking-tight">
                  Subscriptions
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Manage user subscriptions and track expiry
                </p>
              </div>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-xl shadow-violet-500/30 border-0 px-6 py-3 rounded-xl font-semibold"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {error && (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 via-orange-50 to-red-50 dark:from-red-900/20 dark:via-orange-900/20 dark:to-red-900/20 border border-red-200 dark:border-red-800 shadow-lg shadow-red-500/10">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5"></div>
              <div className="relative p-4 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <p className="text-red-800 dark:text-red-200 font-semibold">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards - Modern Glassmorphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
          {/* Total Card */}
          <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl hover:shadow-violet-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-400/20 to-purple-400/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                  <TrendingUp className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-300">ALL</span>
                </div>
              </div>
              <p className="text-4xl font-black text-slate-900 dark:text-white mb-1">{stats.total}</p>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Subscriptions</p>
            </div>
          </div>

          {/* Active Card */}
          <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-emerald-200/50 dark:border-emerald-800/50 shadow-xl shadow-emerald-200/50 dark:shadow-emerald-900/50 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-400/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                  <Heart className="w-3 h-3 text-emerald-600 dark:text-emerald-400 fill-current" />
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">LIVE</span>
                </div>
              </div>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300 mb-1">{stats.active}</p>
              <p className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70">Active Now</p>
            </div>
          </div>

          {/* Expired Card */}
          <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-red-200/50 dark:border-red-800/50 shadow-xl shadow-red-200/50 dark:shadow-red-900/50 hover:shadow-2xl hover:shadow-red-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-400/20 to-rose-400/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-500/30">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Clock className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">OFF</span>
                </div>
              </div>
              <p className="text-4xl font-black text-red-700 dark:text-red-300 mb-1">{stats.expired}</p>
              <p className="text-sm font-semibold text-red-600/70 dark:text-red-400/70">Expired</p>
            </div>
          </div>

          {/* Cancelled Card */}
          <div className="group relative overflow-hidden bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 hover:shadow-2xl hover:shadow-slate-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 to-gray-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-400/20 to-gray-400/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl shadow-lg shadow-slate-500/30">
                  <XCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800/50 rounded-lg">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">END</span>
                </div>
              </div>
              <p className="text-4xl font-black text-slate-700 dark:text-slate-300 mb-1">{stats.cancelled}</p>
              <p className="text-sm font-semibold text-slate-600/70 dark:text-slate-400/70">Cancelled</p>
            </div>
          </div>

          {/* Revenue Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-amber-900/20 backdrop-blur-xl rounded-3xl p-6 border border-amber-200/50 dark:border-amber-800/50 shadow-xl shadow-amber-200/50 dark:shadow-amber-900/50 hover:shadow-2xl hover:shadow-amber-500/20 transition-all duration-500 hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-yellow-500/10"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-2xl"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl shadow-lg shadow-amber-500/30">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Star className="w-3 h-3 text-amber-600 dark:text-amber-400 fill-current" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-300">MRR</span>
                </div>
              </div>
              <p className="text-4xl font-black text-amber-700 dark:text-amber-300 mb-1">{formatPrice(stats.revenue)}</p>
              <p className="text-sm font-semibold text-amber-600/70 dark:text-amber-400/70">Monthly Revenue</p>
            </div>
          </div>
        </div>

        {/* Filters and Search - Modern */}
        <div className="mb-8 flex flex-col lg:flex-row gap-4">
          {/* Status Filter Pills */}
          <div className="inline-flex items-center bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl p-1.5 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/50 dark:border-slate-700/50">
            {(['all', 'active', 'expired', 'cancelled'] as StatusFilter[]).map((status) => {
              const isActive = statusFilter === status;
              const config = getStatusConfig(status);
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r ' + config.gradient + ' text-white shadow-lg'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"></div>
                  )}
                  <span className="relative flex items-center gap-2">
                    {status === 'all' ? (
                      <Filter className="w-4 h-4" />
                    ) : (
                      <config.icon className="w-4 h-4" />
                    )}
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-2xl blur-xl"></div>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by phone, name, or subscription ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="relative w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Subscription Cards Grid */}
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-20">
            <div className="relative inline-flex mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-3xl blur-2xl"></div>
              <div className="relative w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-3xl flex items-center justify-center shadow-xl">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">
              {searchQuery ? 'No subscriptions found' : 'No subscriptions yet'}
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {searchQuery ? 'Try a different search term' : 'Subscriptions will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSubscriptions.map((sub) => {
              const statusConfig = getStatusConfig(sub.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedCards.has(sub.subscriptionId);

              // Calculate progress for days
              const progressPercent = sub.daysRemaining !== undefined && sub.plan.durationDays
                ? (sub.daysRemaining / sub.plan.durationDays) * 100
                : 0;

              return (
                <div
                  key={sub.subscriptionId}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${statusConfig.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>

                  {/* Card */}
                  <div className="relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-3xl border border-slate-200/50 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
                    {/* Status Banner */}
                    <div className={`h-1.5 bg-gradient-to-r ${statusConfig.gradient}`}></div>

                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-5">
                        <div className="flex items-center gap-4">
                          {/* Avatar */}
                          <div className={`relative p-1 bg-gradient-to-br ${statusConfig.gradient} rounded-2xl shadow-lg ${statusConfig.glow}`}>
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAvatarGradient(sub.user.name || sub.user.phoneNumber)} flex items-center justify-center text-white font-black text-lg`}>
                              {getInitials(sub.user.name || sub.user.phoneNumber)}
                            </div>
                            <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-full">
                              <div className={`p-1.5 bg-gradient-to-br ${statusConfig.gradient} rounded-lg`}>
                                <StatusIcon className="w-3 h-3 text-white" />
                              </div>
                            </div>
                          </div>

                          {/* User Info */}
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {sub.user.name || 'User'}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{sub.user.phoneNumber}</p>
                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold mt-2 ${statusConfig.bgLight} ${statusConfig.textLight} ${statusConfig.borderLight} border`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <button
                          onClick={() => toggleCard(sub.subscriptionId)}
                          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-slate-400" />
                        </button>
                      </div>

                      {/* Plan & Price */}
                      <div className="flex items-center justify-between mb-5 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Plan</p>
                          <p className="text-base font-bold text-slate-900 dark:text-white">{sub.plan.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mb-1">Price</p>
                          <p className="text-base font-black bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                            {formatPrice(sub.plan.price)}
                          </p>
                        </div>
                      </div>

                      {/* Days Progress */}
                      {sub.status === 'active' && sub.daysRemaining !== undefined && (
                        <div className="mb-5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Time Remaining</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                              {sub.daysRemaining} days left
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(progressPercent, 5)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {sub.status === 'expired' && sub.daysSinceExpired !== undefined && (
                        <div className="mb-5 p-3 bg-red-50/50 dark:bg-red-900/20 rounded-xl border border-red-200/50 dark:border-red-800/50">
                          <div className="flex items-center gap-2">
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                              Expired {sub.daysSinceExpired} days ago
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Dates Row */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Started</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDate(sub.startDate)}</p>
                        </div>
                        <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl">
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Ends</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDate(sub.endDate)}</p>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Subscription ID</p>
                              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{sub.subscriptionId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">User ID</p>
                              <p className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all">{sub.user.userId}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Duration</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300">{sub.plan.durationDays ? `${sub.plan.durationDays} days` : 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Created</p>
                              <p className="font-bold text-slate-700 dark:text-slate-300">{formatDate(sub.createdAt)}</p>
                            </div>
                            {sub.user.trialEndDate && (
                              <div className="col-span-2">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Trial Period Ends</p>
                                <p className="font-bold text-slate-700 dark:text-slate-300">{formatDate(sub.user.trialEndDate)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Expand Button */}
                      <button
                        onClick={() => toggleCard(sub.subscriptionId)}
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            Show Less
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" />
                            View Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {filteredSubscriptions.length > 0 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                Showing {filteredSubscriptions.length} of {stats.total} subscriptions
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
