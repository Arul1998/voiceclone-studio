export interface VideoFile {
  id: string;
  name: string;
  size: number;
  duration: number;
  url: string;
  thumbnail?: string;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface TranslationJob {
  id: string;
  status: 'pending' | 'detecting' | 'transcribing' | 'translating' | 'cloning' | 'syncing' | 'complete' | 'error';
  progress: number;
  sourceLanguage?: Language;
  targetLanguage: Language;
  originalVideo: VideoFile;
  translatedVideoUrl?: string;
  voiceCloning: boolean;
  error?: string;
}

export type ProcessingStep = {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
};
