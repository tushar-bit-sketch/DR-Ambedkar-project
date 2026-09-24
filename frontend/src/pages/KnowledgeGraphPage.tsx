import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, Search, ZoomIn, ZoomOut, RotateCcw, Filter, 
  Layers, ShieldCheck, Clock, ExternalLink, Info, CheckCircle2,
  ChevronRight, List, Share2, Sparkles, BookOpen, AlertCircle
} from 'lucide-react';
import { apiService } from '../services/api';
import { GraphEntityItem, GraphRelationshipItem, GraphStatusData } from '../types';
import { ProvenanceChainViewer } from '../components/archive/ProvenanceChainViewer';
import { DemoBanner } from '../components/archive/DemoBanner';

// Entity type color tokens for museum-grade visual hierarchy
const ENTITY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  Person: { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8', dot: '#2563EB' },
  Document: { bg: '#FEF3C7', border: '#D97706', text: '#B45309', dot: '#D97706' },
  Speech: { bg: '#FEF9C3', border: '#EAB308', text: '#A16207', dot: '#CA8A04' },
  Event: { bg: '#ECFDF5', border: '#10B981', text: '#047857', dot: '#059669' },
  Institution: { bg: '#EEF2FF', border: '#6366F1', text: '#4338CA', dot: '#4F46E5' },
  Topic: { bg: '#FAF5FF', border: '#A855F7', text: '#7E22CE', dot: '#9333EA' },
  Concept: { bg: '#FDF4FF', border: '#D946EF', text: '#A21CAF', dot: '#C026D3' },
  Place: { bg: '#FFF7ED', border: '#F97316', text: '#C2410C', dot: '#EA580C' },
  Collection: { bg: '#F0FDFA', border: '#14B8A6', text: '#0F766E', dot: '#0D9488' }
};

interface GraphNode extends GraphEntityItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface GraphLink {
  id: number;
  source: GraphNode;
  target: GraphNode;
  relationship_type: string;
  confidence: number;
  verification_status: string;
  evidence_text?: string | null;
}

