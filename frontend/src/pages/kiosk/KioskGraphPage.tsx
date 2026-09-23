import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, Search, ZoomIn, ZoomOut, RotateCcw, 
  ArrowRight, Info, Layers, ChevronRight, X, ExternalLink, ShieldCheck
} from 'lucide-react';
import { apiService } from '../../services/api';
import { GraphEntityItem, GraphRelationshipItem } from '../../types';

export const KioskGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<GraphEntityItem[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<GraphEntityItem | null>(null);
  const [neighbors, setNeighbors] = useState<GraphRelationshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // Canvas zoom/pan state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    apiService.searchEntities({ limit: 60 }).then(data => {
      if (mounted) {
        setEntities(data);
        if (data.length > 0) {
          handleSelectEntity(data[0]);
        }
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleSelectEntity = async (entity: GraphEntityItem) => {
    setSelectedEntity(entity);
    try {
      const neighborData = await apiService.getEntityNeighbors(entity.id);
      setNeighbors(neighborData.edges || []);
    } catch {
      setNeighbors([]);
    }
  };

  const entityTypes = ['ALL', 'Person', 'Organization', 'Event', 'Concept', 'Location'];

  const filteredEntities = entities.filter(e => {
    const matchesSearch = e.canonical_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || e.entity_type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesType;
  });

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-6 select-none">
      {/* Kiosk Header */}
      <div className="bg-[#102038] text-white rounded-2xl p-5 shadow-lg flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-heritage-500 text-slate-950 flex items-center justify-center font-bold text-2xl">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold tracking-tight">
              Interactive Historical Knowledge Network
            </h1>
            <p className="text-xs text-heritage-300">
              Touch to explore historical figures, movements, treatises, and their primary archival connections
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/kiosk/timeline')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 flex items-center gap-2 transition"
          >
            Switch to Timeline &rarr;
          </button>
        </div>
      </div>

      {/* Main Touch Interaction Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Entity Directory (Touch Friendly Buttons) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-md border border-stone-200 p-4 flex flex-col h-[78vh]">
          {/* Search bar */}
          <div className="relative mb-3">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Search historical figures, organizations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-stone-100 rounded-xl text-sm font-medium border border-transparent focus:border-heritage-500 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none">
            {entityTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                  filterType === t
                    ? 'bg-[#102038] text-white'
                    : 'bg-stone-100 text-slate-600 hover:bg-stone-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Scrollable Entity List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {filteredEntities.map(entity => {
              const isSelected = selectedEntity?.id === entity.id;
              return (
                <button
                  key={entity.id}
                  onClick={() => handleSelectEntity(entity)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-heritage-50 border-heritage-500 shadow-sm'
                      : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <div>
                    <div className="font-serif font-bold text-slate-900 text-sm">{entity.canonical_name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                        {entity.entity_type}
                      </span>
                      {entity.birth_date && (
                        <span className="text-[10px] text-slate-500">
                          {entity.birth_date} — {entity.death_date || 'Present'}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-heritage-600' : 'text-slate-300'}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail & Network View */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-md border border-stone-200 p-6 flex flex-col h-[78vh] overflow-y-auto">
          {selectedEntity ? (
            <div className="space-y-6">
              {/* Entity Hero */}
              <div className="border-b border-stone-200 pb-5">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 bg-stone-100 text-slate-700 text-xs font-bold uppercase rounded-md tracking-wider">
                    {selectedEntity.entity_type}
                  </span>
                  <button
                    onClick={() => navigate(`/kiosk/entity/${selectedEntity.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-heritage-100 hover:bg-heritage-200 text-heritage-800 rounded-lg text-xs font-bold transition"
                  >
                    <span>Full Touch Dossier</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h2 className="text-3xl font-serif font-bold text-slate-900 mt-2">
                  {selectedEntity.canonical_name}
                </h2>

                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  {selectedEntity.description || 'No biographical overview recorded in the canonical archive.'}
                </p>
              </div>

              {/* Connected Relationships in the Graph */}
              <div>
                <h3 className="text-base font-serif font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-heritage-600" />
                  Connected Archival Relationships ({neighbors.length})
                </h3>

                {neighbors.length === 0 ? (
                  <div className="p-6 bg-stone-50 rounded-xl text-center text-xs text-slate-500">
                    No connected relationships retrieved for this entity.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {neighbors.map(rel => {
                      const isSource = rel.source_entity_id === selectedEntity.id;
                      const partnerName = isSource ? rel.target_name : rel.source_name;
                      const partnerId = isSource ? rel.target_entity_id : rel.source_entity_id;

                      return (
                        <div
                          key={rel.id}
                          className="p-4 bg-stone-50 rounded-xl border border-stone-200 hover:border-heritage-400 transition"
                        >
                          <div className="text-[10px] font-mono uppercase text-heritage-700 font-bold">
                            {(rel.relation_type || rel.relationship_type).replace(/_/g, ' ')}
                          </div>
                          <div className="font-serif font-bold text-slate-900 text-sm mt-1">
                            {partnerName}
                          </div>
                          {rel.evidence_text && (
                            <div className="mt-2 text-xs italic text-slate-600 line-clamp-2 bg-white p-2 rounded border border-stone-200">
                              "{rel.evidence_text}"
                            </div>
                          )}
                          <div className="mt-3 flex items-center justify-between text-[11px]">
                            <span className="text-slate-400 font-mono">
                              {rel.confidence ? `Conf: ${(rel.confidence * 100).toFixed(0)}%` : 'Verified'}
                            </span>
                            <button
                              onClick={() => {
                                const target = entities.find(e => e.id === partnerId);
                                if (target) handleSelectEntity(target);
                              }}
                              className="text-heritage-600 font-bold hover:underline flex items-center gap-1"
                            >
                              Explore &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Network className="w-16 h-16 mb-2 stroke-1" />
              <p className="text-sm">Select an entity from the list to view connections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskGraphPage;
