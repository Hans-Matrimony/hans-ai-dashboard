/**
 * API Route: /api/chat-logs/analytics/detailed
 * Fetches detailed conversation analytics for model training feedback
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import axios from 'axios';
import {
  analyzeDetailedResponses,
  analyzeEmotionalAccuracy,
  analyzeTopicPerformance
} from '@/lib/ai-analytics';
import { DetailedAnalytics } from '@/lib/analytics-types';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * GET /api/chat-logs/analytics/detailed
 * Fetch detailed analytics data for model training
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const channel = searchParams.get('channel');
    const limit = parseInt(searchParams.get('limit') || '50'); // Analyze up to 50 conversations

    // Fetch conversations from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      params: {
        startDate: start_date,
        endDate: end_date,
        channel: channel,
        limit: 100 // Reduced limit
      },
      timeout: 30000
    });

    const data = mongoResponse.data;
    const users = data.users || [];

    // Extract conversations for detailed analysis
    const conversations = extractConversationsWithIds(users, channel);
    const allMessages = extractAllMessagesWithIds(users, channel);

    // Only analyze top 3 conversations to avoid Groq limits
    const analysisSampleSize = Math.min(3, conversations.length);
    const sampledConversations = conversations.slice(0, analysisSampleSize);

    // Run detailed analyses
    const [detailedResponses, emotionalAccuracy, topicPerformance] = await Promise.all([
      analyzeDetailedResponses(sampledConversations),
      analyzeEmotionalAccuracy(allMessages.slice(0, 20)), // Only analyze first 20 messages
      analyzeTopicPerformance(sampledConversations)
    ]);

    const now = new Date();
    const detailedAnalytics: DetailedAnalytics = {
      period: {
        start: start_date || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: end_date || now.toISOString()
      },
      detailed_responses: detailedResponses,
      emotional_accuracy: emotionalAccuracy,
      topic_performance: topicPerformance,
      last_updated: now.toISOString()
    };

    return NextResponse.json(detailedAnalytics);
  } catch (error) {
    console.error('Detailed analytics API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch detailed analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Extract conversations with IDs for detailed analysis
 * Only includes recent messages to keep prompts manageable
 */
function extractConversationsWithIds(users: any[], channel: string | null): Array<{
  id: string;
  text: string;
  timestamp: string;
}> {
  const conversations: Array<{ id: string; text: string; timestamp: string }> = [];

  for (const user of users) {
    const sessions = user.sessions || [];

    for (const session of sessions) {
      // Filter by channel if specified
      if (channel && channel !== 'all') {
        const sessionChannel = session.channel?.toLowerCase() || '';
        if (!sessionChannel.includes(channel)) {
          continue;
        }
      }

      const messages = session.messages || [];

      // Only take last 6 messages (3 exchanges) to keep prompt size manageable
      const recentMessages = messages.slice(-6);

      let currentConversation = '';
      let conversationId = `${user.userId}_${session.sessionId}`;

      for (const msg of recentMessages) {
        if (msg.role === 'user') {
          // Truncate user messages to 150 chars
          const truncatedText = msg.text.length > 150 ? msg.text.substring(0, 150) + '...' : msg.text;
          currentConversation += `User: ${truncatedText}\n`;
        } else if (msg.role === 'assistant') {
          // Truncate bot responses to 300 chars
          const truncatedText = msg.text.length > 300 ? msg.text.substring(0, 300) + '...' : msg.text;
          currentConversation += `Bot: ${truncatedText}\n`;
        }
      }

      if (currentConversation.trim()) {
        conversations.push({
          id: conversationId,
          text: currentConversation.trim(),
          timestamp: session.startTime || new Date().toISOString()
        });
      }
    }
  }

  return conversations;
}

/**
 * Extract all messages with conversation IDs
 */
function extractAllMessagesWithIds(users: any[], channel: string | null): Array<{
  role: string;
  text: string;
  conversation_id: string;
}> {
  const allMessages: Array<{ role: string; text: string; conversation_id: string }> = [];

  for (const user of users) {
    const sessions = user.sessions || [];

    for (const session of sessions) {
      // Filter by channel if specified
      if (channel && channel !== 'all') {
        const sessionChannel = session.channel?.toLowerCase() || '';
        if (!sessionChannel.includes(channel)) {
          continue;
        }
      }

      const messages = session.messages || [];
      const conversationId = `${user.userId}_${session.sessionId}`;

      for (const msg of messages) {
        if (msg.text && msg.role) {
          allMessages.push({
            role: msg.role,
            text: msg.text,
            conversation_id: conversationId
          });
        }
      }
    }
  }

  return allMessages;
}
