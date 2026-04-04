/**
 * API Route: /api/chat-logs/analytics
 * Fetches conversation analytics with AI-powered insights
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import axios from 'axios';
import {
  analyzeQuality,
  analyzeSentiment,
  detectIssues,
  analyzeTopics,
  analyzeResponseLength,
  analyzeSatisfaction
} from '@/lib/ai-analytics';
import { analyticsCache } from '@/lib/analytics-cache';
import {
  ConversationAnalytics,
  AnalyticsFilters,
  QualityScore,
  SentimentAnalysis,
  IssueDetection,
  ResponseLengthAnalysis,
  SatisfactionSignals
} from '@/lib/analytics-types';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * GET /api/chat-logs/analytics
 * Fetch analytics data (cached or fresh)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filters: AnalyticsFilters = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      channel: (searchParams.get('channel') as any) || undefined,
      user_type: (searchParams.get('user_type') as any) || undefined
    };

    const forceRefresh = searchParams.get('force_refresh') === 'true';

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = analyticsCache.get(filters);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // Fetch fresh data
    const analytics = await fetchAnalytics(filters);
    analyticsCache.set(filters, analytics, true); // Cache as AI analysis

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Fetch analytics from MongoDB and analyze with AI
 */
async function fetchAnalytics(filters: AnalyticsFilters): Promise<ConversationAnalytics> {
  try {
    console.log('[Analytics] Fetching from MongoDB Logger:', MONGO_LOGGER_URL);

    // Fetch conversations from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      params: {
        startDate: filters.start_date,
        endDate: filters.end_date,
        channel: filters.channel,
        limit: 1000 // Get more data for better analysis
      },
      timeout: 30000
    });

    const data = mongoResponse.data;
    console.log('[Analytics] MongoDB response:', JSON.stringify(data).substring(0, 200));

    const users = data.users || [];
    console.log('[Analytics] Total users:', users.length);

    // Extract conversations for analysis
    const conversations = extractConversations(users, filters);
    const allMessages = extractAllMessages(users, filters);
    const individualMessages = extractIndividualMessages(users, filters);

    console.log('[Analytics] Extracted conversations:', conversations.length);
    console.log('[Analytics] Extracted messages:', allMessages.length);
    console.log('[Analytics] Extracted individual messages:', individualMessages.userMessages.length, 'user,', individualMessages.botMessages.length, 'bot');

    if (conversations.length === 0) {
      console.log('[Analytics] No conversations found, returning default data');
      return getDefaultAnalytics();
    }

    // Determine sample rate (10% by default, max 5 conversations for Groq limits)
    const sampleSize = Math.min(5, Math.max(3, Math.floor(conversations.length * 0.1)));
    const sampledConversations = conversations.slice(0, sampleSize);

    console.log('[Analytics] Running AI analysis on', sampleSize, 'conversations');

    // Run AI analyses (in parallel for speed)
    const results = await Promise.all([
      analyzeQuality(sampledConversations.map(c => c.text)).catch(e => {
        console.error('[Analytics] Quality analysis failed:', e.message);
        return getDefaultQualityScore();
      }),
      analyzeSentiment(allMessages).catch(e => {
        console.error('[Analytics] Sentiment analysis failed:', e.message);
        return getDefaultSentimentAnalysis();
      }),
      detectIssues(sampledConversations.map(c => c.text)).catch(e => {
        console.error('[Analytics] Issue detection failed:', e.message);
        return getDefaultIssueDetection();
      }),
      analyzeTopics(sampledConversations.map(c => c.text)).catch(e => {
        console.error('[Analytics] Topic analysis failed:', e.message);
        return getDefaultTopicDistribution();
      }),
      Promise.resolve().then(() => analyzeResponseLength(individualMessages)).catch(e => {
        console.error('[Analytics] Response length analysis failed:', e.message);
        return getDefaultResponseLengthAnalysis();
      }),
      Promise.resolve().then(() => analyzeSatisfaction(allMessages)).catch(e => {
        console.error('[Analytics] Satisfaction analysis failed:', e.message);
        return getDefaultSatisfactionSignals();
      })
    ]);

    const [quality, sentiment, issues, topics, responseLength, satisfaction] = results;

    console.log('[Analytics] AI analysis complete');
    console.log('[Analytics] Quality:', quality);
    console.log('[Analytics] Sentiment:', sentiment);
    console.log('[Analytics] Issues:', issues);
    console.log('[Analytics] Topics:', topics);

    // Calculate period
    const now = new Date();
    const period = {
      start: filters.start_date || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: filters.end_date || now.toISOString()
    };

    return {
      period,
      total_conversations: conversations.length,
      total_messages: allMessages.length,
      quality,
      sentiment,
      issues,
      topics: topics.topics,
      response_length: responseLength,
      satisfaction,
      last_updated: now.toISOString(),
      cache_status: 'fresh'
    };
  } catch (error) {
    console.error('[Analytics] Fetch error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Analytics] Axios error:', error.response?.data);
    }
    return getDefaultAnalytics();
  }
}

/**
 * Extract conversations from user data
 * Only includes recent messages to keep prompts manageable
 */
