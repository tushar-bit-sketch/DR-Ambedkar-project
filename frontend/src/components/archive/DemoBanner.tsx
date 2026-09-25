import React from 'react';
import { ShieldAlert, Info, ShieldCheck, WifiOff } from 'lucide-react';

interface DemoBannerProps {
  customMessage?: string;
  isDemoData?: boolean;
  isOffline?: boolean;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ customMessage, isDemoData, isOffline }) => {
  if (isOffline) {
    return (
      <aside aria-label="Archive Backend Offline Notice" className="bg-[#E2CFB4] border-b border-ink/40 text-ink px-4 py-1.5 text-xs font-mono">
        <div className="max-w-[1540px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <WifiOff className="w-3.5 h-3.5 text-[#79402C] flex-shrink-0 animate-pulse" />
            <span className="truncate sm:whitespace-normal text-[10px] sm:text-[11px] text-ink">
              <strong className="text-[#79402C] uppercase font-bold">[ARCHIVE TELEPRINTER: BACKEND OFFLINE]</strong>{' '}
              {customMessage || "Live FastAPI search engine is currently offline. Primary repository cache and static broadsheet exhibits remain fully accessible."}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-ink bg-[#D4BE9B] border border-ink/40 px-2 py-0.5 text-[9px] uppercase tracking-wider font-mono whitespace-nowrap flex-shrink-0 font-bold">
            <ShieldAlert className="w-3 h-3 text-[#79402C]" />
            <span>STANDALONE MODE</span>
          </div>
        </div>
      </aside>
    );
  }

  if (isDemoData === false) {
    return (
      <aside aria-label="Authentic Archival Repository" className="bg-[#FAF6EE] border-b border-ink/20 text-ink px-4 py-1.5 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 bg-emerald-800 flex-shrink-0"></span>
            <span className="truncate sm:whitespace-normal text-[11px]">
              <strong className="text-oxblood uppercase font-bold">[OFFICIAL REPOSITORY RECORD]</strong> Sourced from official public records (BAWS & CAD Debates) with SHA-256 integrity verification.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-ink-700 bg-newsprint-200 border border-ink/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono whitespace-nowrap flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-800" />
            <span>Verified Primary Corpus</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Digital Heritage Repository Status" className="bg-[#FAF6EE] border-b border-ink/20 text-ink px-4 py-1.5 text-xs font-mono">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert className="w-4 h-4 text-oxblood flex-shrink-0" />
          <span className="leading-snug text-[11px]">
            <strong className="text-oxblood uppercase font-bold">[CURATORIAL NOTICE]</strong>{' '}
            {customMessage || "Items in this repository are managed under strict Dublin Core provenance and SHA-256 checksums."}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-ink-700 bg-newsprint-200 border border-ink/30 px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono whitespace-nowrap flex-shrink-0">
          <Info className="w-3.5 h-3.5 text-oxblood" />
          <span>OAIS Ledger v2.6</span>
        </div>
      </div>
    </aside>
  );
};
