import React from 'react';
import { Header } from '@/components/Header';
import { VideoUploader } from '@/components/VideoUploader';
import { YouTubeImport } from '@/components/YouTubeImport';
import { LanguageSelector } from '@/components/LanguageSelector';
import { VoiceCloningToggle } from '@/components/VoiceCloningToggle';
import { ProcessingScreen } from '@/components/ProcessingScreen';
import { VideoPreview } from '@/components/VideoPreview';
import { Button } from '@/components/ui/button';
import { useVideoTranslation } from '@/hooks/useVideoTranslation';
import { useAuth } from '@/contexts/AuthContext';
import { Wand2, LogOut, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const {
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
  } = useVideoTranslation();
  const { user, signOut } = useAuth();

  const navigate = useNavigate();

  const isProcessing = job && job.status !== 'complete' && job.status !== 'error';
  const isComplete = job?.status === 'complete';

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 gradient-glow opacity-50" />
      </div>

      <Header />

      {/* User info bar */}
      <div className="relative z-10 pt-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <span>{user?.email}</span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')} className="text-xs h-7">
              <History className="w-3 h-3 mr-1" />
              History
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-xs h-7">
              <LogOut className="w-3 h-3 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
      </div>

      <main className="relative z-10 pb-8 px-4 max-w-lg mx-auto">
        {!job && (
          <>
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

            <div className="mb-4">
              <VideoUploader
                onVideoSelect={selectVideo}
                selectedVideo={selectedVideo}
                onClear={reset}
              />
            </div>

            {/* YouTube import */}
            {!selectedVideo && (
              <div className="mb-6">
                <YouTubeImport onVideoReady={selectVideo} />
              </div>
            )}

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

        {isProcessing && (
          <ProcessingScreen job={job} steps={processingSteps} />
        )}

        {isComplete && job && (
          <VideoPreview job={job} onReset={reset} translatedAudioUrl={translatedAudio} />
        )}

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
