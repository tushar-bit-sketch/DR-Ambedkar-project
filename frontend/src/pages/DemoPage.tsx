import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Sparkles, ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, 
  Search, BookOpen, Cpu, Bot, Globe, Network, Clock, Film, 
  Monitor, ShieldCheck, ExternalLink, RefreshCw, Landmark, ChevronRight, Play
} from 'lucide-react';
import { demoApi, DemoStageOverview, DemoStageDetail } from '../services/demoApi';

export const DemoPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [stages, setStages] = useState<DemoStageOverview[]>([]);
  const [currentStageId, setCurrentStageId] = useState<string>('digital_archive');
  const [stageDetail, setStageDetail] = useState<DemoStageDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load stages list
  useEffect(() => {
    const loadStages = async () => {
      try {
        const data = await demoApi.getStages();
        setStages(data);
        const requestedStage = searchParams.get('stage') || data[0]?.stage_id || 'digital_archive';
        setCurrentStageId(requestedStage);
      } catch (err: any) {
        setError(err.message || 'Failed to load demonstration stages');
      }
    };
    loadStages();
  }, []);

  // Load active stage detail
  useEffect(() => {
    if (!currentStageId) return;
    const loadDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await demoApi.getStageDetail(currentStageId);
        setStageDetail(detail);
      } catch (err: any) {
        setError(err.message || 'Failed to load stage details');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [currentStageId]);

  const handleSelectStage = (stageId: string) => {
    setCurrentStageId(stageId);
    setSearchParams({ stage: stageId });
  };

  const currentStageIndex = stages.findIndex(s => s.stage_id === currentStageId);
  const currentStepNumber = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;

  const handleNext = () => {
    if (currentStageIndex < stages.length - 1) {
      handleSelectStage(stages[currentStageIndex + 1].stage_id);
    }
  };

  const handlePrev = () => {
    if (currentStageIndex > 0) {
      handleSelectStage(stages[currentStageIndex - 1].stage_id);
    }
  };

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'digital_archive': return BookOpen;
      case 'smart_search': return Search;
      case 'ocr_digitization': return Cpu;
      case 'ai_research_assistant': return Bot;
      case 'multilingual_access': return Globe;
      case 'knowledge_graph': return Network;
      case 'intelligent_timeline': return Clock;
      case 'audio_video_archive': return Film;
      case 'kiosk_experience': return Monitor;
      case 'security_preservation': return ShieldCheck;
      default: return Sparkles;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-slate-900 pb-28">
      {/* Top Presentation Header */}
      <div className="bg-[#102038] text-white border-b-2 border-heritage-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Exit Demo</span>
            </Link>
            <span className="text-white/20">|</span>
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-heritage-400 animate-pulse" />
              <div>
                <span className="font-serif font-bold text-lg sm:text-xl text-white">
                  SIH Demonstration Experience
                </span>
                <span className="hidden md:inline-block ml-2 text-xs text-heritage-300 font-mono">
                  • Stage {currentStepNumber} of 10
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              to="/system-status"
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 border border-white/20 transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>System Status</span>
            </Link>

            <Link
              to="/demo/control"
              className="px-3 py-1.5 rounded-lg bg-heritage-500 hover:bg-heritage-400 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow"
            >
              <span>Curator Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 10-Stage Stepper Ribbon */}
        <div className="bg-[#0A1424] border-t border-white/10 overflow-x-auto py-2 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto flex items-center space-x-1 min-w-max">
            {stages.map((st, idx) => {
              const Icon = getStageIcon(st.stage_id);
              const isCurrent = st.stage_id === currentStageId;
              const isDone = idx < currentStageIndex;

              return (
                <button
                  key={st.stage_id}
                  onClick={() => handleSelectStage(st.stage_id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isCurrent
                      ? 'bg-heritage-500 text-slate-950 shadow-md font-bold'
                      : isDone
                      ? 'bg-white/10 text-white hover:bg-white/15'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={st.title}
                >
                  <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-mono ${
                    isCurrent ? 'bg-slate-950 text-heritage-400' : 'bg-white/20 text-white'
                  }`}>
                    {idx + 1}
                  </span>
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden lg:inline">{st.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading && !stageDetail ? (
          <div className="p-16 text-center text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-heritage-600" />
            <span>Loading authentic archival demonstration stage...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
            <div>
              <div className="font-bold">Error Loading Stage</div>
              <div className="text-sm">{error}</div>
            </div>
          </div>
        ) : stageDetail ? (
          <div className="space-y-8 animate-fade-in">
            {/* Stage Title Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-stone-100 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono uppercase text-heritage-700 font-bold mb-1">
                    <span>Pillar {stageDetail.step} of 10</span>
                    <span>•</span>
                    <span>Institutional Capability Verification</span>
                  </div>
                  <h1 className="text-2xl sm:text-4xl font-serif font-bold text-slate-900">
                    {stageDetail.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    stageDetail.status === 'OPERATIONAL'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : stageDetail.status === 'OPERATIONAL (FALLBACK)'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{stageDetail.status}</span>
                  </span>
                </div>
              </div>

              {/* Problem vs Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-2">
                  <div className="text-xs font-mono uppercase text-amber-800 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Historical Archive Challenge</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {stageDetail.problem}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 space-y-2">
                  <div className="text-xs font-mono uppercase text-emerald-800 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>SIH Architectural Solution</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {stageDetail.solution}
                  </p>
                </div>
              </div>
            </div>

            {/* Two-Column Stage Explorer */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Talking Points for Judges */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 font-serif font-bold text-lg text-slate-900 border-b border-stone-100 pb-3">
                    <Sparkles className="w-5 h-5 text-heritage-600" />
                    <span>Key Evaluation Highlights</span>
                  </div>

                  <ul className="space-y-3">
                    {stageDetail.talking_points.map((tp, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-heritage-500 mt-2 flex-shrink-0" />
                        <span>{tp}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-slate-500 leading-relaxed">
                    <strong>Zero Fabrication Rule:</strong> All data displayed below is fetched live from actual database records in <code className="font-mono bg-stone-200 px-1 py-0.5 rounded">archive_phase1.db</code>.
                  </div>
                </div>
              </div>

              {/* Right Column: Live Interactive Evidence Widget */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="font-serif font-bold text-lg text-slate-900">
                      Live Archival Evidence Preview
                    </div>
                    <span className="text-xs font-mono text-slate-400">Authentic Primary Records</span>
                  </div>

                  {/* Stage-specific Interactive Demonstrations */}
                  {stageDetail.stage_id === 'digital_archive' && stageDetail.sample_records && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500">
                        Primary source masters accessioned with immutable SHA-256 fingerprints:
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {stageDetail.sample_records.map((r, i) => (
                          <div key={i} className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:border-heritage-400 transition space-y-1">
                            <div className="flex justify-between items-start">
                              <span className="font-mono text-xs font-bold text-heritage-700">{r.archive_id}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">{r.verification_status}</span>
                            </div>
                            <div className="font-bold text-slate-900 text-sm">{r.title}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-3">
                              <span>Type: {r.document_type}</span>
                              <span>Year: {r.year}</span>
                              <span className="font-mono text-[11px] truncate max-w-xs">{r.checksum}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/documents"
                        className="inline-flex items-center gap-2 text-sm font-bold text-heritage-700 hover:text-heritage-900"
                      >
                        <span>Open Document Catalog</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {stageDetail.stage_id === 'smart_search' && stageDetail.suggested_queries && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500">
                        Try authentic search queries across speeches, debates, and historical treatises:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stageDetail.suggested_queries.map((sq, i) => (
                          <div key={i} className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition space-y-2">
                            <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                              <span>"{sq.query}"</span>
                              <Search className="w-4 h-4 text-heritage-600" />
                            </div>
                            <div className="text-xs text-slate-500">{sq.description}</div>
                            <button
                              onClick={() => navigate(`/search?q=${encodeURIComponent(sq.query)}`)}
                              className="w-full py-1.5 px-3 rounded-lg bg-heritage-500 hover:bg-heritage-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                            >
                              <span>Launch Hybrid Search</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stageDetail.stage_id === 'ocr_digitization' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
                        <div className="font-bold text-slate-900 text-sm">Active OCR Digitization Pipeline</div>
                        <div className="text-xs text-slate-600">
                          Raw scans undergo multi-tier preprocessing (binarization, skew correction), character recognition with confidence heatmaps, and mandatory curator review.
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Link
                            to="/admin/ocr"
                            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-bold text-xs flex items-center gap-1.5"
                          >
                            <Cpu className="w-4 h-4" />
                            <span>View OCR Curator Review Workstation</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {stageDetail.stage_id === 'ai_research_assistant' && stageDetail.sample_questions && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500">
                        Test closed-world RAG queries guaranteed to cite primary sources:
                      </div>
                      <div className="space-y-3">
                        {stageDetail.sample_questions.map((q, i) => (
                          <div key={i} className="p-4 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 transition space-y-2">
                            <div className="font-bold text-slate-900 text-sm">
                              Q: "{q.question}"
                            </div>
                            <div className="text-xs text-emerald-700 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Grounded Citation Target: {q.expected_source}</span>
                            </div>
                            <button
                              onClick={() => navigate(`/research?q=${encodeURIComponent(q.question)}`)}
                              className="py-1.5 px-3 rounded-lg bg-heritage-500 hover:bg-heritage-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              <span>Ask Research Assistant</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {stageDetail.stage_id === 'knowledge_graph' && stageDetail.featured_entities && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500">
                        Canonical historical entities with 6-step unbroken archival provenance:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {stageDetail.featured_entities.map((e, i) => (
                          <div key={i} className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-center">
                            <div className="font-bold text-slate-900 text-xs truncate">{e.name}</div>
                            <span className="text-[10px] font-mono uppercase text-heritage-700">{e.type}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/knowledge-graph"
                        className="inline-flex items-center gap-2 text-sm font-bold text-heritage-700 hover:text-heritage-900 pt-2"
                      >
                        <Network className="w-4 h-4" />
                        <span>Explore Full Historical Knowledge Graph</span>
                      </Link>
                    </div>
                  )}

                  {stageDetail.stage_id === 'intelligent_timeline' && stageDetail.sample_milestones && (
                    <div className="space-y-4">
                      <div className="text-xs text-slate-500">
                        Historical milestones respecting strict date precision (never inventing days):
                      </div>
                      <div className="space-y-2">
                        {stageDetail.sample_milestones.map((m, i) => (
                          <div key={i} className="p-3 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{m.title}</span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-heritage-100 text-heritage-900 font-bold">{m.date_str}</span>
                          </div>
                        ))}
                      </div>
                      <Link
                        to="/timeline"
                        className="inline-flex items-center gap-2 text-sm font-bold text-heritage-700 hover:text-heritage-900 pt-2"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Open Interactive Historical Timeline</span>
                      </Link>
                    </div>
                  )}

                  {stageDetail.stage_id === 'audio_video_archive' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                        <div className="font-bold text-slate-900 text-sm">Archival Audio Address (1952)</div>
                        <div className="text-xs text-slate-600">
                          Preserved master audio clip with synchronized WebVTT captions and speaker diarization.
                        </div>
                        <Link
                          to="/media"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-heritage-600 hover:bg-heritage-700 text-white font-bold text-xs shadow-sm"
                        >
                          <Film className="w-4 h-4" />
                          <span>Browse Archival Audio/Video Catalog</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {stageDetail.stage_id === 'kiosk_experience' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                        <div className="font-bold text-slate-900 text-sm">Touchscreen Museum Kiosk Interface</div>
                        <div className="text-xs text-slate-600">
                          Touch-optimized navigation with large interactive controls, high-contrast visibility, and an automated 120s inactivity timer that purges visitor queries without modifying the permanent archive.
                        </div>
                        <Link
                          to="/kiosk/media"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-heritage-600 hover:bg-heritage-700 text-white font-bold text-xs shadow-sm"
                        >
                          <Monitor className="w-4 h-4" />
                          <span>Launch Museum Kiosk Exhibition View</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {stageDetail.stage_id === 'security_preservation' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                          <div className="font-mono text-slate-500 uppercase font-bold text-[10px]">Master Vault</div>
                          <div className="font-bold text-emerald-700 mt-1">READ-ONLY (0o444)</div>
                        </div>
                        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                          <div className="font-mono text-slate-500 uppercase font-bold text-[10px]">Rate Limiting</div>
                          <div className="font-bold text-emerald-700 mt-1">SLIDING WINDOW ACTIVE</div>
                        </div>
                      </div>
                      <Link
                        to="/system-status"
                        className="inline-flex items-center gap-2 text-sm font-bold text-heritage-700 hover:text-heritage-900 pt-2"
                      >
                        <ShieldCheck className="w-4 h-4" />
                        <span>View Real-Time Subsystem Health Matrix</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Floating Bottom Navigation Controller */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#102038] text-white border-t border-heritage-500/40 p-4 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStageIndex <= 0}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs sm:text-sm font-bold flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center space-x-1.5">
            {stages.map((st, i) => (
              <button
                key={st.stage_id}
                onClick={() => handleSelectStage(st.stage_id)}
                className={`w-3 h-3 rounded-full transition-all ${
                  st.stage_id === currentStageId
                    ? 'bg-heritage-400 w-8'
                    : i < currentStageIndex
                    ? 'bg-white/60'
                    : 'bg-white/20'
                }`}
                title={`Stage ${i + 1}: ${st.title}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={currentStageIndex >= stages.length - 1}
            className="px-5 py-2 rounded-xl bg-heritage-500 hover:bg-heritage-400 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow transition"
          >
            <span>Next Stage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
