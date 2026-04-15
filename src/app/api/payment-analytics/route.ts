/**
 * API Route: /api/payment-analytics
 * Fetches payment funnel analytics from subscriptions service
 */

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_URL || 'http://localhost:8000';

/**
 * GET /api/payment-analytics
 * Fetch payment analytics data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    console.log('[Payment Analytics] Fetching from subscriptions service');
    console.log('[Payment Analytics] SUBSCRIPTIONS_URL:', SUBSCRIPTIONS_URL);
    console.log('[Payment Analytics] Params:', { start_date, end_date });

    // Fetch from subscriptions service
    const response = await axios.get(`${SUBSCRIPTIONS_URL}/analytics/payment-funnel`, {
      params: {
        start_date,
        end_date
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('[Payment Analytics] Success:', response.data);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('[Payment Analytics] Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Payment Analytics] Axios error details:', {
        message: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseData: error.response?.data,
        requestUrl: error.config?.url,
        requestParams: error.config?.params
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
        error: 'Failed to fetch payment analytics',
        details: errorDetails,
        // Return empty data on error
        period: { start: new Date().toISOString(), end: new Date().toISOString() },
        button_clicks: 0,
        payments_completed: 0,
        payments_failed: 0,
        total_revenue: 0,
        total_revenue_inr: 0,
        conversion_rate: 0,
        average_order_value: 0,
        average_order_value_inr: 0,
        by_plan: [],
        daily_trend: []
      },
      { status: 500 }
    );
  }
}
