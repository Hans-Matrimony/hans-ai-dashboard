/**
 * AI Analytics Service
 * Interfaces with DeepSeek, Groq APIs for fast, accurate conversation analysis
 * Primary: DeepSeek V4 Flash (best for reasoning, very cheap)
 * Fallback: Groq Llama 3.1 (free tier with rate limits)
 */

import axios, { AxiosError } from 'axios';
import {
  QualityScore,
  SentimentAnalysis,
  IssueDetection,
  TopicDistribution,
  ResponseLengthAnalysis,
  SatisfactionSignals,
  FriendshipPositioning
} from './analytics-types';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const ZAI_API_KEY = process.env.ZAI_API_KEY || '';
const HF_API_KEY = process.env.HF_API_KEY || '';
const API_TIMEOUT = 120000; // 2 minutes

// Choose API priority: DeepSeek (primary) -> Groq (fallback, free)
const USE_ZAI = false; // Z.AI disabled - using DeepSeek only
const USE_DEEPSEEK = DEEPSEEK_API_KEY && DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here';
const USE_HF = false; // Hugging Face disabled - models not available on free inference API

// Simple in-memory cache for friendship scores (avoid re-analyzing same conversations)
const friendshipCache = new Map<string, { score: FriendshipPositioning; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Call AI API (DeepSeek -> Groq fallback) for analysis
 */
async function callAIAPI(prompt: string, systemPrompt: string = 'You are an expert AI analyst.') {
  console.log('\n' + '─'.repeat(40));
  console.log('🔌 [AI API] Initializing API call');
  console.log('   ├─ USE_DEEPSEEK:', USE_DEEPSEEK);
  console.log('   ├─ DEEPSEEK_API_KEY:', DEEPSEEK_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('   ├─ GROQ_API_KEY:', GROQ_API_KEY ? '✅ SET' : '❌ NOT SET');
  console.log('   └─ Prompt length:', prompt.length, 'characters');
  console.log('─'.repeat(40));

  // PRIMARY: DeepSeek V4 Flash (fast, cheap, great reasoning)
  if (false) { // Z.AI disabled
    const zaiStartTime = Date.now();
    try {
      console.log('\n🟢 [Z.AI] Sending request...');
      console.log('   ├─ Model: glm-4.7-flash (FREE)');
      console.log('   ├─ Max tokens: 2048');
      console.log('   └─ Temperature: 0.3');

      const response = await axios.post(
        'https://api.z.ai/api/coding/paas/v4/chat/completions',
        {
          model: 'glm-4.7-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${ZAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: API_TIMEOUT
        }
      );

      const content = response.data.choices[0].message.content;
      const zaiDuration = ((Date.now() - zaiStartTime) / 1000).toFixed(2);

      console.log('\n✅ [Z.AI] SUCCESS!');
      console.log('   ├─ Response length:', content?.length || 0, 'characters');
      console.log('   ├─ Duration:', zaiDuration, 'seconds');
      console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
      console.log('─'.repeat(40) + '\n');

      return content;
    } catch (zaiError: any) {
      const zaiDuration = ((Date.now() - zaiStartTime) / 1000).toFixed(2);
      console.error('\n❌ [Z.AI] FAILED!');
      console.error('   ├─ Duration:', zaiDuration, 'seconds');
      console.error('   ├─ Error:', zaiError instanceof Error ? zaiError.message : String(zaiError));
      if (axios.isAxiosError(zaiError)) {
        console.error('   ├─ Status:', zaiError.response?.status || 'No response');
        console.error('   └─ Data:', zaiError.response?.data ? JSON.stringify(zaiError.response.data).substring(0, 200) : 'N/A');
      }
      console.error('   ⬇️  Falling back to DeepSeek API...');
      console.log('─'.repeat(40));
      // Fall through to DeepSeek
    }
  }

  // PRIMARY: DeepSeek V4 Flash (fast, cheap, great reasoning)
  if (USE_DEEPSEEK) {
    const deepseekStartTime = Date.now();
    try {
      console.log('\n🔵 [DEEPSEEK V4 FLASH] Sending request...');
      console.log('   ├─ Model: deepseek-chat (V4 Flash)');
      console.log('   ├─ Max tokens: 2048');
      console.log('   └─ Temperature: 0.3');

      const response = await axios.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: API_TIMEOUT
        }
      );

      const content = response.data.choices[0].message.content;
      const deepseekDuration = ((Date.now() - deepseekStartTime) / 1000).toFixed(2);

      console.log('\n✅ [DEEPSEEK] SUCCESS!');
      console.log('   ├─ Response length:', content?.length || 0, 'characters');
      console.log('   ├─ Duration:', deepseekDuration, 'seconds');
      console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
      console.log('─'.repeat(40) + '\n');

      return content;
    } catch (deepseekError) {
      const deepseekDuration = ((Date.now() - deepseekStartTime) / 1000).toFixed(2);
      console.error('\n❌ [DEEPSEEK] FAILED!');
      console.error('   ├─ Duration:', deepseekDuration, 'seconds');
      console.error('   ├─ Error:', deepseekError instanceof Error ? deepseekError.message : String(deepseekError));

      if (axios.isAxiosError(deepseekError)) {
        console.error('   ├─ Status:', deepseekError.response?.status || 'No response');
        console.error('   └─ Data:', deepseekError.response?.data ? JSON.stringify(deepseekError.response.data).substring(0, 200) : 'N/A');
      }
      console.error('   ⬇️  Falling back to Groq API...');
      console.log('─'.repeat(40));
      // Fall through to Groq
    }
  }

  // SECONDARY: Groq API (free tier with rate limits)
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const groqStartTime = Date.now();
    try {
      if (retryCount > 0) {
        console.log(`\n🔄 [GROQ API] Retry attempt ${retryCount}/${maxRetries}...`);
      } else {
        console.log('\n🟧 [GROQ API] Sending request...');
      }
      console.log('   ├─ Model: llama-3.1-8b-instant');
      console.log('   ├─ Max tokens: 2048');
      console.log('   ├─ Temperature: 0.3');
      console.log('   └─ Response format: json_object');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2048,
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
      const groqDuration = ((Date.now() - groqStartTime) / 1000).toFixed(2);

      console.log('\n✅ [GROQ API] SUCCESS!');
      console.log('   ├─ Response length:', content?.length || 0, 'characters');
      console.log('   ├─ Duration:', groqDuration, 'seconds');
      console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
      console.log('─'.repeat(40) + '\n');

      return content;
    } catch (groqError: any) {
      const groqDuration = ((Date.now() - groqStartTime) / 1000).toFixed(2);

      // Check if it's a rate limit error (429)
      if (axios.isAxiosError(groqError) && groqError.response?.status === 429) {
        retryCount++;

        if (retryCount < maxRetries) {
          // Wait longer with each retry (5s, 10s, 20s)
          const waitTime = 5000 * Math.pow(2, retryCount - 1);
          console.error(`\n⚠️  [GROQ API] Rate limit hit! Waiting ${waitTime/1000}s before retry...`);
          console.error(`   ├─ Retry ${retryCount}/${maxRetries}`);
          console.error(`   └─ Status: 429 (Too Many Requests)`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue; // Retry the request
        }
      }

      // If not rate limit or max retries reached, fail
      console.error('\n❌ [GROQ API] FAILED!');
      console.error('   ├─ Duration:', groqDuration, 'seconds');
      console.error('   ├─ Error:', groqError instanceof Error ? groqError.message : String(groqError));

      if (axios.isAxiosError(groqError)) {
        console.error('   ├─ Status:', groqError.response?.status || 'No response');
        console.error('   └─ Data:', groqError.response?.data ? JSON.stringify(groqError.response.data).substring(0, 200) : 'N/A');
      }
      console.error('─'.repeat(40) + '\n');
      throw groqError;
    }
  }

  throw new Error('Max retries reached for Groq API');
}

