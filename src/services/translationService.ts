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
  speakersDetected?: number | string;
  error?: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Upload video to Storage and return the path
const uploadVideoToStorage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'mp4';
  const filePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

  const { error } = await supabase.storage
    .from('videos')
    .upload(filePath, file, {
      contentType: file.type || 'video/mp4',
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  return filePath;
};

// Clean up uploaded file from Storage
const deleteVideoFromStorage = async (filePath: string): Promise<void> => {
  await supabase.storage.from('videos').remove([filePath]);
};

// Main translation function
export const translateVideo = async (
  videoFile: File,
  targetLanguage: Language,
  voiceCloning: boolean,
  onProgress: (step: string, progress: number) => void
): Promise<TranslationResult> => {
  if (videoFile.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
    };
  }

  let storagePath: string | null = null;

  try {
    // Step 1: Upload video to Storage
    onProgress('uploading', 10);
    storagePath = await uploadVideoToStorage(videoFile);

    onProgress('processing', 30);

    // Step 2: Call the edge function with the storage path
    const { data, error } = await supabase.functions.invoke('translate-video', {
      body: {
        storagePath,
        mimeType: videoFile.type || 'video/mp4',
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
      audioFormat: data.audioFormat,
      speakersDetected: data.speakersDetected,
    };

  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed'
    };
  } finally {
    // Clean up storage
    if (storagePath) {
      deleteVideoFromStorage(storagePath).catch(console.error);
    }
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
