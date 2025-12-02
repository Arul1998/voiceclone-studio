import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Language code mapping for ElevenLabs dubbing API
const languageCodeMap: Record<string, string> = {
  'Tamil': 'ta',
  'Hindi': 'hi',
  'Telugu': 'te',
  'Kannada': 'kn',
  'Malayalam': 'ml',
  'Bengali': 'bn',
  'Marathi': 'mr',
  'Gujarati': 'gu',
  'Punjabi': 'pa',
  'Odia': 'or',
  'Assamese': 'as',
  'Urdu': 'ur',
  'Sanskrit': 'sa',
  'Konkani': 'kok',
  'Nepali': 'ne',
  'Sindhi': 'sd',
  'English': 'en',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Italian': 'it',
  'Portuguese': 'pt',
  'Russian': 'ru',
  'Japanese': 'ja',
  'Korean': 'ko',
  'Chinese': 'zh',
  'Arabic': 'ar',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, targetLanguage, voiceCloning } = await req.json();
    
    if (!audioBase64) {
      throw new Error('No audio data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log('Starting multi-speaker video translation...');
    console.log('Target language:', targetLanguage);
    console.log('Voice cloning enabled:', voiceCloning);

    // Convert base64 audio to binary
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const targetLangCode = languageCodeMap[targetLanguage] || 'en';
    console.log('Target language code:', targetLangCode);

    // Use ElevenLabs Dubbing API for multi-speaker voice cloning
    console.log('Step 1: Creating dubbing project with ElevenLabs...');
    
    const formData = new FormData();
    const audioBlob = new Blob([bytes], { type: 'audio/wav' });
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('target_lang', targetLangCode);
    formData.append('mode', 'automatic'); // Automatic speaker detection
    formData.append('num_speakers', '0'); // Auto-detect number of speakers
    formData.append('watermark', 'false');

    const dubbingResponse = await fetch('https://api.elevenlabs.io/v1/dubbing', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: formData,
    });

    if (!dubbingResponse.ok) {
      const errorText = await dubbingResponse.text();
      console.error('Dubbing creation error:', errorText);
      throw new Error(`Dubbing creation failed: ${errorText}`);
    }

    const dubbingData = await dubbingResponse.json();
    const dubbingId = dubbingData.dubbing_id;
    console.log('Dubbing project created, ID:', dubbingId);

    // Step 2: Poll for dubbing completion
    console.log('Step 2: Waiting for dubbing to complete...');
    
    let dubbingComplete = false;
    let attempts = 0;
    const maxAttempts = 60; // Max 5 minutes (5 seconds * 60)
    let dubbingStatus: any = null;

    while (!dubbingComplete && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.elevenlabs.io/v1/dubbing/${dubbingId}`, {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('Status check error:', errorText);
        throw new Error(`Status check failed: ${errorText}`);
      }

      dubbingStatus = await statusResponse.json();
      console.log('Dubbing status:', dubbingStatus.status, `(attempt ${attempts + 1})`);

      if (dubbingStatus.status === 'dubbed') {
        dubbingComplete = true;
      } else if (dubbingStatus.status === 'failed') {
        throw new Error(`Dubbing failed: ${dubbingStatus.error || 'Unknown error'}`);
      }
      
      attempts++;
    }

    if (!dubbingComplete) {
      throw new Error('Dubbing timed out after 5 minutes');
    }

    // Step 3: Download the dubbed audio
    console.log('Step 3: Downloading dubbed audio...');
    
    const audioDownloadResponse = await fetch(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio/${targetLangCode}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!audioDownloadResponse.ok) {
      const errorText = await audioDownloadResponse.text();
      console.error('Audio download error:', errorText);
      throw new Error(`Audio download failed: ${errorText}`);
    }

    const dubbedAudioBuffer = await audioDownloadResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(dubbedAudioBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const audioBase64Output = btoa(binary);
    
    console.log('Multi-speaker dubbing complete. Audio size:', dubbedAudioBuffer.byteLength, 'bytes');
    console.log('Detected speakers:', dubbingStatus.num_speakers || 'unknown');

    // Get transcription info if available
    let transcription = '';
    let translation = '';
    let sourceLanguage = { code: 'auto', name: 'Auto-detected' };

    if (dubbingStatus.source_lang) {
      sourceLanguage = {
        code: dubbingStatus.source_lang,
        name: dubbingStatus.source_lang
      };
    }

    // Try to get transcript
    try {
      const transcriptResponse = await fetch(
        `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/transcript/${dubbingStatus.source_lang || 'en'}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );
      if (transcriptResponse.ok) {
        const transcriptData = await transcriptResponse.json();
        transcription = transcriptData.transcript || '';
      }
    } catch (e) {
      console.log('Could not fetch transcript:', e);
    }

    // Try to get translated transcript
    try {
      const translatedTranscriptResponse = await fetch(
        `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/transcript/${targetLangCode}`,
        {
          method: 'GET',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
        }
      );
      if (translatedTranscriptResponse.ok) {
        const translatedData = await translatedTranscriptResponse.json();
        translation = translatedData.transcript || '';
      }
    } catch (e) {
      console.log('Could not fetch translated transcript:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sourceLanguage,
        transcription: transcription || 'Multi-speaker audio processed',
        translation: translation || `Dubbed to ${targetLanguage}`,
        audioBase64: audioBase64Output,
        audioFormat: 'audio/mpeg',
        speakersDetected: dubbingStatus.num_speakers || 'multiple'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-video function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
