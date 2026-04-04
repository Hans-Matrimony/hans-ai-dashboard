/**
 * API Route: /api/chat-logs/messages
 * Proxy route to fetch messages from MongoDB Logger service
 * Browsers cannot directly call internal services due to CORS/network restrictions
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const MONGO_LOGGER_URL = process.env.NEXT_PUBLIC_MONGO_LOGGER_URL || 'https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com';

/**
 * GET /api/chat-logs/messages
 * Fetch all messages from MongoDB Logger
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Chat Logs] Fetching from MongoDB Logger:', MONGO_LOGGER_URL);

    // Forward query parameters to MongoDB Logger
    const searchParams = request.nextUrl.searchParams;
    const params = new URLSearchParams();

    // Map frontend query params to MongoDB Logger params
    if (searchParams.get('startDate')) {
      params.append('startDate', searchParams.get('startDate')!);
    }
    if (searchParams.get('endDate')) {
      params.append('endDate', searchParams.get('endDate')!);
    }
    if (searchParams.get('channel')) {
      params.append('channel', searchParams.get('channel')!);
    }
    if (searchParams.get('userId')) {
      params.append('userId', searchParams.get('userId')!);
    }
    if (searchParams.get('limit')) {
      params.append('limit', searchParams.get('limit')!);
    }

    // Fetch from MongoDB Logger
    const mongoResponse = await axios.get(`${MONGO_LOGGER_URL}/messages`, {
      params,
      timeout: 30000
    });

    console.log('[Chat Logs] MongoDB response:', {
      count: mongoResponse.data.count,
      users: mongoResponse.data.users?.length || 0
    });

    return NextResponse.json(mongoResponse.data);
  } catch (error) {
    console.error('[Chat Logs] Fetch error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Chat Logs] Axios error:', error.response?.data);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.response?.data || error.message },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat-logs/messages
 * Delete all messages from MongoDB Logger
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const confirm = searchParams.get('confirm');

    if (confirm !== 'yes') {
      return NextResponse.json(
        { error: 'Confirmation required. Add ?confirm=yes to delete all records.' },
        { status: 400 }
      );
    }

    console.log('[Chat Logs] Deleting all messages from MongoDB Logger');

    const mongoResponse = await axios.delete(`${MONGO_LOGGER_URL}/messages?confirm=yes`, {
      timeout: 30000
    });

    console.log('[Chat Logs] Delete response:', mongoResponse.data);

    return NextResponse.json(mongoResponse.data);
  } catch (error) {
    console.error('[Chat Logs] Delete error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Chat Logs] Axios error:', error.response?.data);
      return NextResponse.json(
        { error: 'Failed to delete messages', details: error.response?.data || error.message },
        { status: error.response?.status || 500 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete messages', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
