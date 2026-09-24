import React from 'react';
import { Calendar, Globe, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { DocumentItem } from '../../types';
import { ArchivalBadge } from './ArchivalBadge';

interface DocumentCardProps {
  document: DocumentItem;
  onSelect: (document: DocumentItem) => void;
  viewMode?: 'grid' | 'list';
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onSelect,
  viewMode = 'grid'
}) => {
  const isVerified = document.verification_status === 'VERIFIED';
  const yearDisplay = document.year || (document.date_created ? document.date_created.slice(0, 4) : null);

  if (viewMode === 'list') {
    return (
      <div className="bg-[#FAF6EE] border border-ink/40 hover:border-ink p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-letterpress-sm">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-oxblood border border-oxblood/40 px-2 py-0.5 bg-newsprint-100">
              ACCESSION: {document.archive_id}
            </span>
            {yearDisplay && (
              <span className="font-mono text-[11px] font-bold text-ink bg-newsprint-200 border border-ink/30 px-1.5 py-0.5">
                EPOCH: {yearDisplay}
              </span>
            )}
            <ArchivalBadge type={document.document_type} />
            <ArchivalBadge status={document.verification_status} variant="status" />
            {isVerified && <ArchivalBadge variant="integrity" />}
          </div>
          <h3 
            onClick={() => onSelect(document)}
            className="text-base font-serif font-bold text-ink hover:text-oxblood cursor-pointer transition line-clamp-1"
          >
            {document.title}
          </h3>
          <p className="text-xs font-editorial text-ink-700 line-clamp-2 italic">
            {document.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-ink-600 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-oxblood" />
              {document.date_created || document.year || 'Undated'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-ink-500" />
              {document.language_name || 'English'}
            </span>
            {document.collection_title && (
              <span className="flex items-center gap-1 text-oxblood font-bold truncate max-w-xs uppercase">
                <BookOpen className="w-3.5 h-3.5 text-oxblood" />
                {document.collection_title}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <button
            onClick={() => onSelect(document)}
            className="w-full sm:w-auto px-4 py-2 bg-ink hover:bg-oxblood text-white text-xs font-mono uppercase font-bold tracking-wider transition flex items-center justify-center gap-1.5 shadow-letterpress-sm border border-ink"
          >
            <span>[ Examine Record ]</span>
            <ExternalLink className="w-3.5 h-3.5 text-newsprint-300" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAF6EE] border border-ink/40 hover:border-ink transition-all flex flex-col h-full group shadow-sm hover:shadow-letterpress">
      {/* Top Header & Archive Provenance Bar */}
      <div className="p-2.5 border-b border-ink/20 flex items-center justify-between gap-2 bg-newsprint-100 font-mono text-[10px]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-oxblood border border-oxblood/40 px-1.5 py-0.2 bg-[#FAF6EE]">
            {document.archive_id}
          </span>
          {yearDisplay && (
            <span className="text-ink-600 font-bold">
              • {yearDisplay}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ArchivalBadge type={document.document_type} />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {document.collection_title && (
            <p className="text-[10px] text-oxblood font-mono uppercase tracking-wider font-bold line-clamp-1 border-b border-ink/10 pb-1">
              {document.collection_title}
            </p>
          )}
          <h3 
            onClick={() => onSelect(document)}
            className="font-serif text-lg font-bold text-ink group-hover:text-oxblood cursor-pointer transition leading-snug line-clamp-2"
          >
            {document.title}
          </h3>
          <p className="text-xs font-editorial text-ink-700 line-clamp-3 leading-relaxed italic">
            {document.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="pt-3 border-t border-ink/20 space-y-2 font-mono">
          <div className="flex items-center justify-between text-[11px] text-ink-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-oxblood" />
              {document.date_created || document.year || 'Undated'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3 h-3 text-ink-500" />
              {document.language_name || 'English'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-ink/10 gap-1">
            <div className="flex items-center gap-1">
              <ArchivalBadge status={document.verification_status} variant="status" />
              {isVerified && <ArchivalBadge variant="integrity" />}
            </div>
            <button
              onClick={() => onSelect(document)}
              className="px-2.5 py-1 bg-ink hover:bg-oxblood text-white text-[11px] font-mono uppercase font-bold tracking-wider transition flex items-center gap-1 shadow-letterpress-sm border border-ink"
            >
              <span>[ Open Slip ]</span>
              <ExternalLink className="w-3 h-3 text-newsprint-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
