import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Clock, Bot, Landmark, Search, 
  ArrowRight, ShieldCheck, Scale, FileText, 
  Volume2, Globe2, Compass, Layers, CheckCircle, ExternalLink
} from 'lucide-react';
import { apiService } from '../services/api';
import { Collection, DocumentItem, TimelineEvent } from '../types';
import { DocumentCard } from '../components/archive/DocumentCard';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { DemoBanner } from '../components/archive/DemoBanner';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [featuredDocs, setFeaturedDocs] = useState<DocumentItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    apiService.getCollections().then(setCollections);
    apiService.getDocuments({ page_size: 4 }).then(res => setFeaturedDocs(res.items));
    apiService.getTimelineEvents().then(events => setTimelineEvents(events.slice(0, 4)));
  }, []);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <div className="min-h-screen bg-newsprint-100 text-ink">
      <DemoBanner isDemoData={false} />

      {/* Broadsheet Front Page Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Main Broadsheet Columns: Lead Story (8 cols) + Secondary Dispatches & Inquiry Slip (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 border-b-2 border-double border-ink">
          
          {/* Left/Center Main Column: Lead Story */}
          <div className="lg:col-span-8 space-y-6 lg:border-r border-ink/20 lg:pr-8">
            {/* Top Gazette Wire / Eyebrow */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 pb-2 font-mono text-[11px]">
              <span className="text-oxblood font-bold uppercase tracking-wider">
                ★ HISTORIC CONSTITUTIONAL DISPATCH • CONSTITUENT ASSEMBLY OF INDIA
              </span>
              <span className="text-ink-600">
                ACCESSION: AMB-CAD-1949-042 [VERIFIED]
              </span>
            </div>

            {/* Lead Headline */}
            <div className="space-y-3">
              <h2 className="font-serif font-black text-3xl sm:text-4xl lg:text-5xl text-ink leading-tight tracking-tight uppercase">
                "On 26th January 1950, We Are Going to Enter into a Life of Contradictions"
              </h2>
              <p className="font-serif italic text-base sm:text-lg text-sepia leading-snug">
                Dr. B. R. Ambedkar's landmark address to the Constituent Assembly warns that political democracy without socio-economic equality is a palace built upon shifting sand.
              </p>
            </div>

            {/* Verbatim Excerpt in Letterpress Box */}
            <div className="bg-[#FAF6EE] border-2 border-ink p-5 shadow-letterpress-sm space-y-3">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-oxblood border-b border-ink/10 pb-1">
                <span>VERBATIM RECORD • CONSTITUENT ASSEMBLY DEBATES VOL. XI</span>
                <span>25TH NOVEMBER 1949</span>
              </div>
              <blockquote className="font-editorial text-sm sm:text-base text-ink-900 leading-relaxed broadsheet-drop-cap">
                "On the 26th of January 1950, we are going to enter into a life of contradictions. In politics we will have equality and in social and economic life we will have inequality. In politics we will be recognising the principle of one man one vote and one vote one value. In our social and economic life, we shall, by reason of our social and economic structure, continue to deny the principle of one man one value."
              </blockquote>
              <div className="text-right font-mono text-xs text-ink-600 font-bold uppercase">
                — DR. B. R. AMBEDKAR, Chairman, Drafting Committee
              </div>
            </div>

            {/* Context & Actions */}
            <div className="space-y-4">
              <p className="font-editorial text-sm text-ink-700 leading-relaxed">
                This repository holds the unabridged proceedings, official drafting committee minutes, digitized manuscript notes, and scholarly cross-references with authenticated cryptographic checksums.
              </p>
              
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/debates"
                  className="px-4 py-2 bg-ink hover:bg-oxblood text-white font-mono text-xs uppercase font-bold tracking-wider transition border border-ink shadow-letterpress-sm flex items-center gap-2"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>[ Read Full Verbatim Record ]</span>
                </Link>
                <Link
                  to="/research?query=Explain%20Dr.%20Ambedkar's%20life%20of%20contradictions%20warning%20in%20Constituent%20Assembly"
                  className="px-4 py-2 bg-[#FAF6EE] hover:bg-newsprint-300 text-oxblood font-mono text-xs uppercase font-bold tracking-wider transition border border-oxblood shadow-letterpress-sm flex items-center gap-2"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>[ Interrogate with AI Assistant ]</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Official Inquiry Slip & Classified Dispatches */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Official Archival Inquiry Slip (Search Desk) */}
            <div className="bg-[#FAF6EE] border-2 border-ink p-4 shadow-letterpress-sm space-y-3">
              <div className="border-b-2 border-ink pb-1 flex items-center justify-between">
                <h3 className="font-serif font-black text-sm uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <Search className="w-4 h-4 text-oxblood" />
                  <span>Official Inquiry Slip</span>
                </h3>
                <span className="font-mono text-[9px] text-oxblood uppercase font-bold">
                  LEDGER INQUIRY
                </span>
              </div>
              <p className="text-[11px] font-editorial text-ink-600 leading-tight">
                Search verified speeches, manuscripts, parliamentary debates, and legal opinions.
              </p>
              <form onSubmit={handleHeroSearch} className="space-y-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter keywords, volume, topic..."
                  className="w-full px-3 py-2 bg-white border border-ink/40 text-ink font-mono text-xs focus:outline-none focus:border-ink"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-ink hover:bg-oxblood text-white font-mono text-xs uppercase font-bold tracking-widest transition flex items-center justify-center gap-1.5 shadow-letterpress-sm"
                >
                  <span>[ Execute Search Dispatch ]</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </form>
              <div className="pt-1 flex flex-wrap gap-1 text-[10px] font-mono text-ink-600">
                <span className="text-ink-400">Index Tags:</span>
                {['CAD Debates', 'Castes in India', 'Problem of Rupee', 'Mahad 1927'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setSearchQuery(tag);
                      navigate(`/explore?q=${encodeURIComponent(tag)}`);
                    }}
                    className="underline hover:text-oxblood"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Secondary Historic Dispatch 1 */}
            <div className="border-t-2 border-ink pt-3 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-oxblood">
                <span className="font-bold">ACCESSION: AMB-SOC-1936-001</span>
                <span>LAHORE DISPATCH</span>
              </div>
              <h4 className="font-serif font-bold text-base text-ink hover:text-oxblood transition leading-snug">
                <Link to="/documents">Annihilation of Caste: The Undelivered Address</Link>
              </h4>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                The groundbreaking treatise dissecting hereditary social stratification, prepared for the Jat-Pat Todak Mandal conference of 1936.
              </p>
              <div className="pt-1 font-mono text-[10px] text-ink-500">
                [ 1936 • PHILOSOPHICAL ESSAY • 52 PAGES ]
              </div>
            </div>

            {/* Secondary Historic Dispatch 2 */}
            <div className="border-t border-ink/20 pt-3 space-y-1">
              <div className="flex items-center justify-between font-mono text-[10px] text-oxblood">
                <span className="font-bold">ACCESSION: AMB-ECO-1923-004</span>
                <span>LONDON DISPATCH</span>
              </div>
              <h4 className="font-serif font-bold text-base text-ink hover:text-oxblood transition leading-snug">
                <Link to="/documents">The Problem of the Rupee: Its Origin & Solution</Link>
              </h4>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Seminal doctoral thesis submitted to the University of London analyzing currency stability and central banking mechanisms in British India.
              </p>
              <div className="pt-1 font-mono text-[10px] text-ink-500">
                [ 1923 • MONETARY ECONOMICS • 320 PAGES ]
              </div>
            </div>

          </div>
        </div>

        {/* Archival Ledger Statistics Strip */}
        <div className="my-8 py-4 border-y-2 border-double border-ink bg-[#FAF6EE] font-mono">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x-0 md:divide-x divide-ink/20">
            <div className="p-2">
              <div className="font-serif font-black text-2xl sm:text-3xl text-ink">43+</div>
              <div className="text-[10px] text-ink-700 uppercase font-bold tracking-widest mt-0.5">
                CATALOGUED RECORDS
              </div>
              <div className="text-[9px] text-ink-500">BAWS & CAD Proceedings</div>
            </div>
            <div className="p-2">
              <div className="font-serif font-black text-2xl sm:text-3xl text-ink">5</div>
              <div className="text-[10px] text-ink-700 uppercase font-bold tracking-widest mt-0.5">
                CURATED LEDGERS
              </div>
              <div className="text-[9px] text-ink-500">Writings, Speeches & Media</div>
            </div>
            <div className="p-2">
              <div className="font-serif font-black text-2xl sm:text-3xl text-ink">31</div>
              <div className="text-[10px] text-ink-700 uppercase font-bold tracking-widest mt-0.5">
                TIMELINE MILESTONES
              </div>
              <div className="text-[9px] text-ink-500">1891–1956 Chronology</div>
            </div>
            <div className="p-2">
              <div className="font-serif font-black text-2xl sm:text-3xl text-oxblood">100%</div>
              <div className="text-[10px] text-oxblood uppercase font-bold tracking-widest mt-0.5">
                OPEN SCHOLARLY ACCESS
              </div>
              <div className="text-[9px] text-ink-500">OAIS & Dublin Core Standard</div>
            </div>
          </div>
        </div>

        {/* Classified Archival Holdings (Collections) */}
        <section className="my-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b-2 border-ink">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold">
                REGISTRY CATALOGUE
              </span>
              <h3 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
                Classified Archival Holdings
              </h3>
            </div>
            <Link
              to="/explore"
              className="font-mono text-xs uppercase font-bold text-ink hover:text-oxblood flex items-center gap-1 mt-2 sm:mt-0 transition underline"
            >
              <span>[ Open Full Ledger ]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {collections.map((coll, index) => (
              <div 
                key={coll.id}
                onClick={() => navigate(`/explore?collection_id=${coll.id}`)}
                className="bg-[#FAF6EE] border border-ink/40 hover:border-ink p-4 shadow-sm hover:shadow-letterpress transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-oxblood border-b border-ink/10 pb-1">
                    <span className="font-bold">[HOLDING 0{index + 1}]</span>
                    <span>{coll.period || 'ARCHIVE'}</span>
                  </div>
                  <h4 className="font-serif font-bold text-base text-ink group-hover:text-oxblood transition leading-snug">
                    {coll.title}
                  </h4>
                  <p className="font-editorial text-xs text-ink-700 line-clamp-3 leading-relaxed">
                    {coll.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-ink/10 flex items-center justify-between font-mono text-[11px] text-ink-600">
                  <span>{coll.document_count || 4} Items Indexed</span>
                  <span className="font-bold text-oxblood group-hover:translate-x-1 transition-transform">
                    Inspect →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Accessions & Digitized Facsimiles */}
        <section className="my-10 pt-8 border-t-2 border-ink">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b-2 border-ink">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold">
                DOCUMENTARY EVIDENCE
              </span>
              <h3 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
                Recent Archival Accessions
              </h3>
            </div>
            <Link
              to="/documents"
              className="font-mono text-xs uppercase font-bold text-ink hover:text-oxblood flex items-center gap-1 mt-2 sm:mt-0 transition underline"
            >
              <span>[ Browse All Documents ]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={(d) => setSelectedDoc(d)}
              />
            ))}
          </div>
        </section>

        {/* AI Research Assistant Broadsheet Teleprinter Section */}
        <section className="my-12 p-6 sm:p-8 bg-[#FAF6EE] border-2 border-ink shadow-letterpress">
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="text-center space-y-1 border-b-2 border-ink pb-3">
              <span className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold">
                ★ LIVE RETRIEVAL-AUGMENTED INTELLIGENCE DESK ★
              </span>
              <h3 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase">
                Scholarly AI Research Assistant
              </h3>
              <p className="font-editorial text-sm text-ink-700 max-w-xl mx-auto italic">
                Directly interrogating thousands of pages of primary sources with verified citations and source grounding.
              </p>
            </div>

            {/* Teleprinter Dispatch Preview */}
            <div className="bg-newsprint-100 border border-ink/30 p-4 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between text-[11px] text-ink-600 border-b border-ink/20 pb-2">
                <span className="flex items-center gap-1.5 font-bold text-oxblood">
                  <Bot className="w-4 h-4 text-oxblood" />
                  <span>INQUIRY TELEPRINTER • HUGGING FACE INFERENCE ENGINE</span>
                </span>
                <span className="stamp-oxblood text-[9px] py-0 px-1">
                  SOURCE-GROUNDED RAG
                </span>
              </div>

              <div className="bg-[#FAF6EE] p-3 border border-ink/20 font-editorial text-sm text-ink leading-relaxed">
                <span className="font-mono text-xs text-ink-500 uppercase block mb-1">
                  Sample Query: "What did Dr. Ambedkar state about the grammar of anarchy?"
                </span>
                "Dr. Ambedkar warned that with the introduction of constitutional methods for achieving social and economic objectives, bloody methods of revolution must be abandoned. He described civil disobedience, non-cooperation and satyagraha in an independent constitutional democracy as the <em>'Grammar of Anarchy'</em> [CAD Vol. XI, Nov 25, 1949]."
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-ink-600">
                  Verification: Constituent Assembly Debates • Citation ID: [CAD-1949-NOV25-P978]
                </span>
                <Link
                  to="/research?query=What%20did%20Dr.%20Ambedkar%20mean%20by%20the%20Grammar%20of%20Anarchy%3F"
                  className="px-4 py-1.5 bg-ink hover:bg-oxblood text-white font-mono text-xs uppercase font-bold tracking-wider transition border border-ink shadow-letterpress-sm flex items-center gap-1.5"
                >
                  <span>[ Open Research Workbench ]</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Biographical Chronology Ledger */}
        <section className="my-10 pt-8 border-t-2 border-ink">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b-2 border-ink">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold">
                HISTORICAL CHRONOLOGY
              </span>
              <h3 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
                Timeline of Epochal Milestones
              </h3>
            </div>
            <Link
              to="/timeline"
              className="font-mono text-xs uppercase font-bold text-ink hover:text-oxblood flex items-center gap-1 mt-2 sm:mt-0 transition underline"
            >
              <span>[ Open Full Timeline ]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {timelineEvents.map((event) => (
              <div 
                key={event.id} 
                className="bg-[#FAF6EE] p-4 border border-ink/40 shadow-sm hover:shadow-letterpress transition space-y-2 font-mono"
              >
                <div className="flex items-center justify-between border-b border-ink/10 pb-1">
                  <span className="font-serif font-black text-2xl text-oxblood">
                    {event.year}
                  </span>
                  <span className="text-[10px] text-ink-500 uppercase">MILESTONE</span>
                </div>
                <h4 className="font-serif font-bold text-base text-ink leading-snug">
                  {event.title}
                </h4>
                <p className="font-editorial text-xs text-ink-700 line-clamp-3 leading-relaxed">
                  {event.description}
                </p>
                {event.related_locations && (
                  <div className="pt-2 text-[10px] text-ink-500 border-t border-ink/10">
                    📍 {event.related_locations}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Institutional Charter Tri-Fold */}
        <section className="my-12 border-2 border-ink bg-[#FAF6EE] p-6 shadow-letterpress-sm font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-ink/20">
            <div className="space-y-2 pt-4 md:pt-0 pr-0 md:pr-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <Globe2 className="w-4 h-4" />
                <span>Multilingual Records</span>
              </div>
              <h4 className="font-serif font-bold text-base text-ink">
                Universal Accessibility
              </h4>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Curated in Marathi (मराठी), Hindi (हिंदी), English, and classical texts for nationwide democratic access.
              </p>
            </div>

            <div className="space-y-2 pt-4 md:pt-0 px-0 md:px-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <Scale className="w-4 h-4" />
                <span>Cryptographic Provenance</span>
              </div>
              <h4 className="font-serif font-bold text-base text-ink">
                Institutional Integrity
              </h4>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Immutable SHA-256 digital checksums and Dublin Core OAIS standards preserve absolute archival truth.
              </p>
            </div>

            <div className="space-y-2 pt-4 md:pt-0 pl-0 md:pl-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Museum & Kiosk Station</span>
              </div>
              <h4 className="font-serif font-bold text-base text-ink">
                Public Kiosk Mode
              </h4>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Designed for memorial kiosks, university libraries, and exhibition touchscreens with 48px+ touch controls.
              </p>
            </div>
          </div>
        </section>

      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onOpenResearch={(title) => {
            setSelectedDoc(null);
            navigate(`/research?query=${encodeURIComponent(`Explain key context of: ${title}`)}`);
          }}
        />
      )}
    </div>
  );
};
