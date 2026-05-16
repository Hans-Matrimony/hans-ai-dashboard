/**
 * API Route: /api/chat-logs/friendship/auto
 * Real-time auto-analysis for friendship scores
 * Processes users in small batches using DeepSeek V4 Flash
 * Called automatically when chat logs page loads
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { analyzeFriendshipPositioning } from '@/lib/ai-analytics';
import { FriendshipPositioning } from '@/lib/analytics-types';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * POST /api/chat-logs/friendship/auto
 * Auto-analyze friendship scores for a batch of users
 * Body: { users: [{ userId, messages: [{role, text}] }] }
 * OR query param: ?limit=50 (fetches from mongo and analyzes)
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '3', 10);
    const skipUserIds = searchParams.get('skip')?.split(',').filter(Boolean) || [];

    console.log('[Friendship Auto] Starting real-time auto-analysis with DeepSeek');
    console.log('[Friendship Auto] Limit:', limit, 'Skip:', skipUserIds.length, 'users');

    // Fetch users from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      params: { limit },
      timeout: 30000
    });

    const data = mongoResponse.data;
    const users = data.users || [];

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        results: [],
        analyzed: 0,
        skipped: 0,
        total: 0
      });
    }

    console.log('[Friendship Auto] Found', users.length, 'users');

    // Prepare users for analysis (skip already scored + users with metadata scores)
    const usersToAnalyze: Array<{ userId: string; messages: Array<{ role: string; text: string }> }> = [];
    const metadataResults: Array<{ userId: string; score: FriendshipPositioning; source: string }> = [];

    for (const user of users) {
      const userId = user.userId;

      // Skip users the client already has scores for
      if (skipUserIds.includes(userId)) {
        continue;
      }

      // Check for metadata-based scores first (FREE, instant)
      const sessions = user.sessions || [];
      const metadataScores: Array<{
        overall: number; empathy: number; personalization: number;
        warmth: number; supportive_listening: number; rapport: number;
      }> = [];

      for (const session of sessions) {
        for (const msg of (session.messages || [])) {
          if (msg.role === 'assistant' && msg.metadata?.friendshipScore?.overall !== undefined) {
            metadataScores.push(msg.metadata.friendshipScore);
          }
        }
      }

      if (metadataScores.length > 0) {
        // Calculate cumulative from metadata (free, no API call)
        const count = metadataScores.length;
        const avgScore: FriendshipPositioning = {
          overall: Number((metadataScores.reduce((s, m) => s + m.overall, 0) / count).toFixed(2)),
          empathy: Number((metadataScores.reduce((s, m) => s + m.empathy, 0) / count).toFixed(2)),
          personalization: Number((metadataScores.reduce((s, m) => s + m.personalization, 0) / count).toFixed(2)),
          warmth: Number((metadataScores.reduce((s, m) => s + m.warmth, 0) / count).toFixed(2)),
          supportive_listening: Number((metadataScores.reduce((s, m) => s + m.supportive_listening, 0) / count).toFixed(2)),
          rapport: Number((metadataScores.reduce((s, m) => s + m.rapport, 0) / count).toFixed(2)),
          confidence: 1.0,
          strengths: [],
          improvements: []
        };
        metadataResults.push({ userId, score: avgScore, source: 'metadata' });
        continue;
      }

      // Collect messages for AI analysis
      const allMessages: Array<{ role: string; text: string }> = [];
      for (const session of sessions) {
        for (const msg of (session.messages || [])) {
          if (msg.text && (msg.role === 'user' || msg.role === 'assistant')) {
            allMessages.push({ role: msg.role, text: msg.text });
          }
        }
      }

      // Only include users with enough messages
      if (allMessages.length >= 6) {
        usersToAnalyze.push({ userId, messages: allMessages });
      }
    }

    console.log('[Friendship Auto] Metadata scores:', metadataResults.length);
    console.log('[Friendship Auto] Need AI analysis:', usersToAnalyze.length);

    // Analyze users with AI (in batches of 5 for speed)
    const aiResults: Array<{ userId: string; score: FriendshipPositioning; source: string }> = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < usersToAnalyze.length; i++) {
      const user = usersToAnalyze[i];
      try {
        console.log(`[Friendship Auto] Analyzing ${i + 1}/${usersToAnalyze.length}: ${user.userId}`);
        const score = await analyzeFriendshipPositioning(user.messages);
        aiResults.push({ userId: user.userId, score, source: 'zai_realtime' });

        // Small delay between requests
        if (i < usersToAnalyze.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error(`[Friendship Auto] Failed for ${user.userId}:`, error instanceof Error ? error.message : String(error));
        // Skip failed users, don't break the batch
      }
    }

    // Combine results
    const allResults = [...metadataResults, ...aiResults];

    // Calculate statistics
    const scores = allResults.map(r => r.score.overall);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    return NextResponse.json({
      success: true,
      results: allResults,
      analyzed: allResults.length,
      fromMetadata: metadataResults.length,
      fromAI: aiResults.length,
      skipped: skipUserIds.length,
      total: users.length,
      statistics: {
        average: Number(avgScore.toFixed(1)),
        high: scores.filter(s => s >= 7).length,
        medium: scores.filter(s => s >= 5 && s < 7).length,
        low: scores.filter(s => s < 5).length
      },
      completedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Friendship Auto] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to auto-analyze friendship scores',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
