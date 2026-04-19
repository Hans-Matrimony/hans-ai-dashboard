'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';

interface VoiceSample {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: 'hi' | 'en';
  voice_id: string;
  description: string;
}

interface Template {
  id: string;
  name: string;
  text: string;
  category: 'enforcement' | 'emotional' | 'greeting' | 'astrology';
}

// Available voices (Edge TTS)
const voices: VoiceSample[] = [
  // Female voices (Meera)
  {
    id: 'meera_hindi_1',
    name: 'Meera - Hindi (Swara)',
    gender: 'female',
    language: 'hi',
    voice_id: 'hi-IN-SwaraNeural',
    description: 'Warm, gentle Hindi voice - Perfect for emotional support'
  },
  {
    id: 'meera_hindi_2',
    name: 'Meera - Hindi (Tara)',
    gender: 'female',
    language: 'hi',
    voice_id: 'hi-IN-TaraNeural',
    description: 'Soft, soothing Hindi voice - Great for sensitive topics'
  },
  {
    id: 'meera_hindi_3',
    name: 'Meera - Hindi (Anjali)',
    gender: 'female',
    language: 'hi',
    voice_id: 'hi-IN-AnjaliNeural',
    description: 'Natural Hindi voice - Professional yet warm'
  },

  // Male voices (Aarav)
  {
    id: 'aarav_hindi_1',
    name: 'Aarav - Hindi (Madhur)',
    gender: 'male',
    language: 'hi',
    voice_id: 'hi-IN-MadhurNeural',
    description: 'Confident, calm Hindi voice - Trustworthy and supportive'
  },
  {
    id: 'aarav_hindi_2',
    name: 'Aarav - Hindi (Ravi)',
    gender: 'male',
    language: 'hi',
    voice_id: 'hi-IN-RaviNeural',
    description: 'Friendly, warm Hindi voice - Approachable and caring'
  },
  {
    id: 'aarav_english_1',
    name: 'Aarav - Indian English (Neeraj)',
    gender: 'male',
    language: 'en',
    voice_id: 'en-IN-NeerajNeural',
    description: 'Deep, confident Indian English - Authoritative yet kind'
  },
];

// Hinglish templates for testing
const templates: Template[] = [
  {
    id: 'enforcement_paywall',
    name: 'Enforcement - Paywall',
    text: 'Namaste! Aapke free message limit ho gaya hai. Premium plan upgrade karo aur baatein continue karo.',
    category: 'enforcement'
  },
  {
    id: 'emotional_support',
    name: 'Emotional - Stress Support',
    text: 'Tension mat lijiye, sab theek ho jayega. Main hoon na, aapke saath hoon.',
    category: 'emotional'
  },
  {
    id: 'greeting_morning',
    name: 'Greeting - Good Morning',
    text: 'Suprabhat! Kaise hain aap? Aaj ka din achha rahega.',
    category: 'greeting'
  },
  {
    id: 'astrology_horoscope',
    name: 'Astrology - Daily Horoscope',
    text: 'Aaj ka din thoda challenging hoga, par sab theek ho jayega. Sabr rakhna.',
    category: 'astrology'
  },
  {
    id: 'enforcement_daily_limit',
    name: 'Enforcement - Daily Limit',
    text: 'Aaj ki limit khatam ho gayi hai. Kal phir baat karenge, theek hai?',
    category: 'enforcement'
  },
  {
    id: 'emotional_encouragement',
    name: 'Emotional - Encouragement',
    text: 'Aap bahut strong ho, ye phase bhi nikal jayega. Sab theek hoga.',
    category: 'emotional'
  }
];

