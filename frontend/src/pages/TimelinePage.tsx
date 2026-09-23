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
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner />

      {/* Header Banner */}
      <section className="bg-[#1B2A4A] text-white py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-xs font-mono text-heritage-300 uppercase tracking-wider">
              <Clock className="w-4 h-4 text-heritage-400" />
              <span>EVIDENCE-DRIVEN HISTORICAL CHRONOLOGY (1891–1956)</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
              Intelligent Archival Timeline
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl font-light">
              Explore biographical, constitutional, academic, and socio-political milestones with strict date precision and verified custodial provenance.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-white/10 p-1 rounded-lg border border-white/15 self-start md:self-auto">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
                viewMode === 'timeline' ? 'bg-heritage-500 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Interactive Timeline
            </button>
            <button
              onClick={() => setViewMode('accessible_table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition ${
                viewMode === 'accessible_table' ? 'bg-heritage-500 text-slate-950 shadow' : 'text-slate-200 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Accessible Table
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 pt-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-heritage-500 text-slate-950 shadow'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Entity Filter Banner */}
      {filteredEntityName && (
        <div className="bg-heritage-50 border-b border-heritage-200 px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-heritage-900">
            <span>
              Filtered for milestones involving: <strong className="font-serif">{filteredEntityName}</strong>
            </span>
            <button
              onClick={clearEntityFilter}
              className="text-heritage-700 hover:text-heritage-950 flex items-center gap-1 font-bold underline"
            >
              <X className="w-3.5 h-3.5" /> Clear Filter
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex justify-between items-center text-xs text-stone-500 pb-4 mb-8 border-b border-stone-200">
          <span>Displaying {filteredEvents.length} Verified Historical Milestones</span>
          <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" /> Provenance Verified
          </span>
        </div>

        {viewMode === 'timeline' ? (
          /* Interactive Timeline Visualization */
          <div className="relative border-l-2 md:border-l-0 md:before:absolute md:before:top-0 md:before:bottom-0 md:before:left-1/2 md:before:w-0.5 md:before:bg-heritage-400/60 ml-4 md:ml-0 space-y-12">
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
                    className={`absolute -left-[25px] md:left-1/2 md:-translate-x-1/2 top-4 w-10 h-10 rounded-full border-4 cursor-pointer transition-all flex items-center justify-center font-mono font-bold text-xs shadow-md z-10 ${
                      isSelected
                        ? 'bg-heritage-500 border-national-900 text-slate-950 scale-110'
                        : 'bg-white border-heritage-500 text-heritage-800 hover:bg-heritage-100'
                    }`}
                  >
                    {String(event.year).slice(-2)}
                  </div>

                  {/* Event Card Content */}
                  <div className="ml-6 md:ml-0 md:w-1/2 md:px-8">
                    <div 
                      onClick={() => setActiveEvent(event)}
                      className={`bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 ${
                        isSelected
                          ? 'border-heritage-500 ring-2 ring-heritage-400/30'
                          : 'border-stone-200 hover:border-heritage-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-serif font-bold text-2xl text-heritage-700">
                          {event.year}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono uppercase bg-stone-100 text-stone-600 px-2 py-0.5 rounded border border-stone-200">
                            {event.date_precision || 'YEAR'}
                          </span>
                          <span className="text-[11px] font-mono text-stone-700 bg-heritage-50 px-2 py-0.5 rounded border border-heritage-200 font-bold">
                            {formatEventDate(event)}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif font-bold text-lg sm:text-xl text-stone-900 leading-snug">
                        {event.title}
                      </h3>

                      <p className="text-xs text-stone-600 leading-relaxed font-serif">
                        {event.description}
                      </p>

                      {/* Metadata Chips */}
                      <div className="pt-3 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                        {event.related_locations && (
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <MapPin className="w-3.5 h-3.5 text-heritage-600 shrink-0" />
                            <span>{event.related_locations}</span>
                          </div>
                        )}
                        {event.related_people && (
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <Users className="w-3.5 h-3.5 text-heritage-600 shrink-0" />
                            <span>{event.related_people}</span>
                          </div>
                        )}
                      </div>

                      {/* Connect to Knowledge Graph Button */}
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                          {event.category || 'Historical Milestone'}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/knowledge-graph');
                          }}
                          className="text-heritage-600 hover:text-heritage-800 text-xs font-bold flex items-center gap-1"
                        >
                          <Network className="w-3.5 h-3.5" /> Explore in Graph
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
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#102038] text-white uppercase text-[10px] font-mono tracking-wider">
                <tr>
                  <th className="p-3.5">Year / Precision</th>
                  <th className="p-3.5">Milestone Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-stone-50 transition">
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-stone-900 block">{formatEventDate(event)}</span>
                      <span className="text-[10px] text-stone-400 uppercase">{event.date_precision || 'YEAR'}</span>
                    </td>
                    <td className="p-3.5">
                      <p className="font-serif font-bold text-stone-900 text-sm">{event.title}</p>
                      <p className="text-stone-600 text-xs mt-0.5 line-clamp-2">{event.description}</p>
                    </td>
                    <td className="p-3.5 text-stone-600 font-mono text-[11px]">{event.category}</td>
                    <td className="p-3.5 text-stone-600">{event.related_locations || '—'}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => navigate('/knowledge-graph')}
                        className="text-heritage-600 hover:text-heritage-800 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <Network className="w-3 h-3" /> Graph
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
