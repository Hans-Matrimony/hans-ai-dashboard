'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

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
                    user: 'dashboard-user',
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
        <div className="flex flex-col h-screen bg-slate-950">
            {/* Header */}
            <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm px-4 py-3 md:px-6 md:py-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                        <span className="text-white text-sm font-bold">AS</span>
                    </div>
                    <div>
                        <h2 className="text-white font-semibold">Acharya Sharma</h2>
                        <p className="text-slate-500 text-xs">Vedic Astrologer &middot; Online</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 md:px-6 md:py-6 md:space-y-6">
                {messages.length === 0 && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center max-w-md">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🪷</span>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Namaste!</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                Start a conversation with Acharya Sharma. Ask about your Kundli, career, marriage, or any Jyotish question.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-2 justify-center">
                                {['Meri Kundli dekho', 'Career mein kya hoga?', 'Shaadi kab hogi?', 'Health prediction'].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); inputRef.current?.focus(); }}
                                        className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                        <span className="text-white text-[10px] font-bold">AS</span>
                                    </div>
                                    <span className="text-xs text-slate-500">Acharya Sharma</span>
                                </div>
                            )}
                            <div
                                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-md'
                                    : 'bg-slate-800 text-slate-200 rounded-bl-md border border-slate-700'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.isStreaming && (
                                    <span className="inline-block w-1.5 h-4 bg-indigo-400 animate-pulse ml-0.5 rounded-sm" />
                                )}
                            </div>
                            <p className={`text-[10px] text-slate-600 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                                {formatTime(msg.timestamp)}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm p-3 md:p-4">
                <div className="flex items-end gap-3 max-w-4xl mx-auto">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            rows={1}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
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
                        className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white transition-all duration-200 flex-shrink-0"
                    >
                        {isLoading ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
