import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Shield, BookOpen, ExternalLink, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FAF6EE] text-ink border-t-4 border-double border-ink pt-12 pb-8 font-mono">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 pb-8 border-b border-ink/20">
          {/* Colophon & Masthead Summary */}
          <div className="space-y-3 md:col-span-1 border-r-0 md:border-r border-ink/20 pr-0 md:pr-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 border-2 border-ink flex items-center justify-center font-serif font-black text-base text-oxblood bg-newsprint-50">
                अ
              </div>
              <span className="font-serif font-black text-ink text-base tracking-wider uppercase">
                Ambedkar Archive
              </span>
            </div>
            <p className="text-xs font-editorial text-ink-700 leading-relaxed">
              Official institutional repository dedicated to the preservation, scholarly citation, and broadsheet dissemination of the writings, speeches, and parliamentary proceedings of Dr. B. R. Ambedkar.
            </p>
            <div className="pt-2 text-[10px] text-oxblood font-bold tracking-widest uppercase">
              GOVERNMENT GAZETTE VOL. LXXVI • REVISED EDITION
            </div>
          </div>

          {/* Curated Holdings Ledger */}
          <div className="space-y-3 border-r-0 md:border-r border-ink/20 pr-0 md:pr-6">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase border-b-2 border-ink pb-1 text-ink">
              Archival Holdings
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/debates" className="hover:text-oxblood hover:underline transition">
                  • CAD Debates (1946–1950)
                </Link>
              </li>
              <li>
                <Link to="/documents" className="hover:text-oxblood hover:underline transition">
                  • Social Treatises & Castes in India
                </Link>
              </li>
              <li>
                <Link to="/documents" className="hover:text-oxblood hover:underline transition">
                  • Economic & Monetary Works
                </Link>
              </li>
              <li>
                <Link to="/manuscripts" className="hover:text-oxblood hover:underline transition">
                  • Digitized Manuscripts & Notes
                </Link>
              </li>
              <li>
                <Link to="/media" className="hover:text-oxblood hover:underline transition">
                  • Audio-Visual Photographic Archive
                </Link>
              </li>
            </ul>
          </div>

          {/* Scholarly Standards & Citations */}
          <div className="space-y-3 border-r-0 md:border-r border-ink/20 pr-0 md:pr-6">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase border-b-2 border-ink pb-1 text-ink">
              Scholarly Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/research" className="hover:text-oxblood hover:underline transition font-bold text-oxblood">
                  ★ AI Research Assistant (RAG)
                </Link>
              </li>
              <li>
                <Link to="/timeline" className="hover:text-oxblood hover:underline transition">
                  • Chronological Historical Ledger
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-oxblood hover:underline transition">
                  • Provenance & Verification
                </Link>
              </li>
              <li className="text-ink-600 text-[11px]">
                • Dublin Core Metadata Standard
              </li>
              <li className="text-ink-600 text-[11px]">
                • ISO 14721 OAIS Reference Model
              </li>
            </ul>
          </div>

          {/* Institutional Imprint & Admin Desk */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm tracking-wider uppercase border-b-2 border-ink pb-1 text-ink">
              Archival Dispatch Desk
            </h4>
            <p className="text-xs font-editorial text-ink-700 leading-relaxed">
              Open scholarly access for constitutional jurisprudence, historical inquiry, and civic enlightenment.
            </p>
            <div className="pt-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white hover:bg-oxblood text-xs font-bold uppercase tracking-wider transition border border-ink shadow-letterpress-sm"
              >
                <Shield className="w-3.5 h-3.5" />
                Curatorial Ledger Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Verified Primary Source Inventory Strip */}
        <div className="bg-newsprint-200 border border-ink/30 p-3 mb-6 font-mono text-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="stamp-oxblood text-[8px] py-0 px-1 font-bold">SOURCE REPOSITORY ATTESTATION</span>
              <span className="text-[11px] font-bold text-ink-900">Verified Legal Deposit & Public Records Inventories:</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-ink-700">
              <span className="hover:text-oxblood">• Dr. Ambedkar Foundation (BAWS Vols. 1–22)</span>
              <span className="hover:text-oxblood">• Parliament of India (Constituent Assembly Debates)</span>
              <span className="hover:text-oxblood">• National Digital Library of India (NDLI)</span>
              <span className="hover:text-oxblood">• Dublin Core (ISO 15836)</span>
            </div>
          </div>
        </div>

        {/* Bottom Colophon Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-ink-600 gap-4 pt-2">
          <p className="text-[11px]">
            © {new Date().getFullYear()} The Ambedkar Digital Heritage Archive. All Facsimiles & Transcripts Maintained Under Open Scholarly Access.
          </p>
          <div className="flex items-center space-x-4 text-[10px] uppercase font-bold tracking-wider">
            <span className="text-oxblood">OAIS CERTIFIED REPOSITORY</span>
            <span>•</span>
            <Link to="/about" className="hover:text-oxblood hover:underline">
              Curatorial Charter
            </Link>
            <span>•</span>
            <Link to="/system-status" className="hover:text-oxblood hover:underline">
              Registry Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
