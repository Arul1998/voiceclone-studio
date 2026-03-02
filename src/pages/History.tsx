import React, { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getTranslations, deleteTranslation, TranslationRecord } from '@/services/historyService';
import { ArrowLeft, Download, Trash2, Clock, Globe, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

const HistoryPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [translations, setTranslations] = useState<TranslationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getTranslations();
      setTranslations(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTranslation(id);
      setTranslations(prev => prev.filter(t => t.id !== id));
      toast.success('Translation deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDownloadAudio = (record: TranslationRecord) => {
    if (!record.audio_url) {
      toast.error('No audio available');
      return;
    }
    const link = document.createElement('a');
    link.href = record.audio_url;
    link.download = `translated-${record.target_language}-${record.video_name}.mp3`;
    link.click();
    toast.success('Downloading audio...');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 gradient-glow opacity-50" />
      </div>

      <Header />

      <div className="relative z-10 pt-16 px-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground">
          <span>{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs h-7">
            <LogOut className="w-3 h-3 mr-1" />
            Sign out
          </Button>
        </div>
      </div>

      <main className="relative z-10 pb-8 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold text-foreground">Translation History</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : translations.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No translations yet</p>
            <Button variant="gradient" onClick={() => navigate('/')}>
              Translate a Video
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {translations.map(record => (
              <div key={record.id} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">
                      {record.video_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(record.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    record.status === 'complete'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : record.status === 'failed'
                      ? 'bg-destructive/20 text-destructive'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {record.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {record.source_language || '?'} → {record.target_language}
                  </span>
                  {record.speakers_detected && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {record.speakers_detected} speakers
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {record.audio_url && record.status === 'complete' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs flex-1"
                      onClick={() => handleDownloadAudio(record)}
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Download Audio
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    onClick={() => handleDelete(record.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