export const KnowledgeGraphPage: React.FC = () => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<GraphEntityItem[]>([]);
  const [relationships, setRelationships] = useState<GraphRelationshipItem[]>([]);
  const [graphStatus, setGraphStatus] = useState<GraphStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  // View state
  const [viewMode, setViewMode] = useState<'visual' | 'accessible_list'>('visual');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedRelType, setSelectedRelType] = useState<string>('ALL');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'VERIFIED'>('VERIFIED');

  // Inspector state
  const [selectedNode, setSelectedNode] = useState<GraphEntityItem | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphRelationshipItem | null>(null);
  const [inspectingProvenanceRelId, setInspectingProvenanceRelId] = useState<number | null>(null);

  // Canvas / Pan & Zoom state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initial Data Fetch
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      apiService.searchEntities({ limit: 100 }),
      apiService.listRelationships({ limit: 150 }),
      apiService.getGraphStatus()
    ]).then(([ents, rels, st]) => {
      if (mounted) {
        setEntities(ents);
        setRelationships(rels);
        setGraphStatus(st);
        if (ents.length > 0) setSelectedNode(ents[0]);
        setLoading(false);
      }
    }).catch(err => {
      if (mounted) {
        console.warn('Graph initialization fallback:', err);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  // Filtered nodes and edges
  const filteredEntities = useMemo(() => {
    return entities.filter(e => {
      if (selectedEntityType !== 'ALL' && e.entity_type !== selectedEntityType) return false;
      if (verificationFilter === 'VERIFIED' && e.verification_status !== 'VERIFIED') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = e.canonical_name.toLowerCase().includes(q);
        const matchesDesc = (e.description || '').toLowerCase().includes(q);
        const matchesAlias = e.alternate_names?.some(a => a.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesAlias) return false;
      }
      return true;
    });
  }, [entities, selectedEntityType, verificationFilter, searchQuery]);

  const filteredEntityIds = useMemo(() => new Set(filteredEntities.map(e => e.id)), [filteredEntities]);

  const filteredRelationships = useMemo(() => {
    return relationships.filter(r => {
      if (!filteredEntityIds.has(r.source_entity_id) || !filteredEntityIds.has(r.target_entity_id)) return false;
      if (selectedRelType !== 'ALL' && r.relationship_type !== selectedRelType) return false;
      if (verificationFilter === 'VERIFIED' && r.verification_status !== 'APPROVED') return false;
      return true;
    });
  }, [relationships, filteredEntityIds, selectedRelType, verificationFilter]);

  // Expand neighbors for currently selected node
  const handleExpandNeighbors = async (entityId: number) => {
    try {
      const res = await apiService.getGraphNeighbors(entityId, 1, 30);
      setEntities(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        res.nodes.forEach(n => map.set(n.id, n));
        return Array.from(map.values());
      });
      setRelationships(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        res.edges.forEach(e => map.set(e.id, e));
        return Array.from(map.values());
      });
    } catch (e) {
      console.warn('Neighbor expansion error:', e);
    }
  };

  // Node position simulation & Canvas rendering
  useEffect(() => {
    if (viewMode !== 'visual') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const width = canvas.parentElement?.clientWidth || 800;
    const height = canvas.parentElement?.clientHeight || 600;
    canvas.width = width;
    canvas.height = height;

    // Build graph nodes
    const nodeMap = new Map<number, GraphNode>();
    const angleStep = (2 * Math.PI) / Math.max(1, filteredEntities.length);
    const radius = Math.min(width, height) * 0.35;

    filteredEntities.forEach((ent, idx) => {
      // Deterministic radial layout centered on canvas
      const angle = idx * angleStep;
      nodeMap.set(ent.id, {
        ...ent,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        radius: ent.entity_type === 'Person' ? 26 : 22
      });
    });

    const links: GraphLink[] = [];
    filteredRelationships.forEach(r => {
      const s = nodeMap.get(r.source_entity_id);
      const t = nodeMap.get(r.target_entity_id);
      if (s && t) {
        links.push({
          id: r.id,
          source: s,
          target: t,
          relationship_type: r.relationship_type,
          confidence: r.confidence,
          verification_status: r.verification_status,
          evidence_text: r.evidence_text
        });
      }
    });

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // 1. Draw Links
      links.forEach(link => {
        const isSelectedEdge = selectedEdge?.id === link.id;
        const connectsSelectedNode = selectedNode && (link.source.id === selectedNode.id || link.target.id === selectedNode.id);

        ctx.beginPath();
        ctx.moveTo(link.source.x, link.source.y);
        ctx.lineTo(link.target.x, link.target.y);

        if (isSelectedEdge) {
          ctx.strokeStyle = '#2563EB';
          ctx.lineWidth = 3.5;
        } else if (connectsSelectedNode) {
          ctx.strokeStyle = '#C99700';
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = '#D6D3D1';
          ctx.lineWidth = 1.2;
        }
        ctx.stroke();

        // Edge label (drawn at midpoint)
        const midX = (link.source.x + link.target.x) / 2;
        const midY = (link.source.y + link.target.y) / 2;
        ctx.fillStyle = isSelectedEdge ? '#1D4ED8' : '#78716C';
        ctx.font = '9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(link.relationship_type, midX, midY - 4);
      });

      // 2. Draw Nodes
      nodeMap.forEach(node => {
        const isSelected = selectedNode?.id === node.id;
        const color = ENTITY_COLORS[node.entity_type] || { bg: '#F5F5F4', border: '#78716C', text: '#292524', dot: '#78716C' };

        // Selection halo
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(201, 151, 0, 0.25)';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#C99700';
          ctx.stroke();
        }

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = color.bg;
        ctx.fill();
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.strokeStyle = color.border;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = color.dot;
        ctx.fill();

        // Node Label
        ctx.fillStyle = '#1C1917';
        ctx.font = isSelected ? 'bold 11px serif' : '10px serif';
        ctx.textAlign = 'center';
        const label = node.canonical_name.length > 20 ? node.canonical_name.slice(0, 18) + '...' : node.canonical_name;
        ctx.fillText(label, node.x, node.y + node.radius + 13);

        // Type subtitle
        ctx.fillStyle = '#78716C';
        ctx.font = '8px sans-serif';
        ctx.fillText(node.entity_type.toUpperCase(), node.x, node.y + node.radius + 23);
      });

      ctx.restore();
    };

    render();

    // Canvas click handler for node selection
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;

      // Find clicked node
      let foundNode: GraphNode | null = null;
      nodeMap.forEach(node => {
        const dx = clickX - node.x;
        const dy = clickY - node.y;
        if (Math.sqrt(dx * dx + dy * dy) <= node.radius) {
          foundNode = node;
        }
      });

      if (foundNode) {
        setSelectedNode(foundNode);
        setSelectedEdge(null);
        return;
      }

      // Check clicked link
      let foundLink: GraphLink | null = null;
      for (const link of links) {
        const dist = distToSegment({ x: clickX, y: clickY }, link.source, link.target);
        if (dist < 8) {
          foundLink = link;
          break;
        }
      }

      if (foundLink) {
        const relObj = relationships.find(r => r.id === foundLink!.id);
        if (relObj) {
          setSelectedEdge(relObj);
          setSelectedNode(null);
        }
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [filteredEntities, filteredRelationships, zoom, pan, selectedNode, selectedEdge, viewMode]);

  // Distance from point to line segment
  function distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }) {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return Math.sqrt((p.x - v.x) * (p.x - v.x) + (p.y - v.y) * (p.y - v.y));
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.sqrt((p.x - projX) * (p.x - projX) + (p.y - projY) * (p.y - projY));
  }

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink flex flex-col">
      <DemoBanner />

      {/* Broadsheet Masthead */}
      <section className="bg-[#FAF6EE] text-ink py-6 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-oxblood uppercase tracking-widest font-bold">
              <Network className="w-3.5 h-3.5 text-oxblood" />
              <span>RECORD REPOSITORY • HISTORICAL ONTOLOGY & KNOWLEDGE GRAPH</span>
              {graphStatus && (
                <span className="ml-2 px-2 py-0.5 text-[10px] font-mono font-bold bg-[#EFE8DA] text-ink border border-ink">
                  ENGINE: {graphStatus.backend.toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-tight text-ink">
              Archival Knowledge Graph & Entity Index
            </h1>
            <p className="text-stone-700 text-xs sm:text-sm font-editorial italic max-w-2xl">
              Evidence-anchored relational network mapping Dr. B.R. Ambedkar, constitutional proceedings, scholarly treatises, civic institutions, and verified custodial documents.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#EFE8DA] p-1 border-2 border-ink self-start md:self-auto shadow-letterpress-sm">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase transition ${
                viewMode === 'visual' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" /> [ Visual Web ]
            </button>
            <button
              onClick={() => setViewMode('accessible_list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase transition ${
                viewMode === 'accessible_list' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> [ Structured Index ]
            </button>
          </div>
        </div>
      </section>

      {/* Filter and Search Ribbon */}
      <div className="bg-[#FAF6EE] border-b-2 border-ink px-4 sm:px-6 lg:px-8 py-3 sticky top-14 z-30 shadow-letterpress-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities, treaties, movements, institutions..."
              className="w-full pl-9 pr-3 py-2 bg-white border-2 border-ink text-xs font-mono text-ink placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-oxblood shadow-letterpress-sm"
            />
          </div>

          {/* Type Filters */}
          <div className="flex items-center flex-wrap gap-2">
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="bg-white border-2 border-ink px-2.5 py-1.5 text-xs font-mono font-bold text-ink focus:outline-none shadow-letterpress-sm"
            >
              <option value="ALL">All Entity Classifications</option>
              <option value="Person">Person</option>
              <option value="Document">Document</option>
              <option value="Speech">Speech</option>
              <option value="Event">Event</option>
              <option value="Institution">Institution</option>
              <option value="Topic">Topic</option>
              <option value="Concept">Concept</option>
            </select>

            <select
              value={selectedRelType}
              onChange={(e) => setSelectedRelType(e.target.value)}
              className="bg-white border-2 border-ink px-2.5 py-1.5 text-xs font-mono font-bold text-ink focus:outline-none shadow-letterpress-sm"
            >
              <option value="ALL">All Relational Ties</option>
              <option value="AUTHORED">AUTHORED</option>
              <option value="SPOKE_AT">SPOKE_AT</option>
              <option value="PARTICIPATED_IN">PARTICIPATED_IN</option>
              <option value="DISCUSSES">DISCUSSES</option>
              <option value="REFERENCES">REFERENCES</option>
              <option value="RELATED_TO">RELATED_TO</option>
              <option value="PART_OF_COLLECTION">PART_OF_COLLECTION</option>
            </select>

            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value as any)}
              className="bg-white border-2 border-ink px-2.5 py-1.5 text-xs font-mono font-bold text-oxblood focus:outline-none shadow-letterpress-sm"
            >
              <option value="VERIFIED">[ SEAL: Verified Only ]</option>
              <option value="ALL">[ Include Unverified ]</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Graph Content Canvas + Inspector Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row relative max-w-7xl mx-auto w-full p-4 gap-4">
        {viewMode === 'visual' ? (
          <div className="flex-1 bg-[#FAF6EE] border-2 border-ink relative shadow-letterpress overflow-hidden min-h-[550px]">
            {/* Zoom / Pan Controls Overlay */}
            <div className="absolute top-4 right-4 z-20 flex flex-col gap-1 bg-[#FAF6EE] border-2 border-ink p-1 shadow-letterpress-sm">
              <button 
                onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} 
                className="p-2 text-ink hover:bg-ink hover:text-white transition" 
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} 
                className="p-2 text-ink hover:bg-ink hover:text-white transition" 
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button 
                onClick={resetView} 
                className="p-2 text-ink hover:bg-ink hover:text-white transition" 
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="w-full h-full cursor-grab active:cursor-grabbing"
            />

            {/* Bottom Status / Stats Legend */}
            <div className="absolute bottom-3 left-4 z-20 flex items-center gap-3 text-[11px] font-mono bg-[#FAF6EE] px-3 py-1.5 border-2 border-ink text-ink shadow-letterpress-sm">
              <span>{filteredEntities.length} Entities</span>
              <span>•</span>
              <span>{filteredRelationships.length} Links</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-oxblood font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> SEAL: VERIFIED PROVENANCE
              </span>
            </div>
          </div>
        ) : (
          /* Accessible Structured List View (WCAG 2.1 AA) */
          <div className="flex-1 bg-[#FAF6EE] border-2 border-ink p-6 shadow-letterpress space-y-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <div>
                <h2 className="font-serif font-black text-xl text-ink">
                  Accessible Knowledge Graph Ledger
                </h2>
                <p className="text-stone-700 text-xs font-editorial">
                  Full text-based hierarchy with keyboard navigable entity relationships.
                </p>
              </div>
              <span className="font-mono text-xs text-stone-600 font-bold">
                ENTRIES: {filteredEntities.length}
              </span>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {filteredEntities.map(ent => (
                <div 
                  key={ent.id} 
                  onClick={() => setSelectedNode(ent)}
                  className={`p-3.5 border-2 cursor-pointer transition ${
                    selectedNode?.id === ent.id
                      ? 'border-oxblood bg-[#FFFDF9] shadow-letterpress-sm'
                      : 'border-ink/30 hover:border-ink bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-[#EFE8DA] text-ink border border-ink/30">
                        {ent.entity_type}
                      </span>
                      <h3 className="font-serif font-bold text-ink text-sm">
                        {ent.canonical_name}
                      </h3>
                    </div>
                    <span className="text-xs text-stone-500 font-mono">#{ent.id}</span>
                  </div>
                  {ent.description && (
                    <p className="text-xs text-stone-700 mt-1 font-editorial line-clamp-2">
                      {ent.description}
                    </p>
                  )}
                  {ent.alternate_names && ent.alternate_names.length > 0 && (
                    <p className="text-[11px] text-stone-500 font-mono mt-1">
                      Aliases: {ent.alternate_names.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inspector Sidebar Drawer */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col gap-4">
          {/* Node Inspector */}
          {selectedNode && !selectedEdge && (
            <div className="bg-[#FAF6EE] border-2 border-ink p-5 shadow-letterpress-sm space-y-4">
              <div className="flex items-start justify-between border-b-2 border-ink pb-3">
                <div>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-oxblood text-white border border-ink">
                    {selectedNode.entity_type}
                  </span>
                  <h3 className="font-serif font-bold text-lg text-ink mt-1.5">
                    {selectedNode.canonical_name}
                  </h3>
                </div>
                <button
                  onClick={() => handleExpandNeighbors(selectedNode.id)}
                  className="px-2.5 py-1 bg-white hover:bg-ink hover:text-white text-ink border border-ink text-xs font-mono font-bold uppercase flex items-center gap-1 transition shadow-letterpress-sm"
                  title="Load neighboring nodes"
                >
                  <Sparkles className="w-3 h-3 text-oxblood" /> [ Expand ]
                </button>
              </div>

              {selectedNode.description && (
                <p className="text-xs text-stone-800 leading-relaxed font-editorial">
                  {selectedNode.description}
                </p>
              )}

              {/* Entity Attributes */}
              <div className="space-y-1.5 text-xs text-stone-700 border-t border-ink/20 pt-3 font-mono">
                {selectedNode.birth_date && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Lifespan:</span>
                    <span className="font-mono font-bold text-ink">{selectedNode.birth_date} – {selectedNode.death_date || 'Present'}</span>
                  </div>
                )}
                {selectedNode.location && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Location:</span>
                    <span className="font-bold text-ink">{selectedNode.location}</span>
                  </div>
                )}
                {selectedNode.alternate_names && selectedNode.alternate_names.length > 0 && (
                  <div>
                    <span className="text-stone-500 block mb-0.5">Known Aliases:</span>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.alternate_names.map(a => (
                        <span key={a} className="bg-white text-ink border border-ink/30 px-1.5 py-0.5 text-[10px] font-mono font-bold">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation CTAs */}
              <div className="space-y-2 pt-2 border-t-2 border-ink">
                <button
                  onClick={() => navigate(`/entities/${selectedNode.id}`)}
                  className="w-full py-2 bg-ink hover:bg-oxblood text-white text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition border border-ink shadow-letterpress-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" /> [ View Entity Dossier ]
                </button>
                <button
                  onClick={() => navigate(`/timeline?entity_id=${selectedNode.id}`)}
                  className="w-full py-2 bg-white hover:bg-stone-200 text-ink border border-ink text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition shadow-letterpress-sm"
                >
                  <Clock className="w-3.5 h-3.5 text-oxblood" /> [ Timeline Milestones ]
                </button>
              </div>
            </div>
          )}

          {/* Edge Inspector */}
          {selectedEdge && (
            <div className="bg-[#FAF6EE] border-2 border-ink p-5 shadow-letterpress-sm space-y-4">
              <div className="flex items-center justify-between border-b-2 border-ink pb-3">
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-white text-ink border border-ink">
                  {selectedEdge.relationship_type}
                </span>
                <span className="text-[10px] font-mono font-bold text-oxblood bg-red-50 px-2 py-0.5 border border-oxblood">
                  {selectedEdge.verification_status}
                </span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-stone-500 font-mono uppercase">DISPATCH RELATION</p>
                <p className="font-serif font-bold text-ink text-sm">
                  {selectedEdge.source_entity_name} → <span className="text-oxblood font-mono underline">{selectedEdge.relationship_type}</span> → {selectedEdge.target_entity_name}
                </p>
              </div>

              {selectedEdge.evidence_text && (
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 font-mono uppercase">ARCHIVAL EVIDENCE EXCERPT</p>
                  <p className="text-xs text-stone-800 italic bg-white p-2.5 border border-ink font-editorial leading-relaxed">
                    "{selectedEdge.evidence_text}"
                  </p>
                </div>
              )}

              <div className="text-[11px] text-stone-600 space-y-1 border-t border-ink/20 pt-2 font-mono">
                <div>Provenance: <strong className="text-ink">{selectedEdge.provenance_type}</strong></div>
                <div>Confidence: <strong className="text-ink">{selectedEdge.confidence_label || `${Math.round(selectedEdge.confidence * 100)}%`}</strong></div>
              </div>

              <button
                onClick={() => setInspectingProvenanceRelId(selectedEdge.id)}
                className="w-full py-2 bg-ink hover:bg-oxblood text-white text-xs font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition border border-ink shadow-letterpress-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-oxblood" /> [ Verify Archival Chain ]
              </button>
            </div>
          )}

          {/* Provenance Chain Modal Drawer */}
          {inspectingProvenanceRelId && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="max-w-xl w-full max-h-[90vh] overflow-y-auto">
                <ProvenanceChainViewer
                  relationshipId={inspectingProvenanceRelId}
                  onClose={() => setInspectingProvenanceRelId(null)}
                  onOpenDocument={(docId) => navigate(`/documents`)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
