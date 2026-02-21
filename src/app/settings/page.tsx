'use client';

import { useState, useEffect } from 'react';

interface ServiceStatus {
    name: string;
    url: string;
    status: 'online' | 'offline' | 'checking' | 'internal';
    envKey: string;
    note?: string;
}

export default function SettingsPage() {
    const [services, setServices] = useState<ServiceStatus[]>([
        {
            name: 'OpenClaw Gateway',
            url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
            status: 'checking',
            envKey: 'NEXT_PUBLIC_API_URL',
        },
        {
            name: 'Mem0 Server',
            url: 'Internal (Docker Network)',
            status: 'internal',
            envKey: 'NEXT_PUBLIC_MEM0_URL',
            note: 'Accessible via Gateway internally',
        },
        {
            name: 'Qdrant',
            url: 'Internal (Docker Network)',
            status: 'internal',
            envKey: 'NEXT_PUBLIC_QDRANT_URL',
            note: 'Connected via Mem0 service',
        },
    ]);

    const [envVars, setEnvVars] = useState([
        { key: 'NEXT_PUBLIC_API_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_MEM0_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_QDRANT_URL', value: 'loading...' },
        { key: 'NEXT_PUBLIC_GATEWAY_TOKEN', value: 'loading...' },
    ]);

    useEffect(() => {
        checkGateway();
        // Set env vars client-side only to avoid hydration mismatch
        const token = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || '';
        setEnvVars([
            { key: 'NEXT_PUBLIC_API_URL', value: process.env.NEXT_PUBLIC_API_URL || 'not set' },
            { key: 'NEXT_PUBLIC_MEM0_URL', value: process.env.NEXT_PUBLIC_MEM0_URL || 'not set' },
            { key: 'NEXT_PUBLIC_QDRANT_URL', value: process.env.NEXT_PUBLIC_QDRANT_URL || 'not set' },
            { key: 'NEXT_PUBLIC_GATEWAY_TOKEN', value: token ? `${token.slice(0, 8)}...${token.slice(-8)}` : 'not set' },
        ]);
    }, []);

    const checkGateway = async () => {
        try {
            const res = await fetch('/api/gateway/v1/responses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.NEXT_PUBLIC_GATEWAY_TOKEN
                        ? { Authorization: `Bearer ${process.env.NEXT_PUBLIC_GATEWAY_TOKEN}` }
                        : {}),
                },
                body: JSON.stringify({ model: 'openclaw', input: '' }),
            });
            setServices((prev) =>
                prev.map((s, i) =>
                    i === 0 ? { ...s, status: (res.status < 500 ? 'online' : 'offline') as any } : s
                )
            );
        } catch {
            try {
                await fetch('/api/gateway/', { method: 'GET' });
                setServices((prev) =>
                    prev.map((s, i) => (i === 0 ? { ...s, status: 'online' as any } : s))
                );
            } catch {
                setServices((prev) =>
                    prev.map((s, i) => (i === 0 ? { ...s, status: 'offline' as any } : s))
                );
            }
        }
    };

    const configItems = [
        { label: 'Agent ID', value: 'astrologer', desc: 'Primary agent for Acharya Sharma' },
        { label: 'Agent Name', value: 'Acharya Sharma', desc: 'Vedic Astrologer persona' },
        { label: 'Heartbeat Interval', value: '4 hours', desc: 'Proactive nudge check interval' },
        { label: 'Heartbeat Target', value: 'WhatsApp', desc: 'Channel for follow-up nudges' },
        { label: 'Active Hours', value: '08:00 – 22:00 IST', desc: 'Quiet hours enforced outside this window' },
        { label: 'Tool Profile', value: 'messaging + exec, read', desc: 'Allowed tool scope for the agent' },
    ];

    const statusColors: Record<string, { dot: string; text: string; label: string }> = {
        online: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Online' },
        offline: { dot: 'bg-red-400', text: 'text-red-400', label: 'Offline' },
        checking: { dot: 'bg-slate-500 animate-pulse', text: 'text-slate-500', label: 'Checking...' },
        internal: { dot: 'bg-blue-400', text: 'text-blue-400', label: 'Internal' },
    };

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-slate-400 text-sm mt-1">System configuration and service status</p>
            </div>

            {/* Service Status */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white">Service Status</h2>
                    <button
                        onClick={checkGateway}
                        className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {services.map((service) => {
                        const colors = statusColors[service.status];
                        return (
                            <div key={service.name} className="flex items-center justify-between px-5 py-4">
                                <div>
                                    <p className="text-sm font-medium text-white">{service.name}</p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">{service.url}</p>
                                    {service.note && (
                                        <p className="text-xs text-slate-600 mt-0.5">{service.note}</p>
                                    )}
                                </div>
                                <span className={`flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
                                    <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
                                    {colors.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                    Mem0 &amp; Qdrant run inside Coolify&apos;s Docker network. They&apos;re accessible by the Gateway internally.
                </p>
            </div>

            {/* Agent Configuration */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Agent Configuration</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {configItems.map((item) => (
                        <div key={item.label} className="flex items-center justify-between px-5 py-3.5">
                            <div>
                                <p className="text-sm text-slate-300">{item.label}</p>
                                <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                            </div>
                            <span className="text-sm text-white font-mono bg-slate-800 px-3 py-1 rounded-md">{item.value}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Environment Variables */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-white mb-4">Environment Variables</h2>
                <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
                    {envVars.map((v) => (
                        <div key={v.key} className="flex items-center justify-between px-5 py-3.5">
                            <span className="text-sm text-slate-400 font-mono">{v.key}</span>
                            <span className="text-sm text-slate-300 font-mono">{v.value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-slate-600 mt-2">
                    Edit these in <code className="text-slate-400">hans-ai-dashboard/.env</code> and restart the dev server.
                </p>
            </div>

            {/* Guardrails Summary */}
            <div>
                <h2 className="text-lg font-semibold text-white mb-4">Active Guardrails</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-white">Input</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>Prompt injection defense</li>
                            <li>Off-topic filtering</li>
                            <li>PII protection</li>
                            <li>Abuse handling</li>
                        </ul>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-white">Output</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>No medical/legal/financial</li>
                            <li>No death predictions</li>
                            <li>No fabricated knowledge</li>
                            <li>No emojis, natural tone</li>
                        </ul>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-sm font-medium text-white">Action</span>
                        </div>
                        <ul className="text-xs text-slate-400 space-y-1">
                            <li>Only Qdrant + Mem0 tools</li>
                            <li>No filesystem access</li>
                            <li>User data isolation</li>
                            <li>exec + read only</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
