# Coolify Deployment Guide - Hans AI Dashboard

## Environment Variables for Coolify

Add these variables in your Coolify application's Environment section:

### Required Variables

```bash
# Application
NODE_ENV=production

# Dashboard Authentication (REQUIRED - set your password)
DASHBOARD_PASSWORD=your_secure_password_here

# MongoDB Logger (Chat Logs)
NEXT_PUBLIC_MONGO_LOGGER_URL=https://tkgsogkk4cg4wkgok0cw4gk8.api.hansastro.com
```

### Optional Variables (for full functionality)

```bash
# API Keys for Friendship Analysis

# DeepSeek API (RECOMMENDED - for batch analysis)
# Get your key from: https://platform.deepseek.com/
# Pricing: $0.14/M input, $0.28/M output
DEEPSEEK_API_KEY=sk-your_deepseek_api_key_here

# Groq API (for single user analysis - FREE tier available)
# Get your key from: https://console.groq.com/keys
GROQ_API_KEY=gsk-your_groq_api_key_here
```

### Optional External Services

```bash
# Subscriptions Service (if you have the payment backend)
SUBSCRIPTIONS_URL=https://your-subscriptions-service.com

# API Configuration
NEXT_PUBLIC_API_URL=https://your-api-gateway.com
NEXT_PUBLIC_WS_URL=wss://your-api-gateway.com

# Mem0 Memory Server (if using memory features)
NEXT_PUBLIC_MEM0_URL=https://your-mem0-server.com

# Qdrant Vector Database (if using vector search)
NEXT_PUBLIC_QDRANT_URL=https://your-qdrant-instance.com
```

## How Friendship Analysis Works

### Single User Analysis (Calculate Score button)
- **API Used:** Groq (Llama 3.1-8b)
- **Messages:** Last 20 messages per user
- **Purpose:** Quick individual scoring
- **Cost:** FREE (Groq free tier)

### Batch Analysis (Analyze All Users button)
- **API Used:** DeepSeek V4 Flash
- **Messages:** Last 20 messages per user
- **Purpose:** Score all users at once
- **Cost:** ~$0.12 for 400 users
- **Fallback:** Falls back to Groq if DeepSeek key not set

## Scoring Metrics

Each user gets a friendship score (1-10) across 5 dimensions:

1. **Empathy** - How well bot acknowledges user emotions
2. **Personalization** - Remembers context and user details
3. **Warmth** - Friendly, conversational tone
4. **Listening** - Asks follow-up questions
5. **Rapport** - Builds trust and partnership

### Score Interpretation

| Score Range | Rating | Color |
|-------------|--------|-------|
| 7-10 | Excellent | 🟢 Green |
| 5-7 | Good | 🟡 Yellow |
| 1-5 | Needs Improvement | 🔴 Red |

## Minimum Required for Friendship Feature

To enable friendship analysis, you need at least ONE of these:

1. **DEEPSEEK_API_KEY** (Recommended for batch)
2. **GROQ_API_KEY** (Free tier, good for single users)

Without API keys, the feature will return default scores of 5.0.

## Testing Checklist

- [ ] Set DASHBOARD_PASSWORD for security
- [ ] Set DEEPSEEK_API_KEY for batch analysis
- [ ] Set GROQ_API_KEY for single user analysis
- [ ] Test login with dashboard password
- [ ] Test single user friendship score calculation
- [ ] Test batch friendship analysis (all users)
- [ ] Verify scores are not all 5.0 (indicates real AI analysis)
- [ ] Check strengths/improvements show actual conversation quotes

## Common Issues

### Issue: All scores showing 5.0
**Solution:** API keys not set or invalid. Check DEEPSEEK_API_KEY and GROQ_API_KEY.

### Issue: "userId parameter is required"
**Solution:** This was a bug in the frontend. Make sure you have the latest code.

### Issue: Rate limit errors
**Solution:** 
- For Groq: The code automatically retries with exponential backoff
- For DeepSeek: Use the batch analysis which has built-in delays

### Issue: Timeout on large batches
**Solution:** The timeout is set to 2 minutes (120s). For very large datasets, consider reducing the batch size.
