import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Search, Sliders, Database, Layers, Sparkles, Filter, 
  FileText, BookOpen, Clock, ChevronRight, CheckCircle2, 
  AlertTriangle, Copy, Check, ExternalLink, Cpu, Info, RefreshCw
} from 'lucide-react';
import { archiveApi } from '../services/api';
import { SearchResponse, SearchResultItem, SearchMode } from '../types';
import { PageMasthead } from '../components/layout/PageMasthead';

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
    <div className="min-h-screen bg-newsprint-100 text-ink pb-16">
      {/* Standardized Archival Search Bureau Masthead */}
      <PageMasthead
        eyebrow="MULTI-CHANNEL ARCHIVAL SEARCH DESK • DUBLIN CORE OAIS REGISTRY"
        headline="Archival Semantic & Hybrid Retrieval"
        subheadline="Direct passage-level retrieval across manuscripts, constituent assembly debates, speeches, and books with unbroken folio provenance and dense multilingual representations."
        accession={searchResponse ? `LOCATED PASSAGES: ${searchResponse.total}` : 'READY FOR RETRIEVAL'}
        rightSlot={
          <div className="flex flex-wrap items-center gap-2 bg-newsprint-200 border border-ink/30 p-2 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-600">Vector Engine:</span>
              {isVectorProduction ? (
                <span className="bg-verified-bg text-verified-text border border-verified-border px-1.5 py-0.2 font-bold text-[10px]">
                  [PGVECTOR PROD]
                </span>
              ) : (
                <span className="bg-[#FAF6EE] text-oxblood border border-oxblood px-1.5 py-0.2 font-bold text-[10px]">
                  [SQLITE FALLBACK]
                </span>
              )}
            </div>
            <span className="text-ink/30">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-600">Embedding:</span>
              <span className="text-ink-900 font-bold text-[11px]">BGE-M3 (1024-D)</span>
            </div>
            <span className="text-ink/30">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-600">Reranker:</span>
              <span className="text-ink-900 font-bold text-[11px]">BGE-Reranker-v2</span>
            </div>
          </div>
        }
        bottomSlot={
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="bg-[#FAF6EE] border-2 border-ink shadow-letterpress-sm p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-ink-500 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter archival keywords, constitutional clauses, volume numbers..."
                  className="w-full pl-10 pr-4 py-2 bg-white text-ink border border-ink/30 focus:outline-none focus:border-ink font-mono text-xs sm:text-sm"
                />
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center bg-newsprint-200 p-1 border border-ink/30 font-mono">
                <button
                  type="button"
                  onClick={() => handleModeChange('hybrid')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition ${
                    mode === 'hybrid'
                      ? 'bg-ink text-white shadow-letterpress-sm'
                      : 'text-ink-700 hover:text-ink'
                  }`}
                  title="Reciprocal Rank Fusion combining lexical BM25 and dense vector representations"
                >
                  Hybrid RRF
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('semantic')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition ${
                    mode === 'semantic'
                      ? 'bg-ink text-white shadow-letterpress-sm'
                      : 'text-ink-700 hover:text-ink'
                  }`}
                  title="Dense vector cosine similarity via BGE-M3"
                >
                  Semantic
                </button>
                <button
                  type="button"
                  onClick={() => handleModeChange('keyword')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition ${
                    mode === 'keyword'
                      ? 'bg-ink text-white shadow-letterpress-sm'
                      : 'text-ink-700 hover:text-ink'
                  }`}
                  title="Full-text lexical matching"
                >
                  Lexical
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-ink hover:bg-oxblood text-white font-mono text-xs uppercase font-bold tracking-wider px-5 py-2 transition flex items-center justify-center gap-1.5 shadow-letterpress-sm border border-ink"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                <span>[ Retrieve ]</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-ink-600 font-bold uppercase">Official Inquiries:</span>
              {presetQueries.map((pq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(pq);
                    executeSearch(pq, mode, documentType, language, year);
                  }}
                  className="bg-[#FAF6EE] hover:bg-newsprint-300 text-ink border border-ink/30 px-2 py-0.5 text-[10px] uppercase font-bold transition hover:border-ink"
                >
                  #{pq}
                </button>
              ))}
            </div>
          </form>
        }
      />

      {/* Main Content: Sidebar + Search Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Facets Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#FAF6EE] border-2 border-ink p-4 shadow-letterpress-sm font-mono">
              <div className="flex items-center justify-between pb-3 border-b-2 border-ink">
                <h3 className="font-serif font-black text-sm uppercase text-ink flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-oxblood" />
                  <span>Classified Facets</span>
                </h3>
                {(documentType || language || year) && (
                  <button
                    onClick={() => {
                      setDocumentType('');
                      setLanguage('');
                      setYear('');
                      executeSearch(query, mode, '', '', '');
                    }}
                    className="text-[10px] text-oxblood hover:underline font-bold uppercase"
                  >
                    [ Reset ]
                  </button>
                )}
              </div>

              {/* Document Type Filter */}
              <div className="mt-4">
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-1">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    executeSearch(query, mode, e.target.value, language, year);
                  }}
                  className="w-full bg-white border border-ink/40 p-1.5 text-xs font-mono focus:outline-none focus:border-ink"
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
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    executeSearch(query, mode, documentType, e.target.value, year);
                  }}
                  className="w-full bg-white border border-ink/40 p-1.5 text-xs font-mono focus:outline-none focus:border-ink"
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
                <label className="block text-[11px] font-bold text-ink uppercase tracking-wider mb-1">
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
                  className="w-full bg-white border border-ink/40 p-1.5 text-xs font-mono focus:outline-none focus:border-ink"
                />
              </div>

              {/* Transcription Layer Distribution */}
              {searchResponse?.facets?.transcription_layers && (
                <div className="mt-6 pt-4 border-t border-ink/20">
                  <h4 className="text-[11px] font-bold text-oxblood uppercase tracking-wider mb-2">
                    Provenance Layers
                  </h4>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(searchResponse.facets.transcription_layers).map(([layer, count]) => (
                      <div key={layer} className="flex justify-between items-center text-ink-700">
                        <span className="font-mono text-[11px] truncate">{layer}</span>
                        <span className="bg-newsprint-300 text-ink px-1.5 py-0.2 border border-ink/30 font-bold text-[10px]">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Retrieval Pipeline Info Box */}
            <div className="bg-[#FAF6EE] border-2 border-ink p-4 text-xs space-y-2 font-mono shadow-letterpress-sm">
              <div className="flex items-center gap-1.5 text-oxblood font-bold uppercase text-[11px]">
                <Info className="w-4 h-4 text-oxblood" />
                <span>Search Integrity Standards</span>
              </div>
              <p className="text-ink-700 leading-relaxed font-editorial text-xs italic">
                Every passage retrieved is anchored to a permanent archival document record, folio/page boundary, and transcription checksum.
              </p>
              <div className="pt-2 border-t border-ink/20 text-[10px] text-ink-600 space-y-1">
                <div>• Verified documents: indexed for open scholarship</div>
                <div>• Zero hallucinated or synthetic passages</div>
                <div>• Cryptographic SHA-256 verifiable folios</div>
              </div>
            </div>
          </div>

          {/* Right Results Column */}
          <div className="lg:col-span-3 space-y-5">
            {/* Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF6EE] px-4 py-2 border-2 border-ink shadow-letterpress-sm font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-ink">
                  {searchResponse ? `[ ${searchResponse.total} PASSAGES LOCATED ]` : '[ READY FOR RETRIEVAL ]'}
                </span>
                {searchResponse?.query && (
                  <span className="text-oxblood italic">
                    query: "{searchResponse.query}"
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-ink-600">
                <span>MODE: <strong className="text-oxblood uppercase">{mode}</strong></span>
                <span>•</span>
                <span>PAGE {searchResponse?.page || 1}</span>
              </div>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="bg-[#FAF6EE] border-2 border-ink p-12 text-center shadow-letterpress-sm font-mono space-y-3">
                <div className="archival-loading-bar max-w-sm mx-auto mb-3" />
                <h4 className="font-serif font-black text-lg text-ink uppercase">
                  Executing Archival Retrieval Pipeline...
                </h4>
                <p className="text-xs text-ink-600 mt-1 font-editorial italic">
                  Querying lexical full-text index, dense vector embeddings, and reciprocal rank fusion.
                </p>
              </div>
            )}

            {/* Zero Results State */}
            {!loading && searchResponse && searchResponse.items.length === 0 && (
              <div className="bg-[#FAF6EE] border-2 border-ink p-12 text-center shadow-letterpress-sm font-mono">
                <BookOpen className="w-12 h-12 text-ink-400 mx-auto mb-3" />
                <h3 className="font-serif font-black text-lg text-ink uppercase">
                  No Archival Passages Found
                </h3>
                <p className="text-xs font-editorial text-ink-700 mt-1 max-w-md mx-auto italic">
                  No records matched your search query and filters. Try adjusting keywords or switching retrieval modes.
                </p>
              </div>
            )}

            {/* Results List */}
            {!loading && searchResponse && searchResponse.items.map((item) => {
              const isHumanReviewed = item.transcription_layer === 'HUMAN_REVIEWED' || item.is_verified;

              return (
                <div 
                  key={item.chunk_id}
                  className="bg-[#FAF6EE] border border-ink/40 hover:border-ink transition shadow-sm hover:shadow-letterpress overflow-hidden"
                >
                  {/* Card Header Bar */}
                  <div className="bg-newsprint-100 px-4 py-2 border-b border-ink/20 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {/* Retrieval Type Pill */}
                      <span className="px-1.5 py-0.5 border border-ink bg-[#FAF6EE] text-ink font-bold text-[9px] uppercase">
                        {item.retrieval_type} MATCH
                      </span>

                      {/* Folio & Page Badge */}
                      <span className="text-ink-700 text-[11px] font-bold">
                        {item.folio_number || `PAGE ${item.page_number || 1}`}
                      </span>

                      <span className="text-ink/30">•</span>

                      {/* Document Type */}
                      <span className="border border-oxblood/40 bg-newsprint-200 text-oxblood px-1.5 py-0.2 font-bold text-[9px] uppercase">
                        {item.document_type}
                      </span>
                    </div>

                    {/* Transcription Layer Badge */}
                    <div>
                      {isHumanReviewed ? (
                        <span className="stamp-oxblood text-[9px] py-0 px-1.5">
                          HUMAN-REVIEWED ARCHIVAL TEXT
                        </span>
                      ) : (
                        <span className="stamp-ink text-[9px] py-0 px-1.5">
                          MACHINE-GENERATED / UNVERIFIED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2">
                    {/* Document Title Link */}
                    <div className="flex items-baseline justify-between gap-2">
                      <Link 
                        to={`/documents/${item.document_id}?page=${item.page_number || 1}&highlight=${encodeURIComponent(query)}`}
                        className="font-serif font-bold text-lg text-ink hover:text-oxblood transition leading-snug"
                        title="Open canonical archival folio"
                      >
                        {item.document_title || item.title}
                      </Link>
                      <span className="font-mono text-[11px] text-oxblood font-bold shrink-0">
                        {item.archive_id}
                      </span>
                    </div>


                    {/* Creator & Year Metadata */}
                    <div className="flex items-center gap-2 text-[11px] text-ink-600 font-mono">
                      <span>{item.creator || "Dr. B. R. Ambedkar"}</span>
                      {item.year && <span>• {item.year}</span>}
                      {item.collection_title && <span>• {item.collection_title}</span>}
                    </div>

                    {/* Evidence Passage with Highlighted Snippet */}
                    <div className="mt-2 bg-newsprint-50 p-3 border border-ink/20 font-editorial text-sm leading-relaxed text-ink">
                      {item.highlighted_snippet ? (
                        <p 
                          dangerouslySetInnerHTML={{ __html: item.highlighted_snippet }}
                          className="[&>mark]:bg-newsprint-300 [&>mark]:text-oxblood [&>mark]:font-bold [&>mark]:px-0.5"
                        />
                      ) : (
                        <p>{item.chunk_text.slice(0, 320)}...</p>
                      )}
                    </div>

                    {/* Diagnostic Scoring Bar */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-500 pt-1">
                      {item.score !== undefined && (
                        <span>Combined Score: <strong className="text-ink">{item.score.toFixed(4)}</strong></span>
                      )}
                      {item.keyword_rank && (
                        <span>KW Rank: #{item.keyword_rank}</span>
                      )}
                      {item.semantic_score !== null && item.semantic_score !== undefined && (
                        <span>Cosine Sim: {item.semantic_score.toFixed(4)}</span>
                      )}
                      {item.reranker_score !== null && item.reranker_score !== undefined ? (
                        <span>Reranker: {item.reranker_score.toFixed(4)}</span>
                      ) : (
                        <span className="text-ink-400">Reranker: Direct Fusion</span>
                      )}
                    </div>

                    {/* Archival Provenance Citation Box */}
                    <div className="mt-3 pt-2 border-t border-ink/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs bg-newsprint-100 p-2.5 border border-ink/20">
                      <div className="flex-1 text-[11px] text-ink-700">
                        <strong className="text-oxblood">Citation:</strong> {item.citation}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyCitation(item)}
                          className="px-2 py-0.5 bg-[#FAF6EE] hover:bg-newsprint-300 text-ink border border-ink/40 font-mono text-[10px] font-bold uppercase transition shadow-letterpress-sm"
                          title="Copy standard archival citation"
                        >
                          {copiedChunkId === item.chunk_id ? (
                            <span className="text-oxblood font-bold">[ COPIED ]</span>
                          ) : (
                            <span>[ COPY CITATION ]</span>
                          )}
                        </button>

                        <Link
                          to={`/documents/${item.document_id}?page=${item.page_number || 1}&highlight=${encodeURIComponent(query)}`}
                          className="px-2.5 py-0.5 bg-ink hover:bg-oxblood text-white font-mono font-bold text-[10px] uppercase transition shadow-letterpress-sm flex items-center gap-1"
                        >
                          <span>[ VIEW SLIP ]</span>
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
