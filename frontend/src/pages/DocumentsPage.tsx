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

  useEffect(() => {
    apiService.getDocuments({ page_size: 50 }).then(res => {
      // Filter primarily books, essays, monographs
      const writings = res.items.filter(d => 
        d.document_type === 'BOOK' || d.document_type === 'ESSAY' || d.document_type === 'GAZETTE'
      );
      setDocs(writings.length > 0 ? writings : res.items);
    });
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
          <span className="font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            [DEMO DATA REPOSITORY]
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onSelect={(d) => setSelectedDoc(d)}
            />
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
