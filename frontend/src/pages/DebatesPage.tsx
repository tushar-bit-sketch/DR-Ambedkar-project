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
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      <section className="bg-[#1B2A4A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center space-x-2 text-xs font-mono text-heritage-300 uppercase tracking-wider">
            <Scale className="w-4 h-4 text-heritage-400" />
            <span>PARLIAMENTARY PROCEEDINGS • 1946–1950</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Constituent Assembly Debates (CAD)
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl font-light">
            Official stenographic records of the drafting of the Constitution of India, fundamental rights revisions, minority safeguards, and Dr. Ambedkar's committee defenses.
          </p>

          <div className="pt-2 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search debates by Draft Article, speech, or date..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-slate-900 bg-white border border-stone-300 text-sm focus:outline-none focus:border-heritage-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex justify-between items-center text-xs text-slate-500 pb-2 border-b border-stone-200">
          <span>Official Debates Catalog: {filteredDebates.length} Sessions</span>
          <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            [DEMO DATA REPOSITORY]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDebates.map((debate) => (
            <div 
              key={debate.id}
              className="bg-white border border-stone-200 hover:border-heritage-400 rounded-xl p-6 shadow-sm hover:shadow-archival transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-heritage-600 bg-heritage-50 px-2.5 py-0.5 rounded border border-heritage-200">
                    {debate.archive_id}
                  </span>
                  <ArchivalBadge type="DEBATE" />
                  <ArchivalBadge status={debate.verification_status} variant="status" />
                  <ArchivalBadge variant="demo" />
                </div>

                <h3 
                  onClick={() => setSelectedDoc(debate)}
                  className="font-serif text-xl font-bold text-ink-900 hover:text-heritage-700 cursor-pointer transition leading-snug"
                >
                  {debate.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                  {debate.description}
                </p>

                <div className="bg-stone-50 p-3 rounded text-xs text-slate-600 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span>Source Record:</span>
                    <span className="text-slate-800">{debate.source_reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stenographic Date:</span>
                    <span className="text-slate-800">{debate.date_created}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-sans">
                  Dr. B.R. Ambedkar • Chairman, Drafting Committee
                </span>
                <button
                  onClick={() => setSelectedDoc(debate)}
                  className="px-4 py-2 bg-national-700 hover:bg-national-800 text-white rounded text-xs font-semibold transition flex items-center gap-1.5 shadow"
                >
                  <span>Read Debate Record</span>
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
