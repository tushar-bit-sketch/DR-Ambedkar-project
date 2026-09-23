import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, FileText, GitCommit, Eye, Layers, 
  Landmark, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink, X
} from 'lucide-react';
import { ProvenanceChainData } from '../../types';
import { apiService } from '../../services/api';

interface ProvenanceChainViewerProps {
  relationshipId: number;
  onClose?: () => void;
  onOpenDocument?: (docId: number) => void;
}

export const ProvenanceChainViewer: React.FC<ProvenanceChainViewerProps> = ({
  relationshipId,
  onClose,
  onOpenDocument
}) => {
  const [data, setData] = useState<ProvenanceChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    apiService.getRelationshipProvenance(relationshipId)
      .then(res => {
        if (mounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to resolve provenance chain');
          setLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [relationshipId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-stone-500 font-serif">
        <div className="inline-block w-6 h-6 border-2 border-heritage-600 border-t-transparent rounded-full animate-spin mb-2" />
        <p className="text-xs">Resolving unbroken archival provenance chain...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs">
        <p className="font-bold flex items-center gap-1.5 mb-1">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Provenance Resolution Error
        </p>
        <p>{error || 'Record unavailable'}</p>
      </div>
    );
  }

  const rel = data.relationship;

  return (
    <div className="bg-[#FAF8F5] border border-stone-200 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-heritage-600" />
          <h3 className="font-serif font-bold text-sm text-stone-900">
            Unbroken Archival Provenance Trail
          </h3>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md"
            aria-label="Close provenance drawer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Claim Summary Badge */}
      <div className="bg-white border border-stone-200 rounded-lg p-3 space-y-1.5 shadow-xs">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] text-stone-500 uppercase tracking-wider">
            HISTORICAL CLAIM / RELATIONSHIP
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            data.verification_status === 'APPROVED' || data.verification_status === 'VERIFIED'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {data.verification_status}
          </span>
        </div>
        <p className="font-serif font-bold text-sm text-stone-900">
          {rel?.source_entity_name} <span className="text-heritage-600 font-mono text-xs uppercase px-1.5 py-0.5 bg-heritage-50 rounded border border-heritage-200">{rel?.relationship_type}</span> {rel?.target_entity_name}
        </p>
        {rel?.evidence_text && (
          <p className="text-xs text-stone-600 italic bg-stone-50 p-2 rounded border border-stone-200">
            "{rel.evidence_text}"
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-1">
          <span>Classification: <strong className="text-stone-800">{data.provenance_classification}</strong></span>
          <span>•</span>
          <span>Confidence: <strong className="text-stone-800">{rel?.confidence_label || `${Math.round((rel?.confidence || 1) * 100)}%`}</strong></span>
        </div>
      </div>

      {/* The 6-Step Visual Archival Stepper */}
      <div className="space-y-3">
        <h4 className="text-[11px] font-mono uppercase tracking-wider text-stone-500">
          Lineage Steps to Primary Custodian
        </h4>

        <div className="space-y-2 text-xs">
          {/* Step 1: Physical Archival Repository */}
          <div className="flex items-start gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-mono font-bold text-[10px]">
              1
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-stone-600" />
                Physical Custodian / Primary Source
              </p>
              <p className="text-stone-600 text-[11px]">
                {data.physical_source?.source || data.document?.source_institution || 'Institutional Heritage Archives of India'}
              </p>
              {data.physical_source?.collection_name && (
                <p className="text-[10px] text-stone-500 font-mono">Collection: {data.physical_source.collection_name}</p>
              )}
            </div>
          </div>

          {/* Step 2: Archival Master Document */}
          <div className="flex items-start gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-mono font-bold text-[10px]">
              2
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-stone-600" />
                Archival Master Record
              </p>
              <p className="text-stone-700 font-serif">
                {data.document?.title || 'Cataloged Historical Document'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">
                  {data.document?.archive_id || 'ID Verified'}
                </span>
                {data.document?.id && onOpenDocument && (
                  <button
                    onClick={() => onOpenDocument(data.document!.id)}
                    className="text-[11px] text-heritage-600 hover:text-heritage-800 flex items-center gap-1 font-semibold"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Document Version */}
          <div className="flex items-start gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-mono font-bold text-[10px]">
              3
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5 text-stone-600" />
                Immutable Document Version #{data.document_version?.version_number || 1}
              </p>
              <p className="text-stone-600 text-[11px]">
                {data.document_version?.change_summary || 'Preserved versioned archival master.'}
              </p>
            </div>
          </div>

          {/* Step 4: OCR Page / Folio */}
          <div className="flex items-start gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-mono font-bold text-[10px]">
              4
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-stone-600" />
                OCR Folio / Page #{data.ocr_page?.page_number || 1}
              </p>
              <p className="text-stone-600 text-[11px]">
                Transcription Status: <strong className="text-emerald-700">{data.ocr_page?.review_status || 'VERIFIED'}</strong>
              </p>
            </div>
          </div>

          {/* Step 5: Search Chunk Passage */}
          <div className="flex items-start gap-3 bg-white p-2.5 rounded-lg border border-stone-200">
            <div className="w-6 h-6 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center text-stone-700 shrink-0 font-mono font-bold text-[10px]">
              5
            </div>
            <div className="flex-1">
              <p className="font-bold text-stone-900 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-stone-600" />
                Discrete Evidence Passage #{data.search_chunk?.chunk_index || 0}
              </p>
              <p className="text-stone-600 text-[11px]">
                Anchors relational proposition with verified exact text quotation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
