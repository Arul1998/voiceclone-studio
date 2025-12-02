import React, { useState } from 'react';
import { ChevronDown, Check, Globe } from 'lucide-react';
import { Language } from '@/types/video';
import { languages } from '@/data/languages';
import { cn } from '@/lib/utils';

interface LanguageSelectorProps {
  selectedLanguage: Language;
  onSelect: (language: Language) => void;
  detectedLanguage?: Language;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onSelect,
  detectedLanguage,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const availableLanguages = detectedLanguage
    ? languages.filter(l => l.code !== detectedLanguage.code)
    : languages;

  return (
    <div className={cn("animate-fade-in", isOpen && "relative z-[100]")}>
      <label className="block text-sm font-medium text-muted-foreground mb-3">
        Translate to
      </label>
      
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-xl glass transition-all duration-300",
            isOpen ? "ring-2 ring-primary" : "hover:bg-muted/50"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedLanguage.flag}</span>
            <span className="font-medium text-foreground">{selectedLanguage.name}</span>
          </div>
          <ChevronDown className={cn(
            "w-5 h-5 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180"
          )} />
        </button>

        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-[99]" 
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute left-0 right-0 z-[100] w-full mt-2 rounded-xl bg-card border border-border shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden animate-scale-in">
              <div className="max-h-64 overflow-y-auto no-scrollbar bg-card">
              {availableLanguages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    onSelect(language);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 transition-colors bg-card",
                    selectedLanguage.code === language.code
                      ? "bg-primary/20"
                      : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{language.flag}</span>
                    <span className="text-foreground">{language.name}</span>
                  </div>
                  {selectedLanguage.code === language.code && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
          </>
        )}
      </div>

      {detectedLanguage && (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="w-4 h-4" />
          <span>Detected: {detectedLanguage.flag} {detectedLanguage.name}</span>
        </div>
      )}
    </div>
  );
};
