import React from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Shield, BookOpen, ExternalLink, Globe } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#12161A] text-slate-300 border-t-4 border-heritage-500 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Institution Col */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-heritage-500 text-slate-950 flex items-center justify-center font-serif font-bold text-sm">
                अ
              </div>
              <span className="font-serif font-bold text-white text-lg tracking-wide">
                AMBEDKAR ARCHIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutional Digital Heritage Platform dedicated to preserving and exploring the writings, speeches, parliamentary debates, and manuscripts of Dr. B. R. Ambedkar.
            </p>
            <div className="pt-2 text-[11px] text-heritage-400 font-mono">
              SIH26096 Phase 1 Architecture
            </div>
          </div>

          {/* Curated Collections */}
          <div>
            <h4 className="text-white font-serif font-semibold text-sm mb-4 tracking-wider uppercase border-b border-white/10 pb-1">
              Curated Collections
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/debates" className="hover:text-heritage-300 transition">
                  Constituent Assembly Debates (1946–1950)
                </Link>
              </li>
              <li>
                <Link to="/documents" className="hover:text-heritage-300 transition">
                  Writings on Caste & Social Emancipation
                </Link>
              </li>
              <li>
                <Link to="/documents" className="hover:text-heritage-300 transition">
                  Columbia & LSE Economic Treatises
                </Link>
              </li>
              <li>
                <Link to="/manuscripts" className="hover:text-heritage-300 transition">
                  Unpublished Manuscripts & Typescripts
                </Link>
              </li>
              <li>
                <Link to="/media" className="hover:text-heritage-300 transition">
                  Historical Photographic & Audio Archive
                </Link>
              </li>
            </ul>
          </div>

          {/* Research & Access */}
          <div>
            <h4 className="text-white font-serif font-semibold text-sm mb-4 tracking-wider uppercase border-b border-white/10 pb-1">
              Research & Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/research" className="hover:text-heritage-300 transition flex items-center gap-1">
                  <span>AI Research Assistant (Placeholder)</span>
                </Link>
              </li>
              <li>
                <Link to="/timeline" className="hover:text-heritage-300 transition">
                  Interactive Historical Timeline
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-heritage-300 transition">
                  Provenance & Digitization Standards
                </Link>
              </li>
              <li>
                <span className="text-slate-400 flex items-center gap-1">
                  Dublin Core Metadata Compliant
                </span>
              </li>
              <li>
                <span className="text-slate-400">
                  ISO 14721 OAIS Reference Model
                </span>
              </li>
            </ul>
          </div>

          {/* Institutional Governance */}
          <div>
            <h4 className="text-white font-serif font-semibold text-sm mb-4 tracking-wider uppercase border-b border-white/10 pb-1">
              Archival Access
            </h4>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Open public access for academic research, civic education, and constitutional jurisprudence.
            </p>
            <div className="space-y-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-heritage-600/30 hover:bg-heritage-600/50 text-heritage-300 text-xs transition border border-heritage-500/40"
              >
                <Shield className="w-3.5 h-3.5" />
                Archivist Administration Portal
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 gap-4">
          <p>
            © {new Date().getFullYear()} Ambedkar Digital Heritage Archive. Built for SIH26096 Phase 1 Foundation.
          </p>
          <div className="flex items-center space-x-6">
            <span className="text-amber-400/90 font-mono text-[11px]">
              * DEMO DATA: Phase 1 Architectural Prototype
            </span>
            <Link to="/about" className="hover:text-white transition">
              Curatorial Policy
            </Link>
            <Link to="/about" className="hover:text-white transition">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
