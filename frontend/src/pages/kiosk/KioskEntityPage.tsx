import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Network, Calendar, MapPin, Tag, Volume2, 
  VolumeX, ShieldCheck, CheckCircle2, ChevronRight, FileText
} from 'lucide-react';
import { apiService } from '../../services/api';
import { GraphEntityItem, GraphRelationshipItem, TimelineEvent } from '../../types';

export const KioskEntityPage: React.FC = () => {
  const { entityId } = useParams<{ entityId: string }>();
  const navigate = useNavigate();

  const [entity, setEntity] = useState<GraphEntityItem | null>(null);
  const [relationships, setRelationships] = useState<GraphRelationshipItem[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!entityId) return;
    let mounted = true;
    const idNum = parseInt(entityId, 10);

    Promise.all([
      apiService.getEntity(idNum),
      apiService.getEntityNeighbors(idNum),
      apiService.getEntityTimeline(idNum)
    ]).then(([ent, neighbors, tl]) => {
      if (mounted) {
        setEntity(ent);
        setRelationships(neighbors.edges || []);
        setTimelineEvents(tl);
        setLoading(false);
      }
    }).catch(err => {
      console.warn('Kiosk entity load failed:', err);
      if (mounted) setLoading(false);
    });

    return () => { 
      mounted = false; 
      window.speechSynthesis?.cancel();
    };
  }, [entityId]);

  const handleSpeak = () => {
    if (!entity) return;
    if (speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
      return;
    }
    if ('speechSynthesis' in window) {
      const text = `${entity.canonical_name}. ${entity.entity_type}. ${entity.description || ''}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-6">
        <div className="text-slate-600 font-serif font-bold text-lg animate-pulse">
          Retrieving Archival Entity Record...
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-slate-800">Entity Record Not Found</h2>
        <button
          onClick={() => navigate('/kiosk/graph')}
          className="mt-4 px-6 py-2.5 bg-[#102038] text-white rounded-xl font-bold text-xs"
        >
          Return to Knowledge Graph
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-6 select-none">
      {/* Kiosk Top Bar */}
      <div className="bg-[#102038] text-white rounded-2xl p-4 shadow-lg flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/kiosk/graph')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Knowledge Graph
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSpeak}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              speaking ? 'bg-amber-500 text-slate-950' : 'bg-heritage-500 text-slate-950 hover:bg-heritage-400'
            }`}
          >
            {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>{speaking ? 'Stop Voice' : 'Voice Overview'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left Dossier Card */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-md border border-stone-200 p-6 flex flex-col justify-between">
          <div>
            <span className="px-3 py-1 bg-stone-100 text-slate-700 text-xs font-bold uppercase rounded-md tracking-wider">
              {entity.entity_type}
            </span>

            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mt-3">
              {entity.canonical_name}
            </h1>

            {(entity.birth_date || entity.death_date) && (
              <div className="flex items-center gap-2 text-sm text-slate-600 font-mono mt-2">
                <Calendar className="w-4 h-4 text-heritage-600" />
                <span>{entity.birth_date || 'Unknown'} — {entity.death_date || 'Present'}</span>
              </div>
            )}

            {entity.location && (
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                <MapPin className="w-4 h-4 text-heritage-600" />
                <span>{entity.location}</span>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-stone-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-2">
                Archival Biography
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {entity.description || 'No extended historical biography catalogued.'}
              </p>
            </div>

            {entity.aliases && entity.aliases.length > 0 && (
              <div className="mt-6 pt-4 border-t border-stone-200">
                <div className="text-xs font-bold uppercase text-slate-400 font-mono mb-1.5">
                  Archival Aliases & Variants:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {entity.aliases.map((al, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-stone-100 rounded-md text-xs text-slate-700 font-medium">
                      {al}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-stone-200">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-4 h-4" />
              Verified Institutional Record
            </span>
          </div>
        </div>

        {/* Right Connections & Timeline */}
        <div className="lg:col-span-7 space-y-4">
          {/* Relationships */}
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-heritage-600" />
              Connected Archival Network ({relationships.length})
            </h2>

            {relationships.length === 0 ? (
              <p className="text-xs text-slate-500">No relationships catalogued.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {relationships.map(rel => {
                  const isSource = rel.source_entity_id === entity.id;
                  const targetName = isSource ? rel.target_name : rel.source_name;
                  const targetId = isSource ? rel.target_entity_id : rel.source_entity_id;

                  return (
                    <button
                      key={rel.id}
                      onClick={() => navigate(`/kiosk/entity/${targetId}`)}
                      className="text-left p-3.5 bg-stone-50 hover:bg-heritage-50 rounded-xl border border-stone-200 hover:border-heritage-400 transition"
                    >
                      <div className="text-[10px] font-mono font-bold uppercase text-heritage-700">
                        {(rel.relation_type || rel.relationship_type).replace(/_/g, ' ')}
                      </div>
                      <div className="font-serif font-bold text-slate-900 text-sm mt-0.5">
                        {targetName}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Timeline Events */}
          <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-6">
            <h2 className="text-lg font-serif font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-heritage-600" />
              Archival Timeline Milestones ({timelineEvents.length})
            </h2>

            {timelineEvents.length === 0 ? (
              <p className="text-xs text-slate-500">No milestones directly linked to this record.</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {timelineEvents.map(evt => (
                  <div key={evt.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-heritage-700">
                        {evt.exact_date || evt.year_start}
                      </span>
                      <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded font-medium text-slate-700">
                        {evt.category}
                      </span>
                    </div>
                    <div className="font-serif font-bold text-slate-900 text-sm mt-1">
                      {evt.title}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {evt.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KioskEntityPage;
