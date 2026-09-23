import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Sliders, Database, Layers, Sparkles, Filter, 
  FileText, BookOpen, Clock, ChevronRight, CheckCircle2, 
  AlertTriangle, Copy, Check, ExternalLink, Cpu, Info, RefreshCw
} from 'lucide-react';
import { archiveApi } from '../services/api';
import { SearchResponse, SearchResultItem, SearchMode } from '../types';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialMode = (searchParams.get('mode') as SearchMode) || 'hybrid';

  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [documentType, setDocumentType] = useState(searchParams.get('document_type') || '');
  const [language, setLanguage] = useState(searchParams.get('language') || '');
  const [year, setYear] = useState(searchParams.get('year') || '');

  const [loading, setLoading] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<number | null>(null);
  const [expandedChunkId, setExpandedChunkId] = useState<number | null>(null);

  const executeSearch = async (
    qVal = query,
    modeVal = mode,
    docTypeVal = documentType,
    langVal = language,
    yearVal = year
  ) => {
    setLoading(true);
    try {
      const res = await archiveApi.searchUniversal({
        q: qVal || undefined,
        mode: modeVal,
        document_type: docTypeVal || undefined,
        language: langVal || undefined,
        year: yearVal ? parseInt(yearVal) : undefined,
        page: 1,
        page_size: 15
      });
      setSearchResponse(res);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(initialQuery, initialMode, documentType, language, year);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextParams: Record<string, string> = {};
    if (query) nextParams.q = query;
    if (mode) nextParams.mode = mode;
    if (documentType) nextParams.document_type = documentType;
    if (language) nextParams.language = language;
    if (year) nextParams.year = year;
    setSearchParams(nextParams);

    executeSearch(query, mode, documentType, language, year);
  };

  const handleModeChange = (newMode: SearchMode) => {
    setMode(newMode);
    executeSearch(query, newMode, documentType, language, year);
  };

  const handleCopyCitation = (item: SearchResultItem) => {
    navigator.clipboard.writeText(item.citation);
    setCopiedChunkId(item.chunk_id);
    setTimeout(() => setCopiedChunkId(null), 2500);
  };

  const presetQueries = [
    "Annihilation of Caste social democracy",
    "Grammar of Anarchy Bhakti in politics",
    "Constituent Assembly fundamental rights draft",
    "Mahad Satyagraha water rights",
    "Untouchables historical origins"
  ];

  const vectorBackend = searchResponse?.diagnostics?.vector_backend || 'SQLITE_DEV_FALLBACK';
  const isVectorProduction = searchResponse?.diagnostics?.is_vector_production || false;

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-slate-900 pb-16">
      {/* Header Banner */}
      <div className="bg-[#102038] text-white border-b-2 border-heritage-500 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-heritage-400 text-xs font-mono tracking-wide uppercase mb-1">
                <Database className="w-3.5 h-3.5" />
                Phase 4 Multi-Channel Archival Search Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Archival Semantic & Hybrid Retrieval
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl font-serif">
                Direct passage-level retrieval across manuscripts, constituent assembly debates, speeches, and books 
                with unbroken folio provenance and BGE-M3 dense multilingual representations.
              </p>
            </div>

            {/* Architecture Diagnostic Badges */}
            <div className="flex flex-wrap items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Vector Engine:</span>
                {isVectorProduction ? (
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-mono font-semibold text-[11px]">
                    pgvector (Production)
                  </span>
                ) : (
                  <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-semibold text-[11px]" title="Development fallback active. PostgreSQL + pgvector is enforced in production.">
                    SQLite Fallback (Dev/Test)
                  </span>
                )}
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Embedding:</span>
                <span className="text-heritage-300 font-mono font-medium text-[11px]">
                  BGE-M3 (1024-dim)
                </span>
              </div>
              <span className="text-white/20">|</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Reranker:</span>
                <span className="text-heritage-300 font-mono font-medium text-[11px]">
                  BGE-Reranker-v2-m3
                </span>
              </div>
            </div>
          </div>

          {/* Search Box Form */}
          <form onSubmit={handleSearchSubmit} className="mt-6">
            <div className="bg-white rounded-xl shadow-lg border-2 border-heritage-500/60 p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search historical passages, speeches, constitution drafts, or keywords..."
                  className="w-full pl-10 pr-4 py-2.5 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none font-serif text-sm sm:text-base"
                />
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleModeChange('hybrid')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    mode === 'hybrid'
                      ? 'bg-[#102038] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Reciprocal Rank Fusion (RRF k=60) combining keyword frequency and dense semantic representations"
                >
                  Hybrid (RRF)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('semantic')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    mode === 'semantic'
                      ? 'bg-[#102038] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Dense vector cosine similarity via BAAI/bge-m3"
                >
                  Semantic
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('keyword')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    mode === 'keyword'
                      ? 'bg-[#102038] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Full-text and exact phrase lexical matching"
                >
                  Keyword
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-heritage-600 hover:bg-heritage-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm shadow-sm transition flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span>Retrieve</span>
              </button>
            </div>
          </form>

          {/* Quick Presets */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-serif italic">Sample research inquiries:</span>
            {presetQueries.map((pq, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(pq);
                  executeSearch(pq, mode, documentType, language, year);
                }}
                className="bg-white/10 hover:bg-white/20 text-heritage-200 border border-white/15 px-2.5 py-0.5 rounded-full transition font-serif text-[11px]"
              >
                {pq}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Sidebar + Search Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Facets Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-heritage-300/80 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-heritage-200">
                <h3 className="font-serif font-bold text-base text-[#102038] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-heritage-600" />
                  Archival Facets
                </h3>
                {(documentType || language || year) && (
                  <button
                    onClick={() => {
                      setDocumentType('');
                      setLanguage('');
                      setYear('');
                      executeSearch(query, mode, '', '', '');
                    }}
                    className="text-[11px] text-heritage-700 hover:underline font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Document Type Filter */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    executeSearch(query, mode, e.target.value, language, year);
                  }}
                  className="w-full bg-[#FAF7F0] border border-heritage-300 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-heritage-500 focus:outline-none"
                >
                  <option value="">All Archival Types</option>
                  <option value="BOOK">Book / Monograph</option>
                  <option value="DEBATE">Constituent Assembly Debate</option>
                  <option value="SPEECH">Speech & Address</option>
                  <option value="MANUSCRIPT">Historical Manuscript</option>
                  <option value="HISTORICAL_RECORD">Archival Record</option>
                </select>
              </div>

              {/* Language Filter */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    executeSearch(query, mode, documentType, e.target.value, year);
                  }}
                  className="w-full bg-[#FAF7F0] border border-heritage-300 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-heritage-500 focus:outline-none"
                >
                  <option value="">All Languages</option>
                  <option value="English">English</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Sanskrit">Sanskrit (संस्कृत)</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                  Specific Year
                </label>
                <input
                  type="number"
                  placeholder="e.g. 1949"
                  value={year}
                  onChange={(e) => {
                    setYear(e.target.value);
                    executeSearch(query, mode, documentType, language, e.target.value);
                  }}
                  className="w-full bg-[#FAF7F0] border border-heritage-300 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-heritage-500 focus:outline-none"
                />
              </div>

              {/* Transcription Layer Distribution */}
              {searchResponse?.facets?.transcription_layers && (
                <div className="mt-6 pt-4 border-t border-heritage-200">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 font-mono">
                    Provenance Layers
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(searchResponse.facets.transcription_layers).map(([layer, count]) => (
                      <div key={layer} className="flex justify-between items-center text-slate-600">
                        <span className="font-mono text-[11px] truncate">{layer}</span>
                        <span className="bg-heritage-100 text-heritage-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Retrieval Pipeline Info Card */}
            <div className="bg-[#102038] text-white rounded-xl p-4 text-xs space-y-2.5 border border-heritage-500/30">
              <div className="flex items-center gap-1.5 text-heritage-400 font-bold font-mono">
                <Info className="w-4 h-4" />
                <span>Search Integrity Standards</span>
              </div>
              <p className="text-slate-300 leading-relaxed font-serif text-[11px]">
                Every passage displayed is tied to a permanent archival document record, folio/page boundary, and transcription layer.
              </p>
              <div className="pt-2 border-t border-white/10 text-[11px] text-slate-400 space-y-1">
                <div>• Verified documents: indexed for public search</div>
                <div>• Unverified OCR: labelled machine-generated</div>
                <div>• Zero synthetic/fake vector embeddings</div>
              </div>
            </div>
          </div>

          {/* Right Results Column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white px-5 py-3.5 rounded-xl border border-heritage-300/80 shadow-sm text-xs">
              <div className="flex items-center gap-2">
                <span className="font-serif text-slate-700 font-semibold text-sm">
                  {searchResponse ? `${searchResponse.total} archival passages retrieved` : 'Ready to search'}
                </span>
                {searchResponse?.query && (
                  <span className="text-slate-500 italic">
                    for "{searchResponse.query}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                <span>Mode: <strong className="text-heritage-700 uppercase">{mode}</strong></span>
                <span>•</span>
                <span>Page {searchResponse?.page || 1}</span>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="bg-white rounded-xl border border-heritage-300 p-12 text-center shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin text-heritage-600 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-slate-800">
                  Executing Archival Retrieval Pipeline...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Querying lexical full-text, vector store embeddings, and reciprocal rank fusion.
                </p>
              </div>
            )}

            {/* Zero Results State */}
            {!loading && searchResponse && searchResponse.items.length === 0 && (
              <div className="bg-white rounded-xl border border-heritage-300 p-12 text-center shadow-sm">
                <BookOpen className="w-12 h-12 text-heritage-400 mx-auto mb-3 opacity-60" />
                <h3 className="font-serif font-bold text-lg text-slate-800">
                  No Archival Passages Found
                </h3>
                <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto font-serif">
                  No records matched your search query and filters. Try adjusting keywords, selecting another document type, or switching retrieval modes.
                </p>
              </div>
            )}

            {/* Results List */}
            {!loading && searchResponse && searchResponse.items.map((item) => {
              const isHumanReviewed = item.transcription_layer === 'HUMAN_REVIEWED' || item.is_verified;
              const isExpanded = expandedChunkId === item.chunk_id;

              return (
                <div 
                  key={item.chunk_id}
                  className="bg-white rounded-xl border border-heritage-300 hover:border-heritage-500 transition shadow-sm hover:shadow-md overflow-hidden"
                >
                  {/* Card Header Bar */}
                  <div className="bg-[#FAF7F0] px-5 py-3 border-b border-heritage-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {/* Retrieval Type Pill */}
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                        item.retrieval_type === 'HYBRID' 
                          ? 'bg-purple-100 text-purple-900 border border-purple-300' 
                          : item.retrieval_type === 'SEMANTIC'
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}>
                        {item.retrieval_type} MATCH
                      </span>

                      {/* Folio & Page Badge */}
                      <span className="font-mono text-slate-600 text-[11px] font-medium">
                        {item.folio_number || `Page ${item.page_number || 1}`}
                      </span>

                      <span className="text-slate-300">•</span>

                      {/* Document Type */}
                      <span className="bg-heritage-200 text-heritage-900 px-2 py-0.5 rounded font-bold text-[10px] uppercase">
                        {item.document_type}
                      </span>
                    </div>

                    {/* Transcription Layer Badge (Condition 14) */}
                    <div>
                      {isHumanReviewed ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          HUMAN-REVIEWED ARCHIVAL TEXT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold" title="Machine OCR passage pending curatorial review.">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          MACHINE-GENERATED / UNVERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    {/* Document Title Link */}
                    <div className="flex items-baseline justify-between gap-2">
                      <Link 
                        to={`/documents/${item.document_id}`}
                        className="font-serif font-bold text-lg text-[#102038] hover:text-heritage-700 transition leading-snug"
                      >
                        {item.document_title || item.title}
                      </Link>
                      <span className="font-mono text-xs text-slate-400 shrink-0">
                        {item.archive_id}
                      </span>
                    </div>

                    {/* Creator & Year Metadata */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-serif mt-1">
                      <span>{item.creator || "Dr. B.R. Ambedkar"}</span>
                      {item.year && <span>• {item.year}</span>}
                      {item.collection_title && <span>• Collection: {item.collection_title}</span>}
                    </div>

                    {/* Evidence Passage with Highlighted Snippet */}
                    <div className="mt-3.5 bg-[#FAF7F0] rounded-lg p-3.5 border border-heritage-200 text-sm font-serif leading-relaxed text-slate-800">
                      {item.highlighted_snippet ? (
                        <p 
                          dangerouslySetInnerHTML={{ __html: item.highlighted_snippet }}
                          className="[&>mark]:bg-amber-200 [&>mark]:text-amber-950 [&>mark]:font-semibold [&>mark]:px-0.5 [&>mark]:rounded"
                        />
                      ) : (
                        <p>{item.chunk_text.slice(0, 300)}...</p>
                      )}
                    </div>

                    {/* Diagnostic Scoring Expander */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-slate-500">
                      {item.score !== undefined && (
                        <span>Combined Score: <strong className="text-slate-800">{item.score.toFixed(4)}</strong></span>
                      )}
                      {item.keyword_rank && (
                        <span>KW Rank: #{item.keyword_rank}</span>
                      )}
                      {item.semantic_score !== null && item.semantic_score !== undefined && (
                        <span>Cosine Sim: {item.semantic_score.toFixed(4)}</span>
                      )}
                      {item.reranker_score !== null && item.reranker_score !== undefined ? (
                        <span>Reranker Logit: {item.reranker_score.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 italic">Reranker: Degraded / None</span>
                      )}
                    </div>

                    {/* Archival Provenance Box */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                      <div className="flex-1 font-serif text-[11px] text-slate-600">
                        <strong className="text-slate-800">Archival Citation:</strong> {item.citation}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(item)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300 font-mono text-[11px] font-medium transition"
                          title="Copy standard archival citation to clipboard"
                        >
                          {copiedChunkId === item.chunk_id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-bold">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-500" />
                              <span>Copy Citation</span>
                            </>
                          )}
                        </button>

                        <Link
                          to={`/documents/${item.document_id}`}
                          className="flex items-center gap-1 bg-[#102038] hover:bg-[#1B2A4A] text-white px-2.5 py-1 rounded font-medium text-[11px] transition shadow-sm"
                        >
                          <span>View Document</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
