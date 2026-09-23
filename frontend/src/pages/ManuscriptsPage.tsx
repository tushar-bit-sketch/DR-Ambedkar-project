import React, { useState, useEffect } from 'react';
import { FileText, ZoomIn, ZoomOut, RotateCw, BookOpen, ExternalLink } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem } from '../types';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { ArchivalBadge } from '../components/archive/ArchivalBadge';
import { DemoBanner } from '../components/archive/DemoBanner';

export const ManuscriptsPage: React.FC = () => {
  const [manuscripts, setManuscripts] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    apiService.getDocuments({ document_type: 'MANUSCRIPT' }).then(res => {
      setManuscripts(res.items);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      <section className="bg-[#1B2A4A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-3">
          <span className="font-mono text-xs text-heritage-300 uppercase tracking-wider">
            HIGH-RESOLUTION ARCHIVAL FACSIMILES
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Historical Manuscripts & Original Typescripts
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl font-light">
            Original handwritten notes, draft constitutional amendments, and corrected typescripts preserving marginalia, strike-throughs, and editorial annotations.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Archival Facsimile Feature Card */}
        <div className="bg-white border-2 border-heritage-300 rounded-xl overflow-hidden shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Visual Facsimile Placeholder */}
            <div className="lg:col-span-7 bg-[#23272D] p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-stone-300">
              <div className="bg-[#F8F4EA] p-8 rounded border-4 border-[#D9CEB2] max-w-md w-full shadow-2xl space-y-4 font-serif text-stone-900">
                <div className="flex justify-between items-center border-b border-stone-400 pb-2 text-[10px] font-mono text-stone-500">
                  <span>FACSIMILE FOLIO RECTO</span>
                  <span>MS-AMB-56-04</span>
                </div>
                <h3 className="font-bold text-lg border-b border-stone-300 pb-2">
                  The Buddha and His Dhamma: Preface (1956)
                </h3>
                <p className="text-xs italic text-stone-700 leading-relaxed border-l-2 border-heritage-500 pl-3">
                  "Pali texts show that religion as understood by the Buddha was entirely different from religion as understood by other founders. Morality is Dhamma, and love is compassion..."
                </p>
                <div className="text-[10px] text-stone-500 font-mono pt-3 border-t border-stone-300 flex justify-between">
                  <span>Marginal red ink annotations</span>
                  <span className="text-emerald-700 font-bold">1200 DPI MASTER</span>
                </div>
              </div>
            </div>

            {/* Facsimile Details */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArchivalBadge type="MANUSCRIPT" />
                  <ArchivalBadge status="PENDING_OCR" variant="status" />
                  <ArchivalBadge variant="demo" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-ink-900">
                  Unpublished Notes & Corrected Typescripts
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  These archival folios capture Dr. Ambedkar's exact writing process, including hand-penned Pali phonetic markers and structural revisions completed during the final months of 1956.
                </p>

                <div className="space-y-2 text-xs bg-stone-50 p-4 rounded-lg border border-stone-200">
                  <div className="flex justify-between py-1 border-b border-stone-200">
                    <span className="text-slate-500">Physical Location:</span>
                    <span className="font-semibold text-slate-800">People's Education Society Archives, Mumbai</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200">
                    <span className="text-slate-500">Substrate:</span>
                    <span className="font-semibold text-slate-800">Typewritten Bond Paper with Pen Ink</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Preservation Tier:</span>
                    <span className="font-semibold text-emerald-800">Cold Vault Master Storage (Grade A)</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => {
                    if (manuscripts.length > 0) setSelectedDoc(manuscripts[0]);
                  }}
                  className="w-full py-3 bg-[#1B2A4A] hover:bg-[#102038] text-white font-bold rounded-lg transition shadow flex items-center justify-center gap-2 text-sm"
                >
                  <BookOpen className="w-4 h-4 text-heritage-300" />
                  <span>Open High-Resolution Facsimile Viewer</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Accessioned Manuscripts Catalog */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-stone-200 pb-2">
            <h3 className="font-serif font-bold text-lg text-ink-900">
              Accessioned Manuscripts Catalog
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              [PHASE 1 OCR INTEGRATION FOUNDATION]
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {manuscripts.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedDoc(m)}
                className="bg-white p-5 rounded-lg border border-stone-200 hover:border-heritage-400 transition cursor-pointer shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-heritage-600 bg-heritage-50 px-2 py-0.5 rounded border border-heritage-200">
                      {m.archive_id}
                    </span>
                    <ArchivalBadge variant="demo" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-ink-900 line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {m.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-xs text-slate-500">
                  <span>Year: {m.year || 1956}</span>
                  <span className="text-heritage-600 font-semibold flex items-center gap-1">
                    Inspect Folio <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
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
