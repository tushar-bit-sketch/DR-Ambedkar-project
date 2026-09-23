import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, FileText, Calendar, MapPin, Globe } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { ArchivalBadge } from '../components/archive/ArchivalBadge';
import { DemoBanner } from '../components/archive/DemoBanner';

export const SpeechesPage: React.FC = () => {
  const [speeches, setSpeeches] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    apiService.getDocuments({ document_type: 'SPEECH' }).then(res => {
      setSpeeches(res.items);
    });
  }, []);

  const toggleAudio = (id: number) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      <section className="bg-[#1B2A4A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-3">
          <span className="font-mono text-xs text-heritage-300 uppercase tracking-wider">
            HISTORICAL ORATORY & ADDRESSES
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Speeches & Public Addresses (1927–1956)
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl font-light">
            Landmark orations delivered at mass conferences, Round Table Sessions, parliamentary chambers, and international assemblies.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-stone-200">
          <span>Cataloged Addresses: {speeches.length}</span>
          <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            [DEMO DATA ARCHIVE]
          </span>
        </div>

        <div className="space-y-4">
          {speeches.map((speech) => {
            const isPlaying = playingId === speech.id;
            return (
              <div 
                key={speech.id}
                className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm hover:border-heritage-400 transition flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-heritage-600 bg-heritage-50 px-2.5 py-0.5 rounded border border-heritage-200">
                      {speech.archive_id}
                    </span>
                    <ArchivalBadge type="SPEECH" />
                    <ArchivalBadge status={speech.verification_status} variant="status" />
                    <ArchivalBadge variant="demo" />
                  </div>

                  <h3 
                    onClick={() => setSelectedDoc(speech)}
                    className="font-serif text-xl font-bold text-ink-900 hover:text-heritage-700 cursor-pointer transition"
                  >
                    {speech.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {speech.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-heritage-500" />
                      {speech.date_created || speech.year}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-heritage-500" />
                      {speech.language_name || 'English'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-heritage-500" />
                      {speech.physical_location || 'India'}
                    </span>
                  </div>
                </div>

                {/* Audio Shell / Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => toggleAudio(speech.id)}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-2 border ${
                      isPlaying
                        ? 'bg-heritage-500 text-slate-950 border-heritage-600 shadow'
                        : 'bg-stone-50 hover:bg-stone-100 text-slate-800 border-stone-300'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isPlaying ? 'Playing Audio Shell' : 'Play Archival Audio'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedDoc(speech)}
                    className="px-4 py-2.5 bg-[#1B2A4A] hover:bg-[#102038] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow"
                  >
                    <FileText className="w-4 h-4 text-heritage-300" />
                    <span>Read Verbatim Transcript</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
