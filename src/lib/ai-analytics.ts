/**
 * AI Analytics Service
 * Interfaces with Groq API for fast, accurate conversation analysis
 */

import axios, { AxiosError } from 'axios';
import {
  QualityScore,
  SentimentAnalysis,
  IssueDetection,
  TopicDistribution,
  ResponseLengthAnalysis,
  SatisfactionSignals
} from './analytics-types';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1';
const API_TIMEOUT = 120000; // 2 minutes

/**
 * Call Groq API for analysis
 */
async function callGroqAPI(prompt: string, systemPrompt: string = 'You are an expert AI analyst.') {
  try {
    console.log('[Groq API] Calling API with prompt length:', prompt.length);

    const response = await axios.post(
      `${GROQ_URL}/chat/completions`,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 4096,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT
      }
    );

    const content = response.data.choices[0].message.content;
    console.log('[Groq API] Response length:', content?.length || 0);
    console.log('[Groq API] Response preview:', content?.substring(0, 200) || 'No content');

    return content;
  } catch (error) {
    console.error('[Groq API] Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('[Groq API] Response:', error.response?.data);
    }
    throw error;
  }
}

/**
 * Safely parse JSON with fallback
 */
function safeJSONParse<T>(jsonString: string, fallback: T): T {
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[JSON Parse] Success');
    return parsed;
  } catch (error) {
    console.error('[JSON Parse] Failed:', error);
    console.error('[JSON Parse] Invalid JSON preview:', jsonString.substring(0, 500));
    return fallback;
  }
}

/**
 * Analyze conversation quality using AI
 * Evaluates against professional astrologer standards
 */
