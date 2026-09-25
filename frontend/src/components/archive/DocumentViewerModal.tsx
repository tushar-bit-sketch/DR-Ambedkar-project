import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  X, ZoomIn, ZoomOut, RotateCw, Download, 
  Share2, Volume2, Languages, Bot, FileText, 
  Calendar, Globe, Shield, Landmark, ExternalLink,
  BookOpen, Info, CheckCircle2, AlertCircle, Play, Pause, RefreshCw, Layers
} from 'lucide-react';
import { DocumentItem, TranslationItem, AudioDerivativeItem } from '../../types';
import { ArchivalBadge } from './ArchivalBadge';
import { archiveApi } from '../../services/api';
import { fileStreamUrl, fileDownloadUrl, audioStreamUrl, isBackendConfigured } from '../../config/api';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  onClose: () => void;
  onOpenResearch?: (queryText: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  onClose,
  onOpenResearch
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'preview' | 'ocr' | 'split' | 'translations' | 'audio'>('preview');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Phase 6 Translations state
  const [translations, setTranslations] = useState<TranslationItem[]>([]);
  const [selectedTranslation, setSelectedTranslation] = useState<TranslationItem | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);
  const [targetTranslationLang, setTargetTranslationLang] = useState<string>('Hindi');
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Phase 6 Audio Narration state
  const [audios, setAudios] = useState<AudioDerivativeItem[]>([]);
  const [activeAudio, setActiveAudio] = useState<AudioDerivativeItem | null>(null);
  const [synthesizingAudio, setSynthesizingAudio] = useState<boolean>(false);
  const [targetAudioLang, setTargetAudioLang] = useState<string>('English');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (document?.id) {
      archiveApi.getDocumentTranslations(document.id).then(res => {
        setTranslations(res);
        if (res.length > 0) setSelectedTranslation(res[0]);
      }).catch(err => console.warn('Could not load translations:', err));

      archiveApi.getDocumentAudios(document.id).then(res => {
        setAudios(res);
        if (res.length > 0) setActiveAudio(res[0]);
      }).catch(err => console.warn('Could not load audios:', err));
    }
  }, [document?.id]);

  const handleGenerateTranslation = async () => {
    if (!document?.id) return;
    setTranslating(true);
    setTranslationError(null);
    try {
      const res = await archiveApi.generateTranslation({
        document_id: document.id,
        target_language: targetTranslationLang
      });
      setTranslations(prev => [res, ...prev]);
      setSelectedTranslation(res);
    } catch (err: any) {
      setTranslationError(err.message || 'Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleSynthesizeAudio = async () => {
    if (!document?.id) return;
    setSynthesizingAudio(true);
    setAudioError(null);
    try {
      const res = await archiveApi.synthesizeAudio({
        document_id: document.id,
        translation_id: selectedTranslation?.id,
        language: targetAudioLang
      });
      setAudios(prev => [res, ...prev]);
      setActiveAudio(res);
    } catch (err: any) {
      setAudioError(err.message || 'Audio synthesis failed');
    } finally {
      setSynthesizingAudio(false);
    }
  };

  if (!document) return null;

  const masterFilename = 
    document.archival_file?.filename ||
    document.versions?.[0]?.archival_file?.filename ||
    (document.versions?.[0]?.file_path ? document.versions[0].file_path.split('/').pop() : null);

  const triggerPhaseNotice = (actionName: string, phase: string) => {
    setActionNotice(`${actionName}: ${phase}`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn font-mono">
      <div 
        className="bg-[#FAF6EE] w-full max-w-6xl max-h-[92vh] border-2 border-ink shadow-letterpress-lg flex flex-col overflow-hidden text-ink"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reading Room Header Bar */}
        <div className="bg-[#FAF6EE] text-ink px-6 py-3.5 flex items-center justify-between border-b-2 border-double border-ink flex-shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <span className="font-mono text-xs font-bold text-oxblood border border-oxblood/40 px-2 py-0.5 bg-newsprint-100">
              [ READING TABLE • ACCESSION: {document.archive_id} ]
            </span>
            <div className="truncate">
              <h2 className="font-serif font-black text-base sm:text-lg text-ink truncate uppercase">
                {document.title}
              </h2>
              <span className="text-[11px] text-ink-600 font-mono block truncate">
                {document.collection_title || 'Institutional Digital Repository'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document?.id && (
              <Link
                to={`/documents/${document.id}`}
                className="px-3 py-1.5 border-2 border-ink text-white bg-ink hover:bg-oxblood transition font-mono text-xs font-bold uppercase tracking-wider shadow-letterpress-sm flex items-center gap-1.5"
                title="Open canonical 3-pane archival research desk"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">[ Open Canonical Folio Desk ]</span>
                <span className="sm:hidden">[ Folio Desk ]</span>
              </Link>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 border-2 border-ink text-ink bg-newsprint-100 hover:bg-oxblood hover:text-white transition font-mono text-xs font-bold uppercase tracking-wider shadow-letterpress-sm flex items-center gap-1.5"
              aria-label="Close Document Viewer"
            >
              <span>[ × Close ]</span>
            </button>
          </div>
        </div>

        {/* Phase 1 Notice Banner */}
        {actionNotice && (
          <div className="bg-newsprint-200 border-b border-ink/20 px-4 py-1.5 text-xs text-oxblood font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-oxblood" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice(null)} className="text-ink font-bold ml-4">✕</button>
          </div>
        )}

        {/* Main Split Layout: Left Preview / Right Metadata */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* LEFT: Facsimile / Document Preview Shell (7 cols) */}
          <div className="lg:col-span-7 bg-[#1A1714] text-white flex flex-col border-r-2 border-ink h-[380px] lg:h-auto overflow-hidden">
            {/* Viewer Controls Toolbar */}
            <div className="bg-[#110F0D] px-4 py-2 flex items-center justify-between border-b border-ink/40 text-xs font-mono">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                  className="p-1.5 border border-white/20 hover:border-white text-newsprint-300 hover:text-white transition"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="font-mono text-newsprint-200 text-[11px] w-12 text-center font-bold">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel(prev => Math.min(250, prev + 15))}
                  className="p-1.5 border border-white/20 hover:border-white text-newsprint-300 hover:text-white transition"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(100)}
                  className="px-2 py-1 border border-white/20 text-newsprint-300 text-[10px] hover:text-white uppercase font-bold"
                >
                  Reset
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-1 bg-ink/80 p-0.5 border border-white/20 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2 py-1 text-[11px] uppercase font-bold transition whitespace-nowrap ${
                    activeTab === 'preview' ? 'bg-oxblood text-white shadow-xs' : 'text-newsprint-300 hover:text-white'
                  }`}
                >
                  Master
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`px-2 py-1 text-[11px] uppercase font-bold transition whitespace-nowrap ${
                    activeTab === 'ocr' ? 'bg-oxblood text-white shadow-xs' : 'text-newsprint-300 hover:text-white'
                  }`}
                >
                  Transcription
                </button>
                <button
                  onClick={() => setActiveTab('split')}
                  className={`px-2 py-1 text-[11px] uppercase font-bold transition whitespace-nowrap ${
                    activeTab === 'split' ? 'bg-oxblood text-white shadow-xs' : 'text-newsprint-300 hover:text-white'
                  }`}
                >
                  Split View
                </button>
                <button
                  onClick={() => setActiveTab('translations')}
                  className={`px-2 py-1 text-[11px] uppercase font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'translations' ? 'bg-oxblood text-white shadow-xs' : 'text-newsprint-300 hover:text-white'
                  }`}
                >
                  <Languages className="w-3 h-3" />
                  <span>Translation</span>
                  {translations.length > 0 && (
                    <span className="ml-0.5 px-1 py-0.2 bg-newsprint-100 text-ink text-[9px] font-bold">
                      {translations.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={`px-2 py-1 text-[11px] uppercase font-bold transition whitespace-nowrap flex items-center gap-1 ${
                    activeTab === 'audio' ? 'bg-oxblood text-white shadow-xs' : 'text-newsprint-300 hover:text-white'
                  }`}
                >
                  <Volume2 className="w-3 h-3" />
                  <span>Audio</span>
                  {audios.length > 0 && (
                    <span className="ml-0.5 px-1 py-0.2 bg-newsprint-100 text-ink text-[9px] font-bold">
                      {audios.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Download Master Button if file exists */}
              {masterFilename && (
                <a
                  href={fileDownloadUrl(masterFilename)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-newsprint-100 hover:text-white border border-white/30 hover:border-white px-2 py-1 uppercase font-bold transition"
                  title="Download Raw Archival Master"
                >
                  <Download className="w-3 h-3 text-oxblood" />
                  <span className="hidden sm:inline">Master</span>
                </a>
              )}
            </div>

            {/* Viewer Canvas */}
            <div className="flex-1 overflow-auto p-3 sm:p-4 flex items-center justify-center bg-[#1D2125]">
              {activeTab === 'translations' ? (
                /* Phase 6 Multilingual Derivative Translation View */
                <div className="w-full h-full flex flex-col space-y-3 overflow-hidden">
                  <div className="bg-[#181B1F] p-3 rounded-lg border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Target Language:</span>
                      <select
                        value={targetTranslationLang}
                        onChange={(e) => setTargetTranslationLang(e.target.value)}
                        className="bg-[#14171A] border border-white/20 text-white rounded px-2.5 py-1 text-xs focus:outline-none"
                      >
                        <option value="Hindi">हिन्दी (Hindi)</option>
                        <option value="Marathi">मराठी (Marathi)</option>
                        <option value="Tamil">தமிழ் (Tamil)</option>
                        <option value="English">English</option>
                      </select>
                      <button
                        onClick={handleGenerateTranslation}
                        disabled={translating}
                        className="px-3 py-1 bg-heritage-600 hover:bg-heritage-500 disabled:opacity-50 text-white rounded font-medium flex items-center gap-1.5 transition"
                      >
                        {translating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Languages className="w-3 h-3" />}
                        <span>{translating ? 'Translating...' : 'Generate Translation'}</span>
                      </button>
                    </div>

                    {translations.length > 0 && (
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <span>Version:</span>
                        <select
                          value={selectedTranslation?.id || ''}
                          onChange={(e) => {
                            const found = translations.find(t => t.id === Number(e.target.value));
                            if (found) setSelectedTranslation(found);
                          }}
                          className="bg-[#14171A] border border-white/20 text-white rounded px-2 py-0.5 text-xs"
                        >
                          {translations.map((t) => (
                            <option key={t.id} value={t.id}>
                              v{t.translation_version} ({t.target_language} - {t.status})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="bg-amber-950/40 border border-amber-500/30 rounded px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Original archival master remains immutable. Translations are derivative layers only.</span>
                  </div>

                  {translationError && (
                    <div className="bg-red-950/50 border border-red-500/40 rounded p-2 text-xs text-red-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span>{translationError}</span>
                    </div>
                  )}

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-hidden min-h-[350px]">
                    <div className="bg-[#181B1F] rounded-lg border border-white/10 p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-400/30 font-semibold">
                          ORIGINAL ARCHIVAL TEXT
                        </span>
                        <span className="text-slate-400">{document.language || 'English'}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto bg-[#14171A] rounded p-3 text-xs leading-relaxed font-serif text-slate-200 whitespace-pre-line border border-white/5">
                        {document.ocr_text || document.description || 'No source text available.'}
                      </div>
                    </div>

                    <div className="bg-[#181B1F] rounded-lg border border-white/10 p-3 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono">
                        <span className={`px-2 py-0.5 rounded font-semibold ${
                          selectedTranslation?.status === 'HUMAN_REVIEWED' || selectedTranslation?.status === 'APPROVED'
                            ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/30'
                            : 'bg-amber-900/60 text-amber-200 border border-amber-400/30'
                        }`}>
                          {selectedTranslation?.status === 'HUMAN_REVIEWED' || selectedTranslation?.status === 'APPROVED'
                            ? 'HUMAN-REVIEWED TRANSLATION'
                            : 'MACHINE-GENERATED TRANSLATION'}
                        </span>
                        <span className="text-heritage-400">{selectedTranslation?.target_language || targetTranslationLang}</span>
                      </div>

                      <div className="flex-1 overflow-y-auto bg-[#14171A] rounded p-3 text-xs leading-relaxed font-serif text-slate-200 whitespace-pre-line border border-white/5">
                        {selectedTranslation ? (
                          <div>
                            {selectedTranslation.translated_title && (
                              <h4 className="font-bold text-sm mb-2 text-heritage-300 font-serif border-b border-white/10 pb-1">
                                {selectedTranslation.translated_title}
                              </h4>
                            )}
                            <p>{selectedTranslation.translated_text}</p>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 p-6 text-center">
                            <Languages className="w-8 h-8 opacity-40" />
                            <p>No translation generated yet for this record in {targetTranslationLang}.</p>
                            <p className="text-[11px] text-slate-600">Click 'Generate Translation' above to produce a machine derivative.</p>
                          </div>
                        )}
                      </div>

                      {selectedTranslation && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-slate-400 flex justify-between items-center font-mono">
                          <span>Provider: {selectedTranslation.translation_provider} ({selectedTranslation.translation_model || 'v1.0'})</span>
                          <span>Status: {selectedTranslation.status}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'audio' ? (
                /* Phase 6 Archival Audio Narration View */
                <div className="w-full h-full flex flex-col space-y-4 p-2 overflow-y-auto">
                  <div className="bg-[#181B1F] p-4 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-serif font-bold text-sm text-white flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-heritage-400" />
                        Archival Audio Narration Derivatives
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Acoustic accessibility layer synthesized from verified archival text.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={targetAudioLang}
                        onChange={(e) => setTargetAudioLang(e.target.value)}
                        className="bg-[#14171A] border border-white/20 text-white rounded px-2.5 py-1.5 text-xs focus:outline-none"
                      >
                        <option value="English">English</option>
                        <option value="Hindi">हिन्दी (Hindi)</option>
                        <option value="Marathi">मराठी (Marathi)</option>
                        <option value="Tamil">தமிழ் (Tamil)</option>
                      </select>
                      <button
                        onClick={handleSynthesizeAudio}
                        disabled={synthesizingAudio}
                        className="px-3.5 py-1.5 bg-heritage-600 hover:bg-heritage-500 disabled:opacity-50 text-white rounded font-medium text-xs flex items-center gap-1.5 transition"
                      >
                        {synthesizingAudio ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{synthesizingAudio ? 'Synthesizing...' : 'Synthesize Audio'}</span>
                      </button>
                    </div>
                  </div>

                  {audioError && (
                    <div className="bg-red-950/60 border border-red-500/40 rounded-lg p-3 text-xs text-red-200 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block">Audio Synthesis Notice</span>
                        <span>{audioError}</span>
                      </div>
                    </div>
                  )}

                  {activeAudio ? (
                    <div className="bg-[#181B1F] p-6 rounded-xl border border-white/10 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div>
                          <span className="text-xs font-serif font-bold text-white block">{document.title}</span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Language: {activeAudio.language} • Format: {activeAudio.file_format} • Duration: {activeAudio.duration_seconds}s
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-emerald-900/60 text-emerald-200 border border-emerald-400/30 font-mono text-[10px] font-bold">
                          SYNTHESIZED DERIVATIVE
                        </span>
                      </div>

                      <audio
                        ref={audioRef}
                        controls
                        src={audioStreamUrl(activeAudio.audio_id)}
                        className="w-full"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Speed:</span>
                          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => {
                                setPlaybackRate(rate);
                                if (audioRef.current) audioRef.current.playbackRate = rate;
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                                playbackRate === rate ? 'bg-heritage-500 text-slate-950 font-bold' : 'bg-white/10 hover:bg-white/20'
                              }`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>SHA-256: {activeAudio.checksum?.slice(0, 16)}...</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#181B1F] p-8 rounded-xl border border-white/10 text-center space-y-3">
                      <Volume2 className="w-12 h-12 text-slate-600 mx-auto" />
                      <h4 className="font-serif font-bold text-sm text-slate-300">No Audio Derivative Generated Yet</h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Select a language above and click "Synthesize Audio" to generate an archival narration derivative with SHA-256 integrity verification.
                      </p>
                    </div>
                  )}

                  {audios.length > 1 && (
                    <div className="bg-[#181B1F] p-4 rounded-xl border border-white/10 space-y-2">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Archived Audio Versions</h4>
                      <div className="space-y-1">
                        {audios.map(a => (
                          <div
                            key={a.id}
                            onClick={() => setActiveAudio(a)}
                            className={`p-2 rounded cursor-pointer text-xs flex justify-between items-center transition ${
                              activeAudio?.id === a.id ? 'bg-heritage-600/30 text-heritage-300 border border-heritage-500/30' : 'hover:bg-white/5 text-slate-300'
                            }`}
                          >
                            <span className="font-mono font-medium">{a.audio_id} ({a.language})</span>
                            <span className="text-[10px] text-slate-400">{a.duration_seconds}s • {(a.file_size_bytes / 1024).toFixed(1)} KB</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'split' ? (
                /* Side-by-Side Split View */
                <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-3 min-h-[420px]">
                  {/* Left: Archival Master */}
                  <div className="bg-[#181B1F] rounded-lg border border-white/10 p-3 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono">
                      <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-400/30 font-semibold">
                        ORIGINAL ARCHIVAL MASTER
                      </span>
                      <span className="text-slate-400">IMMUTABLE MASTER LAYER</span>
                    </div>
                    <div className="flex-1 overflow-auto flex items-center justify-center bg-[#14171A] rounded p-2">
                      {masterFilename?.match(/\.(jpg|jpeg|png|tiff|webp)$/i) ? (
                        <img
                          src={fileStreamUrl(masterFilename)}
                          alt={document.title}
                          className="max-h-full object-contain rounded"
                        />
                      ) : masterFilename?.toLowerCase().endsWith('.pdf') ? (
                        <object
                          data={fileStreamUrl(masterFilename)}
                          type="application/pdf"
                          className="w-full h-full min-h-[300px]"
                        >
                          <div className="p-4 text-center text-xs text-slate-400">PDF Master Facsimile Loaded</div>
                        </object>
                      ) : (
                        <div className="text-center text-slate-400 p-4">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-slate-500" />
                          <div className="text-xs font-serif text-slate-300">{document.title}</div>
                          <div className="text-[11px] text-slate-500 mt-1">
                            {masterFilename ? 'Archival master is not available in this deployment.' : 'Archival accession record'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: OCR Transcription Layer */}
                  <div className="bg-[#181B1F] rounded-lg border border-white/10 p-3 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] font-mono">
                      <span className={`px-2 py-0.5 rounded font-semibold ${
                        document.verification_status === 'VERIFIED'
                          ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-400/30'
                          : 'bg-amber-900/60 text-amber-200 border border-amber-400/30'
                      }`}>
                        {document.verification_status === 'VERIFIED'
                          ? 'HUMAN-REVIEWED ARCHIVAL TRANSCRIPTION'
                          : 'MACHINE-GENERATED TRANSCRIPTION'}
                      </span>
                      <span className="text-slate-400">ISOLATED TEXT LAYER</span>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-[#14171A] rounded p-3 text-xs leading-relaxed font-serif text-slate-200 whitespace-pre-line border border-white/5">
                      {document.ocr_text || document.description || (
                        <span className="text-slate-500 italic">No OCR transcription available for this record yet.</span>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 text-right font-mono">
                      {document.verification_status === 'VERIFIED' ? 'Verified by Archival Review' : 'OCR Model Output • Unverified'}
                    </div>
                  </div>
                </div>
              ) : activeTab === 'preview' ? (
                (() => {
                  // Determine media/file type
                  const isPdf = masterFilename?.toLowerCase().endsWith('.pdf') || document.document_type === 'BOOK' || document.document_type === 'DEBATE';
                  const isImage = masterFilename?.match(/\.(jpg|jpeg|png|tiff|webp)$/i) || document.document_type === 'PHOTOGRAPH';
                  const isAudio = masterFilename?.match(/\.(mp3|wav|m4a)$/i) || document.document_type === 'AUDIO';
                  const isVideo = masterFilename?.match(/\.(mp4|webm)$/i) || document.document_type === 'VIDEO';

                  if (!isBackendConfigured() && masterFilename) {
                    return (
                      <div className="bg-[#181B1F] p-8 rounded-xl max-w-lg w-full text-center space-y-3 border border-white/10 shadow-2xl">
                        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                        <h3 className="font-serif font-bold text-base text-white">Archival Master Unavailable</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Archival master facsimile ({masterFilename}) is not available in this deployment. Connect an institutional backend to stream high-resolution preservation masters.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setActiveTab('ocr')}
                            className="px-4 py-2 bg-heritage-600 hover:bg-heritage-700 text-white rounded text-xs font-bold transition shadow"
                          >
                            Read Archival Transcription Layer
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isPdf && masterFilename) {
                    return (
                      <div className="w-full h-full min-h-[450px] bg-stone-900 rounded overflow-hidden flex flex-col">
                        <object
                          data={fileStreamUrl(masterFilename)}
                          type="application/pdf"
                          className="w-full h-full min-h-[450px]"
                        >
                          <div className="p-8 text-center text-slate-300 space-y-3">
                            <p>Direct PDF preview is not supported by your browser.</p>
                            <a
                              href={fileStreamUrl(masterFilename)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block px-4 py-2 bg-heritage-600 text-white rounded font-bold text-xs"
                            >
                              Open PDF Master in New Tab
                            </a>
                          </div>
                        </object>
                      </div>
                    );
                  }

                  if (isImage && masterFilename) {
                    return (
                      <div className="flex items-center justify-center overflow-auto max-h-full">
                        <img
                          src={fileStreamUrl(masterFilename)}
                          alt={document.title}
                          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                          className="max-h-[500px] object-contain rounded shadow-2xl transition-transform"
                        />
                      </div>
                    );
                  }

                  if (isAudio && masterFilename) {
                    return (
                      <div className="bg-[#181B1F] p-8 rounded-2xl max-w-md w-full text-center space-y-4 border border-white/10 shadow-2xl">
                        <div className="w-16 h-16 bg-heritage-500/20 text-heritage-400 rounded-full flex items-center justify-center mx-auto border border-heritage-500/40">
                          <Volume2 className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-base text-white">{document.title}</h3>
                          <p className="text-xs text-slate-400 mt-1">Archival Audio Recording</p>
                        </div>
                        <audio controls className="w-full mt-4">
                          <source src={fileStreamUrl(masterFilename)} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    );
                  }

                  if (isVideo && masterFilename) {
                    return (
                      <div className="w-full max-w-2xl bg-black rounded-xl overflow-hidden shadow-2xl">
                        <video controls className="w-full max-h-[480px]">
                          <source src={fileStreamUrl(masterFilename)} type="video/mp4" />
                          Your browser does not support the video element.
                        </video>
                      </div>
                    );
                  }

                  // Default Folio Text Display
                  return (
                    <div 
                      className="bg-[#F8F4EA] text-stone-900 p-8 rounded shadow-2xl border-4 border-[#D9CEB2] max-w-xl w-full min-h-[420px] transition-all font-serif selection:bg-amber-200"
                      style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                    >
                      <div className="border-b-2 border-stone-400 pb-3 mb-6 flex justify-between items-center text-[10px] text-stone-600 uppercase tracking-widest font-mono">
                        <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded font-bold">
                          ORIGINAL ARCHIVAL MASTER
                        </span>
                        <span>{document.archive_id}</span>
                      </div>

                      <div className="space-y-4">
                        <h1 className="font-serif font-bold text-xl text-stone-900 border-b border-stone-300 pb-2">
                          {document.title}
                        </h1>
                        <div className="text-xs text-stone-600 font-sans flex items-center gap-4">
                          <span><strong>Date:</strong> {document.date || document.date_created || document.year}</span>
                          <span><strong>Creator:</strong> {document.creator || document.author_name || 'Dr. B. R. Ambedkar'}</span>
                        </div>

                        <div className="text-sm leading-relaxed text-stone-800 space-y-3 pt-2">
                          {document.description && (
                            <p className="italic text-stone-600 border-l-2 border-heritage-500 pl-3 text-xs">
                              "{document.description}"
                            </p>
                          )}
                          {document.ocr_text ? (
                            <p className="font-serif text-stone-900 text-justify text-xs leading-relaxed whitespace-pre-line">
                              {document.ocr_text}
                            </p>
                          ) : (
                            <p className="text-stone-500 text-xs italic">
                              Official archival accession copy deposited in national repository.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-stone-300 flex justify-between items-end text-[10px] text-stone-500 font-mono">
                        <span className="truncate max-w-[240px]">SHA-256: {document.checksum?.slice(0, 20)}...</span>
                        <span className="text-emerald-700 font-bold border border-emerald-600 px-2 py-0.5 rounded uppercase">
                          {document.verification_status}
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-[#181B1F] text-slate-200 p-6 rounded-lg w-full max-w-xl h-full overflow-y-auto font-mono text-xs leading-relaxed border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 text-slate-400">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        document.verification_status === 'VERIFIED'
                          ? 'bg-emerald-900/70 text-emerald-200 border border-emerald-400/40'
                          : 'bg-amber-900/70 text-amber-200 border border-amber-400/40'
                      }`}>
                        {document.verification_status === 'VERIFIED'
                          ? 'HUMAN-REVIEWED ARCHIVAL TRANSCRIPTION'
                          : 'MACHINE-GENERATED TRANSCRIPTION'}
                      </span>
                      <span className="text-heritage-400 text-[10px]">ISOLATED TRANSCRIPTION LAYER</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300">
                      {document.ocr_text || document.description || "No full-text transcription available for this folio."}
                    </pre>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Archival Layer: Text Derivative</span>
                    <span>Status: {document.verification_status}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Viewer Footer Status */}
            <div className="bg-[#181B1F] px-4 py-2 text-[11px] text-slate-400 border-t border-white/10 flex justify-between items-center">
              <span>Format: {document.archival_file?.file_format || document.document_type}</span>
              <span className="font-mono text-heritage-400">
                {document.archival_file ? `Stored: ${(document.archival_file.file_size_bytes / 1024).toFixed(1)} KB` : 'Dublin Core OAIS Verified'}
              </span>
            </div>
          </div>

          {/* RIGHT: Dublin Core Metadata & Action Controls (5 cols) */}
          <div className="lg:col-span-5 bg-[#FAF6EE] p-5 sm:p-6 flex flex-col justify-between overflow-y-auto space-y-5 font-mono">
            <div className="space-y-4">
              
              {/* Provenance & Badges Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <ArchivalBadge type={document.document_type} />
                  <ArchivalBadge status={document.verification_status} variant="status" />
                </div>
                <span className="px-2 py-0.5 bg-verified-bg text-verified-text border border-verified-border font-bold text-[9px] uppercase tracking-wider">
                  SHA-256 ✓ ATTESTED
                </span>
              </div>

              {/* Metadata Fields Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-ink/20 pb-1">
                  <h3 className="font-serif font-black text-xs text-ink uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-oxblood" />
                    Dublin Core Metadata Ledger
                  </h3>
                  <span className="text-[10px] text-oxblood font-bold">[ OAIS COMPLIANT ]</span>
                </div>

                <dl className="grid grid-cols-1 gap-2 text-xs">
                  <div className="bg-white p-2.5 border border-ink/30 shadow-xs">
                    <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Document Title</dt>
                    <dd className="font-serif font-bold text-ink text-sm mt-0.5">{document.title}</dd>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Author / Creator</dt>
                      <dd className="font-bold text-ink mt-0.5 truncate">{document.creator || document.author_name || 'Dr. B. R. Ambedkar'}</dd>
                    </div>
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Date / Epoch</dt>
                      <dd className="font-bold text-ink mt-0.5">{document.date || document.date_created || document.year || 'Undated'}</dd>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Primary Language</dt>
                      <dd className="font-bold text-ink mt-0.5">{document.language || document.language_name || 'English'}</dd>
                    </div>
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Classification</dt>
                      <dd className="font-bold text-oxblood mt-0.5 uppercase">{document.document_type}</dd>
                    </div>
                  </div>

                  <div className="bg-white p-2 border border-ink/30 shadow-xs">
                    <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Archival Collection</dt>
                    <dd className="font-bold text-ink mt-0.5 truncate">{document.collection_title || 'General Archival Series'}</dd>
                  </div>

                  <div className="bg-white p-2 border border-ink/30 shadow-xs">
                    <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Custodial Source & Repository</dt>
                    <dd className="text-ink-800 mt-0.5 text-[11px] font-editorial italic">
                      {document.source_name || document.source_reference || 'National Digital Library of India'}
                      {document.source_identifier && (
                        <span className="block font-mono text-[10px] text-oxblood font-bold mt-0.5 not-italic">
                          Shelfmark / Folio: {document.source_identifier}
                        </span>
                      )}
                    </dd>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Accession ID</dt>
                      <dd className="font-bold text-oxblood mt-0.5 text-[11px]">{document.archive_id}</dd>
                    </div>
                    <div className="bg-white p-2 border border-ink/30 shadow-xs">
                      <dt className="text-ink-600 font-bold uppercase text-[9px] tracking-wider">Access Rights</dt>
                      <dd className="font-bold text-ink mt-0.5">{document.access_level || 'PUBLIC'}</dd>
                    </div>
                  </div>

                  {/* Persistent Cryptographic Checksum Box */}
                  <div className="bg-newsprint-200 p-2 border border-ink/40 shadow-xs">
                    <div className="flex items-center justify-between text-[9px] font-bold text-oxblood uppercase pb-0.5">
                      <span>Cryptographic Integrity Digest</span>
                      <span>SHA-256</span>
                    </div>
                    <p className="font-mono text-[10px] text-ink-700 break-all select-all font-bold">
                      {document.checksum || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </p>
                  </div>
                </dl>
              </div>
            </div>

            {/* Required Actions Bar */}
            <div className="space-y-2 pt-3 border-t-2 border-ink">
              <span className="text-[10px] uppercase tracking-wider font-bold text-oxblood block">
                [ READING ROOM DISPATCH CONTROLS ]
              </span>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                {/* 1. Read */}
                <button
                  onClick={() => setActiveTab('ocr')}
                  className="p-2 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 font-bold uppercase text-ink flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <BookOpen className="w-3.5 h-3.5 text-oxblood" />
                  <span>[ Read ]</span>
                </button>

                {/* 2. Facsimile */}
                <button
                  onClick={() => setActiveTab('preview')}
                  className="p-2 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 font-bold uppercase text-ink flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <FileText className="w-3.5 h-3.5 text-oxblood" />
                  <span>[ Master ]</span>
                </button>

                {/* 3. Audio */}
                <button
                  onClick={() => setActiveTab('audio')}
                  className="p-2 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 font-bold uppercase text-ink flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <Volume2 className="w-3.5 h-3.5 text-oxblood" />
                  <span>[ Audio ]</span>
                </button>

                {/* 4. Split */}
                <button
                  onClick={() => setActiveTab('split')}
                  className="p-2 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 font-bold uppercase text-ink flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <Layers className="w-3.5 h-3.5 text-oxblood" />
                  <span>[ Split ]</span>
                </button>

                {/* 5. Translate */}
                <button
                  onClick={() => setActiveTab('translations')}
                  className="p-2 bg-[#FAF6EE] hover:bg-newsprint-300 border border-ink/40 font-bold uppercase text-ink flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <Languages className="w-3.5 h-3.5 text-oxblood" />
                  <span>[ Translate ]</span>
                </button>

                {/* 6. Ask Research Assistant */}
                <button
                  onClick={() => {
                    if (onOpenResearch) {
                      onOpenResearch(document.title);
                    } else {
                      triggerPhaseNotice('RAG Assistant', 'Opening Research Bureau');
                    }
                  }}
                  className="p-2 bg-ink hover:bg-oxblood text-white uppercase font-bold flex items-center justify-center gap-1.5 transition shadow-letterpress-sm border border-ink"
                >
                  <Bot className="w-3.5 h-3.5 text-newsprint-300" />
                  <span>[ ★ Ask AI ]</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
