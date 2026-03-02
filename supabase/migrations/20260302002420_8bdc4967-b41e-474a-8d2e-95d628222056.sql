CREATE TABLE public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_language text,
  target_language text NOT NULL,
  video_name text NOT NULL,
  video_size bigint,
  video_duration real,
  speakers_detected text,
  transcription text,
  translation text,
  audio_url text,
  status text NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own translations"
  ON public.translations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own translations"
  ON public.translations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own translations"
  ON public.translations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);