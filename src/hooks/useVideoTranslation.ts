import { useState, useCallback } from 'react';
import { VideoFile, TranslationJob, Language, ProcessingStep } from '@/types/video';
import { languages } from '@/data/languages';
import { translateVideo, createAudioBlobUrl } from '@/services/translationService';
import { toast } from '@/hooks/use-toast';

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useVideoTranslation = () => {
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<Language>(languages[0]); // English default
  const [voiceCloning, setVoiceCloning] = useState(true);
  const [job, setJob] = useState<TranslationJob | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [translatedAudio, setTranslatedAudio] = useState<string | null>(null);

  const initializeSteps = (): ProcessingStep[] => [
    { id: 'extract', label: 'Extracting audio', status: 'pending' },
    { id: 'transcribe', label: 'Transcribing speech', status: 'pending' },
    { id: 'detect', label: 'Detecting language', status: 'pending' },
    { id: 'translate', label: 'Translating content', status: 'pending' },
    { id: 'synthesize', label: 'Generating voice', status: 'pending' },
  ];

  const updateStep = (stepId: string, status: ProcessingStep['status']) => {
    setProcessingSteps(prev => 
      prev.map(step => step.id === stepId ? { ...step, status } : step)
    );
  };

  const selectVideo = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setVideoFile(file);
    
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
    if (!selectedVideo || !videoFile) return;

    const steps = initializeSteps();
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
      // Step 1: Extract audio
      updateStep('extract', 'active');
      setJob(prev => prev ? { ...prev, progress: 10, status: 'detecting' } : null);
      
      // Small delay to show the step
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('extract', 'complete');
      
      // Step 2: Transcribe
      updateStep('transcribe', 'active');
      setJob(prev => prev ? { ...prev, progress: 20, status: 'transcribing' } : null);

      // Step 3-5 happen in the edge function
      const result = await translateVideo(
        videoFile,
        targetLanguage,
        voiceCloning,
        (step, progress) => {
          if (step === 'extracting') {
            updateStep('transcribe', 'active');
            setJob(prev => prev ? { ...prev, progress: 30 } : null);
          } else if (step === 'processing') {
            updateStep('transcribe', 'complete');
            updateStep('detect', 'complete');
            updateStep('translate', 'active');
            setJob(prev => prev ? { ...prev, progress: 60, status: 'translating' } : null);
          } else if (step === 'complete') {
            updateStep('translate', 'complete');
            updateStep('synthesize', 'complete');
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      // Update steps to complete
      updateStep('transcribe', 'complete');
      updateStep('detect', 'complete');
      updateStep('translate', 'complete');
      updateStep('synthesize', 'complete');

      // Store the translated audio
      if (result.audioBase64) {
        const audioUrl = createAudioBlobUrl(result.audioBase64, result.audioFormat);
        setTranslatedAudio(audioUrl);
      }

      setJob(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'complete',
        sourceLanguage: result.sourceLanguage,
        translatedVideoUrl: selectedVideo.url // Using original video with new audio overlay
      } : null);

      toast({
        title: "Translation Complete!",
        description: `Translated from ${result.sourceLanguage?.name || 'detected language'} to ${targetLanguage.name}`,
      });

    } catch (error) {
      console.error('Translation error:', error);
      
      // Mark current step as error
      setProcessingSteps(prev => 
        prev.map(step => step.status === 'active' ? { ...step, status: 'error' } : step)
      );
      
      const errorMessage = error instanceof Error ? error.message : 'Translation failed. Please try again.';
      
      setJob(prev => prev ? { 
        ...prev, 
        status: 'error', 
        error: errorMessage
      } : null);

      toast({
        title: "Translation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [selectedVideo, videoFile, targetLanguage, voiceCloning]);

  const reset = useCallback(() => {
    if (selectedVideo?.url) {
      URL.revokeObjectURL(selectedVideo.url);
    }
    if (translatedAudio) {
      URL.revokeObjectURL(translatedAudio);
      setTranslatedAudio(null);
    }
    setVideoFile(null);
    setSelectedVideo(null);
    setJob(null);
    setProcessingSteps([]);
  }, [selectedVideo, translatedAudio]);

  return {
    selectedVideo,
    targetLanguage,
    voiceCloning,
    job,
    processingSteps,
    translatedAudio,
    selectVideo,
    setTargetLanguage,
    setVoiceCloning,
    startTranslation,
    reset,
  };
};
