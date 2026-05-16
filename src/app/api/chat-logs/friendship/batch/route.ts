/**
 * API Route: /api/chat-logs/friendship/batch
 * Batch calculates friendship positioning scores for all users
 * Processes users sequentially to respect rate limits
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { batchAnalyzeFriendshipPositioning } from '@/lib/ai-analytics';
import { FriendshipPositioning } from '@/lib/analytics-types';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * POST /api/chat-logs/friendship/batch
 * Calculate friendship scores for all users
 * Query params:
 *   - limit: maximum number of users to analyze (default: 3)
 *   - channel: filter by channel (optional)
 *   - force: re-analyze even if recently analyzed (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    const channel = searchParams.get('channel');
    const force = searchParams.get('force') === 'true';

    console.log('[Friendship Batch] Starting batch analysis');
    console.log('[Friendship Batch] Limit:', limit, 'Channel:', channel || 'all');

    // 1. Fetch all users from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      params: {
        limit,
        channel: channel || undefined
      },
      timeout: 30000
    });

    const data = mongoResponse.data;
    const users = data.users || [];

    if (users.length === 0) {
      return NextResponse.json({
        error: 'No users found'
      }, { status: 404 });
    }

    console.log('[Friendship Batch] Found', users.length, 'users to analyze');

    // 2. Prepare users map for batch analysis
    const usersMap = new Map<string, Array<{role: string; text: string}>>();

    for (const user of users) {
      const userId = user.userId;
      const allMessages: Array<{role: string; text: string}> = [];

      const sessions = user.sessions || [];
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

      // Only include users with enough messages (at least 4 exchanges = 8 messages)
      if (allMessages.length >= 8) {
        usersMap.set(userId, allMessages);
      }
    }

    console.log('[Friendship Batch] Analyzing', usersMap.size, 'users (after filtering)');

    // 3. Batch analyze with progress tracking
    const results = await batchAnalyzeFriendshipPositioning(
      usersMap,
      (current, total, userId) => {
        console.log(`[Friendship Batch] Progress: ${current}/${total} - ${userId}`);
      }
    );

    // 4. Format results
    const formattedResults = Array.from(results.entries()).map(([userId, score]) => ({
      userId,
      score,
      messageCount: usersMap.get(userId)?.length || 0
    }));

    // Sort by overall score (highest first)
    formattedResults.sort((a, b) => b.score.overall - a.score.overall);

    // Calculate statistics
    const scores = formattedResults.map(r => r.score.overall);
    const averageScoreValue = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;
    const highScores = scores.filter(s => s >= 7).length;
    const mediumScores = scores.filter(s => s >= 5 && s < 7).length;
    const lowScores = scores.filter(s => s < 5).length;

    return NextResponse.json({
      success: true,
      total: users.length,
      analyzed: results.size,
      skipped: users.length - results.size,
      results: formattedResults,
      statistics: {
        average: Number(averageScoreValue.toFixed(1)),
        high: highScores,
        medium: mediumScores,
        low: lowScores
      },
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Friendship Batch] Error:', error);

    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const errorMessage = error.response?.data?.error || error.message;

      return NextResponse.json(
        {
          error: 'Failed to complete batch analysis',
          details: errorMessage
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to complete batch analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chat-logs/friendship/batch
 * Get status of batch analysis (for polling)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'Send POST request to start batch analysis'
  });
}
