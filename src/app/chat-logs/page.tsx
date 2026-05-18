    'use client';

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { FriendshipPositioning } from '@/lib/analytics-types';

/* ──────── Types ──────── */
interface Message {
    messageId: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
    messageType?: string;
    metadata?: {
        delivery_status?: 'success' | 'failed';
        message_id?: string;
        error?: string;
        topic?: string;
        language?: string;
        hours_inactive?: number;
        timestamp?: string;
        dob?: string;
        friendshipScore?: {
            overall: number;
            empathy: number;
            personalization: number;
            warmth: number;
            supportive_listening: number;
            rapport: number;
        };
    };
}

interface Session {
    sessionId: string;
    startTime: string;
    lastMessageTime: string;
    channel: string;
    messages: Message[];
}

interface UserDoc {
    _id: string;
    userId: string;
    sessions: Session[];
    totalSessions: number;
}

interface Subscription {
    userId: string;
    status: 'active' | 'expired' | 'cancelled' | 'trial' | 'pending';
}

interface ApiResponse {
    count: number;
    users: UserDoc[];
}

/* ──────── Helpers ──────── */
// Normalize phone number for matching (remove +, spaces, dashes)
function normalizePhoneNumber(phone: string): string {
    return phone.replace(/[\+\s\-()]/g, '');
}

function fmtTime(iso: string) {
    try {
        const d = new Date(iso);
        return d.toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });
    } catch { return iso; }
}

function fmtRelative(iso: string) {
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    } catch { return ''; }
}

function channelIcon(ch: string) {
    if (ch?.toLowerCase().includes('telegram')) return '✈️';
    if (ch?.toLowerCase().includes('whatsapp')) return '💬';
    return '🌐';
}

function channelColor(ch: string) {
    if (ch?.toLowerCase().includes('telegram')) return 'bg-sky-50 text-sky-700 border-sky-200';
    if (ch?.toLowerCase().includes('whatsapp')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-600 border-slate-200';
}

function getMessageTypeBadge(msgType: string) {
    if (!msgType || msgType === 'text') return null;

    const badges: Record<string, { text: string; color: string; icon: string }> = {
        'proactive_nudge': { text: 'Proactive', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: '💬' },
        'proactive_nudge_failed': { text: 'Proactive (Failed)', color: 'bg-red-50 text-red-700 border-red-200', icon: '❌' },
        'daily_horoscope': { text: 'Horoscope', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: '🔮' },
        'daily_horoscope_failed': { text: 'Horoscope (Failed)', color: 'bg-red-50 text-red-700 border-red-200', icon: '❌' },
    };

    const badge = badges[msgType];
    if (!badge) return null;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.color}`}>
            {badge.icon} {badge.text}
        </span>
    );
}

function getDeliveryStatusBadge(metadata?: Message['metadata']) {
    if (!metadata?.delivery_status) return null;

    if (metadata.delivery_status === 'success') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                ✓ Delivered
            </span>
        );
    }

    if (metadata.delivery_status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 border border-red-200" title={metadata.error}>
                ✗ Failed: {metadata.error || 'Unknown error'}
            </span>
        );
    }

    return null;
}

// Paid/Unpaid badge component
function getPaidUnpaidBadge(subscriptionStatus?: 'active' | 'expired' | 'cancelled' | 'trial' | 'pending') {
    if (!subscriptionStatus) return null;

    if (subscriptionStatus === 'active') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
                💎 Paid
            </span>
        );
    }

    return null;
}

function fmtDuration(ms: number) {
    if (ms < 60000) return '<1m';
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d ${hrs % 24}h`;
}

/* ──────── Stop words for topic extraction ──────── */
const STOP_WORDS = new Set([
    'hi', 'hello', 'hey', 'ok', 'okay', 'yes', 'no', 'the', 'a', 'an', 'is',
    'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
    'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
    'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most',
    'other', 'some', 'such', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'because', 'but', 'and', 'or', 'if', 'while', 'that',
    'what', 'which', 'who', 'whom', 'this', 'these', 'those', 'am', 'it',
    'its', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'not', 'nor',
    'up', 'about', 'also', 'get', 'got', 'like', 'make', 'even', 'much',
    'mera', 'meri', 'mere', 'hai', 'hain', 'ho', 'hoga', 'ka', 'ki', 'ke',
    'ko', 'se', 'ne', 'par', 'pe', 'mein', 'ye', 'yeh', 'wo', 'woh', 'kya',
    'kaise', 'kab', 'kaha', 'kaun', 'aur', 'ya', 'ya', 'nahi', 'nhi', 'na',
    'bhi', 'toh', 'to', 'sir', 'ji', 'please', 'thank', 'thanks', 'hii',
    'tell', 'know', 'want', 'batao', 'bataiye', 'bataye', 'haan', 'hmm',
]);

/* ──────── Topic Keywords Mapping ──────── */
const TOPIC_KEYWORDS: Record<string, string[]> = {
    'Shaadi': ['shaadi', 'marriage', 'vivah', 'wedding', 'bride', 'groom', 'larki', 'larka', 'rishta', 'matchmaking', 'partner', 'spouse', 'life partner', 'bihari', 'marriage bureau'],
    'Career': ['career', 'job', 'naukri', 'business', 'kamai', 'salary', 'income', 'profession', 'work', 'office', 'employment', 'promotion', 'interview', 'resume'],
    'Love': ['love', 'pyar', 'relationship', 'breakup', 'crush', 'girlfriend', 'boyfriend', 'gf', 'bf', 'ex', 'dating', 'affair'],
    'Health': ['health', 'health', 'disease', 'bimari', 'treatment', 'medicine', 'doctor', 'hospital', 'illness', 'symptom', 'fitness', 'diet'],
    'Education': ['education', 'study', 'padhai', 'school', 'college', 'university', 'exam', 'result', 'degree', 'course', 'learning', 'student'],
    'Finance': ['money', 'paisa', 'finance', 'investment', 'sip', 'stock', 'share', 'mutual fund', 'saving', 'loan', 'emi', 'bank'],
    'Family': ['family', 'ghar', 'parents', 'mother', 'father', 'mummy', 'papa', 'mom', 'dad', 'brother', 'sister', 'beti', 'beta', 'bacche'],
    'Astrology': ['astrology', 'kundali', 'horoscope', 'rashi', 'zodiac', 'chart', 'planets', 'stars', 'prediction', 'kundli', 'bhavishya'],
    'Legal': ['court', 'kacheri', 'case', 'lawyer', 'legal', 'advocate', 'fir', 'police', 'justice', 'judgment'],
    'Property': ['property', 'jameen', 'makkan', 'house', 'flat', 'land', 'real estate', 'rent', 'buy', 'sell'],
};

/* ──────── Extract topics from user messages ──────── */
function extractUserTopics(user: UserDoc): string[] {
    const topicScores: Record<string, number> = {};

    // Collect all user messages
    for (const session of user.sessions) {
        for (const message of session.messages) {
            if (message.role !== 'user') continue;

            const text = message.text.toLowerCase();
            const words = text.replace(/[^a-zA-Z0-9ऀ-ॿ\s]/g, '').split(/\s+/);

            // Score each topic based on keyword matches
            for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
                for (const keyword of keywords) {
                    if (text.includes(keyword.toLowerCase())) {
                        topicScores[topic] = (topicScores[topic] || 0) + 1;
                    }
                }
            }
        }
    }

    // Return top 3 topics sorted by score
    return Object.entries(topicScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([topic]) => topic);
}

