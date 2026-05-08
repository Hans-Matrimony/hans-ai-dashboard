/**
 * API Route: /api/chat-logs/friendship/single
 * Simplified route for single user friendship scoring
 * Uses userId query parameter instead of dynamic path
 * Now reads cumulative scores from MongoDB metadata (self-assessed by agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { analyzeFriendshipPositioning } from '@/lib/ai-analytics';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

interface FriendshipScore {
  overall: number;
  empathy: number;
  personalization: number;
  warmth: number;
  supportive_listening: number;
  rapport: number;
  confidence?: number;
}

/**
 * POST /api/chat-logs/friendship/single?userId=123
 * Calculate friendship score for a specific user
 * Now reads from metadata (instant, no API cost)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      console.log('[Friendship Single] ❌ Missing userId parameter');
      return NextResponse.json({
        error: 'userId parameter is required'
      }, { status: 400 });
    }

    console.log(`[Friendship Single] 📊 Score request received for userId: ${userId} at ${new Date().toISOString()}`);

    // 1. Fetch user data from MongoDB Logger
    console.log(`[Friendship Single] 📡 Fetching data from MongoDB Logger...`);
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages?userId=${encodeURIComponent(userId)}`, {
      timeout: 30000
    });

    const userData = mongoResponse.data;
    console.log(`[Friendship Single] 📥 Received data - sessions: ${userData?.sessions?.length || 0}`);

    if (!userData || !userData.sessions) {
      console.log(`[Friendship Single] ❌ No sessions found for userId: ${userId}`);
      return NextResponse.json({
        error: 'No sessions found for this user'
      }, { status: 404 });
    }

    // 2. Extract friendship scores from assistant message metadata
    const scoresFromMetadata: FriendshipScore[] = [];
    const sessions = userData.sessions || [];

    console.log(`[Friendship Single] 🔍 Scanning ${sessions.length} sessions for friendship scores in metadata...`);

    for (const session of sessions) {
      const messages = session.messages || [];
      for (const msg of messages) {
        // Only assistant messages have friendship scores
        if (msg.role === 'assistant' && msg.metadata?.friendshipScore) {
          const score = msg.metadata.friendshipScore as FriendshipScore;
          // Validate score has required fields
          if (score.overall !== undefined) {
            scoresFromMetadata.push(score);
          }
        }
      }
    }

    console.log(`[Friendship Single] ✅ Found ${scoresFromMetadata.length} friendship scores in metadata`);
    if (scoresFromMetadata.length > 0) {
      const avgOverall = scoresFromMetadata.reduce((sum, s) => sum + s.overall, 0) / scoresFromMetadata.length;
      console.log(`[Friendship Single] 📈 Average overall score: ${avgOverall.toFixed(2)}`);
    }

    // 3. Calculate cumulative average from metadata scores
    if (scoresFromMetadata.length > 0) {
      const cumulativeScore: FriendshipScore = {
        overall: 0,
        empathy: 0,
        personalization: 0,
        warmth: 0,
        supportive_listening: 0,
        rapport: 0,
        confidence: 1.0  // High confidence since scores are directly from agent
      };

      // Sum all scores
      for (const score of scoresFromMetadata) {
        cumulativeScore.overall += score.overall || 0;
        cumulativeScore.empathy += score.empathy || 0;
        cumulativeScore.personalization += score.personalization || 0;
        cumulativeScore.warmth += score.warmth || 0;
        cumulativeScore.supportive_listening += score.supportive_listening || 0;
        cumulativeScore.rapport += score.rapport || 0;
      }

      // Calculate averages
      const count = scoresFromMetadata.length;
      cumulativeScore.overall = Number((cumulativeScore.overall / count).toFixed(2));
      cumulativeScore.empathy = Number((cumulativeScore.empathy / count).toFixed(2));
      cumulativeScore.personalization = Number((cumulativeScore.personalization / count).toFixed(2));
      cumulativeScore.warmth = Number((cumulativeScore.warmth / count).toFixed(2));
      cumulativeScore.supportive_listening = Number((cumulativeScore.supportive_listening / count).toFixed(2));
      cumulativeScore.rapport = Number((cumulativeScore.rapport / count).toFixed(2));

      console.log('[Friendship Single] Cumulative score:', cumulativeScore.overall);

      return NextResponse.json({
        userId,
        score: cumulativeScore,
        messageCount: scoresFromMetadata.length,
        sessionCount: sessions.length,
        analyzedAt: new Date().toISOString(),
        source: 'metadata'
      });
    }

    // 4. Fallback: If no scores in metadata, use AI analysis (for older conversations)
    console.log(`[Friendship Single] ⚠️ No scores in metadata - using AI analysis fallback`);
    console.log(`[Friendship Single] 🤖 Starting AI analysis (slower, has cost) at ${new Date().toISOString()}`);

    // Extract all messages for AI analysis
    const allMessages: Array<{role: string; text: string}> = [];
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
      console.log(`[Friendship Single] ❌ No messages found for AI analysis`);
      return NextResponse.json({
        error: 'No messages found for this user'
      }, { status: 404 });
    }

    console.log(`[Friendship Single] 📝 Analyzing ${allMessages.length} messages with AI`);

    // Use AI analysis as fallback
    const startTime = Date.now();
    const score = await analyzeFriendshipPositioning(allMessages);
    const analysisTime = Date.now() - startTime;

    console.log(`[Friendship Single] ✅ AI analysis complete - overall: ${score.overall}, took ${analysisTime}ms`);

    return NextResponse.json({
      userId,
      score,
      messageCount: allMessages.length,
      sessionCount: sessions.length,
      analyzedAt: new Date().toISOString(),
      source: 'ai_fallback'
    });

  } catch (error) {
    console.error('[Friendship Single] Error:', error);

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
