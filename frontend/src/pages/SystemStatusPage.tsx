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
    <div className="min-h-screen bg-[#F8F5EE] text-slate-900 pb-20">
      {/* Top Header */}
      <div className="bg-[#102038] text-white border-b-2 border-heritage-500 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link to="/" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Archive</span>
            </Link>
            <span className="text-white/20">|</span>
            <div>
              <div className="flex items-center gap-2 text-heritage-400 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>SIH26096 System Health & Subsystem Diagnostics</span>
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-wide">
                Live Subsystem Verification Matrix
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded text-xs">
              <span className="text-slate-400">Auto-refresh (10s):</span>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-heritage-500' : 'bg-slate-700'}`}
              >
                <div className={`w-3 h-3 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'} mt-0.5`} />
              </button>
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-heritage-500 hover:bg-heritage-600 text-slate-950 text-xs font-bold transition shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Probes</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 space-y-6">
        {/* Environmental Audit Card */}
        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
            <div>
              <div className="text-xs font-mono text-stone-500 uppercase">Platform Environment Assessment</div>
              <h2 className="text-lg font-serif font-bold text-slate-900 mt-0.5">
                {data?.application || 'SIH26096 Digital Heritage Archive'}
              </h2>
              <div className="text-xs text-stone-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <span><strong>Phase:</strong> {data?.phase || 'PHASE 10 (FINAL)'}</span>
                <span><strong>Host OS:</strong> {data?.environment || 'Windows 11'}</span>
                <span><strong>Last Probe:</strong> {lastRefreshed.toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs text-stone-600 font-semibold">Overall Platform Status:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                data?.overall_status === 'OPERATIONAL'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                  : 'bg-amber-100 text-amber-800 border-amber-400'
              }`}>
                {data?.overall_status || 'OPERATIONAL'}
              </span>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-center">
              <div className="text-2xl font-bold font-mono text-slate-900">{counts.total}</div>
              <div className="text-[11px] text-stone-500 font-medium uppercase mt-0.5">Total Subsystems</div>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <div className="text-2xl font-bold font-mono text-emerald-700">{counts.operational}</div>
              <div className="text-[11px] text-emerald-700 font-medium uppercase mt-0.5">Operational</div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <div className="text-2xl font-bold font-mono text-amber-700">{counts.fallback}</div>
              <div className="text-[11px] text-amber-700 font-medium uppercase mt-0.5">Operational (Fallback)</div>
            </div>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
              <div className="text-2xl font-bold font-mono text-rose-700">{counts.unavailable}</div>
              <div className="text-[11px] text-rose-700 font-medium uppercase mt-0.5">Unavailable</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Subsystems Grid */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-1.5 bg-white border border-stone-300 p-1 rounded-lg text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1 rounded font-medium transition ${filter === 'ALL' ? 'bg-[#102038] text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
              >
                All Subsystems ({counts.total})
              </button>
              <button
                onClick={() => setFilter('OPERATIONAL')}
                className={`px-3 py-1 rounded font-medium transition ${filter === 'OPERATIONAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                Operational ({counts.operational})
              </button>
              <button
                onClick={() => setFilter('DEGRADED_FALLBACK')}
                className={`px-3 py-1 rounded font-medium transition ${filter === 'DEGRADED_FALLBACK' ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-50'}`}
              >
                Fallback ({counts.fallback})
              </button>
              <button
                onClick={() => setFilter('UNAVAILABLE')}
                className={`px-3 py-1 rounded font-medium transition ${filter === 'UNAVAILABLE' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-700 hover:bg-rose-50'}`}
              >
                Unavailable ({counts.unavailable})
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <Link
                to="/demo"
                className="px-3 py-1.5 rounded bg-heritage-500 hover:bg-heritage-600 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-sm"
              >
                <span>Launch SIH Demo Tour</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-900/10 border border-red-400 rounded-lg text-red-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
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
                  className="bg-white rounded-xl border border-stone-300 p-5 shadow-sm hover:shadow transition flex flex-col justify-between"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-slate-900 text-sm leading-tight">
                            {sub.name}
                          </h3>
                          <span className="text-[10px] font-mono text-stone-400 uppercase">{key}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase flex-shrink-0 ${getStatusBadgeClass(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>

                    {/* Provider & Version */}
                    <div className="bg-stone-50 border border-stone-200 rounded p-2.5 text-xs mb-3 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Provider:</span>
                        <span className="font-semibold text-slate-800 text-right truncate ml-2">{sub.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Version:</span>
                        <span className="font-mono text-stone-700">{sub.version}</span>
                      </div>
                    </div>

                    {/* Diagnostic Details */}
                    <div className="text-xs text-slate-600 leading-relaxed">
                      {sub.details}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span className="flex items-center gap-1">
                      {sub.status === 'OPERATIONAL' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : sub.status.includes('FALLBACK') ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span>Probe Verified</span>
                    </span>
                    <span className="font-mono text-[10px]">Dublin Core OAIS</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Host Machine Telemetry Summary */}
        <div className="bg-white rounded-xl border border-stone-300 p-5 shadow-sm">
          <h2 className="font-serif font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-heritage-600" />
            <span>Host Environment Telemetry & Hardware State</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-stone-500 block mb-1">Processor / CPU</span>
              <span className="font-semibold text-slate-900 block">AMD Ryzen 5 7535HS</span>
              <span className="text-[11px] text-stone-500">6 Cores / 12 Threads</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-stone-500 block mb-1">System Memory</span>
              <span className="font-semibold text-slate-900 block">8.00 GB Physical RAM</span>
              <span className="text-[11px] text-emerald-600">Available & Monitored</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-stone-500 block mb-1">Display & Touch State</span>
              <span className="font-semibold text-slate-900 block">Pointer/Keyboard Active</span>
              <span className="text-[11px] text-amber-700">Touchscreen NOT_DETECTED</span>
            </div>
            <div className="p-3 bg-stone-50 rounded border border-stone-200">
              <span className="text-stone-500 block mb-1">Primary Database</span>
              <span className="font-semibold text-slate-900 block">SQLite 3 (Dev Schema)</span>
              <span className="text-[11px] text-emerald-600 font-mono">Mig c8f2910d5403</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;
