import React, { useEffect, useState } from 'react';
import { PuenteDeLaMujerIcon } from './PuenteDeLaMujerIcon';

interface Props {
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const [fadeState, setFadeState] = useState<'visible' | 'fading'>('visible');

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeState('fading');
      setTimeout(() => {
        onFinish();
      }, 400);
    }, 1400);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-400 select-none ${
        fadeState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background ambient water glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#0A84FF]/25 rounded-full blur-3xl pointer-events-none" />

      {/* Puente de la Mujer Isotipo */}
      <div className="relative z-10 flex flex-col items-center animate-scaleUp">
        <div className="p-4 rounded-3xl bg-black border border-white/10 shadow-[0_0_40px_rgba(10,132,255,0.4)] mb-4">
          <PuenteDeLaMujerIcon size={80} />
        </div>

        {/* Brand Name */}
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-1.5">
          <span className="text-white font-black">Puerto</span>
          <span className="bg-gradient-to-r from-[#0A84FF] to-[#5AC8FA] bg-clip-text text-transparent font-black tracking-wide">
            App
          </span>
        </h1>

        <p className="text-xs text-zinc-400 font-medium tracking-wider uppercase mt-1">
          Puerto Madero • Grupo Oficial
        </p>

        {/* iOS style loading indicator dots */}
        <div className="flex items-center gap-1.5 mt-6">
          <span className="w-2 h-2 rounded-full bg-[#0A84FF] animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-[#5AC8FA] animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
