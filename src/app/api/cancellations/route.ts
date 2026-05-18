/**
 * API Route: /api/cancellations
 * Pulls cancelled Razorpay subscriptions, then enriches them with local
 * subscription service user details when available.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RAZORPAY_API_URL = 'https://api.razorpay.com/v1';
const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_URL || 'http://localhost:8000';

type Notes = Record<string, string>;

interface RazorpayCollection<T> {
  entity: 'collection';
  count: number;
  items: T[];
}

interface RazorpaySubscription {
  id: string;
  entity: 'subscription';
  plan_id?: string;
  customer_id?: string;
  status?: string;
  current_start?: number;
  current_end?: number;
  ended_at?: number | null;
  paid_count?: number;
  total_count?: number;
  remaining_count?: number;
  customer_contact?: string;
  customer_email?: string;
  payment_method?: string;
  created_at?: number;
  end_at?: number | null;
  notes?: unknown;
  source?: string;
}

interface LocalSubscription {
  subscriptionId?: string;
  userId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  cancelledAt?: string;
  isCancelled?: boolean;
  razorpaySubscriptionId?: string;
  razorpayPlanId?: string;
  razorpayStatus?: string;
  autoPayEnabled?: boolean;
  user?: {
    userId?: string;
    phoneNumber?: string;
    name?: string;
    trialEndDate?: string;
  };
  plan?: {
    planId?: string;
    name?: string;
    price?: number;
    durationDays?: number;
  };
}

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
  notes?: Notes;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toIsoFromUnix(timestamp?: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

function normalizeNotes(notes: unknown): Notes {
  if (!notes || Array.isArray(notes) || typeof notes !== 'object') return {};

  return Object.entries(notes as Record<string, unknown>).reduce<Notes>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    acc[key] = String(value);
    return acc;
  }, {});
}

function firstValue(...values: Array<string | number | null | undefined>) {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== '');
  return value === undefined || value === null ? undefined : String(value);
}

function formatPhone(phone?: string) {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('+') ? trimmed : `+${trimmed}`;
}

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_SECRET ||
    process.env.RAZORPAY_TOKEN ||
    process.env.RAZORPAY_KEY_TOKEN;

  return { keyId, keySecret };
}

async function fetchRazorpay<T>(path: string, params: Record<string, string | number | undefined> = {}) {
  const { keyId, keySecret } = getRazorpayCredentials();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials are not configured');
  }

  const url = new URL(`${RAZORPAY_API_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Razorpay API failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

async function fetchLocalCancelledSubscriptions() {
  try {
    const response = await fetch(`${SUBSCRIPTIONS_URL}/admin/all-subscriptions?limit=1000`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });

    if (!response.ok) return [];

    const data = await response.json() as { subscriptions?: LocalSubscription[] };
    return (data.subscriptions || []).filter((subscription) => (
      subscription.isCancelled ||
      subscription.razorpayStatus === 'cancelled' ||
      subscription.status === 'cancelled'
    ));
  } catch (error) {
    console.warn('[Cancellations] Could not fetch local subscription enrichments:', error);
    return [];
  }
}

function buildLocalIndexes(localSubscriptions: LocalSubscription[]) {
  const byRazorpaySubscriptionId = new Map<string, LocalSubscription>();
  const byUserId = new Map<string, LocalSubscription>();

  for (const subscription of localSubscriptions) {
    if (subscription.razorpaySubscriptionId) {
      byRazorpaySubscriptionId.set(subscription.razorpaySubscriptionId, subscription);
    }

    const userId = subscription.userId || subscription.user?.userId || subscription.user?.phoneNumber;
    if (userId) byUserId.set(userId, subscription);
  }

  return { byRazorpaySubscriptionId, byUserId };
}

function mapRazorpaySubscription(
  subscription: RazorpaySubscription,
  localBySubscriptionId: Map<string, LocalSubscription>,
  localByUserId: Map<string, LocalSubscription>
): CancellationRow {
  const notes = normalizeNotes(subscription.notes);
  const userId = firstValue(notes.userId, notes.user_id, notes.phone, subscription.customer_contact);
  const local =
    localBySubscriptionId.get(subscription.id) ||
    (userId ? localByUserId.get(userId) || localByUserId.get(formatPhone(userId) || '') : undefined);

  return {
    id: `subscription:${subscription.id}`,
    type: 'subscription',
    cancellationId: subscription.id,
    status: subscription.status || 'cancelled',
    amount: local?.plan?.price ?? null,
    currency: 'INR',
    cancellationDate: toIsoFromUnix(subscription.ended_at || subscription.end_at) || local?.cancelledAt || null,
    userId: firstValue(local?.userId, local?.user?.userId, userId),
    userName: firstValue(local?.user?.name, notes.customer_name),
    phoneNumber: formatPhone(firstValue(local?.user?.phoneNumber, subscription.customer_contact, notes.customer_contact, notes.phone)),
    customerEmail: firstValue(subscription.customer_email, notes.customer_email),
    planId: firstValue(local?.plan?.planId, notes.planId, notes.plan_id, subscription.plan_id),
    planName: firstValue(local?.plan?.name, notes.interval, subscription.plan_id),
    subscriptionId: subscription.id,
    paymentMethod: subscription.payment_method,
    source: 'razorpay',
    notes
  };
}

function mapLocalSubscription(subscription: LocalSubscription): CancellationRow {
  return {
    id: `local-subscription:${subscription.razorpaySubscriptionId || subscription.subscriptionId || subscription.userId}`,
    type: 'subscription',
    cancellationId: subscription.razorpaySubscriptionId || subscription.subscriptionId || subscription.userId || 'local-cancellation',
    status: subscription.razorpayStatus || subscription.status || 'cancelled',
    amount: subscription.plan?.price ?? null,
    currency: 'INR',
    cancellationDate: subscription.cancelledAt || null,
    userId: subscription.userId || subscription.user?.userId,
    userName: subscription.user?.name,
    phoneNumber: formatPhone(subscription.user?.phoneNumber || subscription.userId),
    planId: subscription.plan?.planId || subscription.razorpayPlanId,
    planName: subscription.plan?.name || subscription.plan?.planId || subscription.razorpayPlanId,
    subscriptionId: subscription.razorpaySubscriptionId || subscription.subscriptionId,
    source: 'subscriptions-service'
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = clamp(parseInt(searchParams.get('limit') || '50', 10), 1, 100);
  const skip = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);
  const scan = clamp(parseInt(searchParams.get('scan') || '100', 10), 10, 100);
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  try {
    const localSubscriptions = await fetchLocalCancelledSubscriptions();
    const { byRazorpaySubscriptionId, byUserId } = buildLocalIndexes(localSubscriptions);

    const subscriptionCollection = await fetchRazorpay<RazorpayCollection<RazorpaySubscription>>(
      '/subscriptions',
      { count: scan, skip, from, to }
    );

    const cancelledSubscriptionRows = subscriptionCollection.items
      .filter((subscription) => subscription.status === 'cancelled')
      .map((subscription) => mapRazorpaySubscription(subscription, byRazorpaySubscriptionId, byUserId));

    const seenSubscriptionIds = new Set(cancelledSubscriptionRows.map((row) => row.subscriptionId).filter(Boolean));
    const localOnlyRows = localSubscriptions
      .filter((subscription) => {
        const id = subscription.razorpaySubscriptionId || subscription.subscriptionId;
        return !id || !seenSubscriptionIds.has(id);
      })
      .map(mapLocalSubscription);

    const cancellations = [...cancelledSubscriptionRows, ...localOnlyRows]
      .sort((a, b) => {
        const aTime = a.cancellationDate ? new Date(a.cancellationDate).getTime() : 0;
        const bTime = b.cancellationDate ? new Date(b.cancellationDate).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json({
      cancellations,
      total: cancellations.length,
      razorpay: {
        subscriptionsScanned: subscriptionCollection.count,
        cancelledSubscriptions: cancelledSubscriptionRows.length
      },
      localCancelledSubscriptions: localSubscriptions.length,
      limit,
      offset: skip
    });
  } catch (error) {
    console.error('[Cancellations] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch cancellations',
        message: error instanceof Error ? error.message : 'Unknown error',
        cancellations: [],
        total: 0,
        limit,
        offset: skip
      },
      { status: 500 }
    );
  }
}
