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
    <header className="bg-newsprint-100 text-ink border-b-2 border-ink sticky top-0 z-40 shadow-sm">
      {/* Skip Navigation Link for Accessibility */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink focus:text-white focus:font-mono focus:text-xs focus:shadow-letterpress border-2 border-ink"
      >
        [ Skip to Main Archival Content ]
      </a>
      {/* Top Institutional Ear-Pieces & Gazette Dateline Bar */}
      <div className="bg-[#FAF6EE] text-ink-700 px-4 py-1.5 text-xs border-b border-ink/20 hidden md:block font-mono">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
          {/* Left Ear-Piece */}
          <div className="flex items-center space-x-2.5 min-w-0 flex-shrink truncate">
            <span className="flex items-center gap-1.5 whitespace-nowrap text-ink-900 font-bold uppercase tracking-wider text-[11px]">
              <Landmark className="w-3.5 h-3.5 text-oxblood flex-shrink-0" />
              <span>National Institutional Repository</span>
            </span>
            <span className="text-ink/30 hidden lg:inline">|</span>
            <span className="text-ink-600 hidden lg:inline whitespace-nowrap text-[11px] tracking-wide">
              Dublin Core & OAIS Reference Model Compliant
            </span>
          </div>

          {/* Center Dateline */}
          <div className="hidden xl:flex items-center gap-2 text-[10px] text-ink-500 uppercase tracking-widest font-mono">
            <span>VOL. LXXVI • SPECIAL GAZETTE RECORD</span>
          </div>

          {/* Right Controls / Ear-Piece */}
          <div className="flex items-center space-x-2 xl:space-x-3 flex-shrink-0">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-newsprint-200 border border-ink/40 px-2 py-0.5 text-[11px] whitespace-nowrap">
              <Globe className="w-3 h-3 text-ink-700 flex-shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-ink text-[11px] font-mono focus:outline-none cursor-pointer uppercase font-semibold"
                aria-label="Select Interface Language"
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-newsprint-100 text-ink">
                    {lang.native} ({lang.label})
                  </option>
                ))}
              </select>
            </div>

            {/* SIH Demo Mode Link */}
            <Link
              to="/demo"
              className="flex items-center gap-1 text-oxblood hover:text-white hover:bg-oxblood transition px-2 py-0.5 border border-oxblood text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0"
              title="Interactive 10-Stage Demonstration Tour"
            >
              <Sparkles className="w-3 h-3 flex-shrink-0" />
              <span>Gazette Tour</span>
            </Link>

            {/* System Status Link */}
            <Link
              to="/system-status"
              className="flex items-center gap-1 text-ink-700 hover:text-ink hover:bg-newsprint-300 transition px-2 py-0.5 border border-ink/30 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap flex-shrink-0"
              title="Live Subsystem Diagnostics"
            >
              <Shield className="w-3 h-3 text-emerald-700 flex-shrink-0" />
              <span>Registry Status</span>
            </Link>

            {!isKiosk && (
              <button
                onClick={enterKiosk}
                className="flex items-center gap-1.5 text-ink-700 hover:text-ink hover:bg-newsprint-300 transition px-2 py-0.5 border border-ink/30 text-[10px] font-mono uppercase tracking-wider whitespace-nowrap flex-shrink-0"
                title="Switch to Touchscreen Kiosk Display Mode"
              >
                <Monitor className="w-3 h-3 flex-shrink-0" />
                <span className="hidden sm:inline">Kiosk Desk</span>
              </button>
            )}

            <Link
              to="/admin"
              className="flex items-center gap-1 text-ink-700 hover:text-oxblood transition text-[10px] font-mono uppercase tracking-wider whitespace-nowrap flex-shrink-0"
            >
              <Shield className="w-3 h-3 text-oxblood flex-shrink-0" />
              <span>{isStaff ? `Curator (${role})` : 'Archivist Sign-In'}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grand Archival Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-ink/20">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left Decorative Date / Folio Notice */}
          <div className="hidden md:flex flex-col text-left font-mono text-[10px] text-ink-600 space-y-0.5 flex-1">
            <span className="font-bold tracking-widest text-oxblood">OFFICIAL REPOSITORY RECORD</span>
            <span>ESTD. 1950 • REPUBLIC OF INDIA</span>
            <span className="text-ink-500">ACCESSION PROTOCOL: DUBLIN CORE</span>
          </div>

          {/* Centered Grand Masthead */}
          <Link to="/" className="text-center group flex flex-col items-center">
            <div className="flex items-center justify-center gap-3">
              <div className="w-9 h-9 border-2 border-ink flex items-center justify-center font-serif font-black text-xl text-oxblood bg-newsprint-50 shadow-letterpress-sm group-hover:scale-105 transition-transform">
                अ
              </div>
              <h1 className="font-serif font-black text-2xl sm:text-3xl lg:text-4xl text-ink tracking-tight uppercase leading-none">
                The Ambedkar Archive
              </h1>
              <div className="w-9 h-9 border-2 border-ink flex items-center justify-center font-serif font-black text-xl text-oxblood bg-newsprint-50 shadow-letterpress-sm group-hover:scale-105 transition-transform">
                अ
              </div>
            </div>
            <p className="mt-1 text-xs sm:text-sm font-serif italic text-sepia tracking-wide">
              Digital Heritage Knowledge Platform & Historical Broadsheet Repository
            </p>
          </Link>

          {/* Right Archival Seal / Issue Stamp */}
          <div className="hidden md:flex flex-col items-end text-right font-mono text-[10px] text-ink-600 space-y-0.5 flex-1">
            <span className="stamp-oxblood text-[9px] py-0.5 px-2">OFFICIAL EDITION</span>
            <span className="text-ink-500 mt-1">OPEN ACCESS SCHOLARSHIP</span>
            <span>VERIFIED CITATION ENGINE</span>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {!isKiosk && (
              <button
                onClick={enterKiosk}
                className="min-h-[48px] px-3 py-2 text-ink border-2 border-ink text-xs font-mono font-bold uppercase shadow-letterpress-sm"
                aria-label="Enter Kiosk Mode"
              >
                Kiosk
              </button>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="min-h-[48px] min-w-[48px] p-2 border-2 border-ink text-ink hover:bg-ink hover:text-white flex items-center justify-center shadow-letterpress-sm transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Broadsheet Section Navigation Bar with Double Printer's Rules */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-y-2 border-double border-ink bg-[#FAF6EE]">
        <nav className="hidden lg:flex items-center justify-center space-x-1 xl:space-x-2 py-1.5 text-xs font-mono uppercase tracking-wider">
          {/* Home / Front Page */}
          <Link
            to="/"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Front Page ]
          </Link>

          {/* Search */}
          <Link
            to="/search"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/search')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Dispatch Search ]
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
              className={`flex items-center gap-1 px-3 py-1 border transition-colors whitespace-nowrap ${
                isCollectionsActive
                  ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                  : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
              }`}
              aria-expanded={collectionsOpen}
              aria-haspopup="true"
            >
              <span>[ Holdings & Ledger ▾ ]</span>
            </button>

            {/* Collections Popover Menu in Newspaper Style */}
            {collectionsOpen && (
              <div className="absolute left-0 mt-1 w-72 bg-[#FAF6EE] border-2 border-ink shadow-letterpress py-2 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-ink/20 text-[10px] uppercase font-mono tracking-widest text-oxblood font-bold">
                  Classified Archival Holdings
                </div>
                {collectionLinks.map((col) => {
                  const Icon = col.icon;
                  const active = location.pathname.startsWith(col.path);
                  return (
                    <Link
                      key={col.path}
                      to={col.path}
                      onClick={() => setCollectionsOpen(false)}
                      className={`flex items-start gap-3 px-3 py-2 border-b border-ink/10 last:border-0 hover:bg-newsprint-300 transition-colors ${
                        active ? 'bg-newsprint-300 font-bold' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4 text-oxblood mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-serif font-bold text-ink leading-tight">{col.name}</div>
                        <div className="text-[10px] font-mono text-ink-600 leading-tight mt-0.5">{col.desc}</div>
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
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/media')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Audio-Visual ]
          </Link>

          {/* Timeline */}
          <Link
            to="/timeline"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/timeline')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Chronology ]
          </Link>

          {/* Knowledge Graph */}
          <Link
            to="/knowledge-graph"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/knowledge-graph')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Knowledge Matrix ]
          </Link>

          {/* Research Assistant */}
          <Link
            to="/research"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/research')
                ? 'bg-oxblood text-white border-oxblood font-bold shadow-letterpress-red'
                : 'text-oxblood font-bold border-oxblood/40 hover:bg-oxblood hover:text-white'
            }`}
          >
            [ ★ AI Research Assistant ]
          </Link>

          {/* About */}
          <Link
            to="/about"
            className={`px-3 py-1 border transition-colors whitespace-nowrap ${
              isActive('/about')
                ? 'bg-ink text-white border-ink font-bold shadow-letterpress-sm'
                : 'text-ink border-transparent hover:border-ink hover:bg-newsprint-200'
            }`}
          >
            [ Registry Info ]
          </Link>
        </nav>
      </div>

      {/* Gazette Wire Bulletin Ticker */}
      <div className="bg-folio border-b border-ink/20 py-1.5 px-4 text-[11px] font-mono text-ink-700 hidden sm:block overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-ink flex-shrink-0 animate-pulse" />
            <span className="truncate font-semibold tracking-wide text-ink-800">
              INSTITUTIONAL ARCHIVE ACTIVE: Sourced from official public records (Dr. Ambedkar Foundation BAWS & Constituent Assembly Debates) with SHA-256 integrity verification.
            </span>
          </div>
          <span className="px-2 py-0.5 bg-verified-bg text-verified-text border border-verified-border font-bold uppercase text-[9px] tracking-wider whitespace-nowrap flex items-center gap-1 flex-shrink-0 shadow-xs">
            <span>✓ VERIFIED PRIMARY CORPUS</span>
          </span>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FAF6EE] border-b-2 border-ink px-4 pt-3 pb-6 space-y-2 animate-fadeIn max-h-[85vh] overflow-y-auto font-mono">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 border text-sm ${
              isActive('/') ? 'bg-ink text-white border-ink font-bold' : 'border-ink/20 text-ink'
            }`}
          >
            [ Front Page ]
          </Link>
          <Link
            to="/search"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 border text-sm ${
              isActive('/search') ? 'bg-ink text-white border-ink font-bold' : 'border-ink/20 text-ink'
            }`}
          >
            [ Dispatch Search ]
          </Link>

          {/* Collections Section in Mobile */}
          <div className="py-2 border-y border-ink/20 space-y-1">
            <div className="px-3 text-[11px] uppercase font-bold text-oxblood">
              Classified Holdings
            </div>
            {collectionLinks.map((col) => {
              const Icon = col.icon;
              return (
                <Link
                  key={col.path}
                  to={col.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs ${
                    location.pathname.startsWith(col.path) ? 'bg-newsprint-300 font-bold' : 'text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-oxblood flex-shrink-0" />
                  <span>{col.name}</span>
                </Link>
              );
            })}
          </div>

          {[
            { name: '[ Audio-Visual ]', path: '/media' },
            { name: '[ Chronology ]', path: '/timeline' },
            { name: '[ Knowledge Matrix ]', path: '/knowledge-graph' },
            { name: '[ ★ AI Research Assistant ]', path: '/research' },
            { name: '[ Registry Info ]', path: '/about' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 border text-sm ${
                isActive(link.path)
                  ? 'bg-ink text-white border-ink font-bold'
                  : 'border-ink/20 text-ink'
              }`}
            >
              {link.name}
            </Link>
          ))}

          {/* Mobile Utilities */}
          <div className="pt-3 border-t border-ink/20 flex flex-col space-y-2">
            <div className="flex items-center justify-between px-3 py-2 border border-ink/20 bg-newsprint-200 text-xs">
              <span className="flex items-center gap-2 font-bold text-ink">
                <Globe className="w-4 h-4 text-oxblood flex-shrink-0" />
                Language / भाषा:
              </span>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-[#FAF6EE] border border-ink/40 text-ink px-2 py-1 text-xs font-mono"
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
              className="px-3 py-2 border border-oxblood text-oxblood text-xs font-bold uppercase tracking-wider text-center"
            >
              ★ Tour Gazette Demonstration
            </Link>
            <Link
              to="/system-status"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 border border-ink/40 text-ink text-xs text-center"
            >
              Registry Subsystem Status
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 border border-ink/40 text-ink text-xs text-center"
            >
              Archivist Portal
            </Link>
            <button
              onClick={() => {
                enterKiosk();
                setMobileMenuOpen(false);
              }}
              className="w-full text-center px-3 py-2 text-white bg-ink border border-ink text-xs font-bold uppercase tracking-wider"
            >
              Launch Touchscreen Kiosk Desk
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
