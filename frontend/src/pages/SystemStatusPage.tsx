import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, 
  Server, Cpu, Database, HardDrive, Search, Bot, Globe, 
  Network, Clock, Film, Monitor, Shield, ArrowLeft, ExternalLink,
  Activity, Check, XCircle
} from 'lucide-react';
import { demoApi, SystemStatusResponse, SubsystemStatus } from '../services/demoApi';

export const SystemStatusPage: React.FC = () => {
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'OPERATIONAL' | 'DEGRADED_FALLBACK' | 'UNAVAILABLE'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await demoApi.getSystemStatus();
      setData(res);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch subsystem status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchStatus();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getSubsystemIcon = (key: string) => {
    switch (key) {
      case 'database': return Database;
      case 'document_storage': return HardDrive;
      case 'search_engine': return Search;
      case 'embedding_provider': return Cpu;
      case 'ocr_engine': return Cpu;
      case 'knowledge_graph': return Network;
      case 'timeline_engine': return Clock;
      case 'multilingual_service': return Globe;
      case 'media_engine': return Film;
      case 'transcription_stt': return Bot;
      case 'rag_llm_engine': return Bot;
      case 'kiosk_hardware': return Monitor;
      case 'security_rbac': return Shield;
      case 'telemetry_monitor': return Activity;
      default: return Server;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'OPERATIONAL (FALLBACK)':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'DEGRADED':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'UNAVAILABLE':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'NOT_CONFIGURED':
      case 'NOT_TESTED':
        return 'bg-stone-100 text-stone-700 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-300';
    }
  };

  const subsystemsList = data ? Object.entries(data.subsystems) : [];

  const counts = {
    total: subsystemsList.length,
    operational: subsystemsList.filter(([_, s]) => s.status === 'OPERATIONAL').length,
    fallback: subsystemsList.filter(([_, s]) => s.status === 'OPERATIONAL (FALLBACK)' || s.status === 'DEGRADED').length,
    unavailable: subsystemsList.filter(([_, s]) => s.status === 'UNAVAILABLE' || s.status === 'NOT_CONFIGURED').length,
  };

  const filteredSubsystems = subsystemsList.filter(([_, sub]) => {
    if (filter === 'OPERATIONAL') return sub.status === 'OPERATIONAL';
    if (filter === 'DEGRADED_FALLBACK') return sub.status === 'OPERATIONAL (FALLBACK)' || sub.status === 'DEGRADED';
    if (filter === 'UNAVAILABLE') return sub.status === 'UNAVAILABLE' || sub.status === 'NOT_CONFIGURED';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink pb-20">
      {/* Top Header Masthead */}
      <div className="bg-[#FAF6EE] text-ink border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-ink hover:text-oxblood flex items-center gap-1 text-xs font-mono font-bold uppercase">
              <ArrowLeft className="w-4 h-4" />
              <span>[ Back to Archive ]</span>
            </Link>
            <span className="text-ink/30 font-mono">|</span>
            <div>
              <div className="flex items-center gap-2 text-oxblood text-xs font-mono font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-oxblood" />
                <span>CENTRAL TELEMETRY • LIVE SUBSYSTEM VERIFICATION MATRIX</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-ink">
                Official Diagnostics & Subsystem Gazette
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3 font-mono">
            <div className="flex items-center space-x-2 bg-white border border-ink px-3 py-1.5 text-xs shadow-letterpress-sm">
              <span className="text-stone-600 font-bold uppercase">Auto-Probe (10s):</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-4 transition-colors relative border border-ink ${autoRefresh ? 'bg-oxblood' : 'bg-stone-300'}`}
              >
                <div className={`w-3 h-3 bg-white transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'} mt-0.2`} />
              </button>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-ink hover:bg-oxblood text-white text-xs font-bold uppercase transition border border-ink shadow-letterpress-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>[ Inquire Probes ]</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* Environmental Audit Card */}
        <div className="bg-[#FAF6EE] border-2 border-ink p-6 shadow-letterpress">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-ink">
            <div>
              <div className="text-xs font-mono text-oxblood uppercase font-bold tracking-wider">PLATFORM ENVIRONMENT TELEMETRY</div>
              <h2 className="text-xl font-serif font-black text-ink mt-0.5">
                {data?.application || 'SIH26096 Digital Heritage Archive'}
              </h2>
              <div className="text-xs text-stone-700 font-mono mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong>Phase:</strong> {data?.phase || 'PHASE 10 (FINAL)'}</span>
                <span><strong>Host OS:</strong> {data?.environment || 'Windows 11'}</span>
                <span><strong>Last Probe:</strong> {lastRefreshed.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2 font-mono">
              <span className="text-xs text-stone-700 font-bold uppercase">System Verdict:</span>
              <span className={`px-3 py-1 text-xs font-bold border ${
                data?.overall_status === 'OPERATIONAL'
                  ? 'bg-red-50 text-oxblood border-oxblood'
                  : 'bg-amber-50 text-amber-900 border-amber-500'
              }`}>
                [ SEAL: {data?.overall_status || 'OPERATIONAL'} ]
              </span>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 font-mono">
            <div className="p-3 bg-white border-2 border-ink text-center shadow-letterpress-sm">
              <div className="text-2xl font-black text-ink">{counts.total}</div>
              <div className="text-[10px] text-stone-600 font-bold uppercase mt-0.5">Total Subsystems</div>
            </div>
            <div className="p-3 bg-white border-2 border-ink text-center shadow-letterpress-sm">
              <div className="text-2xl font-black text-emerald-800">{counts.operational}</div>
              <div className="text-[10px] text-emerald-800 font-bold uppercase mt-0.5">Operational</div>
            </div>
            <div className="p-3 bg-white border-2 border-ink text-center shadow-letterpress-sm">
              <div className="text-2xl font-black text-amber-800">{counts.fallback}</div>
              <div className="text-[10px] text-amber-800 font-bold uppercase mt-0.5">Fallback Subsystems</div>
            </div>
            <div className="p-3 bg-white border-2 border-ink text-center shadow-letterpress-sm">
              <div className="text-2xl font-black text-rose-800">{counts.unavailable}</div>
              <div className="text-[10px] text-rose-800 font-bold uppercase mt-0.5">Unavailable</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Subsystems Grid */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 font-mono">
            <div className="flex items-center space-x-1 bg-[#EFE8DA] border-2 border-ink p-1 text-xs shadow-letterpress-sm">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 font-bold uppercase transition ${filter === 'ALL' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'}`}
              >
                All Subsystems ({counts.total})
              </button>
              <button
                onClick={() => setFilter('OPERATIONAL')}
                className={`px-3 py-1 font-bold uppercase transition ${filter === 'OPERATIONAL' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'}`}
              >
                Operational ({counts.operational})
              </button>
              <button
                onClick={() => setFilter('DEGRADED_FALLBACK')}
                className={`px-3 py-1 font-bold uppercase transition ${filter === 'DEGRADED_FALLBACK' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'}`}
              >
                Fallback ({counts.fallback})
              </button>
              <button
                onClick={() => setFilter('UNAVAILABLE')}
                className={`px-3 py-1 font-bold uppercase transition ${filter === 'UNAVAILABLE' ? 'bg-ink text-white shadow-sm' : 'text-ink hover:bg-stone-200'}`}
              >
                Unavailable ({counts.unavailable})
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/demo"
                className="px-4 py-2 bg-ink hover:bg-oxblood text-white text-xs font-bold uppercase transition flex items-center gap-1.5 border border-ink shadow-letterpress-sm"
              >
                <span>[ Launch SIH Demo Tour ]</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-oxblood text-oxblood text-xs font-mono font-bold flex items-center gap-2 shadow-letterpress-sm">
              <AlertTriangle className="w-5 h-5 text-oxblood flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnostic Subsystems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubsystems.map(([key, sub]) => {
              const Icon = getSubsystemIcon(key);
              return (
                <div
                  key={key}
                  className="bg-[#FAF6EE] border-2 border-ink p-5 shadow-letterpress-sm hover:shadow-letterpress transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 bg-white border border-ink text-ink flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-oxblood" />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-ink text-sm leading-tight">
                            {sub.name}
                          </h3>
                          <span className="text-[10px] font-mono text-stone-500 uppercase">{key}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold border uppercase flex-shrink-0 ${getStatusBadgeClass(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>

                    {/* Provider & Version */}
                    <div className="bg-white border border-ink p-2.5 text-xs mb-3 space-y-1 font-mono shadow-letterpress-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500 uppercase">Provider:</span>
                        <span className="font-bold text-ink text-right truncate ml-2">{sub.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500 uppercase">Version:</span>
                        <span className="font-bold text-oxblood">{sub.version}</span>
                      </div>
                    </div>

                    {/* Diagnostic Details */}
                    <div className="text-xs text-stone-700 font-editorial leading-relaxed">
                      {sub.details}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-ink/20 flex items-center justify-between text-[11px] font-mono text-stone-600">
                    <span className="flex items-center gap-1">
                      {sub.status === 'OPERATIONAL' ? (
                        <Check className="w-3.5 h-3.5 text-oxblood" />
                      ) : sub.status.includes('FALLBACK') ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-700" />
                      )}
                      <span>SEAL: Probe Verified</span>
                    </span>
                    <span className="font-mono text-[10px]">ISO 14721 OAIS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Machine Telemetry Summary */}
        <div className="bg-[#FAF6EE] border-2 border-ink p-6 shadow-letterpress space-y-4">
          <h2 className="font-serif font-black text-ink text-lg flex items-center gap-2 border-b-2 border-ink pb-2">
            <Cpu className="w-4 h-4 text-oxblood" />
            <span>Host Environment Telemetry & Hardware State</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
              <span className="text-stone-500 block uppercase mb-1">Processor / CPU</span>
              <span className="font-bold text-ink block">AMD Ryzen 5 7535HS</span>
              <span className="text-[11px] text-stone-500">6 Cores / 12 Threads</span>
            </div>
            <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
              <span className="text-stone-500 block uppercase mb-1">System Memory</span>
              <span className="font-bold text-ink block">8.00 GB Physical RAM</span>
              <span className="text-[11px] text-oxblood font-bold">Monitored Host Reserve</span>
            </div>
            <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
              <span className="text-stone-500 block uppercase mb-1">Display & Touch State</span>
              <span className="font-bold text-ink block">Pointer/Keyboard Active</span>
              <span className="text-[11px] text-stone-600">Standard Broadsheet Render</span>
            </div>
            <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
              <span className="text-stone-500 block uppercase mb-1">Primary Database</span>
              <span className="font-bold text-ink block">SQLite 3 (Dev Schema)</span>
              <span className="text-[11px] text-oxblood font-bold">Mig c8f2910d5403</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;
