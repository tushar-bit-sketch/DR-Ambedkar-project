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
    <div className="min-h-screen bg-newsprint-100 text-ink">
      <DemoBanner />

      <section className="bg-[#FAF6EE] text-ink py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex items-center justify-between font-mono text-[11px] text-oxblood border-b border-ink/10 pb-1">
            <span className="font-bold tracking-wider uppercase">
              [ OFFICIAL CLASSIFIED LEDGER • PRIMARY CORPUS ]
            </span>
            <span>OAIS METADATA VERIFIED</span>
          </div>
          <h1 className="font-serif font-black text-3xl sm:text-4xl text-ink uppercase tracking-tight">
            Documents, Writings & Published Monographs
          </h1>
          <p className="font-editorial text-sm sm:text-base text-ink-700 max-w-3xl leading-relaxed italic">
            Scholarly books, economic treatises, social emancipation essays, legislative acts, and official memoranda authored by Dr. B. R. Ambedkar.
          </p>

          <div className="pt-2 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter ledger by title, accession, or keyword..."
                className="w-full pl-10 pr-4 py-2 border-2 border-ink text-ink bg-white font-mono text-xs focus:outline-none focus:bg-newsprint-50"
              />
              <Search className="w-4 h-4 text-ink-500 absolute left-3 top-2.5" />
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center text-xs font-mono text-ink-600 border-b border-ink/20 pb-2">
          <span>Displaying {filteredDocs.length} Catalogued Holdings</span>
          <span className="stamp-oxblood text-[9px] py-0 px-1.5">
            [ARCHIVAL CORPUS]
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3 font-mono">
            <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-ink-600 uppercase tracking-widest">Retrieving archival ledger records...</p>
          </div>
        ) : error ? (
          <div className="bg-[#FAF6EE] border-2 border-oxblood p-6 text-center max-w-xl mx-auto space-y-3 shadow-letterpress-sm font-mono">
            <h3 className="font-serif font-bold text-oxblood text-base uppercase">Archival Repository Unavailable</h3>
            <p className="text-xs text-ink-700 font-editorial leading-relaxed">{error}</p>
            <button
              onClick={fetchDocuments}
              className="px-4 py-2 bg-oxblood hover:bg-ink text-white font-mono text-xs font-bold uppercase tracking-wider transition border border-oxblood shadow-letterpress-sm"
            >
              [ Retry Connection ]
            </button>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-16 text-center text-ink-500 font-mono">
            <BookOpen className="w-12 h-12 mx-auto mb-2 text-ink-400" />
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
