import React from 'react';
import { FileText, Calendar, Globe, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
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
  if (viewMode === 'list') {
    return (
      <div className="bg-white border border-stone-200 hover:border-heritage-400 p-4 rounded-lg shadow-sm hover:shadow-archival transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-heritage-600 bg-heritage-50 px-2 py-0.5 rounded border border-heritage-200">
              {document.archive_id}
            </span>
            <ArchivalBadge type={document.document_type} />
            <ArchivalBadge status={document.verification_status} variant="status" />
            <ArchivalBadge variant="demo" />
          </div>
          <h3 
            onClick={() => onSelect(document)}
            className="text-base font-serif font-bold text-ink-900 hover:text-heritage-700 cursor-pointer transition line-clamp-1"
          >
            {document.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-2">
            {document.description}
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-heritage-500" />
              {document.date_created || document.year || 'Undated'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-heritage-500" />
              {document.language_name || 'English'}
            </span>
            {document.collection_title && (
              <span className="flex items-center gap-1 text-slate-600 truncate max-w-xs">
                <BookOpen className="w-3.5 h-3.5 text-heritage-500" />
                {document.collection_title}
              </span>
            )}
          </div>
        </div>
        <div>
          <button
            onClick={() => onSelect(document)}
            className="w-full sm:w-auto px-4 py-2 bg-national-700 hover:bg-national-800 text-white text-xs font-semibold rounded shadow-sm hover:shadow transition flex items-center justify-center gap-1.5"
          >
            <span>View Document</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stone-200 hover:border-heritage-400 rounded-lg shadow-sm hover:shadow-archival transition-all flex flex-col h-full overflow-hidden group">
      {/* Top Header & Archive Provenance Bar */}
      <div className="p-4 pb-2 border-b border-stone-100 flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-heritage-600 bg-heritage-50 px-2 py-0.5 rounded border border-heritage-200">
          {document.archive_id}
        </span>
        <div className="flex items-center gap-1.5">
          <ArchivalBadge type={document.document_type} />
          <ArchivalBadge variant="demo" />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {document.collection_title && (
            <p className="text-[11px] text-slate-500 font-medium tracking-wide line-clamp-1 uppercase">
              {document.collection_title}
            </p>
          )}
          <h3 
            onClick={() => onSelect(document)}
            className="font-serif text-lg font-bold text-ink-900 group-hover:text-heritage-700 cursor-pointer transition leading-snug line-clamp-2"
          >
            {document.title}
          </h3>
          <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
            {document.description}
          </p>
        </div>

        {/* Metadata Footer */}
        <div className="pt-4 border-t border-stone-100 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-heritage-500" />
              {document.date_created || document.year || 'Undated'}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-heritage-500" />
              {document.language_name || 'English'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <ArchivalBadge status={document.verification_status} variant="status" />
            <button
              onClick={() => onSelect(document)}
              className="px-3.5 py-1.5 bg-[#1B2A4A] hover:bg-[#102038] text-white text-xs font-semibold rounded shadow-sm hover:shadow transition flex items-center gap-1.5"
            >
              <span>View Document</span>
              <ExternalLink className="w-3 h-3 text-heritage-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
