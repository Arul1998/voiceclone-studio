import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw, Check, Video, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TranslationJob } from '@/types/video';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SubtitleDisplay } from './SubtitleDisplay';

interface VideoPreviewProps {
  job: TranslationJob;
  onReset: () => void;
  translatedAudioUrl?: string | null;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ job, onReset, translatedAudioUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  // Sync audio with video
  useEffect(() => {
    if (videoRef.current && audioRef.current && translatedAudioUrl) {
      // Mute the original video since we have translated audio
      videoRef.current.muted = true;
    }
  }, [translatedAudioUrl]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        audioRef.current?.pause();
      } else {
        videoRef.current.play();
        if (audioRef.current && translatedAudioUrl) {
          audioRef.current.currentTime = videoRef.current.currentTime;
          audioRef.current.play();
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    if (videoRef.current && !translatedAudioUrl) {
      videoRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const prog = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(prog);
      setCurrentTime(videoRef.current.currentTime);
      
      // Keep audio in sync
      if (audioRef.current && translatedAudioUrl) {
        const diff = Math.abs(videoRef.current.currentTime - audioRef.current.currentTime);
        if (diff > 0.3) {
          audioRef.current.currentTime = videoRef.current.currentTime;
        }
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      videoRef.current.currentTime = percentage * videoRef.current.duration;
      if (audioRef.current && translatedAudioUrl) {
        audioRef.current.currentTime = percentage * videoRef.current.duration;
      }
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadAudio = () => {
    if (translatedAudioUrl) {
      const link = document.createElement('a');
      link.href = translatedAudioUrl;
      link.download = `translated-audio-${job.targetLanguage.code}.mp3`;
      link.click();
      toast.success('Audio downloaded!');
    }
  };

  const handleDownloadVideo = async () => {
    if (!videoRef.current || !translatedAudioUrl) {
      toast.error('Video or audio not available');
      return;
    }

    setIsExporting(true);
    toast.info('Preparing video...', { description: 'This may take a moment.' });

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d')!;

      // Create audio context to mix audio
      const audioContext = new AudioContext();
      const audioResponse = await fetch(translatedAudioUrl);
      const audioArrayBuffer = await audioResponse.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);

      // Create media stream from canvas
      const canvasStream = canvas.captureStream(30);
      
      // Create audio source and destination
      const audioSource = audioContext.createBufferSource();
      audioSource.buffer = audioBuffer;
      const audioDestination = audioContext.createMediaStreamDestination();
      audioSource.connect(audioDestination);
      
      // Combine video and audio streams
      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: 'video/webm;codecs=vp9,opus',
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${job.originalVideo.name.replace(/\.[^/.]+$/, '')}-${job.targetLanguage.code}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        toast.success('Video downloaded!', {
          description: 'Your translated video has been saved.',
        });
      };

      // Start recording
      mediaRecorder.start();
      audioSource.start(0);

      // Reset video to start
      video.currentTime = 0;
      video.muted = true;

      // Draw frames
      const drawFrame = () => {
        if (video.ended || video.paused) {
          mediaRecorder.stop();
          audioSource.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      video.play().then(() => {
        drawFrame();
        // Stop after video ends
        video.onended = () => {
          setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
              audioSource.stop();
            }
          }, 500);
        };
      });
    } catch (error) {
      console.error('Export error:', error);
      setIsExporting(false);
      toast.error('Export failed', {
        description: 'Could not export video. Try downloading the audio instead.',
      });
    }
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

      {/* Hidden audio element for translated audio */}
      {translatedAudioUrl && (
        <audio ref={audioRef} src={translatedAudioUrl} />
      )}

      {/* Video player */}
      <div className="relative rounded-2xl overflow-hidden glass shadow-card">
        <video
          ref={videoRef}
          src={job.translatedVideoUrl || job.originalVideo.url}
          className="w-full aspect-video object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            audioRef.current?.pause();
          }}
          muted={!!translatedAudioUrl}
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

      {/* Subtitles */}
      {job.translation && (
        <SubtitleDisplay
          transcript={job.translation}
          currentTime={currentTime}
          targetLanguage={job.targetLanguage.code}
        />
      )}

      {/* Translation info */}
      <div className="mt-4 p-4 rounded-xl glass">
        <p className="text-sm text-muted-foreground mb-1">Translated from</p>
        <p className="font-medium text-foreground">
          {job.sourceLanguage?.flag} {job.sourceLanguage?.name || 'Auto-detected'} → {job.targetLanguage.flag} {job.targetLanguage.name}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mt-6">
        <div className="flex gap-3">
          <Button
            variant="gradient"
            className="flex-1"
            onClick={handleDownloadVideo}
            disabled={isExporting || !translatedAudioUrl}
          >
            <Video className="w-5 h-5 mr-2" />
            {isExporting ? 'Exporting...' : 'Download Video'}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDownloadAudio}
            disabled={!translatedAudioUrl}
          >
            <Music className="w-5 h-5 mr-2" />
            Download Audio
          </Button>
        </div>
        <Button
          variant="ghost"
          className="w-full"
          onClick={onReset}
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Translate Another Video
        </Button>
      </div>
    </div>
  );
};
