import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, LayoutGrid, List, SlidersHorizontal, RefreshCw, X } from 'lucide-react';
import { apiService } from '../services/api';
import { DocumentItem, Collection } from '../types';
import { DocumentCard } from '../components/archive/DocumentCard';
import { FilterSidebar } from '../components/archive/FilterSidebar';
import { DocumentViewerModal } from '../components/archive/DocumentViewerModal';
import { DemoBanner } from '../components/archive/DemoBanner';

export const ExplorePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter states from URL or state
  const searchQuery = searchParams.get('q') || '';
  const selectedCollection = searchParams.get('collection_id') ? Number(searchParams.get('collection_id')) : null;
  const selectedType = searchParams.get('document_type') || null;
  const selectedLanguage = searchParams.get('language') || null;
  const selectedYear = searchParams.get('year') ? Number(searchParams.get('year')) : null;
  const selectedTopic = searchParams.get('topic') || null;

  useEffect(() => {
    apiService.getCollections().then(setCollections);
  }, []);

  useEffect(() => {
    setLoading(true);
    apiService.getDocuments({
      q: searchQuery || undefined,
      collection_id: selectedCollection || undefined,
      document_type: selectedType || undefined,
      year: selectedYear || undefined,
      page_size: 24
    }).then(res => {
      let filtered = res.items;
      if (selectedLanguage) {
        filtered = filtered.filter(d => d.language_name?.toLowerCase() === selectedLanguage.toLowerCase());
      }
      setDocuments(filtered);
      setLoading(false);
    });
  }, [searchQuery, selectedCollection, selectedType, selectedLanguage, selectedYear, selectedTopic]);

  const updateFilter = (key: string, value: string | number | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === '') {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    setSearchParams(newParams);
  };

  const handleResetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5]">
      <DemoBanner isDemoData={documents.some(d => d.is_demo_data)} />

      {/* Explore Header Bar */}
      <section className="bg-[#1B2A4A] text-white py-10 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-heritage-300 uppercase tracking-wider">
            <span>CATALOG EXPLORATION</span>
            <span>•</span>
            <span>DUBLIN CORE REPOSITORY</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold">
            Explore Archival Records
          </h1>

          <p className="text-slate-300 text-sm max-w-3xl font-light">
            Search across speeches, constituent assembly debates, published monographs, gazette orders, and manuscript facsimiles.
          </p>

          {/* Main Search Input */}
          <div className="pt-2 max-w-3xl">
            <div className="relative flex items-center shadow-lg">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateFilter('q', e.target.value)}
                placeholder="Search writings, speeches, debates, manuscripts..."
                className="w-full pl-12 pr-10 py-3.5 rounded-lg text-slate-900 bg-white border border-stone-300 focus:outline-none focus:border-heritage-500 text-sm sm:text-base font-sans"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-4" />
              {searchQuery && (
                <button
                  onClick={() => updateFilter('q', null)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area: Sidebar + Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="lg:hidden px-3 py-2 bg-white border border-stone-300 rounded text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-heritage-600" />
              <span>Filters</span>
            </button>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">
              Showing {documents.length} Archival Items
            </span>
            <span className="hidden sm:inline text-xs text-amber-700 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              [DEMO DATA CATALOG]
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded border transition ${
                viewMode === 'grid'
                  ? 'bg-national-700 text-white border-national-700'
                  : 'bg-white text-slate-600 border-stone-300 hover:bg-stone-50'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded border transition ${
                viewMode === 'list'
                  ? 'bg-national-700 text-white border-national-700'
                  : 'bg-white text-slate-600 border-stone-300 hover:bg-stone-50'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Desktop Filter Sidebar (3 cols) */}
          <div className="hidden lg:block lg:col-span-3 sticky top-28">
            <FilterSidebar
              collections={collections}
              selectedCollection={selectedCollection}
              onSelectCollection={(id) => updateFilter('collection_id', id)}
              selectedType={selectedType}
              onSelectType={(type) => updateFilter('document_type', type)}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={(lang) => updateFilter('language', lang)}
              selectedYear={selectedYear}
              onSelectYear={(year) => updateFilter('year', year)}
              selectedTopic={selectedTopic}
              onSelectTopic={(topic) => updateFilter('topic', topic)}
              onReset={handleResetFilters}
            />
          </div>

          {/* Mobile Filter Drawer */}
          {mobileFilterOpen && (
            <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex justify-end">
              <div className="bg-white w-full max-w-xs h-full rounded-lg p-4 overflow-y-auto space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h3 className="font-serif font-bold text-base text-ink-900">Filters</h3>
                  <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-slate-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <FilterSidebar
                  collections={collections}
                  selectedCollection={selectedCollection}
                  onSelectCollection={(id) => { updateFilter('collection_id', id); setMobileFilterOpen(false); }}
                  selectedType={selectedType}
                  onSelectType={(type) => { updateFilter('document_type', type); setMobileFilterOpen(false); }}
                  selectedLanguage={selectedLanguage}
                  onSelectLanguage={(lang) => { updateFilter('language', lang); setMobileFilterOpen(false); }}
                  selectedYear={selectedYear}
                  onSelectYear={(year) => { updateFilter('year', year); setMobileFilterOpen(false); }}
                  selectedTopic={selectedTopic}
                  onSelectTopic={(topic) => { updateFilter('topic', topic); setMobileFilterOpen(false); }}
                  onReset={() => { handleResetFilters(); setMobileFilterOpen(false); }}
                />
              </div>
            </div>
          )}

          {/* Results Area (9 cols) */}
          <div className="lg:col-span-9 space-y-6">
            {loading ? (
              <div className="bg-white rounded-lg p-12 text-center border border-stone-200 shadow-sm flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-8 h-8 text-heritage-600 animate-spin" />
                <span className="text-sm font-medium text-slate-600">Loading archival records...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="bg-white rounded-lg p-12 text-center border border-stone-200 shadow-sm space-y-3">
                <p className="font-serif text-lg font-bold text-ink-900">
                  No Archival Records Found Matching Your Criteria
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Try clearing some filters or searching for terms like "Constitution", "Caste", "Rupee", or "Mahad".
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-heritage-500 hover:bg-heritage-600 text-slate-950 text-xs font-bold rounded transition shadow-sm"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "space-y-4"}>
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    viewMode={viewMode}
                    onSelect={(d) => setSelectedDoc(d)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentViewerModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
