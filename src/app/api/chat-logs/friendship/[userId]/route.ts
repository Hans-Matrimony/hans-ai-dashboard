/**
 * API Route: /api/chat-logs/friendship/[userId]
 * Calculates friendship positioning score for a specific user
 * Uses Groq AI to analyze how well the bot builds a friend-like connection
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { analyzeFriendshipPositioning } from '@/lib/ai-analytics';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

console.log('[Friendship Route] Module loaded, GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'SET' : 'NOT SET');

/**
 * POST /api/chat-logs/friendship/[userId]
 * Calculate friendship score for a specific user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log('[Friendship Score] Calculating for user:', userId);

    // 1. Fetch all users from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      timeout: 30000
    });

    const allUsers = mongoResponse.data?.users || [];

    // 2. Find the specific user
    const userData = allUsers.find((u: any) => u.userId === userId);

    if (!userData || !userData.sessions) {
      return NextResponse.json({
        error: 'No sessions found for this user'
      }, { status: 404 });
    }

    // 3. Extract all messages from all sessions
    const allMessages: Array<{role: string; text: string}> = [];
    const sessions = userData.sessions || [];

    for (const session of sessions) {
      const messages = session.messages || [];
      for (const msg of messages) {
        if (msg.text && (msg.role === 'user' || msg.role === 'assistant')) {
          allMessages.push({
            role: msg.role,
            text: msg.text
          });
        }
      }
    }

    if (allMessages.length === 0) {
      return NextResponse.json({
        error: 'No messages found for this user'
      }, { status: 404 });
    }

    console.log('[Friendship Score] Analyzing', allMessages.length, 'messages for', userId);

    // 4. Analyze friendship positioning (calls Groq AI)
    const score = await analyzeFriendshipPositioning(allMessages);

    console.log('[Friendship Score] Result for', userId, ':', score);

    // 5. Return the score with metadata
    return NextResponse.json({
      userId,
      score,
      messageCount: allMessages.length,
      sessionCount: sessions.length,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Friendship Score] Error:', error);

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || error.message;

      return NextResponse.json(
        {
          error: 'Failed to analyze friendship score',
          details: errorMessage
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to analyze friendship score',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
