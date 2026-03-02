import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Subtitles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubtitleEntry {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

interface SubtitleDisplayProps {
  transcript: string;
  currentTime: number;
  targetLanguage: string;
}

// Parse transcript text into timed subtitle entries
function parseTranscript(transcript: string, totalDuration: number = 60): SubtitleEntry[] {
  if (!transcript) return [];

  // Split by sentences/periods
  const sentences = transcript
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim().length > 0);

  if (sentences.length === 0) return [];

  const avgDuration = totalDuration / sentences.length;

  return sentences.map((text, i) => ({
    index: i + 1,
    startTime: i * avgDuration,
    endTime: (i + 1) * avgDuration,
    text: text.trim(),
  }));
}

// Generate SRT format string
function generateSRT(entries: SubtitleEntry[]): string {
  return entries
    .map(entry => {
      const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };
      return `${entry.index}\n${formatTime(entry.startTime)} --> ${formatTime(entry.endTime)}\n${entry.text}\n`;
    })
    .join('\n');
}

export const SubtitleDisplay: React.FC<SubtitleDisplayProps> = ({
  transcript,
  currentTime,
  targetLanguage,
}) => {
  const [showSubtitles, setShowSubtitles] = useState(true);
  const entries = parseTranscript(transcript);

  const currentEntry = entries.find(
    e => currentTime >= e.startTime && currentTime < e.endTime
  );

  const handleExportSRT = () => {
    const srt = generateSRT(entries);
    const blob = new Blob([srt], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subtitles-${targetLanguage}.srt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSubtitles(!showSubtitles)}
          className="text-xs"
        >
          <Subtitles className="w-4 h-4 mr-1" />
          {showSubtitles ? 'Hide' : 'Show'} Subtitles
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExportSRT}
          className="text-xs"
        >
          <Download className="w-4 h-4 mr-1" />
          Export SRT
        </Button>
      </div>

      {showSubtitles && currentEntry && (
        <div className="text-center py-2 px-4 rounded-lg bg-background/80 backdrop-blur-sm border border-border">
          <p className="text-sm text-foreground font-medium">{currentEntry.text}</p>
        </div>
      )}
    </div>
  );
};
