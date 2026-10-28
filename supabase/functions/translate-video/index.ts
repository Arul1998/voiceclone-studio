import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const languageCodeMap: Record<string, string> = {
  'Tamil': 'ta', 'Hindi': 'hi', 'Telugu': 'te', 'Kannada': 'kn',
  'Malayalam': 'ml', 'Bengali': 'bn', 'Marathi': 'mr', 'Gujarati': 'gu',
  'Punjabi': 'pa', 'Odia': 'or', 'Assamese': 'as', 'Urdu': 'ur',
  'Sanskrit': 'sa', 'Konkani': 'kok', 'Nepali': 'ne', 'Sindhi': 'sd',
  'English': 'en', 'Spanish': 'es', 'French': 'fr', 'German': 'de',
  'Italian': 'it', 'Portuguese': 'pt', 'Russian': 'ru', 'Japanese': 'ja',
  'Korean': 'ko', 'Chinese': 'zh', 'Arabic': 'ar',
};

// Download video from Supabase Storage
async function downloadFromStorage(storagePath: string): Promise<Uint8Array> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase.storage
    .from('videos')
    .download(storagePath);

  if (error || !data) {
    throw new Error(`Storage download failed: ${error?.message || 'No data'}`);
  }

  return new Uint8Array(await data.arrayBuffer());
}

// Create dubbing project with ElevenLabs
async function createDubbingProject(
  videoBytes: Uint8Array,
  mimeType: string,
  targetLangCode: string
): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;

  const extMap: Record<string, string> = {
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'video/x-msvideo': 'avi', 'video/x-matroska': 'mkv',
  };
  const ext = extMap[mimeType] || 'mp4';

  const formData = new FormData();
  const videoBlob = new Blob([videoBytes], { type: mimeType || 'video/mp4' });
  formData.append('file', videoBlob, `video.${ext}`);
  formData.append('target_lang', targetLangCode);
  formData.append('mode', 'automatic');
  formData.append('num_speakers', '0');
  formData.append('watermark', 'false');
  formData.append('highest_resolution', 'true');

  const response = await fetch('https://api.elevenlabs.io/v1/dubbing', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Dubbing creation failed: ${errorText}`);
  }

  const data = await response.json();
  return data.dubbing_id;
}

// Poll for dubbing completion
async function pollDubbingStatus(dubbingId: string): Promise<any> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;
  const maxAttempts = 120; // 10 minutes max

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 5000));

    const response = await fetch(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status check failed: ${errorText}`);
    }

    const status = await response.json();
    console.log(`Dubbing status: ${status.status} (attempt ${attempt + 1})`);

    if (status.status === 'dubbed') return status;
    if (status.status === 'failed') {
      throw new Error(`Dubbing failed: ${status.error || 'Unknown error'}`);
    }
  }

  throw new Error('Dubbing timed out after 10 minutes');
}

// Download dubbed audio
async function downloadDubbedAudio(dubbingId: string, langCode: string): Promise<Uint8Array> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/audio/${langCode}`,
    { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Audio download failed: ${errorText}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

// Fetch transcript (optional, won't throw)
async function fetchTranscript(dubbingId: string, langCode: string): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')!;
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/dubbing/${dubbingId}/transcript/${langCode}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );
    if (response.ok) {
      const data = await response.json();
      return data.transcript || '';
    }
  } catch (e) {
    console.log('Could not fetch transcript:', e);
  }
  return '';
}

// Convert Uint8Array to base64 safely (chunked)
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { storagePath, mimeType, targetLanguage, voiceCloning } = await req.json();

    if (typeof storagePath !== 'string' || !storagePath.startsWith(`${user.id}/uploads/`) || storagePath.includes('..')) {
      return new Response(JSON.stringify({ error: 'Forbidden storage path' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!storagePath) {
      throw new Error('No video storage path provided');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    const targetLangCode = languageCodeMap[targetLanguage] || 'en';
    console.log(`Starting dubbing: ${targetLanguage} (${targetLangCode}), voice cloning: ${voiceCloning}`);

    // Step 1: Download video from Storage
    console.log('Downloading video from storage...');
    const videoBytes = await downloadFromStorage(storagePath);
    console.log(`Video size: ${videoBytes.length} bytes`);

    // Step 2: Create dubbing project
    console.log('Creating dubbing project...');
    const dubbingId = await createDubbingProject(videoBytes, mimeType, targetLangCode);
    console.log(`Dubbing ID: ${dubbingId}`);

    // Step 3: Poll for completion
    console.log('Waiting for dubbing...');
    const dubbingStatus = await pollDubbingStatus(dubbingId);
    console.log(`Dubbing complete. Speakers: ${dubbingStatus.num_speakers || 'unknown'}`);

    // Step 4: Download dubbed audio
    console.log('Downloading dubbed audio...');
    const audioBytes = await downloadDubbedAudio(dubbingId, targetLangCode);
    const audioBase64 = uint8ArrayToBase64(audioBytes);
    console.log(`Audio size: ${audioBytes.length} bytes`);

    // Step 5: Fetch transcripts (non-blocking)
    const sourceLang = dubbingStatus.source_lang || 'en';
    const [transcription, translation] = await Promise.all([
      fetchTranscript(dubbingId, sourceLang),
      fetchTranscript(dubbingId, targetLangCode),
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        sourceLanguage: { code: sourceLang, name: sourceLang },
        transcription: transcription || 'Multi-speaker audio processed',
        translation: translation || `Dubbed to ${targetLanguage}`,
        audioBase64,
        audioFormat: 'audio/mpeg',
        speakersDetected: dubbingStatus.num_speakers || 'multiple',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in translate-video:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
