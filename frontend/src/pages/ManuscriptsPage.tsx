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
    <div className="min-h-screen bg-[#F4EFE6] text-ink">
      <DemoBanner />

      {/* Broadsheet Masthead */}
      <section className="bg-[#FAF6EE] text-ink py-8 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-7xl mx-auto space-y-2">
          <span className="font-mono text-[11px] text-oxblood uppercase tracking-widest font-bold">
            HISTORICAL FOLIO PRESERVATION • ORIGINAL TYPESCRIPTS & MANUSCRIPTS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink">
            Archival Manuscripts & Corrected Typescripts
          </h1>
          <p className="text-stone-700 text-xs sm:text-sm max-w-3xl font-editorial italic leading-relaxed">
            Original handwritten notes, draft constitutional amendments, and corrected typescripts preserving marginalia, strike-throughs, and editorial annotations.
          </p>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Archival Facsimile Feature Card */}
        <div className="bg-[#FAF6EE] border-2 border-ink shadow-letterpress overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            
            {/* Visual Facsimile Placeholder */}
            <div className="lg:col-span-7 bg-[#1A1714] p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r-2 border-ink">
              <div className="bg-[#FAF6EE] p-8 border-2 border-ink max-w-md w-full shadow-letterpress space-y-4 font-serif text-ink">
                <div className="flex justify-between items-center border-b border-ink/20 pb-2 text-[10px] font-mono text-stone-600 font-bold">
                  <span>FACSIMILE FOLIO RECTO</span>
                  <span className="text-oxblood">MS-AMB-56-04</span>
                </div>
                <h3 className="font-bold text-lg border-b border-ink/20 pb-2 text-ink">
                  The Buddha and His Dhamma: Preface (1956)
                </h3>
                <p className="text-xs italic text-stone-800 leading-relaxed border-l-2 border-oxblood pl-3 font-editorial">
                  "Pali texts show that religion as understood by the Buddha was entirely different from religion as understood by other founders. Morality is Dhamma, and love is compassion..."
                </p>
                <div className="text-[10px] text-stone-600 font-mono pt-3 border-t border-ink/20 flex justify-between">
                  <span>Marginal red ink annotations</span>
                  <span className="text-oxblood font-bold">[ 1200 DPI MASTER ]</span>
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
                <h2 className="font-serif text-2xl font-black text-ink">
                  Unpublished Notes & Corrected Typescripts
                </h2>
                <p className="text-xs text-stone-700 font-editorial leading-relaxed">
                  These archival folios capture Dr. Ambedkar's exact writing process, including hand-penned Pali phonetic markers and structural revisions completed during the final months of 1956.
                </p>

                <div className="space-y-2 text-xs bg-white p-4 border-2 border-ink shadow-letterpress-sm font-mono">
                  <div className="flex justify-between py-1 border-b border-ink/20">
                    <span className="text-stone-500 uppercase">Custodial Seat:</span>
                    <span className="font-bold text-ink">People's Education Society Archives, Mumbai</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ink/20">
                    <span className="text-stone-500 uppercase">Substrate:</span>
                    <span className="font-bold text-ink">Typewritten Bond Paper with Pen Ink</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500 uppercase">Vault Level:</span>
                    <span className="font-bold text-oxblood">Cold Vault Master Storage (Grade A)</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={() => {
                    if (manuscripts.length > 0) setSelectedDoc(manuscripts[0]);
                  }}
                  className="w-full py-3 bg-ink hover:bg-oxblood text-white font-mono font-bold uppercase transition border border-ink shadow-letterpress-sm flex items-center justify-center gap-2 text-xs"
                >
                  <BookOpen className="w-4 h-4 text-white" />
                  <span>[ Open Scholarly Reading Easel ]</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Accessioned Manuscripts Catalog */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b-2 border-ink pb-2">
            <h3 className="font-serif font-black text-xl text-ink">
              Accessioned Manuscripts Ledger
            </h3>
            <span className="text-xs text-stone-600 font-mono font-bold">
              [ PRESERVATION CORPUS ]
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {manuscripts.map((m) => (
              <div 
                key={m.id}
                onClick={() => setSelectedDoc(m)}
                className="bg-[#FAF6EE] p-5 border-2 border-ink hover:border-oxblood transition cursor-pointer shadow-letterpress-sm hover:shadow-letterpress flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs text-oxblood bg-white px-2 py-0.5 border border-ink font-bold">
                      {m.archive_id}
                    </span>
                    <ArchivalBadge variant="demo" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-ink line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-xs text-stone-700 font-editorial line-clamp-2">
                    {m.description}
                  </p>
                </div>
                <div className="pt-2 border-t border-ink/20 flex justify-between items-center text-xs font-mono text-stone-600">
                  <span>RECORD YEAR: {m.year || 1956}</span>
                  <span className="text-oxblood font-bold flex items-center gap-1 uppercase">
                    [ Inspect Folio ] <ExternalLink className="w-3 h-3" />
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
