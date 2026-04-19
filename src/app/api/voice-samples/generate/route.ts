import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { voice_id, text } = body;

    if (!voice_id || !text) {
      return NextResponse.json(
        { error: 'Missing voice_id or text' },
        { status: 400 }
      );
    }

    // Call Python backend Edge TTS service
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8765';

    try {
      const response = await fetch(`${pythonBackendUrl}/voice-samples/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voice_id, text }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend error:', errorData);
        return NextResponse.json(
          { error: errorData.detail || 'Failed to generate audio' },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Convert base64 audio to blob URL
      if (data.success && data.audio) {
        const audioBytes = Buffer.from(data.audio, 'base64');
        const blob = new Blob([audioBytes], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(blob);

        return NextResponse.json({
          success: true,
          audio_url: audioUrl,
          voice_id: data.voice_id,
          text: data.text,
          mock: false, // Real audio from backend
        });
      }

      return NextResponse.json(
        { error: 'Failed to generate audio' },
        { status: 500 }
      );

    } catch (fetchError: any) {
      // Backend connection failed - fall back to testing mode
      console.warn('Backend connection failed, using testing mode:', fetchError.message);

      // Create a mock response for testing
      const mockAudioData = new Uint8Array(1000);
      const blob = new Blob([mockAudioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(blob);

      await new Promise(resolve => setTimeout(resolve, 1000));

      return NextResponse.json({
        success: true,
        audio_url: audioUrl,
        voice_id: voice_id,
        text: text,
        mock: true, // Flag indicating this is test data
        message: 'Backend not connected. Running in testing mode.',
      });
    }

  } catch (error: any) {
    console.error('Voice generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
