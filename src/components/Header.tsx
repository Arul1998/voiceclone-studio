import React from 'react';
import { Languages } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="flex items-center justify-center gap-3 px-4 py-4">
        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-button">
          <Languages className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold text-gradient">VoiceSync</h1>
      </div>
    </header>
  );
};
