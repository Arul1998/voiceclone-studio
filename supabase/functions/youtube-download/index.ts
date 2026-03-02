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
    const { url } = await req.json();

    if (!url) {
      throw new Error('No YouTube URL provided');
    }

    console.log('Downloading YouTube video:', url);

    // Use a public YouTube download API
    // We'll use cobalt.tools API which is a free, open-source video downloader
    const apiResponse = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        url,
        vCodec: 'h264',
        vQuality: '720',
        aFormat: 'mp3',
        filenamePattern: 'basic',
        isAudioOnly: false,
      }),
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Cobalt API error:', errorText);
      throw new Error('Failed to process YouTube URL. The video may be restricted or unavailable.');
    }

    const apiData = await apiResponse.json();
    console.log('Cobalt response status:', apiData.status);

    if (apiData.status === 'error') {
      throw new Error(apiData.text || 'Failed to process video');
    }

    const downloadUrl = apiData.url;
    if (!downloadUrl) {
      throw new Error('No download URL received');
    }

    // Download the video
    console.log('Downloading video file...');
    const videoResponse = await fetch(downloadUrl);
    
    if (!videoResponse.ok) {
      throw new Error('Failed to download video file');
    }

    const videoBuffer = await videoResponse.arrayBuffer();
    const videoBytes = new Uint8Array(videoBuffer);

    // Check size limit (50MB)
    if (videoBytes.length > 50 * 1024 * 1024) {
      throw new Error('Video is too large (max 50MB). Try a shorter video.');
    }

    // Convert to base64 in chunks
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < videoBytes.length; i += chunkSize) {
      const chunk = videoBytes.subarray(i, Math.min(i + chunkSize, videoBytes.length));
      binary += String.fromCharCode(...chunk);
    }
    const videoBase64 = btoa(binary);

    console.log('Video downloaded, size:', videoBytes.length, 'bytes');

    return new Response(
      JSON.stringify({
        success: true,
        videoBase64,
        title: apiData.filename || 'youtube-video',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('YouTube download error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to download video',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
