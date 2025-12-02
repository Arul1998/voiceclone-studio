import { useState, useCallback } from 'react';
import { VideoFile, TranslationJob, Language, ProcessingStep } from '@/types/video';
import { languages } from '@/data/languages';

const generateId = () => Math.random().toString(36).substring(2, 9);

// Mock AI services - simulates backend processing
const mockDetectLanguage = async (): Promise<Language> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  // Randomly select a source language for demo
  const sourceLanguages = ['en', 'es', 'fr', 'de'];
  const randomCode = sourceLanguages[Math.floor(Math.random() * sourceLanguages.length)];
  return languages.find(l => l.code === randomCode) || languages[0];
};

const mockTranscribe = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return "This is a mock transcription of the video audio content.";
};

const mockTranslate = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return "Esta es una transcripción simulada del contenido de audio del video.";
};

const mockCloneVoice = async (): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 2500));
};

const mockSyncAudio = async (): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return "mock-translated-video-url";
};

export const useVideoTranslation = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(languages[1]); // Spanish default
  const [voiceCloning, setVoiceCloning] = useState(true);
  const [job, setJob] = useState<TranslationJob | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);

  const initializeSteps = (): ProcessingStep[] => [
    { id: 'detect', label: 'Detecting language', status: 'pending' },
    { id: 'transcribe', label: 'Transcribing audio', status: 'pending' },
    { id: 'translate', label: 'Translating content', status: 'pending' },
    { id: 'clone', label: 'Cloning voice', status: 'pending' },
    { id: 'sync', label: 'Syncing audio', status: 'pending' },
  ];

  const updateStep = (stepId: string, status: ProcessingStep['status']) => {
    setProcessingSteps(prev => 
      prev.map(step => step.id === stepId ? { ...step, status } : step)
    );
  };

  const selectVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const video: VideoFile = {
      id: generateId(),
      name: file.name,
      size: file.size,
      duration: 0,
      url,
    };

    // Get video duration
    const videoEl = document.createElement('video');
    videoEl.src = url;
    videoEl.onloadedmetadata = () => {
      video.duration = videoEl.duration;
      setSelectedVideo({ ...video });
    };

    setSelectedVideo(video);
  }, []);

  const startTranslation = useCallback(async () => {
    if (!selectedVideo) return;

    const steps = initializeSteps();
    if (!voiceCloning) {
      steps.splice(3, 1); // Remove voice cloning step
    }
    setProcessingSteps(steps);

    const newJob: TranslationJob = {
      id: generateId(),
      status: 'detecting',
      progress: 0,
      targetLanguage,
      originalVideo: selectedVideo,
      voiceCloning,
    };
    setJob(newJob);

    try {
      // Step 1: Detect language
      updateStep('detect', 'active');
      const detectedLanguage = await mockDetectLanguage();
      updateStep('detect', 'complete');
      setJob(prev => prev ? { ...prev, sourceLanguage: detectedLanguage, progress: 20, status: 'transcribing' } : null);

      // Step 2: Transcribe
      updateStep('transcribe', 'active');
      await mockTranscribe();
      updateStep('transcribe', 'complete');
      setJob(prev => prev ? { ...prev, progress: 40, status: 'translating' } : null);

      // Step 3: Translate
      updateStep('translate', 'active');
      await mockTranslate();
      updateStep('translate', 'complete');
      setJob(prev => prev ? { ...prev, progress: 60, status: voiceCloning ? 'cloning' : 'syncing' } : null);

      // Step 4: Clone voice (if enabled)
      if (voiceCloning) {
        updateStep('clone', 'active');
        await mockCloneVoice();
        updateStep('clone', 'complete');
        setJob(prev => prev ? { ...prev, progress: 80, status: 'syncing' } : null);
      }

      // Step 5: Sync audio
      updateStep('sync', 'active');
      const translatedUrl = await mockSyncAudio();
      updateStep('sync', 'complete');
      
      setJob(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'complete',
        translatedVideoUrl: selectedVideo.url // Using original for demo
      } : null);

    } catch (error) {
      setJob(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: 'Translation failed. Please try again.' 
      } : null);
    }
  }, [selectedVideo, targetLanguage, voiceCloning]);

  const reset = useCallback(() => {
    if (selectedVideo?.url) {
      URL.revokeObjectURL(selectedVideo.url);
    }
    setSelectedVideo(null);
    setJob(null);
    setProcessingSteps([]);
  }, [selectedVideo]);

  return {
    selectedVideo,
    targetLanguage,
    voiceCloning,
    job,
    processingSteps,
    selectVideo,
    setTargetLanguage,
    setVoiceCloning,
    startTranslation,
    reset,
  };
};
