import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';
import { TranslationJob, ProcessingStep } from '@/types/video';
import { cn } from '@/lib/utils';

interface ProcessingScreenProps {
  job: TranslationJob;
  steps: ProcessingStep[];
}

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  job,
  steps,
}) => {
  return (
    <div className="flex flex-col items-center py-8 animate-fade-in">
      {/* Progress ring */}
      <div className="relative w-40 h-40 mb-8">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            stroke="url(#gradient)"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={440}
            strokeDashoffset={440 - (440 * job.progress) / 100}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(187, 85%, 53%)" />
              <stop offset="100%" stopColor="hsl(270, 60%, 55%)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-gradient">{job.progress}%</span>
          <span className="text-sm text-muted-foreground">Processing</span>
        </div>
      </div>

      {/* Steps list */}
      <div className="w-full space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
              step.status === 'active' && "glass",
              step.status === 'complete' && "bg-primary/10",
              step.status === 'pending' && "opacity-50"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
              step.status === 'complete' && "bg-primary text-primary-foreground",
              step.status === 'active' && "gradient-primary animate-pulse-glow",
              step.status === 'pending' && "bg-muted text-muted-foreground"
            )}>
              {step.status === 'complete' ? (
                <Check className="w-4 h-4" />
              ) : step.status === 'active' ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </div>
            <span className={cn(
              "font-medium transition-colors",
              step.status === 'complete' && "text-primary",
              step.status === 'active' && "text-foreground",
              step.status === 'pending' && "text-muted-foreground"
            )}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Language info */}
      {job.sourceLanguage && (
        <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">
          <span>{job.sourceLanguage.flag} {job.sourceLanguage.name}</span>
          <span className="mx-3">→</span>
          <span>{job.targetLanguage.flag} {job.targetLanguage.name}</span>
        </div>
      )}
    </div>
  );
};
