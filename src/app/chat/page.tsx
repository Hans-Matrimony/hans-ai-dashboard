'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    isStreaming?: boolean;
}

const API_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || '';

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        inputRef.current?.focus();

        // Generate or retrieve a unique session ID for multitenancy
        let storedId = localStorage.getItem('chat_session_id');
        if (!storedId) {
            storedId = `user-${Math.random().toString(36).substring(2, 11)}-${Date.now().toString(36)}`;
            localStorage.setItem('chat_session_id', storedId);
        }
        setSessionId(storedId);
    }, []);

    const sendMessage = async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: trimmed,
            timestamp: new Date(),
        };

        const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
        };

        setMessages((prev) => [...prev, userMsg, assistantMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('/api/gateway/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
                    'x-openclaw-agent-id': 'astrologer',
                },
                body: JSON.stringify({
                    model: 'openclaw:astrologer',
                    input: trimmed,
                    stream: true,
                    user: sessionId || `user-${Date.now()}`,
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`API Error ${res.status}: ${errText}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            if (reader) {
                let buffer = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);

                                // Handle text delta events
                                if (parsed.type === 'response.output_text.delta' && parsed.delta) {
                                    fullText += parsed.delta;
                                    setMessages((prev) =>
                                        prev.map((m) =>
                                            m.id === assistantMsg.id
                                                ? { ...m, content: fullText }
                                                : m
                                        )
                                    );
                                }

                                // Handle non-streaming completed response
                                if (parsed.type === 'response.completed' && parsed.response?.output) {
                                    for (const item of parsed.response.output) {
                                        if (item.type === 'message' && item.content) {
                                            for (const part of item.content) {
                                                if (part.type === 'output_text' && part.text) {
                                                    fullText = part.text;
                                                    setMessages((prev) =>
                                                        prev.map((m) =>
                                                            m.id === assistantMsg.id
                                                                ? { ...m, content: fullText }
                                                                : m
                                                        )
                                                    );
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch {
                                // skip non-JSON lines
                            }
                        }
                    }
                }
            }

            // Mark streaming as complete
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantMsg.id
                        ? { ...m, isStreaming: false, content: fullText || 'No response received.' }
                        : m
                )
            );
        } catch (err: any) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantMsg.id
                        ? { ...m, isStreaming: false, content: `Error: ${err.message}` }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-screen bg-[#e5ddd5] selection:bg-indigo-100">
            {/* Header */}
            <div className="border-b border-slate-200 bg-[#f0f2f5] px-4 py-3 md:px-6 md:py-3 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                        <span className="text-white text-sm font-bold">AS</span>
                    </div>
                    <div>
                        <h2 className="text-slate-900 font-semibold leading-tight">Acharya Sharma</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-slate-600 text-xs">Vedic Astrologer &middot; Online</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 md:px-6 md:py-6 md:space-y-4">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-md bg-white/60 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-black/5 border border-white/50">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-600/10 flex items-center justify-center mx-auto mb-6">
                                <span className="text-4xl">🪷</span>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Namaste!</h3>
                            <p className="text-slate-600 text-sm leading-relaxed mb-8">
                                Start a conversation with Acharya Sharma. Ask about your Kundli, career, marriage, or any Jyotish question.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {['Meri Kundli dekho', 'Career mein kya hoga?', 'Shaadi kab hogi?', 'Health prediction'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                        className="px-4 py-2 text-xs bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 shadow-sm transition-all text-left"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg) => {
                    const contentParts = msg.role === 'assistant'
                        ? msg.content.split('\n\n').filter(p => p.trim() || msg.isStreaming)
                        : [msg.content];

                    return (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex flex-col gap-1.5",
                                msg.role === 'user' ? 'items-end' : 'items-start'
                            )}
                        >
                            {contentParts.map((part, partIdx) => (
                                <div
                                    key={`${msg.id}-${partIdx}`}
                                    className={`max-w-[85%] md:max-w-[70%] relative ${msg.role === 'user' ? 'ml-12' : 'mr-12'}`}
                                >
                                    <div
                                        className={cn(
                                            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm relative',
                                            msg.role === 'user'
                                                ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none'
                                                : cn(
                                                    'bg-white text-slate-800',
                                                    partIdx === 0 ? 'rounded-tl-none' : ''
                                                )
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap">{part}</p>
                                        {msg.isStreaming && partIdx === contentParts.length - 1 && (
                                            <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm align-middle" />
                                        )}
                                        {partIdx === contentParts.length - 1 && (
                                            <div className="flex items-center justify-end gap-1 mt-1 -mb-0.5 select-none">
                                                <span className="text-[10px] text-slate-500">
                                                    {formatTime(msg.timestamp)}
                                                </span>
                                                {msg.role === 'user' && (
                                                    <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="bg-[#f0f2f5] p-3 md:p-4 border-t border-slate-200">
                <div className="flex items-end gap-3 max-w-5xl mx-auto">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            rows={1}
                            className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all shadow-sm"
                            style={{ maxHeight: '120px' }}
                            onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                            }}
                        />
                    </div>
                    <button
                        onClick={sendMessage}
                        disabled={!input.trim() || isLoading}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-400 text-white transition-all duration-200 flex-shrink-0 shadow-md transform hover:scale-105 active:scale-95"
                    >
                        {isLoading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
