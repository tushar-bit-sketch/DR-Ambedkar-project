import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentCard } from '../components/archive/DocumentCard';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { DemoBanner } from '../components/archive/DemoBanner';

export const DocumentsPage: React.FC = () => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const fetchDocuments = () => {
    setLoading(true);
    setError(null);
    apiService.getDocuments({ page_size: 50 })
      .then(res => {
        setIsDemo(Boolean(res.is_demo_data));
        const writings = res.items.filter(d => 
          d.document_type === 'BOOK' || d.document_type === 'ESSAY' || d.document_type === 'GAZETTE'
        );
        setDocs(writings.length > 0 ? writings : res.items);
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to connect to Archival Document Repository.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      <section className="bg-[#1B2A4A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-3">
          <span className="font-mono text-xs text-heritage-300 uppercase tracking-wider">
            PRIMARY CORPUS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Documents, Writings & Published Monographs
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl font-light">
            Scholarly books, economic treatises, social emancipation essays, legislative acts, and official memoranda authored by Dr. B. R. Ambedkar.
          </p>

          <div className="pt-2 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter writings by title or keyword..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-slate-900 bg-white border border-stone-300 text-sm focus:outline-none focus:border-heritage-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex justify-between items-center text-xs text-slate-500">
          <span>Displaying {filteredDocs.length} Curated Writings</span>
          {isDemo ? (
            <span className="font-mono text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              [DEMO DATASET]
            </span>
          ) : (
            <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              [LIVE ARCHIVE REPOSITORY]
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-heritage-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-mono">Loading archival corpus records...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-8 text-center max-w-xl mx-auto space-y-3">
            <h3 className="font-serif font-bold text-rose-900 text-base">Archival Repository Unavailable</h3>
            <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
            <button
              onClick={fetchDocuments}
              className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-bold transition shadow"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-stone-300" />
            <p className="text-sm font-serif">No writings matched your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={(d) => setSelectedDoc(d)}
              />
            ))}
          </div>
        )}
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
