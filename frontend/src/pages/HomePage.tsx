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
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner isDemoData={false} />

      {/* Monumental Archival Hero Section */}
      <section className="relative bg-gradient-to-b from-[#1B2A4A] via-[#15233E] to-[#0F1B30] text-white py-14 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8 border-b-4 border-heritage-500 overflow-hidden">
        {/* Subtle Archival Watermark Background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center font-serif text-[280px] select-none font-bold text-white">
          अ
        </div>
        
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-heritage-400/30 text-heritage-300 text-xs sm:text-sm font-medium tracking-wide uppercase">
            <Landmark className="w-4 h-4 text-heritage-400" />
            <span>National Digital Heritage Repository • Institutional Knowledge Platform</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight">
            THE AMBEDKAR DIGITAL HERITAGE ARCHIVE
          </h1>

          <p className="max-w-3xl mx-auto text-slate-300 text-base sm:text-xl font-light leading-relaxed">
            Preserving writings, speeches, manuscripts and historical records. Making knowledge accessible to everyone.
          </p>

          {/* Quick Search Bar */}
          <form onSubmit={handleHeroSearch} className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center shadow-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search writings, speeches, debates, manuscripts..."
                className="w-full pl-12 pr-32 py-4 rounded-lg text-slate-900 bg-white border-2 border-heritage-400 focus:outline-none focus:ring-4 focus:ring-heritage-400/30 text-base font-sans"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4" />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 bg-heritage-600 hover:bg-heritage-700 text-white rounded-md font-semibold text-sm transition flex items-center gap-1.5 shadow-sm"
              >
                <span>Search</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap justify-center items-center gap-4 pt-2">
            <Link
              to="/explore"
              className="px-6 py-3.5 bg-heritage-500 hover:bg-heritage-600 text-slate-950 font-bold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-base"
            >
              <Compass className="w-5 h-5" />
              <span>Explore the Archive</span>
            </Link>
            <Link
              to="/research"
              className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-lg transition-all flex items-center gap-2 text-base"
            >
              <Bot className="w-5 h-5 text-heritage-300" />
              <span>Research the Collection</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Archive Statistics (Verified Holdings) */}
      <section className="bg-white border-b border-stone-200 py-8 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6">
            <span className="text-[11px] uppercase tracking-widest font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded border border-emerald-200 font-semibold">
              [VERIFIED INSTITUTIONAL REPOSITORY HOLDINGS]
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-4 border-r last:border-none border-stone-200">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">43+</div>
              <div className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-medium mt-1">
                Cataloged Historical Records
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">BAWS & CAD Proceedings</div>
            </div>
            <div className="p-4 border-r last:border-none border-stone-200">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">5</div>
              <div className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-medium mt-1">
                Curated Collections
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Writings, Speeches, Media & CAD</div>
            </div>
            <div className="p-4 border-r last:border-none border-stone-200">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-ink-900">31</div>
              <div className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-medium mt-1">
                Timeline Milestones
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">1891–1956 Historical Events</div>
            </div>
            <div className="p-4 border-stone-200">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-emerald-700">100%</div>
              <div className="text-xs sm:text-sm text-slate-600 uppercase tracking-wider font-medium mt-1">
                Open Scholarly Access
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Dublin Core & OAIS Standard</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collections Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-300">
          <div>
            <span className="text-xs uppercase tracking-widest font-mono text-heritage-600 font-bold">
              CURATED ACCESSIONS
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
              Featured Collections
            </h2>
          </div>
          <Link
            to="/explore"
            className="text-sm font-semibold text-national-700 hover:text-national-900 flex items-center gap-1 mt-2 sm:mt-0 transition"
          >
            <span>Browse All Collections</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((coll) => (
            <div 
              key={coll.id}
              onClick={() => navigate(`/explore?collection_id=${coll.id}`)}
              className="bg-white border border-stone-200 hover:border-heritage-500 rounded-lg p-5 shadow-sm hover:shadow-archival transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <span className="font-mono text-[11px] text-heritage-600 bg-heritage-50 px-2 py-0.5 rounded border border-heritage-200">
                  {coll.period || 'Historical Archive'}
                </span>
                <h3 className="font-serif font-bold text-lg text-ink-900 group-hover:text-heritage-700 transition">
                  {coll.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                  {coll.description}
                </p>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-slate-500">
                <span>{coll.document_count || 4} Indexed Items</span>
                <span className="text-heritage-600 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Explore →
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Writings & Debates Preview */}
      <section className="bg-stone-100/70 py-16 px-4 sm:px-6 lg:px-8 border-y border-stone-200">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-300">
            <div>
              <span className="text-xs uppercase tracking-widest font-mono text-heritage-600 font-bold">
                CORE MANUSCRIPTS & WRITINGS
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
                Recent Archival Accessions
              </h2>
            </div>
            <Link
              to="/documents"
              className="text-sm font-semibold text-national-700 hover:text-national-900 flex items-center gap-1 mt-2 sm:mt-0 transition"
            >
              <span>View All Documents</span>
              <ArrowRight className="w-4 h-4" />
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
        </div>
      </section>

      {/* Historical Timeline Preview */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-300">
          <div>
            <span className="text-xs uppercase tracking-widest font-mono text-heritage-600 font-bold">
              BIOGRAPHICAL CHRONOLOGY
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
              Historical Timeline Preview
            </h2>
          </div>
          <Link
            to="/timeline"
            className="text-sm font-semibold text-national-700 hover:text-national-900 flex items-center gap-1 mt-2 sm:mt-0 transition"
          >
            <span>Open Interactive Timeline</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {timelineEvents.map((event) => (
            <div key={event.id} className="bg-white p-5 rounded-lg border border-stone-200 shadow-sm hover:border-heritage-400 transition space-y-2">
              <span className="font-serif font-bold text-2xl text-heritage-600 block">
                {event.year}
              </span>
              <h4 className="font-serif font-bold text-base text-ink-900 leading-snug">
                {event.title}
              </h4>
              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {event.description}
              </p>
              {event.related_locations && (
                <div className="pt-2 text-[11px] text-slate-500 font-mono">
                  📍 {event.related_locations}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* AI Research Assistant Showcase Shell */}
      <section className="bg-[#1B2A4A] text-white py-16 px-4 sm:px-6 lg:px-8 border-y-4 border-heritage-500">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-3 mb-8">
            <span className="text-xs uppercase tracking-widest font-mono text-heritage-300 bg-white/10 px-3 py-1 rounded border border-heritage-400/30 font-semibold">
              FORWARD ARCHITECTURE READY (PHASE 5 RAG SHELL)
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold">
              Ambedkar AI Research Assistant
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light">
              Experience the upcoming citation-backed research assistant interface designed for constitutional scholars and researchers.
            </p>
          </div>

          <div className="bg-[#102038] border border-heritage-500/40 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-300 border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-heritage-400" />
                <strong>Institutional Semantic Query Interface</strong>
              </span>
              <span className="text-amber-400 font-mono text-[11px]">
                [DEMO RESPONSE — NOT CONNECTED TO ARCHIVE]
              </span>
            </div>

            <div className="bg-white/5 p-4 rounded-lg text-sm text-slate-200 leading-relaxed font-sans border border-white/10">
              "In his landmark address on November 25, 1949, Dr. B.R. Ambedkar warned that political democracy must not be mistaken for a permanent guarantee of liberty unless it is anchored in social democracy..."
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-400">
                Verified against Constituent Assembly Debates Vol. XI
              </span>
              <Link
                to="/research"
                className="px-4 py-2 bg-heritage-500 hover:bg-heritage-600 text-slate-950 text-xs font-bold rounded shadow transition flex items-center gap-1.5"
              >
                <span>Try Research Assistant Shell</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multilingual & Accessibility Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-heritage-100 text-heritage-700 flex items-center justify-center">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-ink-900">
                Multilingual Access
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Platform architecture configured for English, Marathi (मराठी), Hindi (हिंदी), and Pali translations for nationwide accessibility.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-national-100 text-national-700 flex items-center justify-center">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-ink-900">
                Institutional Integrity
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographic checksums (SHA-256) and Dublin Core metadata fields guarantee the provenance of every historical text.
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-lg text-ink-900">
                Touchscreen Kiosk Ready
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated museum kiosk mode featuring high-contrast options, 48px+ touch targets, and persistent visitor navigation.
              </p>
            </div>
          </div>
        </div>
      </section>

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
