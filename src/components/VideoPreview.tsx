import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TranslationJob } from '@/types/video';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VideoPreviewProps {
  job: TranslationJob;
  onReset: () => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ job, onReset }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
    }
  };

  const handleDownload = () => {
    // In a real app, this would download the translated video
    toast.success('Video saved to device!', {
      description: 'Your translated video has been downloaded.',
    });
  };

  return (
    <div className="animate-fade-in">
      {/* Success badge */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center shadow-button">
          <Check className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-foreground">Translation Complete!</span>
      </div>

      {/* Video player */}
      <div className="relative rounded-2xl overflow-hidden glass shadow-card">
        <video
          ref={videoRef}
          src={job.translatedVideoUrl || job.originalVideo.url}
          className="w-full aspect-video object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
        
        {/* Play overlay */}
        {!isPlaying && (
          <div 
            className="absolute inset-0 flex items-center justify-center bg-background/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow animate-pulse-glow">
              <Play className="w-10 h-10 text-primary-foreground ml-1" />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/90 to-transparent">
          {/* Progress bar */}
          <div 
            className="w-full h-1 bg-muted rounded-full mb-4 cursor-pointer overflow-hidden"
            onClick={handleSeek}
          >
            <div 
              className="h-full gradient-primary rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="glass"
                size="icon"
                onClick={togglePlay}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </Button>
              <Button
                variant="glass"
                size="icon"
                onClick={toggleMute}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {job.sourceLanguage?.flag} → {job.targetLanguage.flag}
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 mt-6">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onReset}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          New Video
        </Button>
        <Button
          variant="gradient"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="w-5 h-5 mr-2" />
          Save Video
        </Button>
      </div>
    </div>
  );
};
