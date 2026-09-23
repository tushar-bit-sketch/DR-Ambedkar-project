import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, Bot, Shield, Monitor, 
  Menu, X, Sparkles, Scale, FileText, Landmark, Globe, ChevronDown
} from 'lucide-react';
import { useKiosk } from '../../context/KioskContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage, LanguageCode } from '../../context/LanguageContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const { isKiosk, enterKiosk } = useKiosk();
  const { role, isStaff } = useAuth();
  const { language, setLanguage, t, supportedLanguages } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCollectionsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCollectionsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setCollectionsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const collectionLinks = [
    { name: 'Explore All Collections', desc: 'Browse full archival catalogue', path: '/explore', icon: Landmark },
    { name: t('nav.documents', 'Writings & Treatises'), desc: 'Authored books, essays & papers', path: '/documents', icon: BookOpen },
    { name: t('nav.manuscripts', 'Rare Manuscripts'), desc: 'Digitized typescripts & original notes', path: '/manuscripts', icon: FileText },
    { name: t('nav.speeches', 'Speeches & Addresses'), desc: 'Presidential & historic speeches', path: '/speeches', icon: Sparkles },
    { name: t('nav.debates', 'CAD Debates'), desc: 'Constituent Assembly proceedings', path: '/debates', icon: Scale },
  ];

  const isCollectionsActive = ['/explore', '/documents', '/manuscripts', '/speeches', '/debates'].some(
    p => location.pathname === p || (p !== '/' && location.pathname.startsWith(p))
  );

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="bg-[#1B2A4A] text-white border-b-2 border-heritage-500 sticky top-0 z-40 shadow-md">
      {/* Top Institutional Bar */}
      <div className="bg-[#102038] text-slate-300 px-4 py-1.5 text-xs border-b border-white/10 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          {/* Left Institutional Credentials */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-shrink truncate">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-slate-300 font-medium">
              <Landmark className="w-3.5 h-3.5 text-heritage-400 flex-shrink-0" />
              <span className="hidden xl:inline">Institutional Digital Heritage Repository • </span>
              <span>National Memorial Platform</span>
            </span>
            <span className="text-white/20 hidden lg:inline">|</span>
            <span className="text-heritage-300 font-mono hidden lg:inline whitespace-nowrap text-[11px]">
              Dublin Core & OAIS Compliant
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 xl:space-x-3 flex-shrink-0">
            {/* Interface Language Selector */}
            <div className="flex items-center gap-1 bg-white/5 border border-heritage-500/30 rounded px-2 py-0.5 text-[11px] whitespace-nowrap flex-shrink-0">
              <Globe className="w-3 h-3 text-heritage-400 flex-shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-slate-200 text-[11px] focus:outline-none cursor-pointer"
                aria-label="Select Interface Language"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#102038] text-white">
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            {/* SIH Demo Mode Link */}
            <Link
              to="/demo"
              className="flex items-center gap-1 text-heritage-300 hover:text-white transition px-2 py-0.5 rounded bg-heritage-500/20 hover:bg-heritage-500/30 border border-heritage-500/50 text-[11px] font-bold whitespace-nowrap flex-shrink-0"
              title="Interactive 10-Stage SIH Demonstration Tour"
            >
              <Sparkles className="w-3 h-3 text-heritage-400 flex-shrink-0" />
              <span>Demo Mode</span>
            </Link>

            {/* System Status Link */}
            <Link
              to="/system-status"
              className="flex items-center gap-1 text-slate-300 hover:text-white transition px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] whitespace-nowrap flex-shrink-0"
              title="Live Subsystem Diagnostics & Status Matrix"
            >
              <Shield className="w-3 h-3 text-emerald-400 flex-shrink-0" />
              <span>System Status</span>
            </Link>

            {!isKiosk && (
              <button
                onClick={enterKiosk}
                className="flex items-center gap-1.5 text-heritage-300 hover:text-white transition px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-heritage-500/30 text-[11px] font-medium whitespace-nowrap flex-shrink-0"
                title="Switch to Touchscreen Kiosk Display Mode"
              >
                <Monitor className="w-3 h-3 flex-shrink-0" />
                <span className="hidden sm:inline">Launch Kiosk Mode</span>
              </button>
            )}

            <Link
              to="/admin"
              className="flex items-center gap-1 text-slate-300 hover:text-white transition text-[11px] whitespace-nowrap flex-shrink-0"
            >
              <Shield className="w-3 h-3 text-heritage-400 flex-shrink-0" />
              <span>{isStaff ? `Admin Portal (${role})` : 'Archivist Sign-In'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Archival Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Emblem & Title (Guaranteed Unshrinkable & Non-wrapping) */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-heritage-500 text-slate-950 flex items-center justify-center font-serif font-bold text-lg sm:text-xl shadow-inner border-2 border-heritage-300 group-hover:scale-105 transition-transform flex-shrink-0">
              अ
            </div>
            <div className="flex-shrink-0">
              <span className="font-serif tracking-wider font-bold text-base sm:text-lg lg:text-xl text-white block leading-tight whitespace-nowrap">
                AMBEDKAR ARCHIVE
              </span>
              <span className="text-[10px] sm:text-[11px] text-heritage-300 uppercase tracking-widest block font-medium whitespace-nowrap">
                Digital Heritage Knowledge Platform
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links (Streamlined, Non-wrapping, Professional Hierarchy) */}
          <nav className="hidden lg:flex items-center space-x-0.5 xl:space-x-1.5 text-xs xl:text-sm font-medium flex-shrink-0">
            {/* Home */}
            <Link
              to="/"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.home', 'Home')}
            </Link>

            {/* Search */}
            <Link
              to="/search"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/search')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.search', 'Search')}
            </Link>

            {/* Collections Dropdown */}
            <div 
              ref={dropdownRef} 
              className="relative"
              onMouseEnter={() => setCollectionsOpen(true)}
              onMouseLeave={() => setCollectionsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCollectionsOpen(!collectionsOpen)}
                className={`flex items-center gap-1 px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                  isCollectionsActive
                    ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                    : 'text-slate-200 hover:text-white hover:bg-white/5'
                }`}
                aria-expanded={collectionsOpen}
                aria-haspopup="true"
              >
                <span>Collections</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${collectionsOpen ? 'rotate-180 text-heritage-300' : 'text-slate-400'}`} />
              </button>

              {/* Collections Popover Menu */}
              {collectionsOpen && (
                <div className="absolute left-0 mt-1 w-72 bg-[#122038] border border-heritage-500/40 rounded-lg shadow-2xl py-2 z-50 backdrop-blur-md animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-white/10 text-[10px] uppercase font-mono tracking-wider text-heritage-300">
                    Archival Holdings
                  </div>
                  {collectionLinks.map((col) => {
                    const Icon = col.icon;
                    const active = location.pathname.startsWith(col.path);
                    return (
                      <Link
                        key={col.path}
                        to={col.path}
                        onClick={() => setCollectionsOpen(false)}
                        className={`flex items-start gap-3 px-3 py-2.5 hover:bg-white/10 transition-colors ${
                          active ? 'bg-heritage-600/20 text-heritage-200' : 'text-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-heritage-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-tight">{col.name}</div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">{col.desc}</div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audio/Video */}
            <Link
              to="/media"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/media')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              Audio/Video
            </Link>

            {/* Timeline */}
            <Link
              to="/timeline"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/timeline')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.timeline', 'Timeline')}
            </Link>

            {/* Knowledge Graph */}
            <Link
              to="/knowledge-graph"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/knowledge-graph')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.graph', 'Knowledge Graph')}
            </Link>

            {/* Research Assistant */}
            <Link
              to="/research"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/research')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              {t('nav.research', 'AI Assistant')}
            </Link>

            {/* About */}
            <Link
              to="/about"
              className={`px-2.5 py-1.5 xl:px-3 xl:py-2 rounded-md transition-colors whitespace-nowrap flex-shrink-0 ${
                isActive('/about')
                  ? 'bg-heritage-600/30 text-heritage-300 border-b-2 border-heritage-400 font-semibold'
                  : 'text-slate-200 hover:text-white hover:bg-white/5'
              }`}
            >
              About
            </Link>
          </nav>

          {/* Mobile / Kiosk Hamburger Button */}
          <div className="flex items-center space-x-2 lg:hidden flex-shrink-0">
            {!isKiosk && (
              <button
                onClick={enterKiosk}
                className="p-2 text-heritage-300 hover:text-white rounded-md bg-white/5 border border-heritage-500/40 text-xs flex items-center gap-1 whitespace-nowrap"
                aria-label="Enter Kiosk Mode"
              >
                <Monitor className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Kiosk</span>
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#102038] border-b border-white/10 px-4 pt-2 pb-6 space-y-1 animate-fadeIn max-h-[85vh] overflow-y-auto">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/') ? 'bg-heritage-600/30 text-heritage-300 font-semibold' : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            {t('nav.home', 'Home')}
          </Link>
          <Link
            to="/search"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-sm font-medium ${
              isActive('/search') ? 'bg-heritage-600/30 text-heritage-300 font-semibold' : 'text-slate-200 hover:bg-white/5'
            }`}
          >
            {t('nav.search', 'Search')}
          </Link>

          {/* Collections Section in Mobile */}
          <div className="py-1">
            <div className="px-3 py-1 text-[11px] uppercase font-mono tracking-wider text-heritage-300/80">
              Archival Collections
            </div>
            {collectionLinks.map((col) => {
              const Icon = col.icon;
              return (
                <Link
                  key={col.path}
                  to={col.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium pl-5 ${
                    location.pathname.startsWith(col.path) ? 'bg-heritage-600/30 text-heritage-300 font-semibold' : 'text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-heritage-400 flex-shrink-0" />
                  <span>{col.name}</span>
                </Link>
              );
            })}
          </div>

          {[
            { name: 'Audio/Video', path: '/media' },
            { name: t('nav.timeline', 'Timeline'), path: '/timeline' },
            { name: t('nav.graph', 'Knowledge Graph'), path: '/knowledge-graph' },
            { name: t('nav.research', 'AI Assistant'), path: '/research' },
            { name: 'About', path: '/about' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive(link.path)
                  ? 'bg-heritage-600/30 text-heritage-300 font-semibold'
                  : 'text-slate-200 hover:bg-white/5'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Mobile Utilities */}
          <div className="pt-3 border-t border-white/10 flex flex-col space-y-2">
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-md text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-heritage-400 flex-shrink-0" />
                Language / भाषा:
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-[#102038] border border-white/20 text-white rounded px-2 py-1 text-xs"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>
            <Link
              to="/demo"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-md text-sm text-heritage-300 hover:bg-white/5 flex items-center gap-2 font-bold"
            >
              <Sparkles className="w-4 h-4 text-heritage-400 flex-shrink-0" />
              SIH Demo Mode Tour
            </Link>
            <Link
              to="/system-status"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 flex items-center gap-2"
            >
              <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Subsystem Diagnostics
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2.5 rounded-md text-sm text-heritage-300 hover:bg-white/5 flex items-center gap-2"
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              Administrative Portal
            </Link>
            <button
              onClick={() => {
                enterKiosk();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 rounded-md text-sm text-white bg-heritage-600 hover:bg-heritage-700 flex items-center gap-2 font-semibold"
            >
              <Monitor className="w-4 h-4 flex-shrink-0" />
              Switch to Touchscreen Kiosk Display
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