function extractConversations(users: any[], filters: AnalyticsFilters): Array<{text: string}> {
  const conversations: Array<{text: string}> = [];

  for (const user of users) {
    const sessions = user.sessions || [];

    for (const session of sessions) {
      // Filter by channel if specified
      if (filters.channel && filters.channel !== 'all') {
        const sessionChannel = session.channel?.toLowerCase() || '';
        if (!sessionChannel.includes(filters.channel)) {
          continue;
        }
      }

      const messages = session.messages || [];

      // Only take last 10 messages (5 exchanges) to keep prompt size manageable
      const recentMessages = messages.slice(-10);

      let currentConversation = '';

      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          // Truncate user messages to 200 chars max
          const truncatedText = msg.text.length > 200 ? msg.text.substring(0, 200) + '...' : msg.text;
          currentConversation += `User: ${truncatedText}\n`;
        } else if (msg.role === 'assistant') {
          // Truncate bot responses to 500 chars max
          const truncatedText = msg.text.length > 500 ? msg.text.substring(0, 500) + '...' : msg.text;
          currentConversation += `Bot: ${truncatedText}\n`;
        }
      }

      if (currentConversation.trim()) {
        conversations.push({
          text: currentConversation.trim()
        });
      }
    }
  }

  return conversations;
}

/**
 * Extract all messages for sentiment/satisfaction analysis
 */
function extractAllMessages(users: any[], filters: AnalyticsFilters): Array<{role: string; text: string}> {
  const allMessages: Array<{role: string; text: string}> = [];

  for (const user of users) {
    const sessions = user.sessions || [];

    for (const session of sessions) {
      // Filter by channel if specified
      if (filters.channel && filters.channel !== 'all') {
        const sessionChannel = session.channel?.toLowerCase() || '';
        if (!sessionChannel.includes(filters.channel)) {
          continue;
        }
      }

      const messages = session.messages || [];

      for (const msg of messages) {
        if (msg.text && msg.role) {
          allMessages.push({
            role: msg.role,
            text: msg.text
          });
        }
      }
    }
  }

  return allMessages;
}

/**
 * Extract individual messages for response length analysis
 */
function extractIndividualMessages(users: any[], filters: AnalyticsFilters): {
  userMessages: string[];
  botMessages: string[];
} {
  const userMessages: string[] = [];
  const botMessages: string[] = [];

  for (const user of users) {
    const sessions = user.sessions || [];

    for (const session of sessions) {
      // Filter by channel if specified
      if (filters.channel && filters.channel !== 'all') {
        const sessionChannel = session.channel?.toLowerCase() || '';
        if (!sessionChannel.includes(filters.channel)) {
          continue;
        }
      }

      const messages = session.messages || [];

      for (const msg of messages) {
        if (msg.text && msg.role === 'user') {
          userMessages.push(msg.text);
        } else if (msg.text && msg.role === 'assistant') {
          botMessages.push(msg.text);
        }
      }
    }
  }

  return { userMessages, botMessages };
}

/**
 * Get default analytics when no data is available
 */
function getDefaultAnalytics(): ConversationAnalytics {
  const now = new Date();
  return {
    period: {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: now.toISOString()
    },
    total_conversations: 0,
    total_messages: 0,
    quality: {
      overall: 75,
      accuracy: 75,
      completeness: 75,
      helpfulness: 75,
      confidence: 0.7
    },
    sentiment: {
      positive: 40,
      negative: 20,
      neutral: 40,
      overall: 'neutral',
      frustration_signals: 0,
      tone_trend: []
    },
    issues: {
      repetitive_responses: [],
      misunderstandings: [],
      incomplete_answers: [],
      hallucinations: [],
      total_issues: 0,
      severity: 'low'
    },
    topics: [],
    response_length: {
      average_user_length: 100,
      average_bot_length: 200,
      length_distribution: { short: 0, medium: 0, long: 0 },
      optimal_length_range: { min: 50, max: 300 },
      too_long_responses: 0,
      too_short_responses: 0
    },
    satisfaction: {
      explicit_positive: 0,
      explicit_negative: 0,
      follow_up_questions: 0,
      repeat_queries: 0,
      abandonment_rate: 0,
      overall_satisfaction: 'medium'
    },
    last_updated: now.toISOString(),
    cache_status: 'fresh'
  };
}

function getDefaultQualityScore() {
  return {
    overall: 75,
    accuracy: 75,
    completeness: 75,
    helpfulness: 75,
    confidence: 0.7
  };
}

function getDefaultSentimentAnalysis() {
  return {
    positive: 40,
    negative: 20,
    neutral: 40,
    overall: 'neutral' as const,
    frustration_signals: 0,
    tone_trend: []
  };
}

function getDefaultIssueDetection() {
  return {
    repetitive_responses: [],
    misunderstandings: [],
    incomplete_answers: [],
    hallucinations: [],
    total_issues: 0,
    severity: 'low' as const
  };
}

function getDefaultTopicDistribution() {
  return {
    topics: [
      { name: 'General', count: 0, percentage: 0, examples: [], subtopics: [] }
    ]
  };
}

function getDefaultResponseLengthAnalysis() {
  return {
    average_user_length: 100,
    average_bot_length: 200,
    length_distribution: { short: 0, medium: 0, long: 0 },
    optimal_length_range: { min: 50, max: 300 },
    too_long_responses: 0,
    too_short_responses: 0
  };
}

function getDefaultSatisfactionSignals() {
  return {
    explicit_positive: 0,
    explicit_negative: 0,
    follow_up_questions: 0,
    repeat_queries: 0,
    abandonment_rate: 0,
    overall_satisfaction: 'medium' as const
  };
}
