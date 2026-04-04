/**
 * API Route: /api/chat-logs/messages/[userId]
 * Proxy route to fetch/delete messages for a specific user from MongoDB Logger
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * GET /api/chat-logs/messages/[userId]
 * Fetch messages for a specific user from MongoDB Logger
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log('[Chat Logs] Fetching user from MongoDB Logger:', userId);

    // Fetch from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages/${userId}`, {
      timeout: 30000
    });

    console.log('[Chat Logs] User data fetched:', {
      userId,
      sessions: mongoResponse.data.sessions?.length || 0
    });

    return NextResponse.json(mongoResponse.data);
  } catch (error) {
    console.error('[Chat Logs] Fetch user error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Chat Logs] Axios error:', error.response?.data);
      return NextResponse.json(
        { error: 'Failed to fetch user messages', details: error.response?.data || error.message },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch user messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-logs/messages/[userId]
 * Delete all messages for a specific user from MongoDB Logger
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    console.log('[Chat Logs] Deleting user from MongoDB Logger:', userId);

    // Delete from MongoDB Logger
    const mongoResponse = await axios.delete(`${MONGO_LOGGER_URL}/messages/${userId}`, {
      timeout: 30000
    });

    console.log('[Chat Logs] User deleted:', mongoResponse.data);

    return NextResponse.json(mongoResponse.data);
  } catch (error) {
    console.error('[Chat Logs] Delete user error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Chat Logs] Axios error:', error.response?.data);
      return NextResponse.json(
        { error: 'Failed to delete user messages', details: error.response?.data || error.message },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete user messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
