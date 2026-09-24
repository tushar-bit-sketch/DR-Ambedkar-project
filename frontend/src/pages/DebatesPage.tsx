import React, { useState, useEffect } from 'react';
import { Scale, Calendar, BookOpen, ExternalLink, Search } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { ArchivalBadge } from '../components/archive/ArchivalBadge';
import { DemoBanner } from '../components/archive/DemoBanner';

export const DebatesPage: React.FC = () => {
  const [debates, setDebates] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiService.getDocuments({ document_type: 'DEBATE' }).then(res => {
      setDebates(res.items);
    });
  }, []);

  const filteredDebates = debates.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase()) ||
    d.archive_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink">
      <DemoBanner />

      {/* Broadsheet Masthead */}
      <section className="bg-[#FAF6EE] text-ink py-8 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center space-x-2 text-[11px] font-mono text-oxblood uppercase tracking-widest font-bold">
            <Scale className="w-3.5 h-3.5 text-oxblood" />
            <span>RECORD DIVISION • PARLIAMENTARY PROCEEDINGS & STENOGRAPHIC DISPATCHES (1946–1950)</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink">
            Constituent Assembly Debates (CAD)
          </h1>
          <p className="text-stone-700 text-xs sm:text-sm max-w-3xl font-editorial italic leading-relaxed">
            Official stenographic records of the drafting of the Constitution of India, fundamental rights revisions, minority safeguards, and Dr. Ambedkar's committee defenses.
          </p>

          <div className="pt-2 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search debates by Draft Article, speech, or date..."
                className="w-full pl-10 pr-4 py-2 bg-white text-ink placeholder-stone-400 border-2 border-ink text-xs font-mono focus:outline-none focus:ring-1 focus:ring-oxblood shadow-letterpress-sm"
              />
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-center text-xs font-mono text-stone-600 pb-2 border-b-2 border-ink">
          <span>OFFICIAL SESSIONS: {filteredDebates.length} RECORDED STENOGRAPHIC SESSIONS</span>
          <span className="font-mono text-oxblood bg-red-50 px-2 py-0.5 border border-oxblood font-bold text-[10px]">
            [ DEMO DATA REPOSITORY ]
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
                  <ArchivalBadge variant="demo" />
                </div>

                <h3 
                  onClick={() => setSelectedDoc(debate)}
                  className="font-serif text-xl font-bold text-ink hover:text-oxblood cursor-pointer transition leading-snug"
                >
                  {debate.title}
                </h3>

                <p className="text-xs sm:text-sm text-stone-700 font-editorial leading-relaxed line-clamp-3">
                  {debate.description}
                </p>

                <div className="bg-white p-3 border-2 border-ink text-xs text-stone-700 space-y-1 font-mono shadow-letterpress-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500 uppercase">Citation Reference:</span>
                    <span className="font-bold text-ink">{debate.source_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500 uppercase">Stenographic Date:</span>
                    <span className="font-bold text-ink">{debate.date_created}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-ink/20">
                <span className="text-[11px] font-editorial italic text-stone-600">
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
