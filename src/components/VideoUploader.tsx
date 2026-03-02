import React, { useRef, useState } from 'react';
import { Upload, Film, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VideoFile } from '@/types/video';
import { cn } from '@/lib/utils';

interface VideoUploaderProps {
  onVideoSelect: (file: File) => void;
  selectedVideo: VideoFile | null;
  onClear: () => void;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoSelect,
  selectedVideo,
  onClear,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB

  const validateAndSelect = (file: File) => {
    if (!file.type.startsWith('video/')) return;
    if (file.size > MAX_SIZE) {
      alert(`File too large. Maximum size is ${MAX_SIZE / (1024 * 1024)}MB.`);
      return;
    }
    onVideoSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (selectedVideo) {
    return (
      <div className="animate-scale-in">
        <div className="relative rounded-2xl overflow-hidden glass shadow-card">
          <video
            src={selectedVideo.url}
            className="w-full aspect-video object-cover"
            controls={false}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                  <Film className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-foreground font-medium truncate max-w-[180px]">
                    {selectedVideo.name}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {formatSize(selectedVideo.size)} • {formatDuration(selectedVideo.duration)}
                  </p>
                </div>
              </div>
              <Button
                variant="icon"
                size="icon"
                onClick={onClear}
                className="shrink-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed transition-all duration-300 animate-fade-in",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/50 hover:bg-muted/30"
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <div 
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
            isDragging ? "gradient-primary shadow-glow scale-110" : "bg-muted"
          )}
        >
          <Upload className={cn(
            "w-10 h-10 transition-colors",
            isDragging ? "text-primary-foreground" : "text-muted-foreground"
          )} />
        </div>
        
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Select a video
        </h3>
        <p className="text-muted-foreground text-sm text-center mb-6 max-w-[250px]">
          Drag and drop or tap to browse your device (max 50MB)
        </p>
        
        <Button
          variant="gradient"
          onClick={() => inputRef.current?.click()}
        >
          Choose Video
        </Button>
      </div>
    </div>
  );
};
