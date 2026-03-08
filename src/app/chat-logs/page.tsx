'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';

/* ──────── Types ──────── */
interface Message {
    messageId: string;
    role: 'user' | 'assistant';
    text: string;
    timestamp: string;
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

interface ApiResponse {
    count: number;
    users: UserDoc[];
}

/* ──────── Helpers ──────── */
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

/* ──────── Main Page ──────── */
export default function ChatLogsPage() {
    const [data, setData] = useState<ApiResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // search / filter state
    const [search, setSearch] = useState('');
    const [channelFilter, setChannelFilter] = useState<string>('all');

    // selection state
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    // analytics panel toggle
    const [showAnalytics, setShowAnalytics] = useState(true);

    // deleting state
    const [deleting, setDeleting] = useState(false);

    // Re-fetch helper
    const refetchData = useCallback((showLoading = true) => {
        if (showLoading) setLoading(true);
        fetch('/api/chat-logs/messages')
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
    }, []);

    // Selection derivations
    const selectedUser = useMemo(() => {
        if (!data || !selectedUserId) return null;
        return data.users.find(u => u.userId === selectedUserId) || null;
    }, [data, selectedUserId]);

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

    // fetch data
    useEffect(() => {
        refetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            refetchData(false); // background refresh
        }, 15000);
        return () => clearInterval(interval);
    }, [refetchData]);

    // compute unique channels
    const channels = useMemo(() => {
        if (!data) return [];
        const set = new Set<string>();
        data.users.forEach(u => u.sessions.forEach(s => set.add(s.channel)));
        return Array.from(set);
    }, [data]);

    // filtered users
    const filteredUsers = useMemo(() => {
        if (!data) return [];
        let users = data.users;

        // channel filter
        if (channelFilter !== 'all') {
            users = users.filter(u =>
                u.sessions.some(s => s.channel === channelFilter)
            );
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

        return users;
    }, [data, search, channelFilter]);

    // total messages for a user
    function totalMessages(u: UserDoc) {
        return u.sessions.reduce((acc, s) => acc + s.messages.length, 0);
    }

    // latest message time for user
    function latestActivity(u: UserDoc) {
        let latest = '';
        u.sessions.forEach(s => {
            if (s.lastMessageTime > latest) latest = s.lastMessageTime;
        });
        return latest;
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
                .replace(/\\n/g, ' ')
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
            totalSessions,
            totalMsgs,
            avgDurationMs,
            channelBreakdown,
            channelTotal,
            topUsers,
            topTopics,
        };
    }, [data]);

    /* ──────── Render ──────── */
    return (
        <div className="h-screen flex flex-col overflow-x-auto overflow-y-hidden">
            {/* ── Header ── */}
            <div className="shrink-0 p-4 md:p-6 pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Chat Logs</h1>
                        <p className="text-slate-500 text-sm mt-0.5">
                            {data ? `${data.count} users · ${data.users.reduce((a, u) => a + totalMessages(u), 0)} messages` : 'Loading…'}
                            {data && (
                                <span className="ml-2 text-[10px] text-slate-400 font-medium">
                                    Last refetched: {lastRefreshed.toLocaleTimeString()}
                                </span>
                            )}
                        </p>
                    </div>

                    {/* Search + Filters */}
                    <div className="flex items-center gap-3 flex-wrap">
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

            {/* ── Analytics Panel (Scrollable & Compact) ── */}
            {showAnalytics && analytics && !loading && !error && (
                <div className="shrink-0 px-4 md:px-6 pb-4 max-h-[30vh] md:max-h-[35vh] overflow-y-auto custom-scrollbar border-b border-slate-100 mb-2">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                        {/* Total Users */}
                        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-3 text-white shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base">👥</span>
                                <span className="text-[10px] font-semibold text-indigo-100 uppercase tracking-tight">Users</span>
                            </div>
                            <p className="text-xl font-bold">{analytics.totalUsers}</p>
                        </div>

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

                    {/* Bottom row: Top Users + Common Topics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Top Active Users */}
                        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Active Users</span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5">
                                {analytics.topUsers.map((u, i) => (
                                    <div key={u.userId} className="flex items-center gap-2 text-[11px]">
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center font-bold shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{i + 1}</span>
                                        <p className="font-semibold text-slate-800 truncate flex-1">{u.userId}</p>
                                        <span className={`text-[9px] px-1 py-0 rounded border ${channelColor(u.channel)}`}>{channelIcon(u.channel)}</span>
                                        <p className="font-bold text-slate-700 shrink-0">{u.msgCount} <span className="font-normal text-slate-400">msgs</span></p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Common Topics */}
                        <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-tight">Topics</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {analytics.topTopics.length > 0 ? (
                                    analytics.topTopics.map(([word, freq], i) => (
                                        <span
                                            key={word}
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium bg-slate-50 text-slate-600 border-slate-100`}
                                        >
                                            {word}
                                            <span className="opacity-50">×{freq}</span>
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-[10px] text-slate-400">No data</p>
                                )}
                            </div>
                        </div>
                    </div>
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
                <div className="flex-1 flex overflow-hidden mx-4 md:mx-6 mb-4 md:mb-6 gap-4 min-w-[900px]">
                    {/* ── Left Panel: User List ── */}
                    <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden`}>
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
                                </div>
                            ) : (
                                filteredUsers.map(user => (
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
                                                <p className="text-sm font-semibold text-slate-800 truncate">{user.userId}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${channelColor(user.sessions[0]?.channel)}`}>
                                                        {channelIcon(user.sessions[0]?.channel)} {user.sessions[0]?.channel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-[11px] text-slate-400">{fmtRelative(latestActivity(user))}</p>
                                                <p className="text-[11px] text-slate-400 mt-1">{totalMessages(user)} msgs</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ── Right Panel: Session + Messages ── */}
                    {selectedUser ? (
                        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Session header */}
                            <div className="shrink-0 p-4 border-b border-slate-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
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
                                            <h2 className="text-sm font-bold text-slate-800">{selectedUser.userId}</h2>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {selectedUser.sessions.length} session{selectedUser.sessions.length !== 1 ? 's' : ''} · {totalMessages(selectedUser)} total messages
                                            </p>
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

                                {/* Session info bar */}
                                {selectedSession && (
                                    <div className="flex items-center gap-4 mt-3 text-[11px] text-slate-400">
                                        <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full border ${channelColor(selectedSession.channel)}`}>
                                            {channelIcon(selectedSession.channel)} {selectedSession.channel}
                                        </span>
                                        <span>Started: {fmtTime(selectedSession.startTime)}</span>
                                        <span>Last: {fmtTime(selectedSession.lastMessageTime)}</span>
                                        <span>{selectedSession.messages.length} messages</span>
                                    </div>
                                )}
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
                                {selectedSession?.messages.map((msg) => (
                                    <div
                                        key={msg.messageId}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-br-md'
                                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
                                                }`}
                                        >
                                            {/* Role label */}
                                            <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                                                }`}>
                                                {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                                            </div>

                                            {/* Message text */}
                                            <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'user' ? 'text-white' : 'text-slate-700'
                                                }`}>
                                                {msg.text.replace(/\\n/g, '\n')}
                                            </p>

                                            {/* Timestamp */}
                                            <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-indigo-300' : 'text-slate-400'
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
    );
}
