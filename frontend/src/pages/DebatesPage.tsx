import React, { useState, useEffect } from 'react';
import { Scale, Calendar, BookOpen, ExternalLink, Search } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { ArchivalBadge } from '../components/archive/ArchivalBadge';
import { DemoBanner } from '../components/archive/DemoBanner';
import { PageMasthead } from '../components/layout/PageMasthead';

export const DebatesPage: React.FC = () => {
  const [debates, setDebates] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiService.getDocuments({ document_type: 'DEBATE' }).then(res => {
      setDebates(res.items);
    }).catch(err => {
      console.warn('Failed to load debates:', err);
    });
  }, []);

  const filteredDebates = debates.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase()) ||
    d.archive_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-newsprint-100 text-ink">
      <DemoBanner />

      <PageMasthead
        eyebrow="RECORD DIVISION • PARLIAMENTARY PROCEEDINGS & STENOGRAPHIC DISPATCHES (1946–1950)"
        headline="Constituent Assembly Debates (CAD)"
        subheadline="Official stenographic records of the drafting of the Constitution of India, fundamental rights revisions, minority safeguards, and Dr. Ambedkar's committee defenses."
        accession={`RECORDED SESSIONS: ${debates.length}`}
        badge="PARLIAMENTARY ARCHIVE"
        bottomSlot={
          <div className="max-w-xl pt-1">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search debates by Draft Article, speech, or date..."
                className="w-full pl-10 pr-4 py-2 bg-white text-ink border-2 border-ink text-xs font-mono focus:outline-none focus:border-oxblood shadow-letterpress-sm"
              />
              <Search className="w-4 h-4 text-ink-500 absolute left-3 top-2.5" />
            </div>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-center text-xs font-mono text-ink-600 pb-2 border-b-2 border-ink">
          <span>OFFICIAL SESSIONS: {filteredDebates.length} RECORDED STENOGRAPHIC SESSIONS</span>
          <span className="stamp-oxblood text-[9px] py-0 px-1.5 font-bold">
            [ STENOGRAPHIC PROCEEDINGS ]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDebates.map((debate) => (
            <div 
              key={debate.id}
              className="bg-[#FAF6EE] border-2 border-ink hover:border-oxblood p-6 shadow-letterpress-sm hover:shadow-letterpress transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-oxblood bg-white px-2.5 py-0.5 border border-ink font-bold">
                    {debate.archive_id}
                  </span>
                  <ArchivalBadge type="DEBATE" />
                  <ArchivalBadge status={debate.verification_status} variant="status" />
                  {debate.verification_status === 'VERIFIED' && <ArchivalBadge variant="integrity" />}
                </div>

                <h3 
                  onClick={() => setSelectedDoc(debate)}
                  className="font-serif text-xl font-bold text-ink hover:text-oxblood cursor-pointer transition leading-snug"
                >
                  {debate.title}
                </h3>

                <p className="text-xs sm:text-sm text-ink-700 font-editorial leading-relaxed line-clamp-3 italic">
                  {debate.description}
                </p>

                <div className="bg-white p-3 border-2 border-ink text-xs text-ink-700 space-y-1 font-mono shadow-letterpress-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-500 uppercase">Citation Reference:</span>
                    <span className="font-bold text-ink">{debate.source_reference || 'Constituent Assembly of India'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-500 uppercase">Stenographic Date:</span>
                    <span className="font-bold text-ink">{debate.date_created || debate.year || '1948–1949'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-ink/20">
                <span className="text-[11px] font-editorial italic text-ink-600">
                  Dr. B.R. Ambedkar • Chairman, Drafting Committee
                </span>
                <button
                  onClick={() => setSelectedDoc(debate)}
                  className="px-4 py-2 bg-ink hover:bg-oxblood text-white font-mono font-bold uppercase text-xs transition flex items-center gap-1.5 border border-ink shadow-letterpress-sm"
                >
                  <span>[ Read Record ]</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
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
