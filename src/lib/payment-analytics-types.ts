/**
 * TypeScript interfaces for Payment Analytics
 */

export interface PaymentFunnelData {
  period: {
    start: string;
    end: string;
  };
  button_clicks: number;
  payments_completed: number;
  payments_failed: number;
  total_revenue: number;  // in paise
  total_revenue_inr: number;  // in rupees
  conversion_rate: number;  // percentage
  average_order_value: number;  // in paise
  average_order_value_inr: number;  // in rupees
  by_plan: PlanPerformance[];
  daily_trend: DailyTrend[];
  completed_payment_user_ids?: string[];  // NEW: User IDs who completed payments
}

export interface PlanPerformance {
  plan_id: string;
  plan_name: string;
  clicks: number;
  conversions: number;
  revenue: number;  // in paise
  conversion_rate?: number;  // percentage
}

export interface DailyTrend {
  date: string;
  clicks: number;
  conversions: number;
  revenue: number;  // in paise
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
}