/* ──────── Topic badge colors ──────── */
function getTopicBadgeColor(topic: string): string {
    const colors: Record<string, string> = {
        'Shaadi': 'bg-pink-50 text-pink-700 border-pink-200',
        'Career': 'bg-blue-50 text-blue-700 border-blue-200',
        'Love': 'bg-red-50 text-red-700 border-red-200',
        'Health': 'bg-green-50 text-green-700 border-green-200',
        'Education': 'bg-indigo-50 text-indigo-700 border-indigo-200',
        'Finance': 'bg-amber-50 text-amber-700 border-amber-200',
        'Family': 'bg-purple-50 text-purple-700 border-purple-200',
        'Astrology': 'bg-violet-50 text-violet-700 border-violet-200',
        'Legal': 'bg-slate-50 text-slate-700 border-slate-200',
        'Property': 'bg-orange-50 text-orange-700 border-orange-200',
    };
    return colors[topic] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function getTopicIcon(topic: string): string {
    const icons: Record<string, string> = {
        'Shaadi': '💍',
        'Career': '💼',
        'Love': '❤️',
        'Health': '🏥',
        'Education': '📚',
        'Finance': '💰',
        'Family': '👨‍👩‍👧‍👦',
        'Astrology': '🔮',
        'Legal': '⚖️',
        'Property': '🏠',
    };
    return icons[topic] || '📌';
}

/* ──────── Main Page ──────── */
function ChatLogsContent() {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // search / filter state
    const [search, setSearch] = useState('');
    const [channelFilter, setChannelFilter] = useState<string>('all');
    const [timeFilter, setTimeFilter] = useState<string>('all');
    const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'paid' | 'free'>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // selection state
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // analytics panel toggle
    const [showAnalytics, setShowAnalytics] = useState(true);

    // fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // resizing state
    const [topHeight, setTopHeight] = useState<number | null>(null);
    const [isResizing, setIsResizing] = useState(false);
    const topSectionRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isUserScrollingRef = useRef(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [newMsgCount, setNewMsgCount] = useState(0);

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (!isResizing) return;
        const newHeight = e.clientY; // Relative to viewport top
        if (newHeight > 150 && newHeight < window.innerHeight * 0.7) {
            setTopHeight(newHeight);
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    // deleting state
    const [deleting, setDeleting] = useState(false);

    // friendship scores state
    const [friendshipScores, setFriendshipScores] = useState<Map<string, FriendshipPositioning>>(new Map());
    const [calculatingFriendship, setCalculatingFriendship] = useState(false);
    const [friendshipProgress, setFriendshipProgress] = useState<{current: number; total: number; userId: string} | null>(null);

    // Auto-analysis state (real-time with DeepSeek)
    const [autoAnalysisRunning, setAutoAnalysisRunning] = useState(false);
    const [autoAnalysisProgress, setAutoAnalysisProgress] = useState<{analyzed: number; total: number} | null>(null);
    const autoAnalysisTriggered = useRef(false);

    // Friendship detail dialog state
    const [showFriendshipDialog, setShowFriendshipDialog] = useState(false);

    // Topics statistics dialog state
    const [showTopicsDialog, setShowTopicsDialog] = useState(false);

    // subscriptions state for paid/unpaid tags
    const [subscriptions, setSubscriptions] = useState<Map<string, 'active' | 'expired' | 'cancelled' | 'trial' | 'pending'>>(new Map());
    const [subscriptionsNormalized, setSubscriptionsNormalized] = useState<Map<string, 'active' | 'expired' | 'cancelled' | 'trial' | 'pending'>>(new Map());
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
    const [subscriptionsError, setSubscriptionsError] = useState<string | null>(null);
    const subscriptionsFetchInProgress = useRef(false);

    // Helper to get subscription status with phone number normalization
    const getSubscriptionStatus = useCallback((userId: string) => {
        if (!userId) return undefined;

        // Try exact match first
        let status = subscriptions.get(userId);
        if (status) return status;

        // Try normalized match (for phone numbers)
        const normalized = normalizePhoneNumber(userId);
        status = subscriptionsNormalized.get(normalized);
        if (status) return status;

        // Try with common prefixes (country code removal)
        if (normalized.startsWith('91') && normalized.length > 10) {
            status = subscriptionsNormalized.get(normalized.substring(2));
            if (status) return status;
        }

        // Try adding country code if it might be missing
        if (normalized.length === 10 && !normalized.startsWith('91')) {
            status = subscriptionsNormalized.get('91' + normalized);
            if (status) return status;
        }

        return undefined;
    }, [subscriptions, subscriptionsNormalized]);

    // Toggle fullscreen with URL sync
    const toggleFullscreen = useCallback(() => {
        const next = !isFullscreen;
        setIsFullscreen(next);
        
        // Update URL to sync with AppShell/Sidebar
        const url = new URL(window.location.href);
        if (next) {
            url.searchParams.set('fullscreen', 'true');
        } else {
            url.searchParams.delete('fullscreen');
        }
        window.history.pushState({}, '', url.toString());
    }, [isFullscreen]);

    // Fetch subscriptions for paid/unpaid status
    const fetchSubscriptions = useCallback(async () => {
        // Prevent concurrent fetches
        if (subscriptionsFetchInProgress.current) {
            console.log('[Subscriptions] Fetch already in progress, skipping');
            return;
        }

        subscriptionsFetchInProgress.current = true;
        setLoadingSubscriptions(true);
        setSubscriptionsError(null);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch('/api/subscriptions?limit=1000', {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Validate response structure
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid response format');
            }

            const subsMap = new Map<string, 'active' | 'expired' | 'cancelled' | 'trial' | 'pending'>();
            const subsNormalizedMap = new Map<string, 'active' | 'expired' | 'cancelled' | 'trial' | 'pending'>();

            // Safely iterate over subscriptions
            const subscriptionsArray = Array.isArray(data.subscriptions) ? data.subscriptions : [];

            for (const sub of subscriptionsArray) {
                if (!sub || typeof sub !== 'object') continue;

                // Handle both direct userId and nested user.userId
                const userId = sub.userId || sub.user?.userId;
                const status = sub.status?.toLowerCase()?.trim();

                // Validate status
                const validStatuses = ['active', 'expired', 'cancelled', 'trial', 'pending'];
                if (userId && status && validStatuses.includes(status)) {
                    const statusTyped = status as 'active' | 'expired' | 'cancelled' | 'trial' | 'pending';
                    // Store exact match
                    subsMap.set(String(userId), statusTyped);
                    // Store normalized for phone number matching
                    subsNormalizedMap.set(normalizePhoneNumber(String(userId)), statusTyped);
                }
            }

            console.log('[Subscriptions] Loaded:', subsMap.size, 'subscriptions');
            setSubscriptions(subsMap);
            setSubscriptionsNormalized(subsNormalizedMap);

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('[Subscriptions] Fetch failed:', errorMsg);
            setSubscriptionsError(errorMsg);
            // Don't clear existing subscriptions on error - keep stale data
        } finally {
            setLoadingSubscriptions(false);
            subscriptionsFetchInProgress.current = false;
        }
    }, []);

    // Re-fetch helper
    const refetchData = useCallback((showLoading = true) => {
        if (showLoading) setLoading(true);

        // Build query parameters
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        fetch(`/api/chat-logs/messages?${params.toString()}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then((d: ApiResponse) => {
                setData(d);
                setLastRefreshed(new Date());
                if (showLoading) setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Failed to fetch');
                if (showLoading) setLoading(false);
            });
    }, [startDate, endDate]);

    // Cache topics for each user
    const userTopics = useMemo(() => {
        if (!data) return new Map<string, string[]>();
        const topicsMap = new Map<string, string[]>();
        for (const user of data.users) {
            const topics = extractUserTopics(user);
            if (topics.length > 0) {
                topicsMap.set(user.userId, topics);
            }
        }
        return topicsMap;
    }, [data]);

    // Compute trending topics across all users with frequencies
    const trendingTopics = useMemo(() => {
        if (!data) return [];
        const topicFreq: Record<string, { count: number; users: Set<string> }> = {};

        for (const user of data.users) {
            for (const session of user.sessions) {
                for (const message of session.messages) {
                    if (message.role !== 'user') continue;

                    const text = message.text.toLowerCase();

                    // Score each topic based on keyword matches
                    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
                        for (const keyword of keywords) {
                            if (text.includes(keyword.toLowerCase())) {
                                if (!topicFreq[topic]) {
                                    topicFreq[topic] = { count: 0, users: new Set() };
                                }
                                topicFreq[topic].count++;
                                topicFreq[topic].users.add(user.userId);
                                break; // Count each topic once per message
                            }
                        }
                    }
                }
            }
        }

        // Convert to array and sort by frequency
        return Object.entries(topicFreq)
            .map(([topic, data]) => ({
                topic,
                frequency: data.count,
                uniqueUsers: data.users.size
            }))
            .sort((a, b) => b.frequency - a.frequency);
    }, [data]);

    // Selection derivations
    const selectedUser = useMemo(() => {
        if (!data || !selectedUserId) return null;
        const user = data.users.find(u => u.userId === selectedUserId) || null;
        if (!user) return null;

        // Apply date filter to selected user's messages - use UTC dates
        const start = startDate ? createDateFromYYYYMMDD(startDate) : null;
        const end = endDate ? createDateFromYYYYMMDD(endDate) : null;
        return filterMessagesByDateRange(user, start, end);
    }, [data, selectedUserId, startDate, endDate]);

    const selectedSession = useMemo(() => {
        if (!selectedUser || !selectedSessionId) return null;
        return selectedUser.sessions.find(s => s.sessionId === selectedSessionId) || selectedUser.sessions[0] || null;
    }, [selectedUser, selectedSessionId]);

    // Delete a specific user
    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm(`Are you sure you want to delete ALL records for "${userId}"?\n\nThis cannot be undone.`)) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/chat-logs/messages/${encodeURIComponent(userId)}`, { method: 'DELETE' });
            const json = await res.json();
            if (res.ok) {
                setSelectedUserId(null);
                setSelectedSessionId(null);
                refetchData();
            } else {
                alert(`Error: ${json.error || 'Failed to delete'}`);
            }
        } catch (err) {
            alert(`Network error: ${err}`);
        }
        setDeleting(false);
    };

    // Delete all records
    const handleDeleteAll = async () => {
        if (!window.confirm('⚠️ DELETE ALL RECORDS?\n\nThis will permanently delete ALL user conversations and debug logs.\n\nThis CANNOT be undone!')) return;
        if (!window.confirm('Are you REALLY sure? Type OK to confirm.')) return;
        setDeleting(true);
        try {
            const res = await fetch('/api/chat-logs/messages?confirm=yes', { method: 'DELETE' });
            const json = await res.json();
            if (res.ok) {
                setSelectedUserId(null);
                setSelectedSessionId(null);
                refetchData();
            } else {
                alert(`Error: ${json.error || 'Failed to delete'}`);
            }
        } catch (err) {
            alert(`Network error: ${err}`);
        }
        setDeleting(false);
    };

    // Calculate friendship scores for latest 10 users (most recent activity)
    const handleCalculateFriendshipScores = async () => {
        if (!data || calculatingFriendship) return;

        // Limit to 3 most recent users for quick analysis
        const MAX_USERS_TO_ANALYZE = 3;
        const usersToAnalyze = filteredUsers.slice(0, MAX_USERS_TO_ANALYZE);
        const userCount = usersToAnalyze.length;

        if (userCount === 0) {
            alert('No users to analyze');
            return;
        }

        const estimatedTime = Math.ceil((userCount * 5) / 60); // ~5 seconds per user with rate limiting
        const timeText = estimatedTime < 1 ? '< 1 minute' : `~${estimatedTime} minute${estimatedTime > 1 ? 's' : ''}`;
        if (!window.confirm(`Calculate friendship scores for the ${userCount} most recent users?\n\nThis will take approximately ${timeText}.`)) {
            return;
        }

        setCalculatingFriendship(true);
        setFriendshipProgress({ current: 0, total: userCount, userId: 'Starting...' });

        try {
            const params = new URLSearchParams();
            params.append('limit', userCount.toString());
            if (channelFilter !== 'all') {
                params.append('channel', channelFilter);
            }

            const response = await fetch(`/api/chat-logs/friendship/batch?${params.toString()}`, {
                method: 'POST'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to calculate friendship scores');
            }

            const result = await response.json();

            // Convert results array to Map
            const scoresMap = new Map<string, FriendshipPositioning>();
            for (const item of result.results) {
                scoresMap.set(item.userId, item.score);
            }

            setFriendshipScores(scoresMap);

            // Show summary
            alert(`✅ Friendship scores calculated!\n\nAnalyzed: ${result.analyzed} users\nSkipped: ${result.skipped} users (not enough messages)\n\nAverage Score: ${result.statistics.average}/10\nHigh (7+): ${result.statistics.high}\nMedium (5-7): ${result.statistics.medium}\nLow (<5): ${result.statistics.low}`);

        } catch (error) {
            console.error('Friendship batch calculation error:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to calculate friendship scores'}`);
        } finally {
            setCalculatingFriendship(false);
            setFriendshipProgress(null);
        }
    };

    // Calculate friendship score for a single user
    const handleCalculateSingleFriendship = async (userId: string) => {
        if (calculatingFriendship) return;

        setCalculatingFriendship(true);

        try {
            console.log('[Friendship Single] Requesting score for userId:', userId);
            const url = `/api/chat-logs/friendship/single?userId=${encodeURIComponent(userId)}`;
            console.log('[Friendship Single] URL:', url);

            const response = await fetch(url, {
                method: 'POST'
            });

            console.log('[Friendship Single] Response status:', response.status);
            console.log('[Friendship Single] Response ok:', response.ok);

            // Get raw text first to debug
            const text = await response.text();
            console.log('[Friendship Single] Response (first 200 chars):', text.substring(0, 200));

            if (!response.ok) {
                let error;
                try {
                    error = JSON.parse(text);
                } catch {
                    error = { error: text.substring(0, 200) };
                }
                throw new Error(error.error || 'Failed to calculate friendship score');
            }

            const result = JSON.parse(text);

            // Update scores map
            setFriendshipScores(prev => new Map(prev).set(userId, result.score));

        } catch (error) {
            console.error('Friendship single calculation error:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to calculate friendship score'}`);
        } finally {
            setCalculatingFriendship(false);
        }
    };

    // Get friendship score color
    const getFriendshipColor = (score: number) => {
        if (score >= 7) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 5) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    // Get friendship icon
    const getFriendshipIcon = (score: number) => {
        if (score >= 7) return '🤝';
        if (score >= 5) return '👋';
        return '❄️';
    };

    // fetch data
    useEffect(() => {
        refetchData();
        fetchSubscriptions(); // Fetch subscriptions for paid/unpaid tags
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [startDate, endDate]); // Only re-run when date filters change

    // Separate effect for auto-refresh to avoid dependency issues
    useEffect(() => {
        // Auto-refresh chat logs every 15 seconds
        const interval = setInterval(() => {
            refetchData(false); // background refresh for chat logs
        }, 15000);

        // Refresh subscriptions every 5 minutes (less frequent as they change less often)
        const subscriptionsInterval = setInterval(() => {
            fetchSubscriptions();
        }, 300000);

        return () => {
            clearInterval(interval);
            clearInterval(subscriptionsInterval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run once on mount, intervals handle refreshes

    // Auto-trigger friendship analysis when data loads (real-time with DeepSeek)
    useEffect(() => {
        if (!data || data.users.length === 0) return;
        if (autoAnalysisTriggered.current) return; // Only trigger once per page load
        if (friendshipScores.size > 0) return; // Already have scores
        if (calculatingFriendship || autoAnalysisRunning) return; // Already running

        autoAnalysisTriggered.current = true;

        const runAutoAnalysis = async () => {
            setAutoAnalysisRunning(true);
            try {
                console.log('[Auto Analysis] Starting real-time friendship analysis with DeepSeek...');
                const skipIds = Array.from(friendshipScores.keys());
                const params = new URLSearchParams();
                params.append('limit', '10');
                if (skipIds.length > 0) {
                    params.append('skip', skipIds.join(','));
                }

                const response = await fetch(`/api/chat-logs/friendship/auto?${params.toString()}`, {
                    method: 'POST'
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.results && result.results.length > 0) {
                        const newScores = new Map(friendshipScores);
                        for (const item of result.results) {
                            newScores.set(item.userId, item.score);
                        }
                        setFriendshipScores(newScores);
                        setAutoAnalysisProgress({ analyzed: result.analyzed, total: result.total });
                        console.log(`[Auto Analysis] Complete! ${result.analyzed} scores calculated (${result.fromMetadata} from metadata, ${result.fromAI} from AI)`);
                    }
                } else {
                    console.error('[Auto Analysis] Failed:', response.status);
                }
            } catch (error) {
                console.error('[Auto Analysis] Error:', error);
            } finally {
                setAutoAnalysisRunning(false);
            }
        };

        // Delay slightly to not block initial render
        const timer = setTimeout(runAutoAnalysis, 2000);
        return () => clearTimeout(timer);
    }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync fullscreen state with URL on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('fullscreen') === 'true') {
            setIsFullscreen(true);
        }
    }, []);

    // Handle ESC key to exit fullscreen
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                toggleFullscreen();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isFullscreen, toggleFullscreen]);

    // Auto-scroll to bottom (latest messages) when session or messages change
   // Scroll handler — detects if user has scrolled up
const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const scrolledUp = distFromBottom > 80;
    isUserScrollingRef.current = scrolledUp;
    setShowScrollBtn(scrolledUp);
    if (!scrolledUp) setNewMsgCount(0);
}, []);

// Auto-scroll to bottom (latest messages) when session or messages change
useEffect(() => {
    if (!selectedSession) return;
    if (isUserScrollingRef.current) {
        // User upar hai — sirf badge count badhao
        setNewMsgCount(prev => prev + 1);
    } else {
        // User neeche hai — auto scroll karo
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setNewMsgCount(0);
    }
}, [selectedSession?.messages.length]);

// Jab naya session select ho tab hamesha bottom pe le jao
useEffect(() => {
    if (selectedSession) {
        isUserScrollingRef.current = false;
        setShowScrollBtn(false);
        setNewMsgCount(0);
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    }
}, [selectedSession?.sessionId]);

    // compute unique channels
    const channels = useMemo(() => {
        if (!data) return [];
        const set = new Set<string>();
        data.users.forEach(u => u.sessions.forEach(s => set.add(s.channel)));
        return Array.from(set);
    }, [data]);

    // Calculate paid/unpaid counts
    const paidUnpaidStats = useMemo(() => {
        if (!data) return { paid: 0, unpaid: 0 };
        const paid = data.users.filter(u => getSubscriptionStatus(u.userId) === 'active').length;
        const unpaid = data.users.length - paid;
        return { paid, unpaid };
    }, [data, getSubscriptionStatus]);

    // filtered users (sorted by most recent activity)
    const filteredUsers = useMemo(() => {
        if (!data) return [];
        let users = data.users;

        // date range filter - use UTC dates
        const start = startDate ? createDateFromYYYYMMDD(startDate) : null;
        const end = endDate ? createDateFromYYYYMMDD(endDate) : null;
        if (start || end) {
            users = users.filter(u => isUserActiveInDateRange(u, start, end));
        }

        // time filter
        if (timeFilter !== 'all') {
            users = users.filter(u => isUserActiveInPeriod(u, timeFilter));
        }

        // channel filter
        if (channelFilter !== 'all') {
            users = users.filter(u =>
                u.sessions.some(s => s.channel === channelFilter)
            );
        }

        // subscription filter (paid/free)
        if (subscriptionFilter !== 'all') {
            users = users.filter(u => {
                const status = getSubscriptionStatus(u.userId);
                if (subscriptionFilter === 'paid') return status === 'active';
                if (subscriptionFilter === 'free') return status !== 'active';
                return true;
            });
        }

        // search filter
        if (search.trim()) {
            const q = search.toLowerCase().trim();
            users = users.filter(u => {
                if (u.userId.toLowerCase().includes(q)) return true;
                return u.sessions.some(s => {
                    if (s.sessionId.toLowerCase().includes(q)) return true;
                    return s.messages.some(m => m.text.toLowerCase().includes(q));
                });
            });
        }

        // Sort by most recent activity (last message time)
        users = users.sort((a, b) => {
            const timeA = new Date(latestActivity(a)).getTime();
            const timeB = new Date(latestActivity(b)).getTime();
            return timeB - timeA; // Most recent first
        });

        return users;
    }, [data, search, channelFilter, timeFilter, subscriptionFilter, getSubscriptionStatus, startDate, endDate]);

    // Calculate filtered paid/unpaid counts (based on current filter)
    const filteredPaidUnpaidStats = useMemo(() => {
        if (!data) return { paid: 0, unpaid: 0 };
        const paid = filteredUsers.filter(u => getSubscriptionStatus(u.userId) === 'active').length;
        const unpaid = filteredUsers.length - paid;
        return { paid, unpaid };
    }, [filteredUsers, getSubscriptionStatus]);

    // total messages for a user
    function totalMessages(u: UserDoc) {
        return u.sessions.reduce((acc, s) => acc + s.messages.length, 0);
    }

    // Calculate average engagement time for a user
    function calculateAvgEngagementTime(u: UserDoc): number {
        let totalDuration = 0;
        let validSessions = 0;

        u.sessions.forEach(s => {
            const start = new Date(s.startTime).getTime();
            const end = new Date(s.lastMessageTime).getTime();
            if (!isNaN(start) && !isNaN(end) && end > start) {
                totalDuration += (end - start);
                validSessions++;
            }
        });

        return validSessions > 0 ? totalDuration / validSessions : 0;
    }

    // latest message time for user (excludes automated messages like proactive_nudge, daily_horoscope)
    function latestActivity(u: UserDoc): string {
        let latest = '';
        u.sessions.forEach(s => {
            s.messages.forEach(m => {
                // Skip automated system messages for activity calculation
                if (m.messageType === 'proactive_nudge' ||
                    m.messageType === 'daily_horoscope' ||
                    m.messageType === 'proactive_nudge_failed' ||
                    m.messageType === 'daily_horoscope_failed') {
                    return;
                }
                if (m.timestamp > latest) latest = m.timestamp;
            });
        });
        return latest;
    }

    // check if user is currently active (within last 5 minutes)
    function isUserActive(u: UserDoc) {
        const lastMsg = latestActivity(u);
        if (!lastMsg) return false;
        const diff = Date.now() - new Date(lastMsg).getTime();
        return diff < 5 * 60 * 1000; // 5 minutes
    }
    // Helper function to create a UTC date from YYYY-MM-DD string
    function createDateFromYYYYMMDD(dateStr: string): Date {
        // Parse YYYY-MM-DD as UTC midnight
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return new Date(dateStr);

        const [, year, month, day] = match;
        // Create date in UTC (month is 0-indexed in JS)
        return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0, 0));
    }

    // check if user was active within the selected date range (checks ANY message in range)
    function isUserActiveInDateRange(u: UserDoc, start: Date | null, end: Date | null): boolean {
        // Create end of day for end date
        const endOfDay = end ? new Date(end) : null;
        if (endOfDay) {
            endOfDay.setUTCHours(23, 59, 59, 999);
        }

        // Check if user has ANY messages within the date range
        for (const session of u.sessions) {
            for (const message of session.messages) {
                const msgTime = new Date(message.timestamp);

                // Check if this message falls within the date range
                if (start && msgTime < start) {
                    continue; // Before start date
                }
                if (endOfDay && msgTime > endOfDay) {
                    continue; // After end date
                }

                // If we get here, this message is in range
                return true;
            }
        }

        return false;
    }

    // Filter messages/sessions by date range
    function filterMessagesByDateRange(u: UserDoc, start: Date | null, end: Date | null): UserDoc {
        if (!start && !end) return u;

        const filteredSessions: Session[] = [];
        const endOfDay = end ? new Date(end) : null;
        if (endOfDay) {
            endOfDay.setUTCHours(23, 59, 59, 999);
        }

        for (const session of u.sessions) {
            const filteredMessages: Message[] = [];

            for (const message of session.messages) {
                const msgTime = new Date(message.timestamp);

                // Check if this message falls within the date range
                if (start && msgTime < start) continue; // Before start date
                if (endOfDay && msgTime > endOfDay) continue; // After end date

                filteredMessages.push(message);
            }

            // Only include session if it has messages in range
            if (filteredMessages.length > 0) {
                filteredSessions.push({
                    ...session,
                    messages: filteredMessages
                });
            }
        }

        return {
            ...u,
            sessions: filteredSessions
        };
    }


    // check if user is active within a specific time period
    function isUserActiveInPeriod(u: UserDoc, period: string): boolean {
        const lastMsg = latestActivity(u);
        if (!lastMsg) return false;
        const diff = Date.now() - new Date(lastMsg).getTime();

        const timeMap: Record<string, number> = {
            '1h': 1 * 60 * 60 * 1000,
            '2h': 2 * 60 * 60 * 1000,
            '4h': 4 * 60 * 60 * 1000,
            '6h': 6 * 60 * 60 * 1000,
            '12h': 12 * 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000,
            'all': Infinity,
        };

        const maxDiff = timeMap[period] || Infinity;
        return diff < maxDiff;
    }

    /* ──────── Analytics Computations ──────── */
    const analytics = useMemo(() => {
        if (!data || !data.users.length) return null;

        const users = data.users;
        const allSessions = users.flatMap(u => u.sessions);
        const allMessages = allSessions.flatMap(s => s.messages);
        const userMessages = allMessages.filter(m => m.role === 'user');

        // Total counts
        const totalUsers = users.length;
        const totalSessions = allSessions.length;
        const totalMsgs = allMessages.length;

        // Active users (within selected date range or last 5 minutes) - use UTC dates
        const dateRangeStart = startDate ? createDateFromYYYYMMDD(startDate) : null;
        const dateRangeEnd = endDate ? createDateFromYYYYMMDD(endDate) : null;
        const activeUsersCount = (startDate || endDate)
    ? users.filter(u => isUserActiveInDateRange(u, dateRangeStart, dateRangeEnd)).length
    : users.filter(u => isUserActive(u)).length;
        
        // Average session duration
        let totalDurationMs = 0;
        let validDurationCount = 0;
        allSessions.forEach(s => {
            const start = new Date(s.startTime).getTime();
            const end = new Date(s.lastMessageTime).getTime();
            if (!isNaN(start) && !isNaN(end) && end > start) {
                totalDurationMs += (end - start);
                validDurationCount++;
            }
        });
        const avgDurationMs = validDurationCount > 0 ? totalDurationMs / validDurationCount : 0;

        // Channel breakdown
        const channelMap: Record<string, number> = {};
        allSessions.forEach(s => {
            const ch = s.channel || 'unknown';
            channelMap[ch] = (channelMap[ch] || 0) + 1;
        });
        const channelBreakdown = Object.entries(channelMap)
            .sort((a, b) => b[1] - a[1]);
        const channelTotal = channelBreakdown.reduce((a, [, c]) => a + c, 0);

        // Top active users (by message count)
        const topUsers = users
            .map(u => ({
                userId: u.userId,
                msgCount: u.sessions.reduce((a, s) => a + s.messages.length, 0),
                sessionCount: u.sessions.length,
                channel: u.sessions[0]?.channel || 'unknown',
            }))
            .sort((a, b) => b.msgCount - a.msgCount)
            .slice(0, 5);

        // Common topics: extract keywords from user messages
        const wordFreq: Record<string, number> = {};
        userMessages.forEach(m => {
            const words = m.text
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\u0900-\u097F\s]/g, '')
                .split(/\s+/)
                .filter(w => w.length > 2 && !STOP_WORDS.has(w));
            words.forEach(w => {
                wordFreq[w] = (wordFreq[w] || 0) + 1;
            });
        });
        const topTopics = Object.entries(wordFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15);

        return {
            totalUsers,
            activeUsersCount,
            totalSessions,
            totalMsgs,
            avgDurationMs,
            channelBreakdown,
            channelTotal,
            topUsers,
            topTopics,
        };
    }, [data, isUserActive, isUserActiveInPeriod, totalMessages, calculateAvgEngagementTime]);

    /* ──────── Render ──────── */
    return (
        <>
        <div className={`h-screen flex flex-col overflow-x-auto overflow-y-hidden ${isFullscreen ? 'bg-slate-900' : ''}`}>
            <div 
                ref={topSectionRef}
                style={(!isFullscreen && topHeight) ? { height: `${topHeight}px`, overflow: 'hidden' } : {}}
                className="shrink-0 flex flex-col"
            >
                {/* ── Header ── */}
                {!isFullscreen && (
                <div className="shrink-0 p-4 md:p-6 pb-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Chat Logs</h1>
                            <p className="text-slate-500 text-sm mt-0.5">
                                {data && analytics ? (
                                    <>
                                        {timeFilter === 'all' ? (
                                            <>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                    </span>
                                                    <span className="font-semibold text-green-600">{analytics.activeUsersCount} active</span>
                                                </span>
                                                <span className="mx-2">·</span>
                                                <span>{data.count} total users</span>
                                                <span className="mx-2">·</span>
                                                <span className="inline-flex items-center gap-1 text-emerald-600">
                                                    💎 {paidUnpaidStats.paid} paid
                                                </span>
                                                <span className="mx-2">·</span>
                                                <span className="inline-flex items-center gap-1 text-slate-500">
                                                    🆓 {paidUnpaidStats.unpaid} free
                                                </span>
                                                <span className="mx-2">·</span>
                                                <span>{data.users.reduce((a, u) => a + totalMessages(u), 0)} messages</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                                                    </span>
                                                    <span className="font-semibold text-indigo-600">
                                                        {filteredUsers.length} users
                                                        {timeFilter !== 'all' && (
                                                            <span className="text-indigo-400 font-normal"> active in </span>
                                                        )}
                                                        {timeFilter !== 'all' && (
                                                            <span className="font-bold">{timeFilter}</span>
                                                        )}
                                                        {subscriptionFilter !== 'all' && (
                                                            <span className="text-purple-400 font-normal"> · {subscriptionFilter === 'paid' ? '💎 Paid' : '🆓 Free'}</span>
                                                        )}
                                                    </span>
                                                </span>
                                                <span className="mx-2">·</span>
                                                <span className="text-slate-400">{data.count} total</span>
                                                {subscriptionFilter !== 'all' && (
                                                    <>
                                                        <span className="mx-2">·</span>
                                                        <span className={`inline-flex items-center gap-1 ${subscriptionFilter === 'paid' ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                            {subscriptionFilter === 'paid' ? '💎' : '🆓'} {filteredUsers.length} {subscriptionFilter === 'paid' ? 'paid' : 'free'}
                                                        </span>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                ) : 'Loading…'}
                                {data && (
                                    <span className="ml-2 text-[10px] text-slate-400 font-medium">
                                        Last refetched: {lastRefreshed.toLocaleTimeString()}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Search + Filters */}
                        <div className="flex items-center gap-3 flex-wrap overflow-x-auto pb-2">
                            {/* Date Range Filter */}
                            <div className="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 p-1.5">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                                />
                                <span className="text-slate-400 text-xs">to</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                                />
                                {(startDate || endDate) && (
                                    <button
                                        onClick={() => {
                                            setStartDate('');
                                            setEndDate('');
                                        }}
                                        className="px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                                        title="Clear date filter"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            {/* Analytics Toggle */}
                            {data && analytics && (
                                <button
                                    id="analytics-toggle-btn"
                                    onClick={() => setShowAnalytics(!showAnalytics)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all shadow-sm ${showAnalytics
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                                        }`}
                                    title={showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Analytics
                                </button>
                            )}

                            {/* Conversation Analytics Link */}
                            <Link
                                href="/conversation-analytics"
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-sm font-medium transition-all shadow-sm"
                                title="View detailed AI-powered conversation analytics"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                                AI Analytics
                            </Link>

                            {/* Calculate Friendship Scores Button - Compact */}
                            <button
                                onClick={handleCalculateFriendshipScores}
                                disabled={calculatingFriendship || !data}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all shrink-0 ${
                                    calculatingFriendship
                                        ? 'bg-pink-50 border-pink-200 text-pink-600'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-pink-200 hover:text-pink-600'
                                }`}
                                title="Calculate friendship scores for all users"
                            >
                                {calculatingFriendship ? (
                                    <>
                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {friendshipProgress ? `${friendshipProgress.current}/${friendshipProgress.total}` : '...'}
                                    </>
                                ) : (
                                    <>
                                        <span>🤝</span>
                                        <span className="hidden sm:inline">Scores</span>
                                    </>
                                )}
                            </button>

                            {/* Search */}
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    id="chat-logs-search"
                                    type="text"
                                    placeholder="Search user ID, session, or text…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-64 transition-all shadow-sm"
                                />
                            </div>

                            {/* Channel filter */}
                            <select
                                id="channel-filter"
                                value={channelFilter}
                                onChange={e => setChannelFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-sm cursor-pointer"
                            >
                                <option value="all">All Channels</option>
                                {channels.map(ch => (
                                    <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>
                                ))}
                            </select>

                            {/* Subscription filter (Paid/Free) */}
                            <select
                                id="subscription-filter"
                                value={subscriptionFilter}
                                onChange={e => setSubscriptionFilter(e.target.value as 'all' | 'paid' | 'free')}
                                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 shadow-sm cursor-pointer"
                            >
                                <option value="all">💎 All Users</option>
                                <option value="paid">💎 Paid Only</option>
                                <option value="free">🆓 Free Only</option>
                            </select>

                            {/* Time filter */}
                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl border border-slate-200 p-1">
                                {[
                                    { label: '1h', value: '1h', title: 'Last 1 hour' },
                                    { label: '2h', value: '2h', title: 'Last 2 hours' },
                                    { label: '4h', value: '4h', title: 'Last 4 hours' },
                                    { label: '6h', value: '6h', title: 'Last 6 hours' },
                                    { label: '12h', value: '12h', title: 'Last 12 hours' },
                                    { label: '24h', value: '24h', title: 'Last 24 hours' },
                                    { label: '7d', value: '7d', title: 'Last 7 days' },
                                    { label: '30d', value: '30d', title: 'Last 30 days' },
                                    { label: 'All', value: 'all', title: 'All time' },
                                ].map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setTimeFilter(filter.value)}
                                        title={`${filter.title}: ${data ? data.users.filter(u => isUserActiveInPeriod(u, filter.value)).length : 0} users active`}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            timeFilter === filter.value
                                                ? 'bg-white text-indigo-600 shadow-sm border border-slate-200'
                                                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                        }`}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            {/* Refresh */}
                            <button
                                id="refresh-btn"
                                onClick={() => refetchData()}
                                className={`p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm ${loading ? 'animate-pulse' : ''}`}
                                title="Refresh"
                                disabled={loading}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            {/* Delete All */}
                            {data && data.users.length > 0 && (
                                <button
                                    id="delete-all-btn"
                                    onClick={handleDeleteAll}
                                    disabled={deleting}
                                    className="p-2.5 rounded-xl border border-red-200 bg-white text-red-400 hover:text-red-600 hover:border-red-400 hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
                                    title="Delete All Records"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                )}

                {/* ── Analytics Panel (Scrollable & Compact) ── */}
                {!isFullscreen && showAnalytics && analytics && !loading && !error && (
                    <div className="shrink-0 px-4 md:px-6 pb-4 max-h-[30vh] md:max-h-[35vh] overflow-y-auto custom-scrollbar border-b border-slate-100 mb-2">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-3">
                            {/* Active Users (NEW) */}
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-3 text-white shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base relative">🟢</span>
                                    <span className="text-[10px] font-semibold text-green-100 uppercase tracking-tight">Active Now</span>
                                </div>
                                <p className="text-2xl font-bold">{analytics.activeUsersCount}</p>
                                <p className="text-[9px] text-green-100 mt-0.5">Last 5 minutes</p>
                            </div>

                            {/* Total Users */}
                            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 text-white shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">👥</span>
                                    <span className="text-[10px] font-semibold text-indigo-100 uppercase tracking-tight">Total Users</span>
                                </div>
                                <p className="text-xl font-bold">{analytics.totalUsers}</p>
                            </div>

                            {/* Paid Users */}
                            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-3 text-white shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base relative">💎</span>
                                    <span className="text-[10px] font-semibold text-violet-100 uppercase tracking-tight">Paid Users</span>
                                </div>
                                <p className="text-xl font-bold">{paidUnpaidStats.paid}</p>
                                <p className="text-[9px] text-violet-100 mt-0.5">Active subscribers</p>
                            </div>

                            {/* Free Users */}
                            <div className="bg-gradient-to-br from-slate-400 to-slate-500 rounded-xl p-3 text-white shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base relative">🆓</span>
                                    <span className="text-[10px] font-semibold text-slate-100 uppercase tracking-tight">Free Users</span>
                                </div>
                                <p className="text-xl font-bold">{paidUnpaidStats.unpaid}</p>
                                <p className="text-[9px] text-slate-100 mt-0.5">Unpaid</p>
                            </div>

                            {/* Friendship Score */}
                            {(() => {
                                const scores = Array.from(friendshipScores.values());
                                const avgScore = scores.length > 0
                                    ? scores.reduce((sum, s) => sum + s.overall, 0) / scores.length
                                    : 0;
                                const highScores = scores.filter(s => s.overall >= 7).length;
                                const mediumScores = scores.filter(s => s.overall >= 5 && s.overall < 7).length;
                                const lowScores = scores.filter(s => s.overall < 5).length;

                                // Get common improvements
                                const allImprovements = scores.flatMap(s => s.improvements || []);
                                const improvementCounts = allImprovements.reduce((acc, imp) => {
                                    acc[imp] = (acc[imp] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>);
                                const topImprovements = Object.entries(improvementCounts)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 2)
                                    .map(([imp]) => imp);

                                const hasScores = scores.length > 0;

                                return (
                                    <div className={`rounded-xl p-3 shadow-sm relative overflow-hidden cursor-pointer transition-all hover:scale-105 ${
                                        hasScores
                                            ? (avgScore >= 7 ? 'bg-gradient-to-br from-pink-500 to-rose-600 text-white' :
                                               avgScore >= 5 ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white' :
                                               'bg-gradient-to-br from-red-500 to-rose-700 text-white')
                                            : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 border border-slate-300'
                                    }`} onClick={() => {
                                        if (!hasScores) {
                                            handleCalculateFriendshipScores();
                                        } else {
                                            setShowFriendshipDialog(true);
                                        }
                                    }}>
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base relative">🤝</span>
                                            <span className={`text-[10px] font-semibold uppercase tracking-tight ${hasScores ? 'text-white/90' : 'text-slate-600'}`}>Friendship</span>
                                        </div>
                                        <p className={`text-xl font-bold ${hasScores ? '' : 'text-slate-700'}`}>
                                            {hasScores ? avgScore.toFixed(1) : 'Tap'}/10
                                        </p>
                                        <p className={`text-[9px] mt-0.5 ${hasScores ? 'text-white/80' : 'text-slate-500'}`}>
                                            {hasScores ? `${scores.length} scored` : 'Latest 10 users'}
                                        </p>
                                        {hasScores && (
                                            <div className="mt-1.5 flex gap-1">
                                                <span className="text-[8px] px-1 rounded bg-emerald-500/50">{highScores}🟢</span>
                                                <span className="text-[8px] px-1 rounded bg-amber-500/50">{mediumScores}🟡</span>
                                                <span className="text-[8px] px-1 rounded bg-red-500/50">{lowScores}🔴</span>
                                            </div>
                                        )}
                                        {!hasScores && !autoAnalysisRunning && (
                                            <div className="mt-1.5 text-[8px] font-medium text-pink-600 flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Analyze latest 10
                                            </div>
                                        )}
                                        {autoAnalysisRunning && !hasScores && (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                                <span className="text-[8px] text-slate-500 font-medium">DeepSeek analyzing...</span>
                                            </div>
                                        )}
                                        {hasScores && (
                                            <div className="mt-1 text-[7px] text-white/70 flex items-center gap-1">
                                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                                Click for details
                                            </div>
                                        )}
                                        {hasScores && topImprovements.length > 0 && (
                                            <div className="mt-1.5 text-[7px] text-white/90 leading-tight">
                                                💡 {topImprovements[0]}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Total Sessions */}
                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-3 text-white shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">🔄</span>
                                    <span className="text-[10px] font-semibold text-purple-100 uppercase tracking-tight">Sessions</span>
                                </div>
                                <p className="text-xl font-bold">{analytics.totalSessions}</p>
                            </div>

                            {/* Total Messages */}
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-3 text-white shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">💬</span>
                                    <span className="text-[10px] font-semibold text-emerald-100 uppercase tracking-tight">Msgs</span>
                                </div>
                                <p className="text-xl font-bold">{analytics.totalMsgs}</p>
                            </div>

                            {/* Avg Session Duration */}
                            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-3 text-white shadow-sm">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">⏱️</span>
                                    <span className="text-[10px] font-semibold text-amber-100 uppercase tracking-tight">Avg Time</span>
                                </div>
                                <p className="text-xl font-bold">{fmtDuration(analytics.avgDurationMs)}</p>
                            </div>

                            {/* Channel Breakdown */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Channels</span>
                                </div>
                                <div className="space-y-1.5">
                                    {analytics.channelBreakdown.map(([ch, count]) => (
                                        <div key={ch}>
                                            <div className="flex items-center justify-between text-[10px] mb-0.5">
                                                <span className="font-medium text-slate-700">{channelIcon(ch)} {ch}</span>
                                                <span className="text-slate-500">{count}</span>
                                            </div>
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${ch.toLowerCase().includes('whatsapp') ? 'bg-emerald-500' :
                                                        ch.toLowerCase().includes('telegram') ? 'bg-sky-500' : 'bg-slate-400'
                                                        }`}
                                                    style={{ width: `${(count / analytics.channelTotal) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Bottom row: Top Users + Common Topics + Friendship Insights + Time Activity */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            {/* Top Active Users */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Active Users</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {analytics.topUsers.slice(0, 3).map((u, i) => (
                                        <div key={u.userId} className="flex items-center gap-2 text-[11px]">
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                                            <p className="font-semibold text-slate-800 truncate flex-1">{u.userId}</p>
                                            <span className={`text-[9px] px-1 py-0 rounded border ${channelColor(u.channel)}`}>{channelIcon(u.channel)}</span>
                                            <p className="font-bold text-slate-700 shrink-0">{u.msgCount} <span className="font-normal text-slate-400">msgs</span></p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Trending Topics */}
                            <div
                                onClick={() => setShowTopicsDialog(true)}
                                className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">📊 Trending Topics</span>
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <div className="space-y-1.5">
                                    {trendingTopics.length > 0 ? (
                                        trendingTopics.slice(0, 4).map((item, i) => (
                                            <div key={item.topic} className="flex items-center gap-2 text-[10px]">
                                                <span className="text-lg">{getTopicIcon(item.topic)}</span>
                                                <span className="font-medium text-slate-700 flex-1">{item.topic}</span>
                                                <span className="text-slate-400 font-medium">×{item.frequency}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-400">No topics detected</p>
                                    )}
                                </div>
                            </div>

                            {/* Friendship Insights */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">🤝 Friendship Issues</span>
                                    {!calculatingFriendship && friendshipScores.size === 0 && (
                                        <button
                                            onClick={handleCalculateFriendshipScores}
                                            className="text-[9px] font-medium text-pink-600 hover:text-pink-700 flex items-center gap-1"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Calculate
                                        </button>
                                    )}
                                </div>
                                {friendshipScores.size > 0 ? (() => {
                                    const scores = Array.from(friendshipScores.values());
                                    const allImprovements = scores.flatMap(s => s.improvements || []);
                                    const improvementCounts = allImprovements.reduce((acc, imp) => {
                                        acc[imp] = (acc[imp] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>);
                                    const topImprovements = Object.entries(improvementCounts)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 4);

                                    // Also show top strengths
                                    const allStrengths = scores.flatMap(s => s.strengths || []);
                                    const strengthCounts = allStrengths.reduce((acc, str) => {
                                        acc[str] = (acc[str] || 0) + 1;
                                        return acc;
                                    }, {} as Record<string, number>);
                                    const topStrengths = Object.entries(strengthCounts)
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 2);

                                    return (
                                        <div className="space-y-2">
                                            {topImprovements.length > 0 && (
                                                <div>
                                                    <p className="text-[9px] font-semibold text-amber-700 mb-1">💡 Common Issues</p>
                                                    <div className="space-y-1">
                                                        {topImprovements.map(([issue, count], i) => (
                                                            <div key={i} className="flex items-center gap-1 text-[9px]">
                                                                <span className="text-amber-500">⚠️</span>
                                                                <span className="text-slate-600 truncate flex-1" title={issue}>{issue}</span>
                                                                <span className="text-slate-400 font-medium">×{count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {topStrengths.length > 0 && (
                                                <div className="pt-1.5 border-t border-slate-100">
                                                    <p className="text-[9px] font-semibold text-emerald-700 mb-1">✓ Strengths</p>
                                                    <div className="space-y-1">
                                                        {topStrengths.map(([strength, count], i) => (
                                                            <div key={i} className="flex items-center gap-1 text-[9px]">
                                                                <span className="text-emerald-500">✓</span>
                                                                <span className="text-slate-600 truncate flex-1" title={strength}>{strength}</span>
                                                                <span className="text-slate-400 font-medium">×{count}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })() : calculatingFriendship ? (
                                    <div className="text-center py-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-3 w-3 text-pink-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            <p className="text-[10px] text-slate-500">Analyzing conversations...</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-3">
                                        <p className="text-[10px] text-slate-400 mb-1">No scores calculated yet</p>
                                        <p className="text-[9px] text-slate-300">Click "Calculate" to analyze latest 10 users' friendship quality</p>
                                    </div>
                                )}
                            </div>

                            {/* Activity by Time Period */}
                            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Activity</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                        { label: 'Last 1h', value: '1h' },
                                        { label: 'Last 2h', value: '2h' },
                                        { label: 'Last 4h', value: '4h' },
                                        { label: 'Last 6h', value: '6h' },
                                        { label: 'Last 12h', value: '12h' },
                                        { label: 'Last 24h', value: '24h' },
                                        { label: 'Last 7d', value: '7d' },
                                        { label: 'Last 30d', value: '30d' },
                                    ].map((period) => {
                                        const count = data ? data.users.filter(u => isUserActiveInPeriod(u, period.value)).length : 0;
                                        const isActive = timeFilter === period.value;
                                        return (
                                            <button
                                                key={period.value}
                                                onClick={() => setTimeFilter(period.value)}
                                                className={`text-left p-2 rounded-lg transition-all ${isActive ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}
                                            >
                                                <p className={`text-[10px] font-medium uppercase ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{period.label}</p>
                                                <p className={`text-lg font-bold ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>{count}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Draggable Divider ── */}
            {!isFullscreen && (
                <div 
                    onMouseDown={startResizing}
                    className={`h-1.5 w-full cursor-row-resize bg-slate-100 hover:bg-indigo-300 transition-colors flex items-center justify-center group relative z-30 ${isResizing ? 'bg-indigo-400' : ''}`}
                >
                    <div className="w-12 h-1 bg-slate-300 group-hover:bg-indigo-100 rounded-full" />
                </div>
            )}

            {/* ── Body ── */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-slate-500">Loading conversations…</p>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Connection Error</h3>
                        <p className="text-sm text-slate-500 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`flex-1 flex overflow-hidden ${isFullscreen ? '' : 'mx-4 md:mx-6 mb-4 md:mb-6'} gap-4 min-w-[900px]`}>
                    {/* ── Left Panel: User List ── */}
                    <div className={cn(
                        selectedUser ? 'hidden md:flex' : 'flex',
                        "flex-col w-full md:w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300",
                        isFullscreen && "rounded-none border-t-0 border-b-0 border-l-0"
                    )}>
                        <div className="p-4 border-b border-slate-100">
                            <h2 className="text-sm font-semibold text-slate-700">
                                Users
                                <span className="ml-2 text-xs font-normal text-slate-400">({filteredUsers.length})</span>
                            </h2>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredUsers.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-sm text-slate-400">No users found</p>
                                    {subscriptionFilter !== 'all' && (
                                        <p className="text-xs text-slate-400 mt-1">
                                            Try changing the subscription filter
                                        </p>
                                    )}
                                </div>
                            ) : (
                                filteredUsers.map(user => {
                                    const active = isUserActive(user);
                                    const friendshipScore = friendshipScores.get(user.userId);
                                    const subscriptionStatus = getSubscriptionStatus(user.userId);
                                    return (
                                        <button
                                            key={user._id}
                                            onClick={() => {
                                                setSelectedUserId(user.userId);
                                                setSelectedSessionId(user.sessions[0]?.sessionId || null);
                                            }}
                                            className={`w-full text-left p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${selectedUser?._id === user._id ? 'bg-indigo-50/70 border-l-2 border-l-indigo-500' : ''
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {/* Live indicator */}
                                                        {active && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="relative flex h-2.5 w-2.5">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                                                </span>
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                                    LIVE
                                                                </span>
                                                            </div>
                                                        )}
                                                        <p className="text-sm font-semibold text-slate-800 truncate">{user.userId}</p>
                                                        {getPaidUnpaidBadge(subscriptionStatus)}
                                                    </div>
                                                    {/* Topic Tags */}
                                                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                        {(() => {
                                                            const topics = userTopics.get(user.userId);
                                                            if (topics && topics.length > 0) {
                                                                return topics.slice(0, 3).map(topic => (
                                                                    <span
                                                                        key={topic}
                                                                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getTopicBadgeColor(topic)}`}
                                                                    >
                                                                        {getTopicIcon(topic)} {topic}
                                                                    </span>
                                                                ));
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        {/* Channel badge */}
                                                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${channelColor(user.sessions[0]?.channel)}`}>
                                                            {channelIcon(user.sessions[0]?.channel)} {user.sessions[0]?.channel}
                                                        </span>

                                                        {/* Friendship Score Badge */}
                                                        {friendshipScore ? (
                                                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${getFriendshipColor(friendshipScore.overall)}`}>
                                                                {getFriendshipIcon(friendshipScore.overall)} {friendshipScore.overall.toFixed(1)}
                                                            </span>
                                                        ) : calculatingFriendship ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400">
                                                                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                                </svg>
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-[11px] font-medium ${active ? 'text-green-600' : 'text-slate-400'}`}>{fmtRelative(latestActivity(user))}</p>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <p className="text-[11px] text-slate-400">{totalMessages(user)} msgs</p>
                                                        <span className="text-slate-300">·</span>
                                                        <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                                                            ⏱️ {fmtDuration(calculateAvgEngagementTime(user))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* ── Right Panel: Session + Messages ── */}
                    {selectedUser ? (
                        <div className={cn(
                            "flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-300",
                            isFullscreen && "rounded-none border-0 bg-slate-900"
                        )}>
                            {/* Session header */}
                            <div className="shrink-0 p-3 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {/* Back button (mobile) */}
                                        <button
                                            onClick={() => { setSelectedUserId(null); setSelectedSessionId(null); }}
                                            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h2 className="text-sm font-bold text-slate-800">{selectedUser.userId}</h2>
                                                {getPaidUnpaidBadge(getSubscriptionStatus(selectedUser.userId))}
                                                {/* Friendship Score Badge (Inline) */}
                                                {(() => {
                                                    const friendshipScore = friendshipScores.get(selectedUser.userId);
                                                    if (friendshipScore) {
                                                        return (
                                                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                                                                friendshipScore.overall >= 7 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                                                                friendshipScore.overall >= 5 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                                                                'text-red-600 bg-red-50 border-red-200'
                                                            }`}>
                                                                🤝 {friendshipScore.overall.toFixed(1)}
                                                            </span>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            {/* User Topics in Detail View */}
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {(() => {
                                                    const topics = userTopics.get(selectedUser.userId);
                                                    if (topics && topics.length > 0) {
                                                        return topics.slice(0, 5).map(topic => (
                                                            <span
                                                                key={topic}
                                                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getTopicBadgeColor(topic)}`}
                                                            >
                                                                {getTopicIcon(topic)} {topic}
                                                            </span>
                                                        ));
                                                    }
                                                    return (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                            No topics detected
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                <p className="text-[10px] text-slate-400">
                                                    {selectedUser.sessions.length} session{selectedUser.sessions.length !== 1 ? 's' : ''} · {totalMessages(selectedUser)} msgs
                                                </p>
                                                {/* Calculate Score Button (Inline) */}
                                                {(!friendshipScores.has(selectedUser.userId) && !calculatingFriendship) && (
                                                    <button
                                                        onClick={() => handleCalculateSingleFriendship(selectedUser.userId)}
                                                        className="text-[10px] text-pink-600 hover:text-pink-700 font-medium flex items-center gap-1"
                                                    >
                                                        ⚡ Calculate Score
                                                    </button>
                                                )}
                                                {calculatingFriendship && !friendshipScores.has(selectedUser.userId) && (
                                                    <span className="text-[10px] text-pink-500 flex items-center gap-1">
                                                        <svg className="animate-spin h-2 w-2" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                        </svg>
                                                        Analyzing...
                                                    </span>
                                                )}
                                                {/* Refresh Score Button (Inline) */}
                                                {friendshipScores.has(selectedUser.userId) && !calculatingFriendship && (
                                                    <button
                                                        onClick={() => handleCalculateSingleFriendship(selectedUser.userId)}
                                                        className="text-[10px] text-slate-400 hover:text-pink-600 flex items-center gap-1"
                                                        title="Refresh score"
                                                    >
                                                        ↻
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Session tabs */}
                                    {selectedUser.sessions.length > 1 && (
                                        <div className="hidden md:flex items-center gap-1">
                                            {selectedUser.sessions.map((s, i) => (
                                                <button
                                                    key={s.sessionId}
                                                    onClick={() => setSelectedSessionId(s.sessionId)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedSession?.sessionId === s.sessionId
                                                        ? 'bg-indigo-100 text-indigo-700'
                                                        : 'text-slate-500 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    Session {i + 1}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1">
                                        {/* Fullscreen Toggle */}
                                        <button
                                            onClick={toggleFullscreen}
                                            className={`p-2 rounded-lg transition-all ${isFullscreen
                                                ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                                                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                                                }`}
                                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                        >
                                            {isFullscreen ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                </svg>
                                            )}
                                        </button>

                                        {/* Delete User button */}
                                        <button
                                            onClick={() => handleDeleteUser(selectedUser.userId)}
                                            disabled={deleting}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
                                            title={`Delete all records for ${selectedUser.userId}`}
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
                                        </button>
                                    </div>
                                </div>

                                {/* Session info bar */}
                                {selectedSession && (
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400">
                                        <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${channelColor(selectedSession.channel)}`}>
                                            {channelIcon(selectedSession.channel)} {selectedSession.channel}
                                        </span>
                                        <span>Started: {fmtTime(selectedSession.startTime)}</span>
                                        <span>·</span>
                                        <span>Last: {fmtTime(latestActivity(selectedUser) || selectedSession.lastMessageTime)}</span>
                                        <span>·</span>
                                        <span>{selectedSession.messages.length} messages</span>
                                    </div>
                                )}

                                {/* Compact Friendship Score Details (Collapsible) */}
                                {selectedUserId && friendshipScores.has(selectedUserId) && (() => {
                                    const score = friendshipScores.get(selectedUserId);
                                    if (!score) return null;
                                    return (
                                        <div className="mt-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
                                            <details className="group">
                                                <summary className="flex items-center justify-between cursor-pointer list-none">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm">🤝</span>
                                                        <span className="text-[11px] font-medium text-slate-700">
                                                            Friendship: <span className={`font-bold ${
                                                                score.overall >= 7 ? 'text-emerald-600' : score.overall >= 5 ? 'text-amber-600' : 'text-red-600'
                                                            }`}>{score.overall.toFixed(1)}/10</span>
                                                        </span>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                            score.overall >= 7 ? 'bg-emerald-100 text-emerald-700' :
                                                            score.overall >= 5 ? 'bg-amber-100 text-amber-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                            {score.overall >= 7 ? 'Excellent' : score.overall >= 5 ? 'Good' : 'Needs Work'}
                                                        </span>
                                                    </div>
                                                    <svg className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </summary>
                                                <div className="mt-2 pt-2 border-t border-slate-200">
                                                    {/* Metrics Grid */}
                                                    <div className="grid grid-cols-5 gap-1.5 mb-2">
                                                        {[
                                                            { key: 'empathy', label: 'Empathy', value: score.empathy },
                                                            { key: 'personalization', label: 'Personal', value: score.personalization },
                                                            { key: 'warmth', label: 'Warmth', value: score.warmth },
                                                            { key: 'supportive_listening', label: 'Listening', value: score.supportive_listening },
                                                            { key: 'rapport', label: 'Rapport', value: score.rapport },
                                                        ].map((metric) => (
                                                            <div key={metric.key} className="text-center bg-white rounded p-1.5 border border-slate-200">
                                                                <p className={`text-xs font-bold ${
                                                                    metric.value >= 7 ? 'text-emerald-600' : metric.value >= 5 ? 'text-amber-600' : 'text-red-600'
                                                                }`}>
                                                                    {metric.value}
                                                                </p>
                                                                <p className="text-[7px] text-slate-500 uppercase">{metric.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Strengths & Improvements */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {score.strengths.length > 0 && (
                                                            <div className="bg-emerald-50 rounded p-1.5 border border-emerald-200">
                                                                <p className="text-[9px] font-medium text-emerald-800 mb-1">✓ Strengths</p>
                                                                <ul className="space-y-0.5">
                                                                    {score.strengths.slice(0, 2).map((strength, i) => (
                                                                        <li key={i} className="text-[9px] text-emerald-700 truncate" title={strength}>• {strength}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                        {score.improvements.length > 0 && (
                                                            <div className="bg-amber-50 rounded p-1.5 border border-amber-200">
                                                                <p className="text-[9px] font-medium text-amber-800 mb-1">💡 Improve</p>
                                                                <ul className="space-y-0.5">
                                                                    {score.improvements.slice(0, 2).map((improvement, i) => (
                                                                        <li key={i} className="text-[9px] text-amber-700 truncate" title={improvement}>• {improvement}</li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </details>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Messages */}
                            <div
                                ref={messagesContainerRef}
                                onScroll={handleScroll}
                                className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 relative ${isFullscreen ? 'bg-slate-900' : 'bg-gradient-to-b from-slate-50/50 to-white'}`}
                                >

                                {selectedSession?.messages.map((msg) => (
                                    <div
                                        key={msg.messageId}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-md'
                                                : isFullscreen
                                                    ? 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-md'
                                                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                                                }`}
                                        >
                                            {/* Message type and delivery badges */}
                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                {/* Role label */}
                                                <span className={`text-[10px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-indigo-200' : isFullscreen ? 'text-slate-400' : 'text-slate-400'
                                                    }`}>
                                                    {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                                                </span>

                                                {/* Friendship Score Badge (for assistant messages only) */}
                                                {msg.role === 'assistant' && msg.metadata?.friendshipScore && (
                                                    <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full border ${
                                                        msg.metadata.friendshipScore.overall >= 7
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : msg.metadata.friendshipScore.overall >= 5
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-red-50 text-red-700 border-red-200'
                                                    }`} title={`Empathy: ${msg.metadata.friendshipScore.empathy} | Warmth: ${msg.metadata.friendshipScore.warmth} | Personalization: ${msg.metadata.friendshipScore.personalization}`}>
                                                        🤝 {msg.metadata.friendshipScore.overall.toFixed(1)}
                                                    </span>
                                                )}

                                                {/* Message type badge */}
                                                {getMessageTypeBadge(msg.messageType || '')}

                                                {/* Delivery status badge */}
                                                {getDeliveryStatusBadge(msg.metadata)}
                                            </div>

                                            {/* Message text */}
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'user' ? 'text-white' : isFullscreen ? 'text-slate-100' : 'text-slate-700'
                                                }`}>
                                                {msg.text.replace(/\\n/g, '\n')}
                                            </p>

                                            {/* Additional metadata details for system messages */}
                                            {msg.metadata && (msg.metadata.topic || msg.metadata.language || msg.metadata.hours_inactive) && (
                                                <div className={`mt-2 pt-2 border-t ${msg.role === 'user' ? 'border-indigo-400/30' : isFullscreen ? 'border-slate-700' : 'border-slate-200'}`}>
                                                    <div className="flex flex-wrap gap-2 text-[10px]">
                                                        {msg.metadata.topic && (
                                                            <span className={`inline-flex items-center gap-1 ${msg.role === 'user' ? 'text-indigo-200' : isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                📌 Topic: {msg.metadata.topic}
                                                            </span>
                                                        )}
                                                        {msg.metadata.language && (
                                                            <span className={`inline-flex items-center gap-1 ${msg.role === 'user' ? 'text-indigo-200' : isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                🌐 {msg.metadata.language === 'hi' ? 'Hindi' : msg.metadata.language === 'en' ? 'English' : msg.metadata.language}
                                                            </span>
                                                        )}
                                                        {msg.metadata.hours_inactive && (
                                                            <span className={`inline-flex items-center gap-1 ${msg.role === 'user' ? 'text-indigo-200' : isFullscreen ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                ⏰ Inactive: {msg.metadata.hours_inactive}h
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Timestamp */}
                                            <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-indigo-300' : isFullscreen ? 'text-slate-500' : 'text-slate-400'
                                                }`}>
                                                {fmtTime(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))}

                                {(!selectedSession || selectedSession.messages.length === 0) && (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-sm text-slate-400">No messages in this session</p>
                                    </div>
                                )}

                                {/* Invisible div for auto-scrolling to bottom */}
                                
                                <div ref={messagesEndRef} />
                                {showScrollBtn && (
                                <button
                                onClick={() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                setNewMsgCount(0);
                                }}
                                className="sticky bottom-4 float-right mr-2 z-10 w-10 h-10 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center hover:scale-110 hover:border-indigo-300 hover:text-indigo-600 transition-all text-slate-500"
                                title="Jump to latest message"
                                >
                                {newMsgCount > 0 && (
                                <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                {newMsgCount > 9 ? '9+' : newMsgCount}
                                </span>
                                )}
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        /* Empty state for right panel */
                        <div className="hidden md:flex flex-1 items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                            <div className="text-center">
                                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-700 mb-1">Select a User</h3>
                                <p className="text-sm text-slate-400">Pick a user from the left to view their conversations</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* ═══ Friendship Detail Dialog ═══ */}
        {showFriendshipDialog && (() => {
            const scores = Array.from(friendshipScores.entries());
            const allScoreValues = scores.map(([, s]) => s.overall);
            const avgScore = allScoreValues.length > 0 ? allScoreValues.reduce((a, b) => a + b, 0) / allScoreValues.length : 0;
            const highCount = allScoreValues.filter(s => s >= 7).length;
            const medCount = allScoreValues.filter(s => s >= 5 && s < 7).length;
            const lowCount = allScoreValues.filter(s => s < 5).length;

            // Aggregate all improvements and strengths across users
            const allImprovements: Record<string, number> = {};
            const allStrengths: Record<string, number> = {};
            scores.forEach(([, s]) => {
                (s.improvements || []).forEach(imp => {
                    const key = imp.substring(0, 120);
                    allImprovements[key] = (allImprovements[key] || 0) + 1;
                });
                (s.strengths || []).forEach(str => {
                    const key = str.substring(0, 120);
                    allStrengths[key] = (allStrengths[key] || 0) + 1;
                });
            });
            const topImprovements = Object.entries(allImprovements).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const topStrengths = Object.entries(allStrengths).sort((a, b) => b[1] - a[1]).slice(0, 8);

            // Sort users by score ascending (worst first)
            const sortedScores = [...scores].sort((a, b) => a[1].overall - b[1].overall);

            // Average sub-scores
            const avgEmpathy = scores.length > 0 ? scores.reduce((s, [, v]) => s + v.empathy, 0) / scores.length : 0;
            const avgWarmth = scores.length > 0 ? scores.reduce((s, [, v]) => s + v.warmth, 0) / scores.length : 0;
            const avgPersonal = scores.length > 0 ? scores.reduce((s, [, v]) => s + v.personalization, 0) / scores.length : 0;
            const avgListening = scores.length > 0 ? scores.reduce((s, [, v]) => s + v.supportive_listening, 0) / scores.length : 0;
            const avgRapport = scores.length > 0 ? scores.reduce((s, [, v]) => s + v.rapport, 0) / scores.length : 0;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowFriendshipDialog(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        {/* Dialog Header */}
                        <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 px-6 py-4 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    🤝 Friendship Score Analysis
                                </h2>
                                <p className="text-sm text-white/80 mt-0.5">
                                    {scores.length} users analyzed • Powered by DeepSeek V4 Flash
                                </p>
                            </div>
                            <button onClick={() => setShowFriendshipDialog(false)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Dialog Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Summary Stats Row */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-pink-600">{avgScore.toFixed(1)}</p>
                                    <p className="text-xs text-pink-500 font-medium mt-1">Average Score /10</p>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-emerald-600">{highCount}</p>
                                    <p className="text-xs text-emerald-500 font-medium mt-1">🟢 Excellent (≥7)</p>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-amber-600">{medCount}</p>
                                    <p className="text-xs text-amber-500 font-medium mt-1">🟡 Good (5-6.9)</p>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-red-600">{lowCount}</p>
                                    <p className="text-xs text-red-500 font-medium mt-1">🔴 Needs Work (&lt;5)</p>
                                </div>
                            </div>

                            {/* Sub-Score Breakdown */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">📊 Average Sub-Scores</h3>
                                <div className="grid grid-cols-5 gap-3">
                                    {[
                                        { label: 'Empathy', value: avgEmpathy, emoji: '💗' },
                                        { label: 'Warmth', value: avgWarmth, emoji: '🔥' },
                                        { label: 'Personal', value: avgPersonal, emoji: '🎯' },
                                        { label: 'Listening', value: avgListening, emoji: '👂' },
                                        { label: 'Rapport', value: avgRapport, emoji: '🤝' },
                                    ].map((metric) => (
                                        <div key={metric.label} className="text-center">
                                            <div className="relative w-full bg-slate-200 rounded-full h-2 mb-2">
                                                <div className={`h-2 rounded-full transition-all duration-500 ${
                                                    metric.value >= 7 ? 'bg-emerald-500' : metric.value >= 5 ? 'bg-amber-500' : 'bg-red-500'
                                                }`} style={{ width: `${(metric.value / 10) * 100}%` }}></div>
                                            </div>
                                            <p className={`text-lg font-bold ${
                                                metric.value >= 7 ? 'text-emerald-600' : metric.value >= 5 ? 'text-amber-600' : 'text-red-600'
                                            }`}>{metric.value.toFixed(1)}</p>
                                            <p className="text-[10px] text-slate-500">{metric.emoji} {metric.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Issues & Improvements + Strengths */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Top Issues / Improvements */}
                                <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                                    <h3 className="text-sm font-bold text-amber-800 mb-3 flex items-center gap-2">
                                        💡 Top Improvements Needed
                                        <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-full">{topImprovements.length} issues</span>
                                    </h3>
                                    {topImprovements.length > 0 ? (
                                        <ul className="space-y-2">
                                            {topImprovements.map(([text, count], i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-amber-200 text-amber-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-amber-900 leading-relaxed">{text}</p>
                                                        <p className="text-[9px] text-amber-600 mt-0.5">Found in {count} user{count > 1 ? 's' : ''}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-amber-600">No specific improvements detected</p>
                                    )}
                                </div>

                                {/* Top Strengths */}
                                <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                                    <h3 className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
                                        ✅ Top Strengths
                                        <span className="text-[9px] bg-emerald-200 text-emerald-700 px-1.5 py-0.5 rounded-full">{topStrengths.length} areas</span>
                                    </h3>
                                    {topStrengths.length > 0 ? (
                                        <ul className="space-y-2">
                                            {topStrengths.map(([text, count], i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-[10px] font-bold flex items-center justify-center mt-0.5">✓</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-emerald-900 leading-relaxed">{text}</p>
                                                        <p className="text-[9px] text-emerald-600 mt-0.5">Found in {count} user{count > 1 ? 's' : ''}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-emerald-600">No specific strengths detected</p>
                                    )}
                                </div>
                            </div>

                            {/* Per-User Score Table */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        👥 Per-User Breakdown
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{sortedScores.length} users</span>
                                    </h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-slate-50">
                                            <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                <th className="text-left px-4 py-2 font-semibold">User</th>
                                                <th className="text-center px-2 py-2 font-semibold">Overall</th>
                                                <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">💗</th>
                                                <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">🔥</th>
                                                <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">🎯</th>
                                                <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">👂</th>
                                                <th className="text-center px-2 py-2 font-semibold hidden md:table-cell">🤝</th>
                                                <th className="text-left px-2 py-2 font-semibold">Key Issue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {sortedScores.map(([userId, score]) => {
                                                const colorClass = score.overall >= 7 ? 'text-emerald-600' : score.overall >= 5 ? 'text-amber-600' : 'text-red-600';
                                                const bgClass = score.overall >= 7 ? 'bg-emerald-50' : score.overall >= 5 ? 'bg-amber-50' : 'bg-red-50';
                                                return (
                                                    <tr key={userId} className={`hover:${bgClass} transition-colors cursor-pointer group`} onClick={() => {
                                                        setShowFriendshipDialog(false);
                                                        setSelectedUserId(userId);
                                                    }}>
                                                        <td className="px-4 py-2.5">
                                                            <p className="text-xs font-medium text-slate-700 group-hover:text-indigo-600 truncate max-w-[180px]" title={userId}>{userId}</p>
                                                        </td>
                                                        <td className="text-center px-2 py-2.5">
                                                            <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${bgClass} ${colorClass}`}>
                                                                {score.overall.toFixed(1)}
                                                            </span>
                                                        </td>
                                                        <td className={`text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell ${score.empathy >= 7 ? 'text-emerald-600' : score.empathy >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score.empathy}</td>
                                                        <td className={`text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell ${score.warmth >= 7 ? 'text-emerald-600' : score.warmth >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score.warmth}</td>
                                                        <td className={`text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell ${score.personalization >= 7 ? 'text-emerald-600' : score.personalization >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score.personalization}</td>
                                                        <td className={`text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell ${score.supportive_listening >= 7 ? 'text-emerald-600' : score.supportive_listening >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score.supportive_listening}</td>
                                                        <td className={`text-center px-2 py-2.5 text-xs font-medium hidden md:table-cell ${score.rapport >= 7 ? 'text-emerald-600' : score.rapport >= 5 ? 'text-amber-600' : 'text-red-600'}`}>{score.rapport}</td>
                                                        <td className="px-2 py-2.5">
                                                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]" title={score.improvements?.[0] || 'None'}>
                                                                {score.improvements?.[0] || '—'}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </div>

                        {/* Dialog Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <p className="text-[10px] text-slate-400">Analysis by DeepSeek V4 Flash • Scores cached for 24h</p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => {
                                    setShowFriendshipDialog(false);
                                    handleCalculateFriendshipScores();
                                }} className="px-3 py-1.5 text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors">
                                    ↻ Re-analyze All
                                </button>
                                <button onClick={() => setShowFriendshipDialog(false)} className="px-4 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })()}

        {/* Topics Statistics Dialog */}
        {showTopicsDialog && (() => {
            const totalMentions = trendingTopics.reduce((sum, t) => sum + t.frequency, 0);
            const totalUsers = data?.users.length || 0;
            const avgUsersPerTopic = trendingTopics.length > 0
                ? Math.round(trendingTopics.reduce((sum, t) => sum + t.uniqueUsers, 0) / trendingTopics.length)
                : 0;

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTopicsDialog(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        {/* Dialog Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-200 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-indigo-900">📊 Trending Topics Analytics</h2>
                                <p className="text-xs text-indigo-600 mt-0.5">Most discussed topics across all user conversations</p>
                            </div>
                            <button onClick={() => setShowTopicsDialog(false)} className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Dialog Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">

                            {/* Summary Stats Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-indigo-600">{trendingTopics.length}</p>
                                    <p className="text-xs text-indigo-500 font-medium mt-1">Active Topics</p>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-purple-600">{totalMentions}</p>
                                    <p className="text-xs text-purple-500 font-medium mt-1">Total Mentions</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4 text-center">
                                    <p className="text-3xl font-black text-blue-600">{avgUsersPerTopic}</p>
                                    <p className="text-xs text-blue-500 font-medium mt-1">Avg Users/Topic</p>
                                </div>
                            </div>

                            {/* Topics Table */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        🔥 Topics Breakdown
                                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{trendingTopics.length} topics</span>
                                    </h3>
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    <table className="w-full">
                                        <thead className="sticky top-0 bg-slate-50">
                                            <tr className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                <th className="text-left px-4 py-2 font-semibold">Rank</th>
                                                <th className="text-left px-4 py-2 font-semibold">Topic</th>
                                                <th className="text-center px-2 py-2 font-semibold">Mentions</th>
                                                <th className="text-center px-2 py-2 font-semibold">Users</th>
                                                <th className="text-left px-4 py-2 font-semibold">% Users</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {trendingTopics.map((item, index) => {
                                                const percentage = totalUsers > 0 ? ((item.uniqueUsers / totalUsers) * 100).toFixed(1) : '0.0';
                                                const rankColor = index === 0 ? 'bg-amber-100 text-amber-700' :
                                                    index === 1 ? 'bg-slate-200 text-slate-700' :
                                                    index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-slate-100 text-slate-600';
                                                return (
                                                    <tr key={item.topic} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${rankColor}`}>
                                                                {index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xl">{getTopicIcon(item.topic)}</span>
                                                                <span
                                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getTopicBadgeColor(item.topic)}`}
                                                                >
                                                                    {item.topic}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="text-center px-2 py-3">
                                                            <span className="text-sm font-bold text-slate-700">{item.frequency}</span>
                                                        </td>
                                                        <td className="text-center px-2 py-3">
                                                            <span className="text-sm font-medium text-slate-600">{item.uniqueUsers}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full ${parseFloat(percentage) >= 50 ? 'bg-indigo-500' : parseFloat(percentage) >= 25 ? 'bg-blue-400' : 'bg-slate-300'}`}
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-slate-500">{percentage}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Topic Distribution Visualization */}
                            {trendingTopics.length > 0 && (
                                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-sm font-bold text-slate-700 mb-3">📈 Topic Distribution</h3>
                                    <div className="space-y-2">
                                        {trendingTopics.slice(0, 6).map((item) => {
                                            const barWidth = totalMentions > 0 ? (item.frequency / totalMentions) * 100 : 0;
                                            return (
                                                <div key={item.topic} className="flex items-center gap-3">
                                                    <span className="text-lg w-8 text-center">{getTopicIcon(item.topic)}</span>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between mb-0.5">
                                                            <span className="text-[10px] font-medium text-slate-700">{item.topic}</span>
                                                            <span className="text-[9px] text-slate-500">{item.frequency} mentions ({((item.frequency / totalMentions) * 100).toFixed(1)}%)</span>
                                                        </div>
                                                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${getTopicBadgeColor(item.topic).split(' ')[0]} ${getTopicBadgeColor(item.topic).split(' ')[1]}`}
                                                                style={{ width: `${barWidth}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Dialog Footer */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                            <p className="text-[10px] text-slate-400">Topics extracted from all user conversations</p>
                            <button onClick={() => setShowTopicsDialog(false)} className="px-4 py-1.5 text-xs font-medium bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            );
        })()}
        </>
    );
}

export default function ChatLogsPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                <p className="text-slate-500 font-medium">Loading Chat Logs...</p>
            </div>
        </div>}>
            <ChatLogsContent />
        </Suspense>
    );
}
