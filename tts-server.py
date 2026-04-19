#!/usr/bin/env python3
"""
Edge TTS Server for Voice Samples Testing
Runs locally for hans-ai-dashboard development/testing
"""
import logging
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import edge_tts
import tempfile
import os
import base64

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tts-server")

# Create FastAPI app
app = FastAPI(title="Edge TTS Server", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Available voices
VOICES = {
    # Hindi Female Voices
    "hi-IN-SwaraNeural": {"name": "Meera - Hindi (Swara)", "gender": "female", "language": "hi"},
    "hi-IN-TaraNeural": {"name": "Meera - Hindi (Tara)", "gender": "female", "language": "hi"},
    "hi-IN-AnjaliNeural": {"name": "Meera - Hindi (Anjali)", "gender": "female", "language": "hi"},

    # Hindi Male Voices
    "hi-IN-MadhurNeural": {"name": "Aarav - Hindi (Madhur)", "gender": "male", "language": "hi"},
    "hi-IN-RaviNeural": {"name": "Aarav - Hindi (Ravi)", "gender": "male", "language": "hi"},

    # Indian English Male Voice
    "en-IN-NeerajNeural": {"name": "Aarav - English (Neeraj)", "gender": "male", "language": "en"},
}


class TTSRequest(BaseModel):
    voice_id: str
    text: str


@app.get("/")
async def root():
    return {
        "service": "Edge TTS Server",
        "status": "running",
        "voices_count": len(VOICES)
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "edge-tts-server"}


@app.get("/voice-samples/voices")
async def get_voices():
    """Get list of available voices."""
    voices = [
        {
            "id": voice_id,
            "name": voice_data["name"],
            "gender": voice_data["gender"],
            "language": voice_data["language"]
        }
        for voice_id, voice_data in VOICES.items()
    ]
    return {"voices": voices}


@app.post("/voice-samples/generate")
async def generate_audio(request: TTSRequest):
    """Generate audio using Edge TTS (100% FREE)."""
    try:
        if request.voice_id not in VOICES:
            raise HTTPException(status_code=400, detail=f"Invalid voice_id: {request.voice_id}")

        logger.info(f"Generating audio: voice={request.voice_id}, text_length={len(request.text)}")

        # Create Edge TTS communicate object
        communicate = edge_tts.Communicate(request.text, request.voice_id)

        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
            temp_path = temp_file.name

        # Generate audio and save to file
        await communicate.save(temp_path)

        # Read the file back as bytes
        with open(temp_path, "rb") as f:
            audio_bytes = f.read()

        # Clean up temp file
        os.unlink(temp_path)

        # Encode to base64
        audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")

        logger.info(f"✓ Audio generated: {len(audio_bytes)} bytes")

        return {
            "success": True,
            "audio": audio_base64,
            "voice_id": request.voice_id,
            "text": request.text,
            "content_type": "audio/mpeg"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating audio: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print("\n" + "="*60)
    print("🎤 Edge TTS Server for Voice Samples Testing")
    print("="*60)
    print(f"📍 Server running at: http://localhost:8765")
    print(f"🎵 Available voices: {len(VOICES)}")
    print(f"💯 100% FREE using Microsoft Edge TTS")
    print("="*60)
    print("\n✨ Ready to generate audio!\n")

    uvicorn.run(app, host="127.0.0.1", port=8765)
