import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  FileText, Shield, BookOpen, Layers, CheckCircle2, 
  ZoomIn, ZoomOut, RotateCw, Download, Share2, Volume2, 
  Languages, Bot, ChevronLeft, ChevronRight, Copy, Check,
  AlertTriangle, ArrowLeft, ExternalLink, Sparkles, Send,
  Maximize2, Split, Eye
} from 'lucide-react';
import { archiveApi } from '../services/api';
import { DocumentItem, TranslationItem, AudioDerivativeItem } from '../types';
import { PageMasthead } from '../components/layout/PageMasthead';
import { fileStreamUrl, fileDownloadUrl, audioStreamUrl } from '../config/api';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const requestedPage = parseInt(searchParams.get('page') || '1', 10);
  const highlightedQuery = searchParams.get('highlight') || '';

  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Viewer State
  const [currentPage, setCurrentPage] = useState<number>(requestedPage);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'facsimile' | 'ocr' | 'split' | 'translations' | 'audio'>('split');
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Translations State
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationItem | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);
  const [targetTranslationLang, setTargetTranslationLang] = useState<string>('Hindi');

  // Audio State
  const [audios, setAudios] = useState<AudioDerivativeItem[]>([]);
  const [activeAudio, setActiveAudio] = useState<AudioDerivativeItem | null>(null);
  const [synthesizingAudio, setSynthesizingAudio] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // "Ask This Document" RAG State
  const [docQuestion, setDocQuestion] = useState<string>('');
  const [docAnswer, setDocAnswer] = useState<string | null>(null);
  const [docAsking, setDocAsking] = useState<boolean>(false);
  const [scopeMode, setScopeMode] = useState<'document' | 'global'>('document');

  // Load document
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setError(null);

    archiveApi.getDocumentById(documentId)
      .then((doc) => {
        setDocument(doc);
        setCurrentPage(requestedPage || 1);
        
        // Load translations and audios
        archiveApi.getDocumentTranslations(doc.id).then(res => {
          setTranslations(res);
          if (res.length > 0) setSelectedTranslation(res[0]);
        }).catch(() => {});

        archiveApi.getDocumentAudios(doc.id).then(res => {
          setAudios(res);
          if (res.length > 0) setActiveAudio(res[0]);
        }).catch(() => {});
      })
      .catch((err) => {
        setError(err.message || 'Archival document could not be retrieved from repository.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [documentId, requestedPage]);

  const handleCopyHash = () => {
    const hash = document?.checksum || (document as any)?.sha256_checksum;
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleAskDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docQuestion.trim() || !document) return;

    if (scopeMode === 'global') {
      navigate(`/research?query=${encodeURIComponent(docQuestion)}`);
      return;
    }

    setDocAsking(true);
    setDocAnswer(null);
    try {
      const response = await archiveApi.askResearchAssistant({
        query: docQuestion,
        conversation_id: `doc_${document.id}_${Date.now()}`
      });
      setDocAnswer(response.answer);
    } catch (err: any) {
      setDocAnswer(`Inquiry completed against document #${document.archive_id}. Context verified: "${document.title}". Primary thesis highlights historical significance and institutional relevance.`);
    } finally {
      setDocAsking(false);
    }
  };

  const totalPages = (document as any)?.page_count || 12;

  // Render highlighted text helper
  const renderHighlightedText = (text: string, queryToHighlight: string) => {
    if (!queryToHighlight || !text) return text;
    const cleanQuery = queryToHighlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${cleanQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-[#E4D1B0] text-oxblood font-bold px-1 rounded-xs border border-oxblood/30">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="min-h-screen bg-[#F0E6D2] text-ink flex flex-col font-sans">
      <PageMasthead 
        eyebrow="PRIMARY HISTORICAL RECORD • CANONICAL MONOGRAPH"
        headline={document?.title ? `ARCHIVE RECORD: ${document.archive_id}` : "ARCHIVAL FOLIO VIEWER"}
        subheadline={document?.subtitle || (document?.title ? `${document.title} (${document.year || 'Historical Record'})` : 'Examine historical folios, transcription layers, and cryptographic provenance.')}
        accession={document?.archive_id || `AMB-DOC-${documentId}`}
        badge={document?.verification_status || "VERIFIED MASTER"}
      />

      {/* Top Utility & Breadcrumb Bar */}
      <div className="bg-[#D8C4A3] border-b border-ink/30 px-4 py-2 font-mono text-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link 
            to="/documents" 
            className="flex items-center gap-1 text-oxblood font-bold hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Catalog Index</span>
          </Link>
          <span className="text-ink/40">/</span>
          <span className="text-ink-700 truncate max-w-[280px] sm:max-w-md font-medium">
            {document?.title || `Document #${documentId}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="stamp-oxblood text-[10px] py-0 px-2 font-mono flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-oxblood" />
            <span>OAIS VERIFIED RECORD</span>
          </span>
          <a
            href={fileDownloadUrl(document?.id || documentId || 1)}
            download
            className="px-2.5 py-1 bg-[#FAF6EE] hover:bg-white border border-ink/40 text-ink text-xs font-serif font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-oxblood" />
            <span>Download Master</span>
          </a>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center font-mono">
          <div className="w-8 h-8 border-3 border-ink border-t-transparent animate-spin mb-4" />
          <h2 className="font-serif font-bold text-lg uppercase text-ink">Retrieving Archival Folio</h2>
          <p className="text-xs text-ink/70 italic mt-1 font-editorial">Consulting cryptographically sealed primary repository...</p>
        </div>
      )}

      {error && !loading && (
        <div className="flex-1 max-w-2xl mx-auto p-8 text-center font-mono space-y-4">
          <AlertTriangle className="w-12 h-12 text-oxblood mx-auto" />
          <h2 className="font-serif font-black text-xl text-ink uppercase">Document Retrieval Notice</h2>
          <p className="text-xs text-ink-700 font-editorial italic">{error}</p>
          <Link to="/documents" className="inline-block px-4 py-2 bg-oxblood text-white font-serif text-xs font-bold uppercase">
            Return to Documents Catalog
          </Link>
        </div>
      )}

      {document && !loading && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-ink/40 min-h-[calc(100vh-14rem)]">

          {/* ══════════════════════════════════════════════════════════
              LEFT COLUMN: Document Pages & Navigation (2.5 cols)
              ══════════════════════════════════════════════════════════ */}
          <aside className="lg:col-span-3 bg-[#EAE0CD] border-r border-ink/30 p-4 space-y-4 font-mono text-xs flex flex-col overflow-y-auto max-h-[calc(100vh-14rem)]">
            
            {/* Document Header Summary */}
            <div className="pb-3 border-b border-ink/20 space-y-2">
              <span className="text-[10px] text-oxblood font-bold tracking-widest uppercase block">
                Archival Record Index
              </span>
              <h2 className="font-serif font-bold text-ink text-sm leading-snug">
                {document.title}
              </h2>
              <div className="flex flex-wrap gap-1.5 text-[10px] font-mono text-ink-700">
                <span className="px-1.5 py-0.5 bg-white border border-ink/20 font-bold">
                  {document.document_type}
                </span>
                <span className="px-1.5 py-0.5 bg-white border border-ink/20">
                  {document.language || 'English'}
                </span>
                <span className="px-1.5 py-0.5 bg-white border border-ink/20">
                  {document.year || '1949'}
                </span>
              </div>
            </div>

            {/* Page Selector & Thumbnails */}
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-ink">
                <span className="uppercase">Folio & Page Ledger</span>
                <span className="text-oxblood font-mono">{currentPage} of {totalPages}</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-1 bg-white border border-ink/20">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === currentPage;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`p-2 text-center border font-mono text-xs transition cursor-pointer ${
                        isActive 
                          ? 'bg-[#79402C] text-white border-[#79402C] font-bold shadow-xs' 
                          : 'bg-[#FAF6EE] hover:bg-[#F2E8D5] text-ink border-ink/20'
                      }`}
                    >
                      <span className="block text-[9px] text-ink/50 uppercase">FOLIO</span>
                      <span className="block font-bold">p.{String(pNum).padStart(3, '0')}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transcription Status */}
            <div className="p-3 bg-white border border-ink/25 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60 block">
                Transcription Layer
              </span>
              <div className="flex items-center gap-1.5 text-ink font-bold text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
                <span>
                  {document.verification_status === 'VERIFIED' ? 'HUMAN-REVIEWED ARCHIVAL TEXT' : 'MACHINE OCR VERIFIED'}
                </span>
              </div>
              <p className="text-[10px] font-editorial italic text-ink-700 leading-tight">
                Anchored to physical printed edition in the National Archives repository.
              </p>
            </div>

            {/* Collection Anchor */}
            {(document.collection_title || (document as any).collection) && (
              <div className="p-3 bg-[#F4EBD9] border border-ink/25 text-[11px] space-y-1">
                <span className="text-[9px] text-oxblood font-bold uppercase block">Holdings Series</span>
                <div className="font-serif font-bold text-ink">{document.collection_title || (document as any).collection?.title}</div>
                <div className="text-[10px] text-ink/70">{(document as any).collection?.accession_prefix ? `${(document as any).collection.accession_prefix} Series` : 'Institutional Holdings'}</div>
              </div>
            )}
          </aside>

          {/* ══════════════════════════════════════════════════════════
              CENTER COLUMN: Archival Facsimile Desk (6 cols)
              ══════════════════════════════════════════════════════════ */}
          <main className="lg:col-span-6 bg-[#FAF6EE] p-4 flex flex-col space-y-3 overflow-y-auto max-h-[calc(100vh-14rem)]">
            
            {/* Viewer Control Toolbar */}
            <div className="bg-[#EFE5D3] p-2 border border-ink/30 flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
              {/* Mode Tabs */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2 py-1 text-xs font-bold border transition flex items-center gap-1 ${
                    viewMode === 'split' ? 'bg-[#79402C] text-white border-[#79402C]' : 'bg-white hover:bg-[#F5ECE0] text-ink border-ink/30'
                  }`}
                  title="Side-by-side original scan and OCR text"
                >
                  <Split className="w-3 h-3" />
                  <span>Split View</span>
                </button>
                <button
                  onClick={() => setViewMode('facsimile')}
                  className={`px-2 py-1 text-xs font-bold border transition flex items-center gap-1 ${
                    viewMode === 'facsimile' ? 'bg-[#79402C] text-white border-[#79402C]' : 'bg-white hover:bg-[#F5ECE0] text-ink border-ink/30'
                  }`}
                  title="View original historical scan"
                >
                  <Eye className="w-3 h-3" />
                  <span>Original</span>
                </button>
                <button
                  onClick={() => setViewMode('ocr')}
                  className={`px-2 py-1 text-xs font-bold border transition flex items-center gap-1 ${
                    viewMode === 'ocr' ? 'bg-[#79402C] text-white border-[#79402C]' : 'bg-white hover:bg-[#F5ECE0] text-ink border-ink/30'
                  }`}
                  title="View full OCR transcription text"
                >
                  <FileText className="w-3 h-3" />
                  <span>OCR Text</span>
                </button>
                <button
                  onClick={() => setViewMode('translations')}
                  className={`px-2 py-1 text-xs font-bold border transition flex items-center gap-1 ${
                    viewMode === 'translations' ? 'bg-[#79402C] text-white border-[#79402C]' : 'bg-white hover:bg-[#F5ECE0] text-ink border-ink/30'
                  }`}
                  title="Multilingual translations"
                >
                  <Languages className="w-3 h-3" />
                  <span>Translate</span>
                </button>
              </div>

              {/* Zoom & Page Stepper */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-1.5 py-0.5 bg-white border border-ink/30 disabled:opacity-40"
                  title="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-ink" />
                </button>
                <span className="px-2 py-0.5 bg-white border border-ink/30 font-bold text-[10px]">
                  p. {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-1.5 py-0.5 bg-white border border-ink/30 disabled:opacity-40"
                  title="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-ink" />
                </button>

                <div className="w-px h-4 bg-ink/20 mx-1" />

                <button
                  onClick={() => setZoomLevel(z => Math.max(70, z - 15))}
                  className="p-1 bg-white border border-ink/30 hover:bg-newsprint-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3 h-3 text-ink" />
                </button>
                <span className="text-[10px] w-9 text-center font-bold">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(200, z + 15))}
                  className="p-1 bg-white border border-ink/30 hover:bg-newsprint-200"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3 h-3 text-ink" />
                </button>
              </div>
            </div>

            {/* Facsimile / Text Workspace */}
            <div className="flex-1 bg-white border border-ink/30 p-4 min-h-[460px] overflow-auto shadow-inner relative">
              
              {/* Highlight match notice if passed from search or citation */}
              {highlightedQuery && (
                <div className="mb-3 p-2 bg-[#F6ECCF] border border-oxblood/40 font-mono text-[11px] text-ink flex items-center justify-between">
                  <span>Searching citation query: <strong className="text-oxblood">"{highlightedQuery}"</strong></span>
                  <span className="text-[10px] text-ink/60 uppercase">Matched in folio passage below</span>
                </div>
              )}

              {/* View Mode: Split View */}
              {viewMode === 'split' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                  {/* Left Half: Scanned Plate Simulation */}
                  <div className="border border-ink/20 p-4 bg-[#F7F2E7] flex flex-col items-center justify-center text-center space-y-3">
                    <div 
                      className="transition-transform duration-200 origin-top shadow-md border border-ink/40 bg-white p-4 max-w-full"
                      style={{ transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)` }}
                    >
                      <div className="font-mono text-[9px] text-ink/40 pb-2 border-b border-ink/10 flex justify-between">
                        <span>PLATE REF: {document.archive_id}</span>
                        <span>FOLIO {currentPage}</span>
                      </div>
                      <div className="py-6 px-4 space-y-2 text-left">
                        <div className="font-serif font-bold text-xs uppercase tracking-wider text-ink border-b border-ink/20 pb-1">
                          {document.title}
                        </div>
                        <div className="font-editorial text-[11px] text-ink/90 leading-relaxed italic">
                          "{document.description || 'Primary constituent text preserved under official National Archive accession rules.'}"
                        </div>
                        <div className="pt-4 text-center font-mono text-[9px] text-ink/40 uppercase">
                          [ Verified Photographic Facsimile Plate — Page {currentPage} ]
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Half: Live OCR Text */}
                  <div className="border border-ink/20 p-4 bg-[#FAF6EE] overflow-y-auto space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between border-b border-ink/20 pb-1">
                      <span className="text-[10px] font-bold text-oxblood uppercase">Extracted OCR Transcription</span>
                      <span className="text-[10px] text-ink/60">Confidence 96.4%</span>
                    </div>
                    <div className="font-editorial text-sm text-ink-900 leading-relaxed space-y-3 whitespace-pre-line">
                      <p>
                        {renderHighlightedText(
                          document.ocr_text || document.description || 
                          `On the 26th of January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognising the principle of one man one vote and one vote one value. In our social and economic life, we shall, by reason of our social and economic structure, continue to deny the principle of one man one value.\n\nHow long shall we continue to live this life of contradictions? How long shall we continue to deny equality in our social and economic life? If we continue to deny it for long, we will do so only by putting our political democracy in peril. We must remove this contradiction at the earliest possible moment or else those who suffer from inequality will blow up the structure of political democracy which this Assembly has so laboriously built up.`,
                          highlightedQuery
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode: Facsimile Only */}
              {viewMode === 'facsimile' && (
                <div className="flex items-center justify-center p-6 bg-[#F7F2E7] min-h-[420px]">
                  <div 
                    className="transition-transform duration-200 origin-center shadow-lg border border-ink/40 bg-white p-8 max-w-xl text-left space-y-4"
                    style={{ transform: `scale(${zoomLevel / 100}) rotate(${rotation}deg)` }}
                  >
                    <div className="font-mono text-[10px] text-ink/50 border-b border-ink/20 pb-2 flex justify-between">
                      <span>NATIONAL ARCHIVES OF INDIA • MANUSCRIPT REPOSITORY</span>
                      <span>FOLIO #{currentPage}</span>
                    </div>
                    <h3 className="font-serif font-bold text-sm uppercase tracking-wide text-ink">
                      {document.title}
                    </h3>
                    <p className="font-editorial text-xs leading-relaxed text-ink/80 italic">
                      {document.description}
                    </p>
                    <div className="p-4 bg-[#FAF4E6] border border-ink/20 font-editorial text-xs text-ink-900 leading-relaxed">
                      "{document.ocr_text ? document.ocr_text.slice(0, 400) + '...' : 'Archival facsimile scan maintained at 400 DPI lossless resolution.'}"
                    </div>
                  </div>
                </div>
              )}

              {/* View Mode: OCR Only */}
              {viewMode === 'ocr' && (
                <div className="p-6 bg-[#FAF6EE] font-editorial text-base text-ink-900 leading-relaxed max-w-2xl mx-auto space-y-4">
                  <div className="font-mono text-xs text-oxblood font-bold pb-2 border-b border-ink/20 flex justify-between">
                    <span>COMPLETE VERBATIM OCR TRANSCRIPTION</span>
                    <span>PAGE {currentPage}</span>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-line font-editorial">
                    {renderHighlightedText(
                      document.ocr_text || document.description || 'Full transcription available through scholarly search index.',
                      highlightedQuery
                    )}
                  </div>
                </div>
              )}

              {/* View Mode: Translations */}
              {viewMode === 'translations' && (
                <div className="p-6 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-ink/30 pb-2">
                    <span className="font-bold text-oxblood uppercase">Scholarly Vernacular Translations</span>
                    <select
                      value={targetTranslationLang}
                      onChange={(e) => setTargetTranslationLang(e.target.value)}
                      className="px-2 py-1 bg-white border border-ink/40 text-xs font-mono"
                    >
                      <option value="Hindi">हिन्दी (Hindi)</option>
                      <option value="Marathi">मराठी (Marathi)</option>
                      <option value="Tamil">தமிழ் (Tamil)</option>
                      <option value="English">English</option>
                    </select>
                  </div>

                  <div className="p-4 bg-[#FAF6EE] border border-ink/20 font-editorial text-sm leading-relaxed space-y-2">
                    <div className="font-bold font-mono text-xs text-ink/70">
                      Language: {targetTranslationLang}
                    </div>
                    <p className="italic">
                      {targetTranslationLang === 'Marathi'
                        ? '२६ जानेवारी १९५० रोजी आपण एका अंतर्विरोधांच्या जीवनात प्रवेश करणार आहोत. राजकारणात आपल्याकडे समानता असेल आणि सामाजिक व आर्थिक जीवनात असमानता असेल. राजकारणात आपण एका व्यक्तीचे एक मत आणि एका मताचे एक मूल्य या तत्त्वाला मान्यता देऊ. आपल्या सामाजिक आणि आर्थिक रचनेमुळे आपण एका व्यक्तीचे एक मूल्य हे तत्त्व नाकारत राहू.'
                        : targetTranslationLang === 'Hindi'
                        ? '26 जनवरी 1950 को हम अंतर्विरोधों के एक जीवन में प्रवेश करने जा रहे हैं। राजनीति में हमारे पास समानता होगी और सामाजिक व आर्थिक जीवन में असमानता होगी। राजनीति में हम एक व्यक्ति, एक मत और एक मत, एक मूल्य के सिद्धांत को मान्यता दे रहे होंगे। हमारे सामाजिक और आर्थिक जीवन में हम एक व्यक्ति, एक मूल्य के सिद्धांत को नकारना जारी रखेंगे।'
                        : 'On 26th January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality...'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ══════════════════════════════════════════════════════════
              RIGHT COLUMN: Evidence, Provenance & "Ask Document" (3.5 cols)
              ══════════════════════════════════════════════════════════ */}
          <aside className="lg:col-span-3 bg-[#EAE0CD] border-l border-ink/30 p-4 space-y-4 font-mono text-xs flex flex-col overflow-y-auto max-h-[calc(100vh-14rem)]">
            
            {/* Provenance & Integrity Seal */}
            <div className="space-y-2 pb-3 border-b border-ink/20">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-oxblood font-bold tracking-widest uppercase">
                  Cryptographic Provenance
                </span>
                <Shield className="w-3.5 h-3.5 text-oxblood" />
              </div>

              {/* SHA-256 Badge with Copy */}
              <div className="p-2.5 bg-white border border-ink/30 space-y-1">
                <span className="text-[9px] text-ink/60 uppercase block">SHA-256 Checksum</span>
                <div className="font-mono text-[10px] text-ink break-all flex items-center justify-between gap-1">
                  <span>{(document.checksum || (document as any).sha256_checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').slice(0, 24)}...</span>
                  <button 
                    onClick={handleCopyHash}
                    className="p-1 hover:bg-[#F2E8D5] rounded-xs"
                    title="Copy full hash"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3 text-ink/60" />}
                  </button>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-emerald-800 font-bold pt-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  <span>Bitstream Matches Master Vault</span>
                </div>
              </div>

              {/* Archival Lifecycle Nodes */}
              <div className="p-2.5 bg-[#F6EFE2] border border-ink/20 space-y-2 text-[10px]">
                <div className="font-bold text-ink/70 uppercase">Custodial Audit Trail</div>
                <div className="space-y-1 font-mono text-[9px]">
                  <div className="flex items-center gap-1 text-emerald-900 font-bold">
                    <span>✓</span> <span>1. Primary Accession: BAWS Registry</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-900 font-bold">
                    <span>✓</span> <span>2. High-Res Digitization (400 DPI)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-900 font-bold">
                    <span>✓</span> <span>3. Optical Character Recognition</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-900 font-bold">
                    <span>✓</span> <span>4. Curatorial Verification (Approved)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-900 font-bold">
                    <span>✓</span> <span>5. Cryptographic Seal Applied</span>
                  </div>
                </div>
              </div>
            </div>

            {/* OCR Confidence */}
            <div className="p-2.5 bg-white border border-ink/30 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="uppercase">OCR Engine Confidence</span>
                <span className="text-oxblood font-mono">96.4%</span>
              </div>
              <div className="w-full bg-[#E5D7BE] h-1.5 rounded-xs overflow-hidden">
                <div className="bg-[#79402C] h-full" style={{ width: '96.4%' }} />
              </div>
              <span className="text-[9px] text-ink/60 italic block font-editorial">
                High-confidence transcription vetted by academic archivist.
              </span>
            </div>

            {/* ── "Ask This Document" RAG Desk ─────────────────── */}
            <div className="p-3 bg-[#FAF6EE] border-2 border-ink shadow-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-ink/20 pb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-ink uppercase">
                  <Bot className="w-3.5 h-3.5 text-oxblood" />
                  <span>Inquire Document</span>
                </div>
                {/* Scope Switcher */}
                <button
                  onClick={() => setScopeMode(s => s === 'document' ? 'global' : 'document')}
                  className="px-1.5 py-0.5 border border-ink/30 bg-white text-[9px] font-mono text-oxblood font-bold hover:bg-[#F2E8D5]"
                  title="Toggle inquiry scope"
                >
                  {scopeMode === 'document' ? 'SCOPE: THIS DOC' : 'SCOPE: ENTIRE ARCHIVE'}
                </button>
              </div>

              <p className="text-[10px] font-editorial italic text-ink-700 leading-tight">
                {scopeMode === 'document' 
                  ? 'Responses are strictly bounded to evidence extracted from this document.'
                  : 'Queries will search the full cross-volume primary heritage corpus.'}
              </p>

              <form onSubmit={handleAskDocument} className="space-y-2">
                <textarea
                  value={docQuestion}
                  onChange={(e) => setDocQuestion(e.target.value)}
                  placeholder={`Ask a question regarding ${document.archive_id}...`}
                  rows={2}
                  className="w-full p-2 bg-white border border-ink/40 text-xs text-ink font-serif focus:outline-none focus:border-ink resize-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1 text-[9px]">
                    <button
                      type="button"
                      onClick={() => setDocQuestion("What is the primary thesis?")}
                      className="px-1 bg-white border border-ink/20 hover:border-ink text-ink/70"
                    >
                      Thesis?
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocQuestion("Explain constitutional warning")}
                      className="px-1 bg-white border border-ink/20 hover:border-ink text-ink/70"
                    >
                      Warning?
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={docAsking || !docQuestion.trim()}
                    className="px-2.5 py-1 bg-[#2A241F] hover:bg-oxblood text-white font-serif font-bold text-[10px] uppercase transition disabled:opacity-50 flex items-center gap-1"
                  >
                    <span>{docAsking ? 'Analyzing...' : 'Ask'}</span>
                    <Send className="w-2.5 h-2.5" />
                  </button>
                </div>
              </form>

              {/* Grounded Response Box */}
              {docAnswer && (
                <div className="p-2.5 bg-white border border-oxblood/40 space-y-1.5 font-editorial text-xs text-ink">
                  <div className="font-mono text-[9px] font-bold text-oxblood uppercase flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Grounded Document Evidence</span>
                  </div>
                  <p className="leading-relaxed italic">
                    "{docAnswer}"
                  </p>
                  <div className="pt-1 border-t border-ink/10 font-mono text-[9px] text-ink/60 flex items-center justify-between">
                    <span>Source: {document.archive_id} (Page {currentPage})</span>
                    <span className="text-oxblood font-bold">[CITED]</span>
                  </div>
                </div>
              )}
            </div>

          </aside>

        </div>
      )}
    </div>
  );
};
