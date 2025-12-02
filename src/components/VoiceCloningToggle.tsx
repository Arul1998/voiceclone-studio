import React from 'react';
import { Mic, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCloningToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const VoiceCloningToggle: React.FC<VoiceCloningToggleProps> = ({
  enabled,
  onToggle,
}) => {
  return (
    <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
      <label className="block text-sm font-medium text-muted-foreground mb-3">
        Voice settings
      </label>
      
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          "w-full p-4 rounded-xl transition-all duration-300",
          enabled
            ? "gradient-primary shadow-button"
            : "glass hover:bg-muted/50"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              enabled ? "bg-primary-foreground/20" : "bg-muted"
            )}>
              <Mic className={cn(
                "w-5 h-5",
                enabled ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            </div>
            <div className="text-left">
              <p className={cn(
                "font-medium",
                enabled ? "text-primary-foreground" : "text-foreground"
              )}>
                Voice Cloning
              </p>
              <p className={cn(
                "text-sm",
                enabled ? "text-primary-foreground/70" : "text-muted-foreground"
              )}>
                Match original speaker's voice
              </p>
            </div>
          </div>
          
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            enabled
              ? "bg-primary-foreground/20 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            <Sparkles className="w-4 h-4" />
            {enabled ? 'ON' : 'OFF'}
          </div>
        </div>
      </button>
    </div>
  );
};
