import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Clock, Calendar, MapPin, Users, BookOpen, Filter, 
  ArrowRight, Network, List, ShieldCheck, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { apiService } from '../services/api';
import { TimelineEvent, GraphEntityItem } from '../types';
import { DemoBanner } from '../components/archive/DemoBanner';

export const TimelinePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeEvent, setActiveEvent] = useState<TimelineEvent | null>(null);
  const [viewMode, setViewMode] = useState<'timeline' | 'accessible_table'>('timeline');
  const [loading, setLoading] = useState(true);

  // Filter by entity if passed in query string: ?entity_id=...
  const entityIdParam = searchParams.get('entity_id');
  const entityId = entityIdParam ? parseInt(entityIdParam, 10) : undefined;
  const [filteredEntityName, setFilteredEntityName] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    if (entityId) {
      apiService.getEntity(entityId).then(ent => {
        if (mounted) setFilteredEntityName(ent.canonical_name);
      }).catch(() => {});
    } else {
      setFilteredEntityName(null);
    }

    apiService.getTimelineEvents({ entity_id: entityId }).then(res => {
      if (mounted) {
        setEvents(res);
        if (res.length > 0) setActiveEvent(res[0]);
        setLoading(false);
      }
    }).catch(err => {
      if (mounted) {
        console.warn('Timeline fetch fallback:', err);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [entityId]);

  const categories = [
    'ALL',
    'Constitutional',
    'Social Movements',
    'Academic Treatises',
    'Labour Reforms',
    'Religious & Philosophical'
  ];

  const filteredEvents = selectedCategory === 'ALL'
    ? events
    : events.filter(e => e.category?.toLowerCase().includes(selectedCategory.toLowerCase()));

  // Formatter for date based on strict historical precision
  const formatEventDate = (event: TimelineEvent) => {
    if (event.date_precision === 'EXACT_DAY' && event.exact_date) {
      return event.exact_date;
    }
    if (event.date_precision === 'MONTH' && event.exact_date) {
      return event.exact_date;
    }
    if (event.date_precision === 'DECADE') {
      return `${event.year}s`;
    }
    if (event.date_precision === 'APPROXIMATE') {
      return `c. ${event.year}`;
    }
    return String(event.year);
  };

  const clearEntityFilter = () => {
    searchParams.delete('entity_id');
    setSearchParams(searchParams);
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink">
      <DemoBanner />

      {/* Broadsheet Gazette Masthead */}
      <section className="bg-[#FAF6EE] border-b-2 border-double border-ink py-8 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-oxblood uppercase tracking-widest font-bold">
              <Clock className="w-3.5 h-3.5 text-oxblood" />
              <span>RECORD DIVISION • HISTORICAL CHRONOLOGY (1891–1956)</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink">
              Chronological Gazette of the Ambedkar Era
            </h1>
            <p className="text-stone-700 text-xs sm:text-sm max-w-2xl font-editorial italic">
              Verified record of constitutional deliberations, socio-political movements, scholarly treatises, and historical milestones.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#EFE8DA] p-1 border-2 border-ink self-start md:self-auto shadow-letterpress-sm">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase transition ${
                viewMode === 'timeline' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> [ Timeline ]
            </button>
            <button
              onClick={() => setViewMode('accessible_table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase transition ${
                viewMode === 'accessible_table' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> [ Ledger Table ]
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 pt-6 border-t border-ink/20 mt-6">
          <span className="text-[11px] font-mono uppercase font-bold text-stone-600 self-center mr-2">Dispatches:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs font-mono font-bold uppercase transition border ${
                selectedCategory === cat
                  ? 'bg-ink text-white border-ink shadow-letterpress-sm'
                  : 'bg-[#FAF6EE] text-ink border-ink/40 hover:border-ink hover:bg-[#EFE8DA]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Entity Filter Banner */}
      {filteredEntityName && (
        <div className="bg-[#EFE8DA] border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-ink font-mono">
            <span>
              [FILTERED INQUIRY]: Verified milestones involving <strong className="font-serif font-black underline">{filteredEntityName}</strong>
            </span>
            <button
              onClick={clearEntityFilter}
              className="text-oxblood hover:text-ink flex items-center gap-1 font-bold uppercase"
            >
              <X className="w-3.5 h-3.5" /> [ Dismiss Filter ]
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center text-xs font-mono text-stone-600 pb-3 mb-8 border-b-2 border-ink">
          <span>ENTRIES ON RECORD: {filteredEvents.length} VERIFIED HISTORICAL DISPATCHES</span>
          <span className="font-mono text-oxblood bg-red-50 px-2 py-0.5 border border-oxblood flex items-center gap-1 font-bold text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" /> SEAL: ARCHIVALLY ATTESTED
          </span>
        </div>

        {viewMode === 'timeline' ? (
          /* Interactive Timeline Visualization */
          <div className="relative border-l-2 border-ink md:border-l-0 md:before:absolute md:before:top-0 md:before:bottom-0 md:before:left-1/2 md:before:w-0.5 md:before:bg-ink ml-4 md:ml-0 space-y-12">
            {filteredEvents.map((event, idx) => {
              const isEven = idx % 2 === 0;
              const isSelected = activeEvent?.id === event.id;

              return (
                <div 
                  key={event.id}
                  className={`relative flex flex-col md:flex-row items-start ${
                    isEven ? 'md:flex-row-reverse' : ''
                  } group`}
                >
                  {/* Center Circle Indicator */}
                  <div 
                    onClick={() => setActiveEvent(event)}
                    className={`absolute -left-[21px] md:left-1/2 md:-translate-x-1/2 top-4 w-10 h-10 border-2 cursor-pointer transition-all flex items-center justify-center font-mono font-bold text-xs shadow-letterpress-sm z-10 ${
                      isSelected
                        ? 'bg-oxblood border-ink text-white scale-110'
                        : 'bg-[#FAF6EE] border-ink text-ink hover:bg-stone-200'
                    }`}
                  >
                    {String(event.year).slice(-2)}
                  </div>

                  {/* Event Card Content */}
                  <div className="ml-6 md:ml-0 md:w-1/2 md:px-8">
                    <div 
                      onClick={() => setActiveEvent(event)}
                      className={`bg-[#FAF6EE] border-2 border-ink p-6 transition-all cursor-pointer space-y-3 shadow-letterpress-sm hover:shadow-letterpress ${
                        isSelected
                          ? 'border-oxblood ring-2 ring-oxblood/20 bg-[#FFFDF9]'
                          : 'hover:border-ink'
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-ink/15 pb-2">
                        <span className="font-serif font-black text-2xl text-oxblood">
                          {event.year}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase bg-[#EFE8DA] text-stone-700 px-2 py-0.5 border border-ink/30 font-bold">
                            {event.date_precision || 'YEAR'}
                          </span>
                          <span className="text-[11px] font-mono text-ink bg-white px-2 py-0.5 border border-ink font-bold">
                            {formatEventDate(event)}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif font-bold text-lg sm:text-xl text-ink leading-snug">
                        {event.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-editorial">
                        {event.description}
                      </p>

                      {/* Metadata Chips */}
                      <div className="pt-3 border-t border-ink/15 space-y-1.5 text-xs text-stone-700 font-mono">
                        {event.related_locations && (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <MapPin className="w-3.5 h-3.5 text-oxblood shrink-0" />
                            <span>LOCALE: {event.related_locations}</span>
                          </div>
                        )}
                        {event.related_people && (
                          <div className="flex items-center gap-1.5 text-stone-700">
                            <Users className="w-3.5 h-3.5 text-oxblood shrink-0" />
                            <span>PERSONS: {event.related_people}</span>
                          </div>
                        )}
                      </div>

                      {/* Connect to Knowledge Graph Button */}
                      <div className="pt-2 border-t border-ink/15 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
                          CATEGORY: {event.category || 'Historical Milestone'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/knowledge-graph');
                          }}
                          className="text-oxblood hover:text-ink text-xs font-mono font-bold flex items-center gap-1 uppercase"
                        >
                          <Network className="w-3.5 h-3.5" /> [ Inspect In Graph ]
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Accessible Table Alternative View (WCAG 2.1 AA) */
          <div className="bg-[#FAF6EE] border-2 border-ink overflow-hidden shadow-letterpress">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-ink text-white uppercase text-[10px] tracking-wider border-b-2 border-ink">
                <tr>
                  <th className="p-3.5">Year / Precision</th>
                  <th className="p-3.5">Milestone Gazette Headline</th>
                  <th className="p-3.5">Classification</th>
                  <th className="p-3.5">Locale</th>
                  <th className="p-3.5">Provenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/20">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-[#EFE8DA] transition">
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-ink block text-sm">{formatEventDate(event)}</span>
                      <span className="text-[10px] text-stone-500 uppercase">{event.date_precision || 'YEAR'}</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-serif font-bold text-ink text-sm">{event.title}</p>
                      <p className="text-stone-700 text-xs mt-0.5 font-editorial line-clamp-2">{event.description}</p>
                    </td>
                    <td className="p-3.5 text-stone-700 font-mono text-[11px] uppercase">{event.category}</td>
                    <td className="p-3.5 text-stone-700">{event.related_locations || '—'}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => navigate('/knowledge-graph')}
                        className="text-oxblood hover:text-ink font-bold flex items-center gap-1 text-[11px] uppercase"
                      >
                        <Network className="w-3 h-3" /> [ Graph ]
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};
