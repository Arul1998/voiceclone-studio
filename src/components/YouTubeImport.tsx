import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface YouTubeImportProps {
  onVideoReady: (file: File) => void;
}

export const YouTubeImport: React.FC<YouTubeImportProps> = ({ onVideoReady }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const isValidYouTubeUrl = (url: string) => {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]+/.test(url);
  };

  const handleImport = async () => {
    if (!url.trim() || !isValidYouTubeUrl(url)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-download', {
        body: { url: url.trim() },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Download failed');

      // Convert base64 to File
      const binary = atob(data.videoBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'video/mp4' });
      const file = new File([blob], `${data.title || 'youtube-video'}.mp4`, { type: 'video/mp4' });

      onVideoReady(file);
      toast.success('Video imported successfully!');
      setUrl('');
    } catch (err) {
      console.error('YouTube import error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to import video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass rounded-xl p-4">
      <p className="text-sm font-medium text-foreground mb-3">Or import from YouTube</p>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste YouTube URL..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={loading}
          />
        </div>
        <Button
          variant="gradient"
          size="sm"
          onClick={handleImport}
          disabled={loading || !url.trim()}
          className="shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Import'}
        </Button>
      </div>
    </div>
  );
};