export async function analyzeQuality(conversations: string[]): Promise<QualityScore> {
  try {
    const systemPrompt = 'You are an expert astrologer evaluating AI chatbot responses. Rate how well the bot follows professional astrologer practices. Respond with valid JSON only.';

    const prompt = `Rate these ${conversations.length} astrology chatbot conversations (0-100 scale) based on professional astrologer standards:

**Evaluate these criteria:**
1. **Birth details collection**: Does the bot ask for date, time, and place of birth before predictions?
2. **Astrological accuracy**: Are predictions based on proper astrology (dashas, transits, houses) or just generic statements?
3. **Remedy suggestions**: Does the suggest gemstones, mantras, or remedies when needed?
4. **Empathy + realism**: Is it empathetic but honest about astrology's limitations?
5. **Complete answers**: Does it explain the "why" behind predictions or just give yes/no?

Return ONLY this JSON:
{
  "overall": 85,
  "accuracy": 80,
  "completeness": 90,
  "helpfulness": 85,
  "confidence": 0.9
}

Conversations:
${conversations.map((c, i) => `\n${i + 1}. ${c.substring(0, 500)}...\n`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, getDefaultQualityScore());

    return {
      overall: parsed.overall || 75,
      accuracy: parsed.accuracy || 75,
      completeness: parsed.completeness || 75,
      helpfulness: parsed.helpfulness || 75,
      confidence: parsed.confidence || 0.8
    };
  } catch (error) {
    console.error('[Quality] Analysis failed:', error);
    return getDefaultQualityScore();
  }
}

/**
 * Analyze sentiment using AI
 */
export async function analyzeSentiment(messages: Array<{role: string; text: string}>): Promise<SentimentAnalysis> {
  try {
    const userMessages = messages.filter(m => m.role === 'user');

    const systemPrompt = 'You are a sentiment analyst. Classify emotions as positive/negative/neutral. Respond with valid JSON only.';

    const prompt = `Analyze sentiment in these ${userMessages.length} messages:

Return ONLY this JSON:
{
  "positive": 40,
  "negative": 20,
  "neutral": 40,
  "overall": "positive",
  "frustration_signals": 3,
  "tone_trend": []
}

User messages (first 20):
${userMessages.slice(0, 20).map((m, i) => `${i + 1}. "${m.text.substring(0, 100)}"`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, getDefaultSentimentAnalysis());

    return {
      positive: parsed.positive || 33,
      negative: parsed.negative || 33,
      neutral: parsed.neutral || 34,
      overall: parsed.overall || 'neutral',
      frustration_signals: parsed.frustration_signals || 0,
      tone_trend: parsed.tone_trend || []
    };
  } catch (error) {
    console.error('[Sentiment] Analysis failed:', error);
    return getDefaultSentimentAnalysis();
  }
}

/**
 * Detect issues in conversations using AI
 * Identifies astrologer-specific quality issues
 */
export async function detectIssues(conversations: string[]): Promise<IssueDetection> {
  try {
    const systemPrompt = 'You are an expert astrologer evaluating AI chatbot quality. Identify professional astrology practice violations. Always respond with valid JSON.';

    const prompt = `Review these ${conversations.length} astrology conversations for professional astrologer compliance issues.

**Look for these ASTROLOGER-SPECIFIC problems:**

1. **Missing birth details** (CRITICAL): Bot gives predictions without asking for date, time, place of birth
2. **Generic responses** (HIGH): Bot gives vague/advice that could apply to anyone (no astrology-specific insight)
3. **No remedies suggested** (MEDIUM): User has problem but bot doesn't suggest gemstone, mantra, puja, or remedy
4. **Overpromising** (HIGH): Bot gives deterministic predictions ("you will get married in 2025") instead of tendencies
5. **Missing astrological reasoning** (MEDIUM): Bot says "this will happen" but doesn't explain which dasha/transit/house causes it
6. **Incomplete answers** (MEDIUM): User asks specific question but bot gives partial response

Return ONLY a JSON object with this exact structure:
{
  "repetitive_responses": [
    {"pattern": "I cannot predict exact dates", "count": 5, "examples": ["example 1"]}
  ],
  "misunderstandings": [
    {"user_query": "text", "bot_response": "text", "issue": "Bot didn't understand user was asking about career"}
  ],
  "incomplete_answers": [
    {"message_id": "id", "text": "text", "missing_info": "what's missing"}
  ],
  "hallucinations": [
    {"message_id": "id", "claim": "false claim", "confidence": "high"}
  ],
  "total_issues": 10,
  "severity": "medium"
}

**Map astrologer issues to categories:**
- Missing birth details → incomplete_answers
- Generic responses → misunderstandings
- No remedies → incomplete_answers
- Overpromising → hallucinations
- Missing reasoning → incomplete_answers

Limit to top 3 issues per category.

Conversations:
${conversations.map((c, i) => `\n--- Conversation ${i + 1} ---\n${c}\n`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, getDefaultIssueDetection());

    return {
      repetitive_responses: parsed.repetitive_responses || [],
      misunderstandings: parsed.misunderstandings || [],
      incomplete_answers: parsed.incomplete_answers || [],
      hallucinations: parsed.hallucinations || [],
      total_issues: parsed.total_issues || 0,
      severity: parsed.severity || 'low'
    };
  } catch (error) {
    console.error('[Issues] Detection failed:', error);
    return getDefaultIssueDetection();
  }
}

/**
 * Analyze topics in conversations using AI
 */
export async function analyzeTopics(conversations: string[]): Promise<TopicDistribution> {
  try {
    const systemPrompt = 'You are an expert conversation analyst. Identify main topics in astrology discussions. Always respond with valid JSON.';

    const prompt = `Analyze the main topics discussed in these ${conversations.length} astrology conversations.

Identify:
1. Primary topics (marriage, career, health, education, finance, etc.)
2. Sub-topics within each primary topic
3. Emerging topics (recently discussed)
4. Trending topics (most frequently discussed)

Return ONLY a JSON object with this exact structure:
{
  "topics": [
    {"name": "Marriage", "count": 25, "percentage": 45, "examples": ["when will I get married"], "subtopics": ["timing", "compatibility"]}
  ],
  "emerging_topics": ["remedies", "gemstones"],
  "trending_topics": ["marriage", "career"]
}

Limit to top 6 topics to keep response concise.

Conversations:
${conversations.map((c, i) => `\n--- Conversation ${i + 1} ---\n${c}\n`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, getDefaultTopicDistribution());

    return {
      topics: parsed.topics || [],
      emerging_topics: parsed.emerging_topics || [],
      trending_topics: parsed.trending_topics || []
    };
  } catch (error) {
    console.error('[Topics] Analysis failed:', error);
    return getDefaultTopicDistribution();
  }
}

/**
 * Analyze response lengths and patterns
 */
export function analyzeResponseLength(data: {
  userMessages: string[];
  botMessages: string[];
}): ResponseLengthAnalysis {
  try {
    const { userMessages, botMessages } = data;

    if (userMessages.length === 0 || botMessages.length === 0) {
      console.log('[ResponseLength] No messages provided');
      return getDefaultResponseLengthAnalysis();
    }

    // Calculate individual message lengths
    const userLengths = userMessages.map(m => m.length);
    const botLengths = botMessages.map(m => m.length);

    const avgUserLength = userLengths.reduce((a, b) => a + b, 0) / userLengths.length;
    const avgBotLength = botLengths.reduce((a, b) => a + b, 0) / botLengths.length;

    const distribution = {
      short: botLengths.filter(l => l < 50).length,
      medium: botLengths.filter(l => l >= 50 && l <= 200).length,
      long: botLengths.filter(l => l > 200).length
    };

    const tooLong = botLengths.filter(l => l > 500).length;
    const tooShort = botLengths.filter(l => l < 30).length;

    console.log('[ResponseLength] User avg:', avgUserLength, 'Bot avg:', avgBotLength);
    console.log('[ResponseLength] Distribution:', distribution);

    return {
      average_user_length: Math.round(avgUserLength),
      average_bot_length: Math.round(avgBotLength),
      length_distribution: distribution,
      optimal_length_range: { min: 50, max: 300 },
      too_long_responses: tooLong,
      too_short_responses: tooShort
    };
  } catch (error) {
    console.error('Response length analysis failed:', error);
    return getDefaultResponseLengthAnalysis();
  }
}

/**
 * Analyze user satisfaction signals
 */
export function analyzeSatisfaction(messages: Array<{role: string; text: string}>): SatisfactionSignals {
  try {
    const userMessages = messages.filter(m => m.role === 'user');
    const allText = userMessages.map(m => m.text.toLowerCase()).join(' ');

    const positiveKeywords = ['thank', 'great', 'helpful', 'perfect', 'thanks', 'awesome', 'good', 'appreciate'];
    const negativeKeywords = ['not helpful', 'wrong', 'bad', 'useless', 'incorrect', 'doesn\'t help', 'waste'];
    const followUpKeywords = ['but what about', 'also', 'another question', 'one more thing', 'what if'];
    const confusionKeywords = ['i don\'t understand', 'confused', 'not clear', 'explain again', 'what do you mean'];

    let explicitPositive = 0;
    let explicitNegative = 0;
    let followUp = 0;
    let repeats = 0;

    userMessages.forEach(msg => {
      const text = msg.text.toLowerCase();
      if (positiveKeywords.some(kw => text.includes(kw))) explicitPositive++;
      if (negativeKeywords.some(kw => text.includes(kw))) explicitNegative++;
      if (followUpKeywords.some(kw => text.includes(kw))) followUp++;
      if (confusionKeywords.some(kw => text.includes(kw))) repeats++;
    });

    // Calculate abandonment (messages ending without closure)
    const abandonment = userMessages.filter(m => {
      const text = m.text.toLowerCase();
      return text.length < 30 && !text.includes('?');
    }).length;

    const total = userMessages.length;
    const satisfactionScore = (explicitPositive - explicitNegative) / Math.max(total, 1);

    let overall: 'high' | 'medium' | 'low';
    if (satisfactionScore > 0.3) overall = 'high';
    else if (satisfactionScore > -0.2) overall = 'medium';
    else overall = 'low';

    return {
      explicit_positive: explicitPositive,
      explicit_negative: explicitNegative,
      follow_up_questions: followUp,
      repeat_queries: repeats,
      abandonment_rate: abandonment,
      overall_satisfaction: overall
    };
  } catch (error) {
    console.error('Satisfaction analysis failed:', error);
    return getDefaultSatisfactionSignals();
  }
}

/**
 * Default fallback values
 */
function getDefaultQualityScore(): QualityScore {
  return {
    overall: 75,
    accuracy: 75,
    completeness: 75,
    helpfulness: 75,
    confidence: 0.7
  };
}

function getDefaultSentimentAnalysis(): SentimentAnalysis {
  return {
    positive: 40,
    negative: 20,
    neutral: 40,
    overall: 'neutral',
    frustration_signals: 0,
    tone_trend: []
  };
}

function getDefaultIssueDetection(): IssueDetection {
  return {
    repetitive_responses: [],
    misunderstandings: [],
    incomplete_answers: [],
    hallucinations: [],
    total_issues: 0,
    severity: 'low'
  };
}

function getDefaultTopicDistribution(): TopicDistribution {
  return {
    topics: [
      { name: 'Marriage', count: 0, percentage: 0, examples: [], subtopics: [] }
    ],
    emerging_topics: [],
    trending_topics: []
  };
}

function getDefaultResponseLengthAnalysis(): ResponseLengthAnalysis {
  return {
    average_user_length: 100,
    average_bot_length: 200,
    length_distribution: { short: 0, medium: 0, long: 0 },
    optimal_length_range: { min: 50, max: 300 },
    too_long_responses: 0,
    too_short_responses: 0
  };
}

function getDefaultSatisfactionSignals(): SatisfactionSignals {
  return {
    explicit_positive: 0,
    explicit_negative: 0,
    follow_up_questions: 0,
    repeat_queries: 0,
    abandonment_rate: 0,
    overall_satisfaction: 'medium'
  };
}

/**
 * Detailed Response Analysis for Training
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

/**
 * Analyze individual conversations for detailed feedback
 * Evaluates against professional astrologer standards
 */
export async function analyzeDetailedResponses(conversations: Array<{
  id: string;
  text: string;
  timestamp: string;
}>): Promise<{
  analyses: DetailedResponseAnalysis[];
  summary: {
    total: number;
    critical: number;
    needs_improvement: number;
    good: number;
  };
}> {
  try {
    const systemPrompt = 'You are a master astrologer training an AI assistant. Evaluate responses against professional astrologer standards. Provide specific, actionable feedback for improvement. Always respond with valid JSON.';

    const prompt = `Analyze these ${conversations.length} astrology conversations as a professional astrologer would.

**For EACH conversation, evaluate against ASTROLOGER STANDARDS:**

**Issue Types (choose one):**
- "no_issue" - Follows best practices perfectly
- "missing_birth_details" - CRITICAL: Gave prediction without asking for birth date, time, place
- "generic_response" - HIGH: Response could apply to anyone (no specific astrological insight)
- "missing_remedy" - MEDIUM: User has problem but no remedy suggested (gemstone, mantra, puja)
- "overpromising" - HIGH: Gave deterministic prediction instead of "tendency" or "possibility"
- "missing_reasoning" - MEDIUM: Didn't explain which dasha/transit/house/planet caused the issue
- "incomplete" - MEDIUM: Partial answer to user's specific question
- "irrelevant" - HIGH: Didn't address user's actual question
- "vague" - MEDIUM: Answer is unclear or confusing

**Severity:**
- "high" - Violates core astrologer practices (missing birth details, overpromising, irrelevant)
- "medium" - Missed important but not critical elements (missing remedy, reasoning)
- "low" - Minor issues (tone, clarity)

**Improvement Suggestions should be:**
- Specific: What exactly should the bot say instead?
- Actionable: Clear steps to improve
- Astrologer-focused: Reference birth details, dashas, remedies, etc.

Return ONLY a JSON object with this exact structure:
{
  "analyses": [
    {
      "conversation_id": "id",
      "user_query": "user's exact message",
      "bot_response": "bot's exact response",
      "quality_score": 65,
      "issue_type": "missing_birth_details",
      "severity": "high",
      "reasoning": "Bot predicted marriage timing without asking for birth date, time, or place. Real astrologer always needs birth chart first.",
      "improvement_suggestion": "Ask: 'To give you accurate marriage timing, I need your birth date, exact time, and place of birth so I can analyze your dashas and transits.'",
      "detected_emotion": "anxious",
      "emotion_match": false,
      "topic": "Marriage timing"
    }
  ]
}

Limit to top ${Math.min(10, conversations.length)} conversations.

Conversations:
${conversations.slice(0, 10).map((c, i) => `\n--- Conversation ${i + 1} (ID: ${c.id}) ---\n${c.text}\n`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, { analyses: [] });
    const analyses = parsed.analyses || [];

    // Add timestamps from original conversations
    analyses.forEach((analysis: any, index: number) => {
      analysis.timestamp = conversations[index]?.timestamp || new Date().toISOString();
    });

    // Calculate summary
    const summary = {
      total: analyses.length,
      critical: analyses.filter((a: any) => a.severity === 'high').length,
      needs_improvement: analyses.filter((a: any) => a.severity === 'medium').length,
      good: analyses.filter((a: any) => a.issue_type === 'no_issue').length
    };

    return { analyses, summary };
  } catch (error) {
    console.error('[Detailed] Analysis failed:', error);
    return { analyses: [], summary: { total: 0, critical: 0, needs_improvement: 0, good: 0 } };
  }
}

/**
 * Analyze emotional accuracy across conversations
 * Evaluates how well bot responds like a real astrologer would to emotional states
 */
export async function analyzeEmotionalAccuracy(messages: Array<{
  role: string;
  text: string;
  conversation_id: string;
}>): Promise<EmotionalAccuracy> {
  try {
    const userMessages = messages.filter(m => m.role === 'user');

    const systemPrompt = 'You are a master astrologer evaluating emotional intelligence. Assess how well responses match astrologer standards for emotional support (empathetic + realistic + remedy-focused). Always respond with valid JSON.';

    const prompt = `Analyze emotional intelligence in these ${userMessages.length} astrology consultation messages.

**Evaluate like a PROFESSIONAL ASTROLOGER:**

**For EACH message:**
1. Detect actual emotion (anxious_about_future, hopeful, confused_by_astrology, frustrated_with_delays, curious, fearful, desperate_for_solution)
2. Did bot respond like a real astrologer would?
   - **Empathy**: Acknowledged their concern?
   - **Realism**: Honest about what astrology can/cannot predict?
   - **Reassurance**: Provided astrological remedy or positive perspective?
   - **Not dismissive**: Didn't just say "I cannot predict"?

3. If mismatched, what should a real astrologer say instead?

**Astrologer emotional response examples:**
- Anxious: "I understand your concern. Let me analyze your Saturn period and suggest remedies to ease this challenging time."
- Hopeless: "Your current dasha is difficult, but every planetary period ends. Here's what will help..."
- Frustrated: "I hear your frustration. Let's look at what your chart actually shows about timing."

Return ONLY a JSON object with this exact structure:
{
  "total_analyzed": 50,
  "correct_detections": 40,
  "incorrect_detections": 10,
  "mismatches": [
    {
      "conversation_id": "id",
      "user_message": "text",
      "actual_emotion": "anxious_about_future",
      "detected_emotion": "curious",
      "bot_response": "what bot said",
      "appropriate_response": "I understand you're worried about your future. Let me analyze your chart to see what remedies can help during this period."
    }
  ]
}

Limit to top ${Math.min(20, userMessages.length)} messages.

User messages (with conversation IDs):
${userMessages.slice(0, 20).map((m, i) => `${i + 1}. [${m.conversation_id}] "${m.text}"`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, { mismatches: [], correct_detections: 0, incorrect_detections: 0, total_analyzed: 0 });
    const mismatches = parsed.mismatches || [];
    const correct = parsed.correct_detections || 0;
    const incorrect = parsed.incorrect_detections || 0;
    const total = correct + incorrect;

    return {
      total_analyzed: parsed.total_analyzed || total,
      correct_detections: correct,
      incorrect_detections: incorrect,
      accuracy_percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      mismatches
    };
  } catch (error) {
    console.error('[Emotional Accuracy] Analysis failed:', error);
    return {
      total_analyzed: 0,
      correct_detections: 0,
      incorrect_detections: 0,
      accuracy_percentage: 0,
      mismatches: []
    };
  }
}

/**
 * Analyze topic-wise performance
 */
export async function analyzeTopicPerformance(conversations: Array<{
  id: string;
  text: string;
}>): Promise<TopicPerformance[]> {
  try {
    const systemPrompt = 'You are a conversation analyst. Identify topics in astrology chats. Respond with valid JSON only.';

    const prompt = `Identify main topics in these ${conversations.length} conversations:

Return ONLY this JSON:
{
  "topics": [
    {
      "topic": "Marriage",
      "total_conversations": 5,
      "accurate_responses": 4,
      "accuracy_percentage": 80,
      "common_issues": [
        {"issue": "Missing details", "count": 2, "percentage": 40, "examples": ["example"]}
      ],
      "avg_quality_score": 75
    }
  ]
}

Limit to top 4 topics.

Conversations (truncated):
${conversations.map((c, i) => `${i + 1}. ${c.text.substring(0, 300)}...`).join('\n')}`;

    const result = await callGroqAPI(prompt, systemPrompt);
    const parsed = safeJSONParse(result, { topics: [] });
    return parsed.topics || [];
  } catch (error) {
    console.error('[Topic Performance] Analysis failed:', error);
    return [];
  }
}
