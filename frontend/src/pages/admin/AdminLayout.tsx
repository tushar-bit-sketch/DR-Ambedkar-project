import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Film, Tags, Users, 
  History, Settings, Shield, ArrowLeft, LogOut, CheckCircle2, UserCheck,
  Layers, Upload, Cpu, Search, Languages, Volume2,
  Network, Clock, Monitor, ShieldCheck, Sparkles, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { DemoBanner } from '../../components/archive/DemoBanner';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, login, logout, user } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Demo Steering', path: '/admin/demo', icon: Sparkles },
    { label: 'System Diagnostics', path: '/admin/system-status', icon: Activity },
    { label: 'Documents Catalog', path: '/admin/documents', icon: FileText },
    { label: 'OCR Digitization', path: '/admin/ocr', icon: Cpu },
    { label: 'Search & Vector Index', path: '/admin/search-index', icon: Search },
    { label: 'Knowledge Graph', path: '/admin/knowledge-graph', icon: Network },
    { label: 'Timeline Curation', path: '/admin/timeline', icon: Clock },
    { label: 'Translations Review', path: '/admin/translations', icon: Languages },
    { label: 'Voice & Languages', path: '/admin/languages', icon: Volume2 },
    { label: 'Archival Collections', path: '/admin/collections', icon: Layers },
    { label: 'Batch Ingestion', path: '/admin/import', icon: Upload },
    { label: 'Media Management', path: '/admin/media', icon: Film },
    { label: 'Kiosk Fleet', path: '/admin/kiosks', icon: Monitor },
    { label: 'Security & Telemetry', path: '/admin/security', icon: ShieldCheck },
    { label: 'Metadata Standards', path: '/admin/metadata', icon: Tags },
    { label: 'User & RBAC', path: '/admin/users', icon: Users },
    { label: 'Audit Logs', path: '/admin/audit', icon: History },
  ];

  const handleRoleChange = (newRole: UserRole) => {
    login(newRole);
  };

  const isActive = (path: string) => {
    if (path === '/admin' && location.pathname === '/admin') return true;
    if (path !== '/admin' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col">
      <DemoBanner customMessage="ARCHIVAL ADMINISTRATION PORTAL — PHASE 1 DEMO REPOSITORY. Changes affect local mock DB session." />

      {/* Admin Top Header */}
      <header className="bg-[#102038] text-white border-b-2 border-heritage-500 px-4 sm:px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <Link to="/" className="text-slate-300 hover:text-white flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Archive</span>
          </Link>
          <span className="text-white/20">|</span>
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-heritage-400" />
            <span className="font-serif font-bold text-base sm:text-lg">
              Institutional Archive Administration
            </span>
          </div>
        </div>

        {/* Role Switcher for Phase 1 RBAC Testing */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="hidden md:flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-slate-300">Active Role:</span>
            <select
              value={role}
              onChange={(e) => handleRoleChange(e.target.value as UserRole)}
              className="bg-transparent text-heritage-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="SUPER_ADMIN" className="bg-[#102038] text-white">SUPER_ADMIN</option>
              <option value="ARCHIVIST" className="bg-[#102038] text-white">ARCHIVIST</option>
              <option value="RESEARCHER" className="bg-[#102038] text-white">RESEARCHER</option>
              <option value="REVIEWER" className="bg-[#102038] text-white">REVIEWER</option>
              <option value="VISITOR" className="bg-[#102038] text-white">VISITOR (Read Only)</option>
            </select>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-white/10 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Admin Area */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside aria-label="Admin Navigation" className="w-full md:w-64 bg-[#1B2A4A] text-slate-200 border-r border-stone-300 p-4 space-y-6 flex-shrink-0">
          <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <div className="text-[11px] text-slate-400 font-mono uppercase">Logged In As</div>
            <div className="font-bold text-sm text-white truncate">{user?.full_name || 'Archival Officer'}</div>
            <div className="text-[10px] text-heritage-300 font-mono">{role}</div>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                    active
                      ? 'bg-heritage-500 text-slate-950 shadow font-bold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-white/10 text-[11px] text-slate-400 space-y-2">
            <div className="font-mono text-heritage-400">Archival Node #01</div>
            <div>PostgreSQL Schema v1.0</div>
            <div>OAuth2 / JWT Active</div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
