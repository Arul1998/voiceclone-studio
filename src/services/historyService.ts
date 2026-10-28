import { supabase } from '@/integrations/supabase/client';

export interface TranslationRecord {
  id: string;
  user_id: string;
  source_language: string | null;
  target_language: string;
  video_name: string;
  video_size: number | null;
  video_duration: number | null;
  speakers_detected: string | null;
  transcription: string | null;
  translation: string | null;
  audio_url: string | null;
  status: string;
  created_at: string;
}

export const saveTranslation = async (record: Omit<TranslationRecord, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('translations')
    .insert(record as any)
    .select()
    .single();

  if (error) {
    console.error('Failed to save translation:', error);
    throw error;
  }
  return data;
};

export const getTranslations = async (): Promise<TranslationRecord[]> => {
  const { data, error } = await supabase
    .from('translations')
    .select('*')
    .order('created_at', { ascending: false }) as any;

  if (error) {
    console.error('Failed to fetch translations:', error);
    throw error;
  }
  return data || [];
};

export const deleteTranslation = async (id: string) => {
  // Also delete audio from storage if exists
  const { data: record } = await supabase
    .from('translations')
    .select('audio_url')
    .eq('id', id)
    .single() as any;

  if (record?.audio_url) {
    const path = record.audio_url.startsWith('http') ? null : record.audio_url;
    if (path) {
      await supabase.storage.from('videos').remove([path]);
    }
  }

  const { error } = await supabase
    .from('translations')
    .delete()
    .eq('id', id) as any;

  if (error) throw error;
};
