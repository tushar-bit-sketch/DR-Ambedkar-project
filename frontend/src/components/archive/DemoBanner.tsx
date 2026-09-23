import React from 'react';
import { ShieldAlert, Info, ShieldCheck } from 'lucide-react';

interface DemoBannerProps {
  customMessage?: string;
  isDemoData?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ customMessage, isDemoData }) => {
  if (isDemoData === false) {
    return (
      <aside aria-label="Authentic Archival Repository" className="bg-emerald-50 border-b border-emerald-200 text-emerald-900 px-4 py-2 text-xs font-medium">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse flex-shrink-0"></span>
            <span className="truncate sm:whitespace-normal">
              <strong>INSTITUTIONAL ARCHIVE ACTIVE:</strong> Sourced from official public records (Dr. Ambedkar Foundation BAWS & Constituent Assembly Debates) with SHA-256 integrity verification.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-emerald-800 bg-emerald-100 border border-emerald-300/60 px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider font-mono whitespace-nowrap flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Verified Primary Corpus</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Digital Heritage Repository Status" className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs md:text-sm font-medium">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span className="leading-snug">
            <strong>DIGITAL HERITAGE REPOSITORY:</strong>{' '}
            {customMessage || "Items in this repository are managed under strict Dublin Core provenance and SHA-256 checksums. Any test/synthetic records are strictly flagged as DEMO DATA."}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider font-mono whitespace-nowrap flex-shrink-0">
          <Info className="w-3.5 h-3.5 text-amber-700" />
          <span>OAIS Build v2.0</span>
        </div>
      </div>
    </aside>
  );
};
