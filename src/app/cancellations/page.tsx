'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import {
  AlertCircle,
  Calendar,
  CreditCard,
  IndianRupee,
  Mail,
  Phone,
  Receipt,
  RefreshCw,
  Search,
  User,
  XCircle
} from 'lucide-react';

interface CancellationRow {
  id: string;
  type: 'subscription';
  cancellationId: string;
  status: string;
  amount?: number | null;
  currency?: string;
  cancellationDate?: string | null;
  userId?: string;
  userName?: string;
  phoneNumber?: string;
  customerEmail?: string;
  planId?: string;
  planName?: string;
  subscriptionId?: string;
  paymentMethod?: string;
  source: 'razorpay' | 'subscriptions-service';
}

interface CancellationsResponse {
  cancellations: CancellationRow[];
  total: number;
  localCancelledSubscriptions?: number;
  razorpay?: {
    subscriptionsScanned: number;
    cancelledSubscriptions: number;
  };
}

type Filter = 'all' | 'razorpay' | 'subscriptions-service' | 'cancelled';

async function getCancellations() {
  const response = await fetch('/api/cancellations?limit=100&scan=100');
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to fetch cancellations');
  }

  return response.json() as Promise<CancellationsResponse>;
}

function formatAmount(amount?: number | null, currency = 'INR') {
  if (amount === null || amount === undefined) return 'N/A';
  return `${currency} ${(amount / 100).toFixed(0)}`;
}

function formatDate(date?: string | null) {
  if (!date) return 'N/A';

  try {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'N/A';
  }
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized === 'processed' || normalized === 'cancelled') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (normalized === 'pending') {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  if (normalized === 'failed') {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function CancellationsPage() {
  const [data, setData] = useState<CancellationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      setData(await getCancellations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cancellations');
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const rows = data?.cancellations || [];

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter =
        filter === 'all' ||
        row.source === filter ||
        row.status.toLowerCase() === filter;

      if (!matchesFilter) return false;
      if (!search) return true;

      return [
        row.cancellationId,
        row.subscriptionId,
        row.userId,
        row.userName,
        row.phoneNumber,
        row.customerEmail,
        row.planName,
        row.planId,
        row.paymentMethod
      ].some((value) => value?.toLowerCase().includes(search));
    });
  }, [filter, query, rows]);

  const stats = useMemo(() => {
    const withPhone = rows.filter((row) => row.phoneNumber).length;
    const local = rows.filter((row) => row.source === 'subscriptions-service').length;
    const razorpay = rows.filter((row) => row.source === 'razorpay').length;
    const today = rows.filter((row) => {
      if (!row.cancellationDate) return false;
      const diff = Date.now() - new Date(row.cancellationDate).getTime();
      return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
    }).length;

    return {
      total: rows.length,
      razorpay,
      local,
      today,
      withPhone
    };
  }, [rows]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-4 border-slate-200 border-t-red-500 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading cancellations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-600 p-3 shadow-lg shadow-red-600/20">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Cancellations</h1>
              <p className="text-sm text-slate-500">Cancelled auto-pay subscriptions with user details</p>
            </div>
          </div>

          <Button onClick={handleRefresh} disabled={refreshing} className="gap-2 bg-red-600 hover:bg-red-700">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Could not load Razorpay cancellations</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">From Razorpay</p>
            <p className="mt-2 text-3xl font-bold text-red-600">{stats.razorpay}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Local records</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{stats.local}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">Last 24h</p>
            <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.today}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">With mobile</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{stats.withPhone}</p>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(['all', 'razorpay', 'subscriptions-service', 'cancelled'] as Filter[]).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  filter === item
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item === 'all' ? 'All' : item === 'subscriptions-service' ? 'Local' : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by mobile, name, subscription ID, plan..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-12 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase text-slate-500 lg:grid">
            <div className="col-span-3">User</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Reference</div>
            <div className="col-span-1">Status</div>
          </div>

          {filteredRows.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="font-medium text-slate-600">No cancellations found</p>
              <p className="text-sm text-slate-400">Try clearing the search or switching filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRows.map((row) => (
                <div key={row.id} className="grid gap-3 px-4 py-4 lg:grid-cols-12 lg:items-center">
                  <div className="lg:col-span-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-slate-100 p-2">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{row.userName || row.userId || 'Unknown user'}</p>
                        <div className="mt-1 flex flex-col gap-1 text-xs text-slate-500">
                          {row.phoneNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {row.phoneNumber}
                            </span>
                          )}
                          {row.customerEmail && (
                            <span className="flex items-center gap-1 truncate">
                              <Mail className="h-3 w-3" />
                              {row.customerEmail}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="text-sm font-semibold text-slate-800">Auto-pay cancelled</p>
                    <p className="text-xs text-slate-500">{row.planName || row.planId || row.source}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 lg:col-span-2">
                    <IndianRupee className="h-4 w-4 text-slate-400" />
                    {formatAmount(row.amount, row.currency)}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 lg:col-span-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {formatDate(row.cancellationDate)}
                  </div>

                  <div className="min-w-0 lg:col-span-2">
                    <p className="truncate font-mono text-xs text-slate-700">{row.subscriptionId || row.cancellationId}</p>
                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      <CreditCard className="h-3 w-3" />
                      {row.paymentMethod || row.source}
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold capitalize ${getStatusClass(row.status)}`}>
                      {row.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          Showing {filteredRows.length} of {rows.length} fetched cancellation records
        </div>
      </div>
    </div>
  );
}
