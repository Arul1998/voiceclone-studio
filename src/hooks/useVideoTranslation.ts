import { useState, useCallback } from 'react';
import { VideoFile, TranslationJob, Language, ProcessingStep } from '@/types/video';
import { languages } from '@/data/languages';
import { translateVideo, createAudioBlobUrl } from '@/services/translationService';
import { saveTranslation } from '@/services/historyService';
import { supabase } from '@/integrations/supabase/client';
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
    { id: 'upload', label: 'Uploading video', status: 'pending' },
    { id: 'detect', label: 'Detecting speakers', status: 'pending' },
    { id: 'translate', label: 'Translating & dubbing', status: 'pending' },
    { id: 'synthesize', label: 'Cloning voices', status: 'pending' },
    { id: 'download', label: 'Downloading result', status: 'pending' },
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
      const result = await translateVideo(
        videoFile,
        targetLanguage,
        voiceCloning,
        (step, progress) => {
          if (step === 'uploading') {
            updateStep('upload', 'active');
            setJob(prev => prev ? { ...prev, progress: 10, status: 'detecting' } : null);
          } else if (step === 'processing') {
            updateStep('upload', 'complete');
            updateStep('detect', 'active');
            setJob(prev => prev ? { ...prev, progress: 30, status: 'transcribing' } : null);
            // Simulate progress through the long dubbing step
            setTimeout(() => {
              updateStep('detect', 'complete');
              updateStep('translate', 'active');
              setJob(prev => prev ? { ...prev, progress: 50, status: 'translating' } : null);
            }, 5000);
            setTimeout(() => {
              updateStep('translate', 'complete');
              updateStep('synthesize', 'active');
              setJob(prev => prev ? { ...prev, progress: 70, status: 'cloning' } : null);
            }, 15000);
          } else if (step === 'complete') {
            updateStep('synthesize', 'complete');
            updateStep('download', 'complete');
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      // Update all steps to complete
      ['upload', 'detect', 'translate', 'synthesize', 'download'].forEach(s => updateStep(s, 'complete'));

      // Store the translated audio
      let audioBlobUrl: string | null = null;
      let audioStorageUrl: string | null = null;

      if (result.audioBase64) {
        audioBlobUrl = createAudioBlobUrl(result.audioBase64, result.audioFormat);
        setTranslatedAudio(audioBlobUrl);

        // Upload audio to storage for history
        try {
          const binary = atob(result.audioBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const audioBlob = new Blob([bytes], { type: result.audioFormat || 'audio/mpeg' });
          const audioPath = `audio/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
          await supabase.storage.from('videos').upload(audioPath, audioBlob);
          const { data: urlData } = supabase.storage.from('videos').getPublicUrl(audioPath);
          audioStorageUrl = urlData.publicUrl;
        } catch (e) {
          console.warn('Failed to upload audio to storage:', e);
        }
      }

      // Save to history
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await saveTranslation({
            user_id: user.id,
            source_language: result.sourceLanguage?.name || null,
            target_language: targetLanguage.name,
            video_name: selectedVideo.name,
            video_size: selectedVideo.size,
            video_duration: selectedVideo.duration,
            speakers_detected: result.speakersDetected?.toString() || null,
            transcription: result.transcription || null,
            translation: result.translation || null,
            audio_url: audioStorageUrl,
            status: 'complete',
          });
        }
      } catch (e) {
        console.warn('Failed to save translation history:', e);
      }

      setJob(prev => prev ? { 
        ...prev, 
        progress: 100, 
        status: 'complete',
        sourceLanguage: result.sourceLanguage,
        transcription: result.transcription,
        translation: result.translation,
        translatedVideoUrl: selectedVideo.url
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
