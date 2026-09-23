import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, Calendar, MapPin, Volume2, VolumeX, ArrowRight, 
  ChevronLeft, ChevronRight, Network, FileText, CheckCircle2
} from 'lucide-react';
import { apiService } from '../../services/api';
import { TimelineEvent } from '../../types';

export const KioskTimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiService.getTimelineEvents().then(res => {
      if (mounted) {
        setEvents(res);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { 
      mounted = false; 
      window.speechSynthesis?.cancel();
    };
  }, []);

  const categories = [
    'ALL',
    'Constitutional',
    'Social Movements',
    'Academic Treatises',
    'Labour Reforms',
    'Religious & Philosophical'
  ];

  const filteredEvents = selectedCategory === 'ALL'
    ? events
    : events.filter(e => e.category?.toLowerCase().includes(selectedCategory.toLowerCase()));

  const currentEvent = filteredEvents[currentIndex] || null;

  const handleNext = () => {
    if (currentIndex < filteredEvents.length - 1) {
      setCurrentIndex(currentIndex + 1);
      stopSpeech();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      stopSpeech();
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const handleSpeak = () => {
    if (!currentEvent) return;
    if (speaking) {
      stopSpeech();
      return;
    }
    if ('speechSynthesis' in window) {
      const text = `${currentEvent.title}. ${currentEvent.exact_date || currentEvent.year_start || ''}. ${currentEvent.description}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-6 select-none">
      {/* Top Banner */}
      <div className="bg-[#102038] text-white rounded-2xl p-5 shadow-lg flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-heritage-500 text-slate-950 flex items-center justify-center font-bold text-2xl">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
              Interactive Archival Chronology
            </h1>
            <p className="text-xs text-heritage-300">
              Verified historical milestones, constitutional milestones, and social movements
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/kiosk/graph')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2 transition"
          >
            Switch to Knowledge Graph &rarr;
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setCurrentIndex(0);
              stopSpeech();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition shadow-sm ${
              selectedCategory === cat
                ? 'bg-heritage-600 text-white'
                : 'bg-white text-slate-700 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Main Focus Card View */}
      {currentEvent ? (
        <div className="flex-1 flex flex-col justify-between bg-white rounded-2xl shadow-md border border-stone-200 p-6 md:p-8">
          {/* Milestone Header */}
          <div>
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#102038] text-heritage-300 font-mono font-bold text-sm rounded-lg">
                  {currentEvent.exact_date || currentEvent.year_start || 'Date Unknown'}
                </span>
                <span className="px-2.5 py-1 bg-stone-100 text-slate-700 text-xs font-semibold rounded-md">
                  {currentEvent.category}
                </span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Archivally Verified
                </span>
              </div>

              <button
                onClick={handleSpeak}
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition ${
                  speaking
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-stone-100 hover:bg-stone-200 text-slate-800 border-stone-300'
                }`}
                title="Audio Readout"
              >
                {speaking ? <VolumeX className="w-5 h-5 text-amber-700" /> : <Volume2 className="w-5 h-5" />}
                <span>{speaking ? 'Stop Narration' : 'Read Aloud'}</span>
              </button>
            </div>

            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 leading-tight">
              {currentEvent.title}
            </h2>

            {currentEvent.location && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-2">
                <MapPin className="w-4 h-4 text-heritage-600" />
                {currentEvent.location}
              </div>
            )}

            <p className="text-base text-slate-700 mt-6 leading-relaxed max-w-4xl">
              {currentEvent.description}
            </p>

            {currentEvent.evidence_text && (
              <div className="mt-6 p-4 bg-stone-50 rounded-xl border-l-4 border-heritage-500 text-xs text-slate-700 font-mono">
                <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                  Primary Archival Evidence Citation:
                </div>
                "{currentEvent.evidence_text}"
              </div>
            )}
          </div>

          {/* Stepper Footer */}
          <div className="pt-6 border-t border-stone-200 flex items-center justify-between mt-6">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="px-6 py-3.5 bg-stone-100 hover:bg-stone-200 disabled:opacity-30 text-slate-800 rounded-xl font-bold text-sm flex items-center gap-2 transition"
            >
              <ChevronLeft className="w-5 h-5" />
              Previous Milestone
            </button>

            <span className="font-mono text-xs text-slate-500 font-semibold">
              {currentIndex + 1} of {filteredEvents.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex >= filteredEvents.length - 1}
              className="px-6 py-3.5 bg-heritage-600 hover:bg-heritage-700 disabled:opacity-30 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition shadow"
            >
              Next Milestone
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-2xl shadow-md border border-stone-200 flex flex-col items-center justify-center p-8 text-slate-400">
          <Clock className="w-16 h-16 stroke-1 mb-2" />
          <p className="text-base">No milestones found in this category.</p>
        </div>
      )}
    </div>
  );
};

export default KioskTimelinePage;
