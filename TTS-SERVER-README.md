# Voice Samples Testing - Edge TTS Server

## 🎤 What is This?

A local Python server that generates audio using **Edge TTS (100% FREE)** for testing voice samples in the hans-ai-dashboard.

## 🚀 Quick Start (Windows)

1. **Install Dependencies & Start Server:**
   ```bash
   # Double-click this file or run in terminal:
   start-tts-server.bat
   ```

2. **Open Dashboard:**
   - Go to http://localhost:3000/voice-samples
   - Select a voice and template
   - Click "Generate Audio"
   - **You'll hear real audio!** 🎵

## 📋 Manual Setup (All Platforms)

### 1. Install Python Dependencies:
```bash
pip install -r requirements-tts-server.txt
```

### 2. Start the TTS Server:
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

### 3. Test in Dashboard:
- Open http://localhost:3000/voice-samples
- Select any voice (6 options: 3 female + 3 male)
- Select any template (enforcement, emotional, greeting, astrology)
- Click "Generate Audio"
- **Play button will appear with real audio!**

## 🛑 Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

## 🎵 Available Voices

### Female Voices (Meera):
- **Meera - Hindi (Swara)** - Warm, gentle voice
- **Meera - Hindi (Tara)** - Soft, soothing voice
- **Meera - Hindi (Anjali)** - Natural, professional voice

### Male Voices (Aarav):
- **Aarav - Hindi (Madhur)** - Confident, calm voice
- **Aarav - Hindi (Ravi)** - Friendly, warm voice
- **Aarav - English (Neeraj)** - Indian English voice

## 💡 How It Works

1. Dashboard sends request to local TTS server (port 8765)
2. Server uses Edge TTS (Microsoft's free neural TTS)
3. Audio is generated and sent back to dashboard
4. Dashboard plays audio in browser
5. **100% FREE - No API costs!**

## 🔧 Configuration

The dashboard automatically connects to `http://localhost:8765`. To change the URL, set the environment variable:

```bash
PYTHON_BACKEND_URL=http://your-custom-url:8765
```

## 🐛 Troubleshooting

### Port Already in Use
If port 8765 is busy, change it in `tts-server.py`:
```python
uvicorn.run(app, host="127.0.0.1", port=8766)  # Use different port
```

### Dependencies Installation Failed
```bash
# Upgrade pip first
python -m pip install --upgrade pip

# Then install dependencies
pip install -r requirements-tts-server.txt
```

### Audio Not Playing
- Check browser console for errors
- Ensure TTS server is running
- Verify voice_id is valid (check server logs)

## 📦 Dependencies

- **fastapi** - Web framework
- **uvicorn** - ASGI server
- **edge-tts** - Microsoft Edge TTS (100% FREE)
- **python-multipart** - For form data

## 🎉 Production Usage

For production, you would:
1. Deploy this TTS server on a separate host
2. Set `PYTHON_BACKEND_URL` to the production URL
3. Use a process manager (systemd, PM2, etc.) to keep it running

For development/testing, running locally is perfect!
