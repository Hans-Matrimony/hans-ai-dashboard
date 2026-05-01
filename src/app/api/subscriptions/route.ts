/**
 * API Route: /api/subscriptions
 * Fetches all subscriptions with user details from subscriptions service
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_URL || 'http://localhost:8000';

/**
 * GET /api/subscriptions
 * Fetch all subscriptions with user details
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[Subscriptions] Fetching from subscriptions service');
    console.log('[Subscriptions] SUBSCRIPTIONS_URL:', SUBSCRIPTIONS_URL);
    console.log('[Subscriptions] Params:', { status, limit, offset });

    // Build query params
    const params: Record<string, string> = {
      limit: limit.toString(),
      offset: offset.toString()
    };
    if (status) {
      params.status = status;
    }

    // Fetch from subscriptions service
    const response = await axios.get(`${SUBSCRIPTIONS_URL}/admin/all-subscriptions`, {
      params,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[Subscriptions] Success:', response.data);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[Subscriptions] Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Subscriptions] Axios error details:', {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url
      });
    }

    // Return detailed error information
    const errorDetails = {
      axiosError: axios.isAxiosError(error),
      message: error instanceof Error ? error.message : 'Unknown error',
      code: axios.isAxiosError(error) ? error.code : 'N/A',
      subscriptionsUrl: SUBSCRIPTIONS_URL,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(
      {
        error: 'Failed to fetch subscriptions',
        details: errorDetails,
        subscriptions: [],
        total: 0,
        limit: 0,
        offset: 0
      },
      { status: 500 }
    );
  }
}
