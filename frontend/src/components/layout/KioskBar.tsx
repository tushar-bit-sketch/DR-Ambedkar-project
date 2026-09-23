import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, ArrowLeft, ZoomIn, ZoomOut, Contrast, 
  XSquare, BookOpen, Clock, Compass, Globe, Film,
  WifiOff, RefreshCw
} from 'lucide-react';
import { useKiosk } from '../../context/KioskContext';
import { useLanguage, LanguageCode } from '../../context/LanguageContext';

export const KioskBar: React.FC = () => {
  const { isKiosk, exitKiosk, toggleHighContrast, highContrast, isOffline, resetSession } = useKiosk();
  const { language, setLanguage, supportedLanguages } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  if (!isKiosk) return null;

  return (
    <>
      {/* Offline Status Warning Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-slate-950 font-bold px-4 py-1.5 text-center text-xs flex items-center justify-center gap-2 shadow-md">
          <WifiOff className="w-4 h-4" />
          <span>OFFLINE CACHE MODE — Serving local verified exhibition packages</span>
        </div>
      )}
      <aside aria-label="Touchscreen Kiosk Navigation Bar" className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B1A2E] text-white border-t-4 border-heritage-500 shadow-2xl py-3 px-6 select-none">

      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Navigation Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className={`flex items-center gap-2 px-5 py-3 rounded-lg font-bold text-lg transition-all ${
              location.pathname === '/' 
                ? 'bg-heritage-500 text-slate-950 shadow-md' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Home className="w-6 h-6" />
            <span>Home</span>
          </button>

          {location.pathname !== '/' && (
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-5 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-lg transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => navigate('/explore')}
            className={`hidden sm:flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-base transition-all ${
              location.pathname === '/explore'
                ? 'bg-heritage-500 text-slate-950'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span>Explore</span>
          </button>

          <button
            onClick={() => navigate('/timeline')}
            className={`hidden sm:flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-base transition-all ${
              location.pathname === '/timeline'
                ? 'bg-heritage-500 text-slate-950'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Timeline</span>
          </button>

          <button
            onClick={() => navigate('/kiosk/media')}
            className={`hidden sm:flex items-center gap-2 px-4 py-3 rounded-lg font-bold text-base transition-all ${
              location.pathname.startsWith('/kiosk/media')
                ? 'bg-heritage-500 text-slate-950'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <Film className="w-5 h-5" />
            <span>Media</span>
          </button>
        </div>

        {/* Kiosk Mode Badge */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-xs uppercase tracking-widest text-heritage-300 font-bold">
            Interactive Museum Kiosk Mode
          </span>
          <span className="text-[11px] text-slate-400">
            Touch-Optimized Exhibition Interface
          </span>
        </div>

        {/* Accessibility, Language & Exit */}
        <div className="flex items-center space-x-3">
          {/* Touchscreen Language Switcher */}
          <button
            onClick={() => {
              const codes: LanguageCode[] = ['en', 'hi', 'mr', 'ta'];
              const idx = codes.indexOf(language);
              const next = codes[(idx + 1) % codes.length];
              setLanguage(next);
            }}
            className="p-3 rounded-lg border text-base font-bold transition flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
            title="Cycle Interface Language (English / हिन्दी / मराठी / தமிழ்)"
          >
            <Globe className="w-5 h-5 text-heritage-400" />
            <span className="uppercase text-sm font-mono">{language}</span>
          </button>

          <button
            onClick={toggleHighContrast}
            className={`p-3 rounded-lg border text-base font-bold transition flex items-center gap-2 ${
              highContrast
                ? 'bg-yellow-400 text-black border-yellow-300'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
            }`}
            title="Toggle High Contrast Display"
          >
            <Contrast className="w-5 h-5" />
            <span className="hidden lg:inline">Contrast</span>
          </button>

          <button
            onClick={resetSession}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold text-base transition"
            title="Reset Ephemeral Visitor Session"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            onClick={exitKiosk}
            className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-900/40 hover:bg-red-800 text-red-200 border border-red-500/40 font-semibold text-base transition"
            title="Exit Touchscreen Kiosk Mode"
          >
            <XSquare className="w-5 h-5" />
            <span>Exit Kiosk</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
};