/**
 * Call Groq API directly (for single user friendship analysis)
 * Always uses Groq Llama 3.1 (free tier with rate limits)
 */
async function callGroqDirect(prompt: string, systemPrompt: string = 'You are an expert AI analyst.'): Promise<string> {
  console.log('\n' + '─'.repeat(40));
  console.log('🟧 [GROQ DIRECT] Single user analysis');
  console.log('   ├─ Model: llama-3.1-8b-instant');
  console.log('   ├─ Max tokens: 2048');
  console.log('   └─ Temperature: 0.3');
  console.log('─'.repeat(40));

  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    const groqStartTime = Date.now();
    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 2048,
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
      const groqDuration = ((Date.now() - groqStartTime) / 1000).toFixed(2);

      console.log('\n✅ [GROQ DIRECT] SUCCESS!');
      console.log('   ├─ Response length:', content?.length || 0, 'characters');
      console.log('   ├─ Duration:', groqDuration, 'seconds');
      console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
      console.log('─'.repeat(40) + '\n');

      return content;
    } catch (groqError: any) {
      const groqDuration = ((Date.now() - groqStartTime) / 1000).toFixed(2);

      if (axios.isAxiosError(groqError) && groqError.response?.status === 429) {
        retryCount++;
        if (retryCount < maxRetries) {
          const waitTime = 5000 * Math.pow(2, retryCount - 1);
          console.error(`\n⚠️  [GROQ DIRECT] Rate limit hit! Waiting ${waitTime/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      console.error('\n❌ [GROQ DIRECT] FAILED!');
      console.error('   ├─ Error:', groqError instanceof Error ? groqError.message : String(groqError));
      if (axios.isAxiosError(groqError)) {
        console.error('   ├─ Status:', groqError.response?.status || 'No response');
      }
      console.error('─'.repeat(40) + '\n');
      throw groqError;
    }
  }

  throw new Error('Max retries reached for Groq API');
}

/**
 * Call Z.AI API directly (for real-time friendship analysis)
 * Uses GLM-4.7 Flash - FREE, fast, good reasoning
 */
async function callZaiDirect(prompt: string, systemPrompt: string = 'You are an expert AI analyst.'): Promise<string> {
  console.log('\n' + '─'.repeat(40));
  console.log('🟢 [Z.AI DIRECT] Real-time analysis');
  console.log('   ├─ Model: glm-4.7-flash (FREE)');
  console.log('   ├─ Max tokens: 2048');
  console.log('   └─ Temperature: 0.3');
  console.log('─'.repeat(40));

  const startTime = Date.now();
  try {
    const response = await axios.post(
      'https://api.z.ai/api/coding/paas/v4/chat/completions',
      {
        model: 'glm-4.7-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${ZAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT
      }
    );

    const content = response.data.choices[0].message.content;
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ [Z.AI DIRECT] SUCCESS!');
    console.log('   ├─ Response length:', content?.length || 0, 'characters');
    console.log('   ├─ Duration:', duration, 'seconds');
    console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
    console.log('─'.repeat(40) + '\n');

    return content;
  } catch (error) {
    console.error('\n❌ [Z.AI DIRECT] FAILED!');
    console.error('   ├─ Duration:', ((Date.now() - startTime) / 1000).toFixed(2), 'seconds');
    console.error('   ├─ Error:', error instanceof Error ? error.message : String(error));
    if (axios.isAxiosError(error)) {
      console.error('   ├─ Status:', error.response?.status || 'No response');
    }
    console.error('─'.repeat(40) + '\n');
    throw error;
  }
}

/**
 * Call DeepSeek API directly (for batch friendship analysis)
 * Always uses DeepSeek V4 Flash (fast, cheap, great reasoning)
 */
async function callDeepSeekDirect(prompt: string, systemPrompt: string = 'You are an expert AI analyst.'): Promise<string> {
  console.log('\n' + '─'.repeat(40));
  console.log('🔵 [DEEPSEEK DIRECT] Batch analysis');
  console.log('   ├─ Model: deepseek-chat (V4 Flash)');
  console.log('   ├─ Max tokens: 2048');
  console.log('   └─ Temperature: 0.3');
  console.log('─'.repeat(40));

  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: API_TIMEOUT
      }
    );

    const content = response.data.choices[0].message.content;
    const duration = ((Date.now() - Date.now()) / 1000).toFixed(2);

    console.log('\n✅ [DEEPSEEK DIRECT] SUCCESS!');
    console.log('   ├─ Response length:', content?.length || 0, 'characters');
    console.log('   └─ Preview:', content?.substring(0, 100) || 'No content', '...');
    console.log('─'.repeat(40) + '\n');

    return content;
  } catch (error) {
    console.error('\n❌ [DEEPSEEK DIRECT] FAILED!');
    console.error('   ├─ Error:', error instanceof Error ? error.message : String(error));
    if (axios.isAxiosError(error)) {
      console.error('   ├─ Status:', error.response?.status || 'No response');
      console.error('   ├─ Status Text:', error.response?.statusText || 'N/A');
      console.error('   └─ Data:', error.response?.data ? JSON.stringify(error.response.data) : 'N/A');
    }
    console.error('─'.repeat(40) + '\n');
    throw error;
  }
}

/**
 * Call AI API with automatic fallback (DeepSeek -> Groq)
 * Used for general analytics
 */
async function callGroqAPI(prompt: string, systemPrompt: string = 'You are an expert AI analyst.') {
  return callAIAPI(prompt, systemPrompt);
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

/**
 * Analyze friendship positioning for a single user
 * Measures how well the AI agent builds a friend-like connection
 * Uses Groq AI with detailed scoring criteria for accurate results
 *
 * @param messages - Array of messages with role and text
 * @returns FriendshipPositioning score with breakdown
 */
export async function analyzeFriendshipPositioning(
  messages: Array<{role: string; text: string}>
): Promise<FriendshipPositioning> {
  const startTime = Date.now();
  console.log('\n' + '═'.repeat(60));
  console.log('🤝 [FRIENDSHIP POSITIONING] ANALYSIS STARTED');
  console.log('═'.repeat(60));

  try {
    // Log total messages available
    console.log('📊 [INPUT] Total messages available:', messages.length);

    // Take last 20 messages for deeper analysis
    const recentMessages = messages.slice(-20);
    console.log('✂️  [PREPROCESSING] Analyzing last', recentMessages.length, 'messages');

    // Log message breakdown by role
    const userMsgs = recentMessages.filter(m => m.role === 'user').length;
    const aiMsgs = recentMessages.filter(m => m.role === 'assistant').length;
    console.log('   └─ User messages:', userMsgs, '| AI messages:', aiMsgs);

    // Create cache key from last 5 messages (enough to identify conversation)
    const cacheKey = recentMessages.slice(-5).map(m => m.text.slice(0, 50)).join('|');

    // Check cache
    const cached = friendshipCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('💾 [CACHE] Using cached score');
      console.log('✅ [FRIENDSHIP POSITIONING] COMPLETED (cached) - Score:', cached.score.overall);
      console.log('═'.repeat(60) + '\n');
      return cached.score;
    }

    if (recentMessages.length === 0) {
      console.error('❌ [ERROR] No messages to analyze');
      console.log('═'.repeat(60) + '\n');
      return getDefaultFriendshipScore();
    }

    console.log('🔍 [ANALYSIS] Starting AI-based friendship scoring...');
    console.log('   ├─ API Priority: DeepSeek V4 Flash (primary) → Groq (fallback)');
    console.log('   ├─ Cache: Miss (fresh analysis)');
    console.log('   └─ Message preview:', recentMessages[0]?.text?.substring(0, 50) + '...');

    const systemPrompt = `You are an expert evaluator of AI-human conversations, specifically for astrologer chatbots.
Your task is to SCORE how well this AI astrologer builds a GENUINE friendship connection with users.

IMPORTANT: Base your scores ONLY on actual evidence in the conversation. Be fair and objective.

SCORING CRITERIA (1-10 scale for each):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. EMPATHY (Emotional Connection)
   Does the bot acknowledge and validate the user's feelings?

   SCORE 10: "I can hear how worried you are about your career. Let me look at your chart together."
   SCORE 7: "I understand your concern about career."
   SCORE 4: "Your career will be fine." (no emotion acknowledgment)
   SCORE 1: "Career prediction coming up." (completely ignores emotion)

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. PERSONALIZATION (Remembers Context & User Details)
   Does the bot reference previous conversations or remember user-specific information?

   SCORE 10: "Like we discussed last week, your Saturn period is challenging now..."
   SCORE 7: "Based on what you mentioned earlier..."
   SCORE 4: "Let me check your birth chart..." (doesn't reference past context)
   SCORE 1: Generic advice that could apply to anyone (no personalization)

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. WARMTH (Friendly, Conversational Tone)
   Is the tone warm and natural, or robotic/formal?

   SCORE 10: "I'm really glad you reached out! Let's figure this out together."
   SCORE 7: "Happy to help with this."
   SCORE 4: "I will now analyze your chart." (robotic/formal)
   SCORE 1: "Provide birth details for analysis." (completely mechanical)

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. SUPPORTIVE LISTENING (Asks Follow-up Questions)
   Does the bot explore the issue before giving solutions?

   SCORE 10: "That sounds difficult. Can you tell me more about when this started?"
   SCORE 7: "What specifically concerns you the most?"
   SCORE 4: Gives advice without asking any follow-up questions
   SCORE 1: "Here is your prediction." (immediate solution, no exploration)

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. RAPPORT (Builds Trust & Shows Care)
   Does the bot create a sense of partnership and ongoing support?

   SCORE 10: "I'm here for you through this. Let's work on remedies together."
   SCORE 7: "I can guide you on this journey."
   SCORE 4: Transactional exchange (question → answer, no partnership)
   SCORE 1: Mechanical, disconnected responses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SCORING GUIDELINES:
- Overall score = AVERAGE of all 5 dimensions
- If conversation has <5 exchanges, reduce confidence score
- Be objective - score based on EVIDENCE in conversation
- If uncertain about a dimension, give mid-range score (5-6)
- Provide SPECIFIC quotes from conversation for strengths/improvements

Return ONLY valid JSON:
{
  "overall": 8.2,
  "empathy": 8,
  "personalization": 7,
  "warmth": 9,
  "supportive_listening": 8,
  "rapport": 8,
  "confidence": 0.85,
  "strengths": ["Quote specific example: 'I can hear how worried you are'"],
  "improvements": ["Quote specific example: 'Your Saturn period is difficult' - too direct"]
}`;

    // Build prompt with truncated conversation to reduce token usage
    const prompt = `Analyze this conversation and provide EVIDENCE-BASED friendship positioning score.

CONVERSATION (${recentMessages.length} messages, truncated to 200 chars each):
${recentMessages.map((m) => {
      const role = m.role === 'user' ? 'User' : 'AI';
      const truncatedText = m.text.length > 200 ? m.text.substring(0, 200) + '...' : m.text;
      return `${role}: ${truncatedText}`;
    }).join('\n\n')}

INSTRUCTIONS:
1. Score each dimension (1-10) based on SPECIFIC examples from conversation
2. For strengths: quote actual bot responses that demonstrate good friendship building
3. For improvements: quote actual bot responses that need improvement
4. Set confidence lower if conversation is too short (<10 messages)

Provide the friendship positioning score as JSON only.`;

    // Call AI API - Priority: DeepSeek (primary) -> Z.AI -> Groq (fallback)
    console.log('📡 [API] Sending request for single user analysis...');
    let result: string;

    // Try DeepSeek first (primary - fast, cheap, great reasoning)
    if (USE_DEEPSEEK) {
      try {
        console.log('   └─ Provider: DeepSeek V4 Flash (primary)');
        result = await callDeepSeekDirect(prompt, systemPrompt);
      } catch (deepseekError) {
        console.warn('   ⚠️  DeepSeek failed, falling back to Groq...');
        result = await callGroqDirect(prompt, systemPrompt);
      }
    } else if (USE_ZAI) {
      console.log('   └─ Provider: Z.AI GLM-4.7 Flash (secondary)');
      result = await callZaiDirect(prompt, systemPrompt);
    } else {
      console.log('   └─ Provider: Groq Llama 3.1 (fallback)');
      result = await callGroqDirect(prompt, systemPrompt);
    }

    // Parse and validate response
    console.log('📄 [PARSING] Parsing AI response...');
    const parsed = safeJSONParse(result, getDefaultFriendshipScore());

    // Ensure scores are within 1-10 range
    const clampScore = (score: number) => Math.max(1, Math.min(10, score || 5));

    // Adjust confidence based on conversation length (using 20 messages)
    let confidence = parsed.confidence || 0.8;
    if (recentMessages.length < 10) {
      confidence = Math.max(0.5, confidence - 0.2);
    }

    const finalScore = {
      overall: clampScore(parsed.overall),
      empathy: clampScore(parsed.empathy),
      personalization: clampScore(parsed.personalization),
      warmth: clampScore(parsed.warmth),
      supportive_listening: clampScore(parsed.supportive_listening),
      rapport: clampScore(parsed.rapport),
      confidence,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : []
    };

    // Save to cache
    friendshipCache.set(cacheKey, { score: finalScore, timestamp: Date.now() });

    // Success logging
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '✅ [SUCCESS] Friendship score calculated successfully!');
    console.log('─'.repeat(60));
    console.log('   ├─ Overall Score:', finalScore.overall, '/ 10');
    console.log('   ├─ Empathy:', finalScore.empathy, '| Personalization:', finalScore.personalization);
    console.log('   ├─ Warmth:', finalScore.warmth, '| Listening:', finalScore.supportive_listening);
    console.log('   ├─ Rapport:', finalScore.rapport, '| Confidence:', finalScore.confidence);
    console.log('   ├─ Duration:', duration, 'seconds');
    console.log('   ├─ Messages analyzed:', recentMessages.length, '/', messages.length);
    console.log('   └─ Strengths:', finalScore.strengths.length, '| Improvements:', finalScore.improvements.length);
    console.log('═'.repeat(60) + '\n');

    return finalScore;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error('\n' + '❌ [FAILURE] Friendship analysis FAILED!');
    console.error('─'.repeat(60));
    console.error('   ├─ Duration:', duration, 'seconds');
    console.error('   ├─ Messages available:', messages.length);
    console.error('   ├─ Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('   └─ Error message:', error instanceof Error ? error.message : String(error));

    if (axios.isAxiosError(error)) {
      console.error('\n   🌐 [AXIOS ERROR DETAILS]:');
      console.error('      ├─ Status:', error.response?.status || 'No response');
      console.error('      ├─ Status Text:', error.response?.statusText || 'N/A');
      console.error('      └─ Data:', error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'N/A');
    }

    console.error('═'.repeat(60) + '\n');
    return getDefaultFriendshipScore();
  }
}

/**
 * Batch analyze friendship positioning for multiple users
 * Processes users sequentially to respect rate limits
 *
 * @param usersMap - Map of userId to messages array
 * @param onProgress - Callback for progress updates
 * @returns Map of userId to FriendshipPositioning score
 */
export async function batchAnalyzeFriendshipPositioning(
  usersMap: Map<string, Array<{role: string; text: string}>>,
  onProgress?: (current: number, total: number, userId: string) => void
): Promise<Map<string, FriendshipPositioning>> {
  const results = new Map<string, FriendshipPositioning>();
  const userIds = Array.from(usersMap.keys());
  const total = userIds.length;
  const startTime = Date.now();

  console.log('\n' + '═'.repeat(60));
  console.log('🚀 [BATCH ANALYSIS] Starting friendship score batch processing');
  console.log('═'.repeat(60));
  console.log('📊 [INPUT] Total users to process:', total);

  // Count messages across all users
  let totalMessages = 0;
  for (const [_, msgs] of usersMap) {
    totalMessages += msgs.length;
  }
  console.log('📨 [INPUT] Total messages across all users:', totalMessages);
  console.log('⚙️  [CONFIG] Primary API:', USE_ZAI ? 'Z.AI GLM-4.7 Flash (FREE)' : 'DeepSeek V4 Flash (cheap, fast)');
  console.log('⚙️  [CONFIG] Fallback API: Groq Llama 3.1 (free tier, rate limited)');
  console.log('⚙️  [CONFIG] Rate limit delay:', USE_ZAI ? '2000ms between users (2s)' : '5000ms between users (5s)');
  console.log('⚙️  [CONFIG] Messages per user: 20 (truncated to 200 chars each)');
  console.log('⚙️  [CONFIG] Retry attempts: 3 (with exponential backoff)');
  console.log('═'.repeat(60) + '\n');

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const messages = usersMap.get(userId) || [];

    try {
      // Call progress callback
      if (onProgress) {
        onProgress(i + 1, total, userId);
      }

      // Progress logging
      const progressPct = Math.round(((i + 1) / total) * 100);
      console.log(`📈 [BATCH] ${i + 1}/${total} (${progressPct}%) - Analyzing ${userId} (${messages.length} messages)`);

      // For batch: use DeepSeek for faster, cheaper processing
      // Take last 20 messages per user (same as single user)
      const recentMessages = messages.slice(-20);

      // Build prompt for this user
      const systemPrompt = `You are an expert evaluator of AI-human conversations, specifically for astrologer chatbots.
Your task is to SCORE how well this AI astrologer builds a GENUINE friendship connection with users.

IMPORTANT: Base your scores ONLY on actual evidence in the conversation. Be fair and objective.

SCORING CRITERIA (1-10 scale for each): EMPATHY, PERSONALIZATION, WARMTH, SUPPORTIVE_LISTENING, RAPPORT
Overall score = AVERAGE of all 5 dimensions

Return ONLY valid JSON:
{
  "overall": 8.2,
  "empathy": 8,
  "personalization": 7,
  "warmth": 9,
  "supportive_listening": 8,
  "rapport": 8,
  "confidence": 0.85,
  "strengths": ["Specific example from conversation"],
  "improvements": ["Specific example from conversation"]
}`;

      const prompt = `Analyze this conversation and provide EVIDENCE-BASED friendship positioning score.

CONVERSATION (${recentMessages.length} messages, truncated to 200 chars each):
${recentMessages.map((m) => {
    const role = m.role === 'user' ? 'User' : 'AI';
    const truncatedText = m.text.length > 200 ? m.text.substring(0, 200) + '...' : m.text;
    return `${role}: ${truncatedText}`;
  }).join('\n\n')}

Provide the friendship positioning score as JSON only.`;

      // Use Z.AI (FREE) for batch, fallback to DeepSeek
      let result: string;
      if (USE_ZAI) {
        result = await callZaiDirect(prompt, systemPrompt);
      } else {
        result = await callDeepSeekDirect(prompt, systemPrompt);
      }
      const parsed = safeJSONParse(result, getDefaultFriendshipScore());

      // Clamp scores to 1-10 range
      const clampScore = (score: number) => Math.max(1, Math.min(10, score || 5));

      const score = {
        overall: clampScore(parsed.overall),
        empathy: clampScore(parsed.empathy),
        personalization: clampScore(parsed.personalization),
        warmth: clampScore(parsed.warmth),
        supportive_listening: clampScore(parsed.supportive_listening),
        rapport: clampScore(parsed.rapport),
        confidence: parsed.confidence || 0.8,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 3) : []
      };
      results.set(userId, score);

      // Check if score is valid (not default/failed)
      if (score.confidence > 0) {
        successCount++;
        console.log(`   ✅ Score: ${score.overall}/10 (confidence: ${score.confidence})`);
      } else {
        failureCount++;
        console.log(`   ⚠️  Failed or default score`);
      }

      // Add delay to respect rate limits
      // Z.AI: 2s delay (generous limits), DeepSeek/Groq: 5s delay
      if (i < userIds.length - 1) {
        const delayMs = USE_ZAI ? 2000 : 5000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      failureCount++;
      console.error(`   ❌ [BATCH] Failed for ${userId}:`, error instanceof Error ? error.message : String(error));
      // Set default score on failure
      results.set(userId, getDefaultFriendshipScore());
    }
  }

  // Final summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 [BATCH ANALYSIS] COMPLETED');
  console.log('═'.repeat(60));
  console.log('📊 [SUMMARY]');
  console.log(`   ├─ Total users processed: ${results.size}/${total}`);
  console.log(`   ├─ Successful: ${successCount} (${Math.round(successCount/total*100)}%)`);
  console.log(`   ├─ Failed: ${failureCount} (${Math.round(failureCount/total*100)}%)`);
  console.log(`   ├─ Total duration: ${duration}s`);
  console.log(`   ├─ Average per user: ${(parseFloat(duration)/total).toFixed(2)}s`);
  console.log(`   └─ Total messages analyzed: ${totalMessages}`);
  console.log('═'.repeat(60) + '\n');

  return results;
}

/**
 * Default friendship score when analysis fails
 */
function getDefaultFriendshipScore(): FriendshipPositioning {
  return {
    overall: 5,
    empathy: 5,
    personalization: 5,
    warmth: 5,
    supportive_listening: 5,
    rapport: 5,
    confidence: 0,
    strengths: [],
    improvements: ['Analysis failed - please try again']
  };
}
