import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Starting video translation process...');
    console.log('Target language:', targetLanguage);
    console.log('Voice cloning enabled:', voiceCloning);

    // Step 1: Transcribe audio using Lovable AI (Gemini can process audio)
    console.log('Step 1: Transcribing audio...');
    
    const transcriptionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert audio transcriber. Listen to the audio and provide an accurate transcription. Also detect the language of the audio. Respond in JSON format: {"language": "detected language code (e.g., ta, en, es)", "languageName": "language name", "transcription": "the transcribed text"}'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please transcribe this audio and detect the language.'
              },
              {
                type: 'input_audio',
                input_audio: {
                  data: audioBase64,
                  format: 'wav'
                }
              }
            ]
          }
        ],
      }),
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('Transcription error:', errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const transcriptionData = await transcriptionResponse.json();
    const transcriptionText = transcriptionData.choices?.[0]?.message?.content || '';
    
    console.log('Transcription result:', transcriptionText);
    
    // Parse the JSON response
    let transcriptionResult;
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = transcriptionText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        transcriptionResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Could not parse transcription result');
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      // Fallback: treat the whole response as transcription
      transcriptionResult = {
        language: 'unknown',
        languageName: 'Unknown',
        transcription: transcriptionText
      };
    }

    // Step 2: Translate the text
    console.log('Step 2: Translating text to', targetLanguage);
    
    const translationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert translator. Translate the following text to ${targetLanguage}. Maintain the tone, style, and meaning. Only respond with the translated text, nothing else.`
          },
          {
            role: 'user',
            content: transcriptionResult.transcription
          }
        ],
      }),
    });

    if (!translationResponse.ok) {
      const errorText = await translationResponse.text();
      console.error('Translation error:', errorText);
      throw new Error(`Translation failed: ${errorText}`);
    }

    const translationData = await translationResponse.json();
    const translatedText = translationData.choices?.[0]?.message?.content || '';
    
    console.log('Translation result:', translatedText);

    // Step 3: Generate speech using ElevenLabs with voice cloning
    console.log('Step 3: Generating speech with ElevenLabs...');
    
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    let voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Default fallback voice (Sarah)
    
    // If voice cloning is enabled, create an instant voice clone
    if (voiceCloning) {
      console.log('Creating instant voice clone from original audio...');
      try {
        // Convert base64 audio to blob for voice cloning
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create FormData with the audio file
        const formData = new FormData();
        const audioBlob = new Blob([bytes], { type: 'audio/wav' });
        formData.append('files', audioBlob, 'voice_sample.wav');
        formData.append('name', `voice_clone_${Date.now()}`);
        formData.append('description', 'Voice clone for video translation');
        
        const cloneResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
          },
          body: formData,
        });

        if (cloneResponse.ok) {
          const cloneData = await cloneResponse.json();
          voiceId = cloneData.voice_id;
          console.log('Voice clone created successfully, voice ID:', voiceId);
        } else {
          const errorText = await cloneResponse.text();
          console.warn('Voice cloning failed, using default voice:', errorText);
        }
      } catch (cloneError) {
        console.warn('Voice cloning error, using default voice:', cloneError);
      }
    }
    
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: translatedText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('TTS error:', errorText);
      throw new Error(`Text-to-speech failed: ${errorText}`);
    }

    const audioArrayBuffer = await ttsResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow
    const uint8Array = new Uint8Array(audioArrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const audioBase64Output = btoa(binary);
    
    console.log('Speech generation complete. Audio size:', audioArrayBuffer.byteLength, 'bytes');

    return new Response(
      JSON.stringify({
        success: true,
        sourceLanguage: {
          code: transcriptionResult.language,
          name: transcriptionResult.languageName
        },
        transcription: transcriptionResult.transcription,
        translation: translatedText,
        audioBase64: audioBase64Output,
        audioFormat: 'audio/mpeg'
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
