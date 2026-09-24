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
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-none text-[9px] font-mono uppercase tracking-widest bg-newsprint-200 text-oxblood border border-oxblood font-bold ${className}`}>
        ARCHIVAL SPECIMEN
      </span>
    );
  }

  if (variant === 'status' && status) {
    let colorClass = 'bg-newsprint-100 text-ink border-ink/40';
    if (status === 'VERIFIED') {
      colorClass = 'bg-[#FAF6EE] text-emerald-900 border-emerald-800 font-bold';
    } else if (status === 'PENDING_OCR') {
      colorClass = 'bg-newsprint-200 text-ink-700 border-ink/40';
    } else if (status === 'IN_REVIEW') {
      colorClass = 'bg-newsprint-200 text-oxblood border-oxblood';
    } else if (status === 'DRAFT') {
      colorClass = 'bg-newsprint-100 text-ink-600 border-ink/30';
    }

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-mono uppercase tracking-wider border ${colorClass} ${className}`}>
        [{status.replace('_', ' ')}]
      </span>
    );
  }

  // Type badge in rubber-stamp broadsheet format
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-mono uppercase tracking-wider border border-ink/40 bg-newsprint-100 text-ink font-semibold ${className}`}>
      {type || 'DOCUMENT'}
    </span>
  );
};