export default function VoiceSamplesPage() {
  const [selectedVoice, setSelectedVoice] = useState<VoiceSample | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioHistory, setAudioHistory] = useState<Array<{voice: VoiceSample; template: Template; url: string; timestamp: number}>>([]);

  // Filter voices by gender
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const filteredVoices = voices.filter(voice =>
    genderFilter === 'all' || voice.gender === genderFilter
  );

  // Generate audio
  const generateAudio = async () => {
    if (!selectedVoice || !selectedTemplate) {
      setError('Please select both a voice and a template');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedAudioUrl(null);

    try {
      const response = await fetch('/api/voice-samples/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice_id: selectedVoice.voice_id,
          text: selectedTemplate.text,
          gender: selectedVoice.gender,
          language: selectedVoice.language,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await response.json();

      if (data.success && data.audio_url) {
        setGeneratedAudioUrl(data.audio_url);

        // Add to history
        const newHistoryItem = {
          voice: selectedVoice,
          template: selectedTemplate,
          url: data.audio_url,
          timestamp: Date.now(),
        };
        setAudioHistory([newHistoryItem, ...audioHistory].slice(0, 10));
      } else {
        throw new Error(data.error || 'Failed to generate audio');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate audio');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Head>
        <title>Voice Samples - Hans AI Dashboard</title>
      </Head>

      <div className="min-h-screen bg-slate-50 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 0111-7m-7 7h11m-7 4a7 7 0 01-7-7m11 0v7m0 0l-4-4m5 5l-4 4m-5 5V4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Voice Samples</h1>
                <p className="text-slate-500 text-sm mt-1">Test different voices for enforcement messages (100% FREE)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Voice Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">1. Select Voice</h2>
            </div>

            {/* Gender Filter */}
            <div className="p-4 border-b border-slate-200">
              <div className="flex gap-2">
                <button
                  onClick={() => setGenderFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    genderFilter === 'all'
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Voices
                </button>
                <button
                  onClick={() => setGenderFilter('female')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    genderFilter === 'female'
                      ? 'bg-pink-100 text-pink-700 border border-pink-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Female (Meera)
                </button>
                <button
                  onClick={() => setGenderFilter('male')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    genderFilter === 'male'
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Male (Aarav)
                </button>
              </div>
            </div>

            {/* Voice List */}
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {filteredVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    selectedVoice?.id === voice.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          voice.gender === 'female'
                            ? 'bg-pink-100 text-pink-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {voice.gender === 'female' ? '♀' : '♂'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          voice.language === 'hi'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {voice.language === 'hi' ? 'HI' : 'EN'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900">{voice.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{voice.description}</p>
                    </div>
                    <div className="ml-2">
                      <svg className={`w-5 h-5 ${
                        selectedVoice?.id === voice.id ? 'text-indigo-600' : 'text-slate-300'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Middle Panel: Template Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">2. Select Message</h2>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-semibold ${
                      template.category === 'enforcement'
                        ? 'bg-red-500'
                        : template.category === 'emotional'
                        ? 'bg-purple-500'
                        : template.category === 'greeting'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}>
                      {template.category === 'enforcement'
                        ? '⚠️'
                        : template.category === 'emotional'
                        ? '💚'
                        : template.category === 'greeting'
                        ? '👋'
                        : '🔮'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-sm">{template.name}</h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.text}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Generate & Preview */}
          <div className="space-y-6">
            {/* Generate Button */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">3. Generate & Preview</h2>

              {!selectedVoice && (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a9 9 0 010 0 9 9 0 010 0 9 9 0 010-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>Select a voice from the left panel</p>
                </div>
              )}

              {selectedVoice && !selectedTemplate && (
                <div className="text-center py-8 text-slate-400">
                  <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Select a message template</p>
                </div>
              )}

              {selectedVoice && selectedTemplate && (
                <div className="space-y-4">
                  {/* Selected Info */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Voice:</span>
                      <span className="text-sm font-semibold text-slate-900">{selectedVoice.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Template:</span>
                      <span className="text-sm font-semibold text-slate-900">{selectedTemplate.name}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">Message text:</p>
                      <p className="text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                        "{selectedTemplate.text}"
                      </p>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={generateAudio}
                    disabled={isGenerating}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all ${
                      isGenerating
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md'
                    }`}
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        Generating...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 0111-7m-7 7h11m-7 4a7 7 0 01-7-7m11 0v7m0 0l-4-4m5 5l-4 4m-5 5V4" />
                        </svg>
                        Generate Audio (FREE)
                      </span>
                    )}
                  </button>

                  {/* Error */}
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-700">❌ {error}</p>
                    </div>
                  )}

                  {/* Audio Player */}
                  {generatedAudioUrl && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3 3M3 21v-8a2 2 0 012 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <span className="text-sm font-semibold text-indigo-900">Audio Generated Successfully!</span>
                      </div>
                      <audio
                        controls
                        src={generatedAudioUrl}
                        className="w-full"
                        style={{ maxHeight: '80px' }}
                      />
                      <p className="text-xs text-indigo-600 mt-2">💡 This is 100% FREE using Edge TTS</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* History */}
            {audioHistory.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Generations</h2>
                <div className="space-y-3">
                  {audioHistory.slice(0, 5).map((item, index) => (
                    <div key={index} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-900">{item.voice.name}</span>
                        <span className="text-xs text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mb-2">"{item.template.text}"</p>
                      <audio controls src={item.url} className="w-full" style={{ maxHeight: '60px' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="max-w-7xl mx-auto mt-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 About Voice Samples</p>
                <p className="text-blue-700">
                  This testing tool uses <strong>Edge TTS (100% FREE)</strong> to generate audio samples.
                  All voices are from Microsoft Edge's neural TTS engine and are completely FREE to use.
                  Select a voice, choose a template, and click "Generate Audio" to hear how enforcement messages will sound.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
