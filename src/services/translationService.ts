import { supabase } from "@/integrations/supabase/client";
import { Language } from "@/types/video";
import { languages } from "@/data/languages";

export interface TranslationResult {
  success: boolean;
  sourceLanguage?: Language;
  transcription?: string;
  translation?: string;
  audioBase64?: string;
  audioFormat?: string;
  error?: string;
}

// Extract audio from video file as base64
export const extractAudioFromVideo = async (videoFile: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    
    video.onloadedmetadata = async () => {
      try {
        const audioContext = new AudioContext();
        const response = await fetch(video.src);
        const arrayBuffer = await response.arrayBuffer();
        
        // For now, we'll send the video file directly as it may contain audio
        // The backend will handle audio extraction
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        
        URL.revokeObjectURL(video.src);
        resolve(base64);
      } catch (error) {
        URL.revokeObjectURL(video.src);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };
  });
};

// Alternative: Use Web Audio API to extract audio
export const extractAudioAsWav = async (videoFile: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await videoFile.arrayBuffer();
      
      // Try to decode audio from the video file
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBuffer = audioBufferToWav(audioBuffer);
      const base64 = btoa(
        new Uint8Array(wavBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      resolve(base64);
    } catch (error) {
      console.error('Audio extraction error:', error);
      reject(error);
    }
  });
};

// Convert AudioBuffer to WAV format
function audioBufferToWav(audioBuffer: AudioBuffer): ArrayBuffer {
  const numChannels = 1; // Mono
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const data = audioBuffer.getChannelData(0);
  const buffer = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(buffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + data.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitDepth / 8, true);
  view.setUint16(32, numChannels * bitDepth / 8, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, data.length * 2, true);
  
  // Write audio data
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// Main translation function
export const translateVideo = async (
  videoFile: File,
  targetLanguage: Language,
  voiceCloning: boolean,
  onProgress: (step: string, progress: number) => void
): Promise<TranslationResult> => {
  try {
    onProgress('extracting', 10);
    
    // Extract audio as WAV
    let audioBase64: string;
    try {
      audioBase64 = await extractAudioAsWav(videoFile);
    } catch (e) {
      console.warn('WAV extraction failed, trying raw extraction:', e);
      audioBase64 = await extractAudioFromVideo(videoFile);
    }
    
    onProgress('processing', 30);
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('translate-video', {
      body: {
        audioBase64,
        targetLanguage: targetLanguage.name,
        voiceCloning
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw new Error(error.message || 'Translation failed');
    }

    if (!data.success) {
      throw new Error(data.error || 'Translation failed');
    }

    onProgress('complete', 100);

    // Map the source language code to our language list
    const sourceLanguage = languages.find(
      l => l.code === data.sourceLanguage?.code || 
           l.name.toLowerCase() === data.sourceLanguage?.name?.toLowerCase()
    ) || {
      code: data.sourceLanguage?.code || 'unknown',
      name: data.sourceLanguage?.name || 'Unknown',
      flag: '🌐'
    };

    return {
      success: true,
      sourceLanguage,
      transcription: data.transcription,
      translation: data.translation,
      audioBase64: data.audioBase64,
      audioFormat: data.audioFormat
    };
    
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed'
    };
  }
};

// Create a blob URL from base64 audio
export const createAudioBlobUrl = (base64: string, format: string = 'audio/mpeg'): string => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: format });
  return URL.createObjectURL(blob);
};
