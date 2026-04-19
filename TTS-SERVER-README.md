# Voice Samples Testing - Edge TTS Server

## 🎤 What is This?

A Python server that generates audio using **Edge TTS (100% FREE)** for testing voice samples in the hans-ai-dashboard.

## 🚀 Quick Start Options

### Option 1: Deploy on Coolify (Recommended for Production)
### Option 2: Run Locally with Docker
### Option 3: Run Locally with Python (for testing)

---

## ☁️ Option 1: Deploy on Coolify

### Step 1: Create New Service in Coolify

1. Go to your Coolify dashboard
2. Click "New Service" → "Dockerfile"
3. Select repository: `hans-ai-dashboard`
4. Set Dockerfile path: `Dockerfile.tts-server`
5. Set port: `8765`

### Step 2: Configure Environment

Add these environment variables in Coolify:
```
PYTHONUNBUFFERED=1
```

### Step 3: Deploy & Get URL

- Click "Deploy" in Coolify
- Wait for deployment to finish
- Coolify will assign a URL like: `https://edge-tts-server.your-domain.com`

### Step 4: Update Dashboard Configuration

In your **Dashboard** service on Coolify, add environment variable:
```
PYTHON_BACKEND_URL=https://edge-tts-server.your-domain.com
```

### Step 5: Redeploy Dashboard

Redeploy the dashboard service to apply the new environment variable.

### Step 6: Test Audio!

Open your dashboard at: `https://your-dashboard-url.com/voice-samples`

---

## 🐳 Option 2: Run Locally with Docker

### Start the TTS Server:
```bash
docker-compose -f docker-compose.tts-server.yml up -d
```

### Stop the TTS Server:
```bash
docker-compose -f docker-compose.tts-server.yml down
```

### View Logs:
```bash
docker-compose -f docker-compose.tts-server.yml logs -f
```

The server will run at: `http://localhost:8765`

---

## 🐍 Option 3: Run Locally with Python (for testing)

### Prerequisites:
- Python 3.8+ installed
- pip installed

### Install Dependencies:
```bash
pip install -r requirements-tts-server.txt
```

### Start Server:
```bash
python tts-server.py
```

You should see:
```
============================================================
🎤 Edge TTS Server for Voice Samples Testing
============================================================
📍 Server running at: http://localhost:8765
🎵 Available voices: 6
💯 100% FREE using Microsoft Edge TTS
============================================================

✨ Ready to generate audio!
```

---

## 🎵 Available Voices

### Female Voices (Meera):
- **Meera - Hindi (Swara)** - Warm, gentle voice
- **Meera - Hindi (Tara)** - Soft, soothing voice
- **Meera - Hindi (Anjali)** - Natural, professional voice

### Male Voices (Aarav):
- **Aarav - Hindi (Madhur)** - Confident, calm voice
- **Aarav - Hindi (Ravi)** - Friendly, warm voice
- **Aarav - English (Neeraj)** - Indian English voice

---

## 💡 How It Works

1. Dashboard sends request to TTS server
2. Server uses Edge TTS (Microsoft's free neural TTS)
3. Audio is generated and sent back to dashboard
4. Dashboard plays audio in browser
5. **100% FREE - No API costs!**

---

## 🔧 Configuration

The dashboard connects to TTS server via `PYTHON_BACKEND_URL` environment variable:

- **Default (local testing):** `http://localhost:8765`
- **Coolify deployment:** `https://edge-tts-server.your-domain.com`
- **Custom:** Any URL where your TTS server is running

---

## 🐛 Troubleshooting

### Audio Not Playing (Coolify)
1. Check if TTS service is running in Coolify
2. Verify `PYTHON_BACKEND_URL` is set in dashboard
3. Check TTS service logs in Coolify
4. Ensure both services are on the same network

### Port Already in Use (Local)
Change port in `tts-server.py`:
```python
uvicorn.run(app, host="127.0.0.1", port=8766)
```

### Dependencies Installation Failed
```bash
python -m pip install --upgrade pip
pip install -r requirements-tts-server.txt
```

---

## 📦 Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **edge-tts** - Microsoft Edge TTS (100% FREE)
- **python-multipart** - For form data

---

## 🎉 Coolify Deployment Architecture

```
┌─────────────────────────┐
│   Coolify Dashboard     │
│                         │
│  ┌───────────────────┐  │
│  │ hans-ai-dashboard │  │
│  │   (Next.js)       │  │
│  │   Port: 3000      │  │
│  └────────┬──────────┘  │
│           │              │
│           │ HTTP API     │
│           ▼              │
│  ┌───────────────────┐  │
│  │  edge-tts-server  │  │
│  │   (Python)        │  │
│  │   Port: 8765      │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

Both services run in Coolify and communicate internally! 🚀
