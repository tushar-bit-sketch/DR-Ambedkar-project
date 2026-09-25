import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Bot, Search, 
  ArrowRight, Scale, 
  Globe2, ShieldCheck, Film, Compass
} from 'lucide-react';
import { apiService } from '../services/api';
import { Collection, DocumentItem, TimelineEvent } from '../types';
import { HeroSection } from '../components/hero/HeroSection';
import { InfographicSection } from '../components/archive/InfographicSection';
import { LiveVideoSection } from '../components/archive/LiveVideoSection';
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
  const [stats, setStats] = useState<{
    documents: number;
    collections: number;
    timeline: number;
    entities: number;
    relations: number;
  }>({
    documents: 33,
    collections: 8,
    timeline: 31,
    entities: 35,
    relations: 25
  });
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    apiService.getCollections()
      .then(setCollections)
      .catch(err => {
        console.warn('Collections fetch failed:', err);
        setIsOffline(true);
      });

    apiService.getDocuments({ page_size: 4 })
      .then(res => setFeaturedDocs(res.items))
      .catch(err => {
        console.warn('Featured docs fetch failed:', err);
        setIsOffline(true);
      });

    apiService.getTimelineEvents()
      .then(events => setTimelineEvents(events.slice(0, 4)))
      .catch(err => {
        console.warn('Timeline events fetch failed:', err);
      });

    apiService.getSystemStatus()
      .then(res => {
        if (res?.counts) {
          setStats({
            documents: res.counts.documents ?? 33,
            collections: res.counts.collections ?? 8,
            timeline: res.counts.timeline ?? 31,
            entities: res.counts.entities ?? 35,
            relations: res.counts.relations ?? 25
          });
        }
      })
      .catch(err => console.warn('Could not fetch dynamic stats:', err));
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
    <div className="min-h-screen bg-[#C8A87A] parchment-archive-bg text-ink">

      {/* 1. Master Historical Broadsheet: integrated masthead, hero, stats */}
      <HeroSection stats={stats} />

      {/* Main Archival Canvas Container */}
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 sm:space-y-10">
        
        {/* Offline notice (below broadsheet, doesn't disrupt the front-page composition) */}
        {isOffline && (
          <aside className="font-mono text-[10px] text-ink/70 bg-[#DDD0B4]/50 border border-ink/20 px-3 py-2 flex items-center gap-2">
            <span className="text-[#79402C] font-bold">[ARCHIVE TELEPRINTER: BACKEND OFFLINE]</span>
            Live FastAPI service is currently unreachable. Static repository cache remains accessible.
          </aside>
        )}

        {/* 2. Live Historical Video Station & Phonographic Broadcast Monitor */}
        <LiveVideoSection />


        {/* 4. Interactive Archival Infographic Knowledge Matrix */}
        <InfographicSection />

        {/* 5. Main Broadsheet Lead Story & Inquiry Desk */}
        <div className="deckled-paper-panel p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left/Center Main Column: Lead Story */}
            <div className="lg:col-span-8 space-y-5 lg:border-r border-ink/20 lg:pr-8">
              {/* Eyebrow */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/20 pb-2 font-mono text-[11px]">
                <span className="text-oxblood font-bold uppercase tracking-wider">
                  ★ HISTORIC CONSTITUTIONAL DISPATCH • CONSTITUENT ASSEMBLY OF INDIA
                </span>
                <span className="text-ink-600 font-bold">
                  ACCESSION: AMB-CAD-1949-042 [VERIFIED]
                </span>
              </div>

              {/* Lead Headline */}
              <div className="space-y-2">
                <h2 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-ink leading-tight tracking-tight uppercase">
                  "On 26th January 1950, We Are Going to Enter into a Life of Contradictions"
                </h2>
                <p className="font-serif italic text-base sm:text-lg text-sepia leading-snug">
                  Dr. B. R. Ambedkar's landmark address to the Constituent Assembly warns that political democracy without socio-economic equality is a palace built upon shifting sand.
                </p>
              </div>

              {/* Verbatim Excerpt */}
              <div className="bg-[#FAF4E6] border border-ink/30 p-5 space-y-3 shadow-2xs">
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

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/debates"
                  className="oxblood-nav-pill px-5 py-2.5 text-xs sm:text-sm font-serif font-bold flex items-center gap-2 hover:bg-[#8B2525] transition"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Full Verbatim Record →</span>
                </Link>
                <Link
                  to="/research?query=Explain%20Dr.%20Ambedkar's%20life%20of%20contradictions%20warning%20in%20Constituent%20Assembly"
                  className="parchment-btn px-5 py-2.5 text-xs sm:text-sm font-serif font-bold flex items-center gap-2 border border-ink/30"
                >
                  <Bot className="w-4 h-4 text-oxblood" />
                  <span>Interrogate with AI Assistant →</span>
                </Link>
              </div>
            </div>

            {/* Right Column: Inquiry Slip & Secondary Dispatches */}
            <div className="lg:col-span-4 space-y-5">
              {/* Inquiry Slip */}
              <div className="bg-[#FAF4E6] border border-ink/30 p-5 space-y-3">
                <div className="border-b-2 border-ink pb-1 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-oxblood" />
                    <span>Inquiry Slip</span>
                  </h3>
                  <span className="accession-tag text-[10px]">LEDGER</span>
                </div>
                <p className="text-xs font-editorial text-ink-700 leading-snug">
                  Search verified speeches, manuscripts, parliamentary debates, and legal opinions.
                </p>
                <form onSubmit={handleHeroSearch} className="space-y-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter keywords, volume, topic..."
                    className="w-full px-3 py-2 bg-white border border-ink/30 text-ink font-serif text-xs focus:outline-none focus:border-ink"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-[#2A241F] hover:bg-oxblood text-white font-serif text-xs font-bold tracking-wider transition flex items-center justify-center gap-1.5"
                  >
                    <span>Execute Search →</span>
                  </button>
                </form>
                <div className="pt-1 flex flex-wrap gap-1 text-[10px] font-mono text-ink-600">
                  <span className="text-ink-400">Tags:</span>
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

              {/* Lahore Dispatch */}
              <div className="border-t border-ink/20 pt-3 space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-oxblood font-bold">
                  <span>ACCESSION: AMB-SOC-1936-001</span>
                  <span>LAHORE DISPATCH</span>
                </div>
                <h4 className="font-serif font-bold text-base text-ink hover:text-oxblood transition leading-snug">
                  <Link to="/documents">Annihilation of Caste: The Undelivered Address</Link>
                </h4>
                <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                  Groundbreaking treatise prepared for the Jat-Pat Todak Mandal conference of 1936.
                </p>
                <div className="pt-0.5 font-mono text-[10px] text-ink-500">
                  [ 1936 • PHILOSOPHICAL ESSAY • 52 PAGES ]
                </div>
              </div>

              {/* London Dispatch */}
              <div className="border-t border-ink/20 pt-3 space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-oxblood font-bold">
                  <span>ACCESSION: AMB-ECO-1923-004</span>
                  <span>LONDON DISPATCH</span>
                </div>
                <h4 className="font-serif font-bold text-base text-ink hover:text-oxblood transition leading-snug">
                  <Link to="/documents">The Problem of the Rupee: Origin & Solution</Link>
                </h4>
                <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                  Doctoral thesis submitted to University of London on central banking and currency.
                </p>
                <div className="pt-0.5 font-mono text-[10px] text-ink-500">
                  [ 1923 • MONETARY ECONOMICS • 320 PAGES ]
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* 6. Classified Archival Holdings (Featured Collections) */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-2 border-b-2 border-double border-ink">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold mb-0.5">
                REGISTRY CATALOGUE
              </p>
              <h2 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
                Classified Archival Holdings
              </h2>
            </div>
            <Link
              to="/explore"
              className="text-oxblood font-serif font-bold text-sm hover:underline mt-1 sm:mt-0 flex items-center gap-1"
            >
              <span>Explore All Collections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {collections.slice(0, 4).map((coll, index) => (
              <div 
                key={coll.id}
                onClick={() => navigate(`/explore?collection_id=${coll.id}`)}
                className="deckled-paper-panel p-5 hover:border-ink transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] text-oxblood border-b border-ink/10 pb-1">
                    <span className="font-bold">[HOLDING 0{index + 1}]</span>
                    <span>{coll.period || 'ARCHIVE'}</span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-ink group-hover:text-oxblood transition leading-snug">
                    {coll.title}
                  </h3>
                  <p className="font-editorial text-xs text-ink-700 line-clamp-3 leading-relaxed">
                    {coll.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-ink/10 flex items-center justify-between font-mono text-[11px] text-ink-600">
                  <span>{coll.document_count ?? 0} Items</span>
                  <span className="font-bold text-oxblood group-hover:translate-x-1 transition-transform">
                    Inspect →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Recent Archival Accessions */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-2 border-b-2 border-double border-ink">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold mb-0.5">
                DOCUMENTARY EVIDENCE
              </p>
              <h2 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
                Recent Archival Accessions
              </h2>
            </div>
            <Link
              to="/documents"
              className="text-oxblood font-serif font-bold text-sm hover:underline mt-1 sm:mt-0 flex items-center gap-1"
            >
              <span>Browse All Documents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
            {featuredDocs.slice(0, 4).map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onSelect={(d) => setSelectedDoc(d)}
              />
            ))}
          </div>
        </section>

        {/* 8. AI Research Assistant Section */}
        <section className="deckled-paper-panel p-6 sm:p-8 space-y-5">
          <div className="space-y-1.5 border-b-2 border-double border-ink pb-3">
            <span className="font-mono text-xs uppercase tracking-widest text-oxblood font-bold">
              ★ RETRIEVAL-AUGMENTED INTELLIGENCE DESK ★
            </span>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-ink uppercase tracking-tight">
              Scholarly AI Research Assistant
            </h2>
            <p className="font-editorial text-sm text-ink-700 italic">
              Directly interrogating primary sources with verified paragraph citations and source grounding.
            </p>
          </div>

          <div className="bg-[#FAF4E6] border border-ink/30 p-5 font-mono text-xs space-y-3">
            <div className="flex items-center justify-between text-[11px] text-ink-600 border-b border-ink/20 pb-2">
              <span className="flex items-center gap-1.5 font-bold text-oxblood">
                <Bot className="w-4 h-4 text-oxblood" />
                <span>INQUIRY TELEPRINTER • HUGGING FACE INFERENCE ENGINE</span>
              </span>
              <span className="accession-tag text-[10px]">
                SOURCE-GROUNDED RAG
              </span>
            </div>

            <div className="bg-[#FAF4E6] p-4 border border-ink/15 font-editorial text-sm text-ink leading-relaxed">
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
                className="oxblood-nav-pill px-5 py-2 text-xs font-serif font-bold transition flex items-center gap-1.5 hover:bg-[#8B2525]"
              >
                <span>Open Research Workbench →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 9. Institutional Charter Tri-Fold */}
        <section className="deckled-paper-panel p-6 sm:p-8 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-ink/20">
            <div className="space-y-2 pt-4 md:pt-0 pr-0 md:pr-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <Globe2 className="w-4 h-4" />
                <span>Multilingual Records</span>
              </div>
              <h3 className="font-serif font-bold text-base text-ink">
                Universal Accessibility
              </h3>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Curated in Marathi (मराठी), Hindi (हिंदी), English, and classical texts for nationwide democratic access.
              </p>
            </div>

            <div className="space-y-2 pt-4 md:pt-0 px-0 md:px-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <Scale className="w-4 h-4" />
                <span>Cryptographic Provenance</span>
              </div>
              <h3 className="font-serif font-bold text-base text-ink">
                Institutional Integrity
              </h3>
              <p className="font-editorial text-xs text-ink-700 leading-relaxed">
                Immutable SHA-256 digital checksums and Dublin Core OAIS standards preserve absolute archival truth.
              </p>
            </div>

            <div className="space-y-2 pt-4 md:pt-0 pl-0 md:pl-4">
              <div className="flex items-center gap-2 text-oxblood font-bold text-xs uppercase">
                <ShieldCheck className="w-4 h-4" />
                <span>Museum & Kiosk Station</span>
              </div>
              <h3 className="font-serif font-bold text-base text-ink">
                Public Kiosk Mode
              </h3>
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
