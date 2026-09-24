import React, { useState, useEffect } from 'react';
import { Volume2, Play, Pause, FileText, Calendar, MapPin, Globe } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { ArchivalBadge } from '../components/archive/ArchivalBadge';
import { DemoBanner } from '../components/archive/DemoBanner';
import { PageMasthead } from '../components/layout/PageMasthead';

export const SpeechesPage: React.FC = () => {
  const [speeches, setSpeeches] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    apiService.getDocuments({ document_type: 'SPEECH' }).then(res => {
      setSpeeches(res.items);
    }).catch(err => {
      console.warn('Failed to load speeches:', err);
    });
  }, []);

  const toggleAudio = (id: number) => {
    setPlayingId(playingId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-newsprint-100 text-ink">
      <DemoBanner />

      <PageMasthead
        eyebrow="HISTORICAL ORATORY & ADDRESSES • OFFICIAL DISPATCHES (1927–1956)"
        headline="Speeches & Public Addresses (1927–1956)"
        subheadline="Landmark orations delivered at mass conferences, Round Table Sessions, parliamentary chambers, and international assemblies."
        accession={`CATALOGED ADDRESSES: ${speeches.length}`}
        badge="VERIFIED AUDIO DERIVATIVES"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-center text-xs font-mono text-ink-600 pb-2 border-b-2 border-ink">
          <span>CATALOGED ADDRESSES: {speeches.length} HISTORICAL DISPATCHES</span>
          <span className="stamp-oxblood text-[9px] py-0 px-1.5 font-bold">
            [ AUTHENTICATED ORATORY ]
          </span>
        </div>

        <div className="space-y-4">
          {speeches.map((speech) => {
            const isPlaying = playingId === speech.id;
            return (
              <div 
                key={speech.id}
                className="bg-[#FAF6EE] border-2 border-ink p-6 shadow-letterpress-sm hover:shadow-letterpress transition flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-oxblood bg-white px-2.5 py-0.5 border border-ink font-bold">
                      {speech.archive_id}
                    </span>
                    <ArchivalBadge type="SPEECH" />
                    <ArchivalBadge status={speech.verification_status} variant="status" />
                    {speech.verification_status === 'VERIFIED' && <ArchivalBadge variant="integrity" />}
                  </div>

                  <h3 
                    onClick={() => setSelectedDoc(speech)}
                    className="font-serif text-xl sm:text-2xl font-bold text-ink hover:text-oxblood cursor-pointer transition leading-snug"
                  >
                    {speech.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-700 font-editorial leading-relaxed line-clamp-2 italic">
                    {speech.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-600 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-oxblood" />
                      {speech.date_created || speech.year}
                    </span>
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-oxblood" />
                      {speech.language_name || 'English'}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-oxblood" />
                      {speech.physical_location || 'India'}
                    </span>
                  </div>
                </div>

                {/* Audio Shell / Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => toggleAudio(speech.id)}
                    className={`px-4 py-2.5 text-xs font-mono font-bold uppercase transition flex items-center gap-2 border border-ink shadow-letterpress-sm ${
                      isPlaying
                        ? 'bg-oxblood text-white'
                        : 'bg-white hover:bg-newsprint-300 text-ink'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-oxblood" />}
                    <span>{isPlaying ? '[ Playing Audio Shell ]' : '[ Play Archival Audio ]'}</span>
                  </button>

                  <button
                    onClick={() => setSelectedDoc(speech)}
                    className="px-4 py-2.5 bg-ink hover:bg-oxblood text-white font-mono font-bold uppercase text-xs transition flex items-center gap-1.5 border border-ink shadow-letterpress-sm"
                  >
                    <FileText className="w-4 h-4 text-white" />
                    <span>[ Read Verbatim Record ]</span>
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
