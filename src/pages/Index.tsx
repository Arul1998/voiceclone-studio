import React from 'react';
import { Header } from '@/components/Header';
import { VideoUploader } from '@/components/VideoUploader';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceCloningToggle } from '@/components/VoiceCloningToggle';
import { ProcessingScreen } from '@/components/ProcessingScreen';
import { VideoPreview } from '@/components/VideoPreview';
import { Button } from '@/components/ui/button';
import { useVideoTranslation } from '@/hooks/useVideoTranslation';
import { Wand2 } from 'lucide-react';

const Index = () => {
  const {
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
  } = useVideoTranslation();

  const isProcessing = job && job.status !== 'complete' && job.status !== 'error';
  const isComplete = job?.status === 'complete';

  return (
    <div className="min-h-screen bg-background">
      {/* Background glow effect */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 gradient-glow opacity-50" />
      </div>

      <Header />

      <main className="relative z-10 pt-20 pb-8 px-4 max-w-lg mx-auto">
        {!job && (
          <>
            {/* Hero section when no video */}
            {!selectedVideo && (
              <div className="text-center mb-8 animate-fade-in">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Translate Any Video
                </h2>
                <p className="text-muted-foreground">
                  AI-powered voice translation with speaker cloning
                </p>
              </div>
            )}

            {/* Video uploader */}
            <div className="mb-6">
              <VideoUploader
                onVideoSelect={selectVideo}
                selectedVideo={selectedVideo}
                onClear={reset}
              />
            </div>

            {/* Settings (only show when video selected) */}
            {selectedVideo && (
              <div className="space-y-6 mb-8">
                <LanguageSelector
                  selectedLanguage={targetLanguage}
                  onSelect={setTargetLanguage}
                />

                <VoiceCloningToggle
                  enabled={voiceCloning}
                  onToggle={setVoiceCloning}
                />

                <Button
                  variant="gradient"
                  size="xl"
                  className="w-full animate-slide-up"
                  style={{ animationDelay: '200ms' }}
                  onClick={startTranslation}
                >
                  <Wand2 className="w-6 h-6 mr-2" />
                  Start Translation
                </Button>
              </div>
            )}
          </>
        )}

        {/* Processing screen */}
        {isProcessing && (
          <ProcessingScreen job={job} steps={processingSteps} />
        )}

        {/* Preview screen */}
        {isComplete && job && (
          <VideoPreview job={job} onReset={reset} />
        )}

        {/* Error state */}
        {job?.status === 'error' && (
          <div className="text-center py-8 animate-fade-in">
            <p className="text-destructive mb-4">{job.error}</p>
            <Button variant="outline" onClick={reset}>
              Try Again
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
