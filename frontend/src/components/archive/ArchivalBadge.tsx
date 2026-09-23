import React from 'react';
import { DocumentType, VerificationStatus } from '../../types';

interface ArchivalBadgeProps {
  type?: DocumentType | string;
  status?: VerificationStatus | string;
  variant?: 'type' | 'status' | 'demo';
  className?: string;
}

export const ArchivalBadge: React.FC<ArchivalBadgeProps> = ({
  type,
  status,
  variant = 'type',
  className = ''
}) => {
  if (variant === 'demo') {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 font-semibold ${className}`}>
        DEMO DATA
      </span>
    );
  }

  if (variant === 'status' && status) {
    let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';
    if (status === 'VERIFIED') {
      colorClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    } else if (status === 'PENDING_OCR') {
      colorClass = 'bg-blue-50 text-blue-800 border-blue-300';
    } else if (status === 'IN_REVIEW') {
      colorClass = 'bg-amber-50 text-amber-800 border-amber-300';
    } else if (status === 'DRAFT') {
      colorClass = 'bg-slate-100 text-slate-800 border-slate-300';
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider border font-medium ${colorClass} ${className}`}>
        {status.replace('_', ' ')}
      </span>
    );
  }

  // Type badge
  const typeColors: Record<string, string> = {
    MANUSCRIPT: 'bg-amber-50 text-amber-900 border-amber-200',
    BOOK: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    SPEECH: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    DEBATE: 'bg-blue-50 text-blue-900 border-blue-200',
    ESSAY: 'bg-purple-50 text-purple-900 border-purple-200',
    LETTER: 'bg-rose-50 text-rose-900 border-rose-200',
    GAZETTE: 'bg-stone-100 text-stone-900 border-stone-300'
  };

  const style = (type && typeColors[type]) || 'bg-slate-100 text-slate-800 border-slate-300';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-serif uppercase tracking-wider border font-medium ${style} ${className}`}>
      {type || 'DOCUMENT'}
    </span>
  );
};
