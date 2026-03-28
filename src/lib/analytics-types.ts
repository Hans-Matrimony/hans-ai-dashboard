/**
 * TypeScript interfaces for AI-powered conversation analytics
 */

export interface QualityScore {
  overall: number;        // 0-100 weighted average
  accuracy: number;       // 0-100 information correctness
  completeness: number;   // 0-100 addresses user's question
  helpfulness: number;    // 0-100 usefulness and actionability
  confidence: number;     // 0-1 AI's confidence in scoring
}

export interface SentimentAnalysis {
  positive: number;           // 0-100 percentage
  negative: number;           // 0-100 percentage
  neutral: number;            // 0-100 percentage
  overall: 'positive' | 'negative' | 'neutral';
  frustration_signals: number;  // Count of frustrated messages
  tone_trend: Array<{timestamp: string; sentiment: string}>;
}

export interface RepetitiveResponse {
  pattern: string;
  count: number;
  examples: string[];
}

export interface Misunderstanding {
  user_query: string;
  bot_response: string;
  issue: string;
}

export interface IncompleteAnswer {
  message_id: string;
  text: string;
  missing_info: string;
}

export interface Hallucination {
  message_id: string;
  claim: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface IssueDetection {
  repetitive_responses: RepetitiveResponse[];
  misunderstandings: Misunderstanding[];
  incomplete_answers: IncompleteAnswer[];
  hallucinations: Hallucination[];
  total_issues: number;
  severity: 'low' | 'medium' | 'high';
}

export interface Topic {
  name: string;
  count: number;
  percentage: number;
  examples: string[];
  subtopics: string[];
}

export interface TopicDistribution {
  topics: Topic[];
  emerging_topics: string[];
  trending_topics: string[];
}

export interface ResponseLengthAnalysis {
  average_user_length: number;
  average_bot_length: number;
  length_distribution: {
    short: number;    // < 50 chars
    medium: number;   // 50-200 chars
    long: number;     // > 200 chars
  };
  optimal_length_range: { min: number; max: number };
  too_long_responses: number;
  too_short_responses: number;
}

export interface SatisfactionSignals {
  explicit_positive: number;   // "thanks", "great", etc.
  explicit_negative: number;   // "not helpful", "wrong", etc.
  follow_up_questions: number; // Indicates incomplete answers
  repeat_queries: number;      // Indicates confusion
  abandonment_rate: number;    // Conversations ending mid-query
  overall_satisfaction: 'high' | 'medium' | 'low';
}

export interface AnalyticsPeriod {
  start: string;
  end: string;
}

export interface ConversationAnalytics {
  period: AnalyticsPeriod;
  total_conversations: number;
  total_messages: number;
  quality: QualityScore;
  sentiment: SentimentAnalysis;
  issues: IssueDetection;
  topics: Topic[];
  response_length: ResponseLengthAnalysis;
  satisfaction: SatisfactionSignals;
  last_updated: string;
  cache_status: 'fresh' | 'cached' | 'stale';
}

export interface AnalyticsFilters {
  start_date?: string;
  end_date?: string;
  channel?: 'whatsapp' | 'telegram' | 'all';
  user_type?: 'new' | 'returning' | 'all';
}

export interface AnalysisRequest {
  filters: AnalyticsFilters;
  force_refresh?: boolean;
  sample_rate?: number;
}

export interface AnalysisJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: ConversationAnalytics;
  error?: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Detailed Response Analysis Types for Model Training
 */
export interface DetailedResponseAnalysis {
  conversation_id: string;
  user_query: string;
  bot_response: string;
  quality_score: number;
  issue_type: 'no_issue' | 'missing_birth_details' | 'generic_response' | 'missing_remedy' | 'overpromising' | 'missing_reasoning' | 'incomplete' | 'inaccurate' | 'irrelevant' | 'vague' | 'missing_context';
  severity: 'low' | 'medium' | 'high';
  reasoning: string;
  improvement_suggestion: string;
  detected_emotion: string;
  emotion_match: boolean;
  topic: string;
  timestamp: string;
}

export interface EmotionalAccuracy {
  total_analyzed: number;
  correct_detections: number;
  incorrect_detections: number;
  accuracy_percentage: number;
  mismatches: Array<{
    conversation_id: string;
    user_message: string;
    actual_emotion: string;
    detected_emotion: string;
    bot_response: string;
    appropriate_response: string;
  }>;
}

export interface TopicPerformance {
  topic: string;
  total_conversations: number;
  accurate_responses: number;
  accuracy_percentage: number;
  common_issues: Array<{
    issue: string;
    count: number;
    percentage: number;
    examples: string[];
  }>;
  avg_quality_score: number;
}

export interface DetailedAnalytics {
  period: { start: string; end: string };
  detailed_responses: {
    analyses: DetailedResponseAnalysis[];
    summary: {
      total: number;
      critical: number;
      needs_improvement: number;
      good: number;
    };
  };
  emotional_accuracy: EmotionalAccuracy;
  topic_performance: TopicPerformance[];
  last_updated: string;
}
