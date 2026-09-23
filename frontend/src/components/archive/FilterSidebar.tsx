import React from 'react';
import { Filter, RotateCcw, Check } from 'lucide-react';
import { Collection } from '../../types';

interface FilterSidebarProps {
  collections: Collection[];
  selectedCollection: number | null;
  onSelectCollection: (id: number | null) => void;
  selectedType: string | null;
  onSelectType: (type: string | null) => void;
  selectedLanguage: string | null;
  onSelectLanguage: (lang: string | null) => void;
  selectedYear: number | null;
  onSelectYear: (year: number | null) => void;
  selectedTopic: string | null;
  onSelectTopic: (topic: string | null) => void;
  onReset: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  collections,
  selectedCollection,
  onSelectCollection,
  selectedType,
  onSelectType,
  selectedLanguage,
  onSelectLanguage,
  selectedYear,
  onSelectYear,
  selectedTopic,
  onSelectTopic,
  onReset
}) => {
  const documentTypes = [
    { label: 'All Types', value: null },
    { label: 'Constituent Assembly Debates', value: 'DEBATE' },
    { label: 'Books & Monographs', value: 'BOOK' },
    { label: 'Speeches & Addresses', value: 'SPEECH' },
    { label: 'Manuscripts & Typescripts', value: 'MANUSCRIPT' },
    { label: 'Official Gazettes & Acts', value: 'GAZETTE' },
  ];

  const languages = [
    { label: 'All Languages', value: null },
    { label: 'English', value: 'English' },
    { label: 'Marathi (मराठी)', value: 'Marathi' },
    { label: 'Hindi (हिंदी)', value: 'Hindi' },
    { label: 'Pali (पालि)', value: 'Pali' },
  ];

  const years = [
    { label: 'All Years', value: null },
    { label: '1949 (Draft Constitution Adoption)', value: 1949 },
    { label: '1948 (Draft Constitution Debates)', value: 1948 },
    { label: '1947 (Drafting Committee Formation)', value: 1947 },
    { label: '1936 (Annihilation of Caste)', value: 1936 },
    { label: '1927 (Mahad Satyagraha)', value: 1927 },
    { label: '1923 (Problem of the Rupee)', value: 1923 },
    { label: '1916 (Columbia University)', value: 1916 },
  ];

  const topics = [
    { label: 'All Topics', value: null },
    { label: 'Constitutional Law & Rights', value: 'constitutional-law' },
    { label: 'Social Democracy & Caste', value: 'social-democracy' },
    { label: 'Monetary Economics & Rupee', value: 'monetary-economics' },
    { label: 'Labour Law & Working Hours', value: 'labour-rights' },
    { label: 'Buddhist Philosophy & Ethics', value: 'buddhist-philosophy' },
    { label: 'Women\'s Rights & Hindu Code', value: 'womens-rights' },
  ];

  const hasActiveFilters = Boolean(
    selectedCollection || selectedType || selectedLanguage || selectedYear || selectedTopic
  );

  return (
    <aside aria-label="Archive Filters" className="bg-white border border-stone-200 rounded-lg p-5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-heritage-600" />
          <h3 className="font-serif font-bold text-sm text-ink-900 uppercase tracking-wider">
            Archive Filters
          </h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-heritage-700 hover:text-heritage-900 font-medium flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Collection Filter */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Archival Collection
        </label>
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          <button
            onClick={() => onSelectCollection(null)}
            className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
              selectedCollection === null
                ? 'bg-heritage-100 text-heritage-900 font-semibold'
                : 'text-slate-600 hover:bg-stone-50'
            }`}
          >
            <span>All Collections</span>
            {selectedCollection === null && <Check className="w-3.5 h-3.5 text-heritage-700" />}
          </button>
          {collections.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCollection(c.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                selectedCollection === c.id
                  ? 'bg-heritage-100 text-heritage-900 font-semibold'
                  : 'text-slate-600 hover:bg-stone-50'
              }`}
            >
              <span className="truncate pr-2">{c.title}</span>
              {selectedCollection === c.id && <Check className="w-3.5 h-3.5 text-heritage-700 flex-shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Document Type
        </label>
        <div className="space-y-1">
          {documentTypes.map((dt) => (
            <button
              key={dt.label}
              onClick={() => onSelectType(dt.value)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition flex items-center justify-between ${
                selectedType === dt.value
                  ? 'bg-heritage-100 text-heritage-900 font-semibold'
                  : 'text-slate-600 hover:bg-stone-50'
              }`}
            >
              <span>{dt.label}</span>
              {selectedType === dt.value && <Check className="w-3.5 h-3.5 text-heritage-700" />}
            </button>
          ))}
        </div>
      </div>

      {/* Year */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Historical Year / Epoch
        </label>
        <select
          value={selectedYear || ''}
          onChange={(e) => onSelectYear(e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs p-2 rounded border border-stone-300 bg-stone-50 text-slate-800 focus:outline-none focus:border-heritage-500"
        >
          {years.map((y) => (
            <option key={y.label} value={y.value || ''}>
              {y.label}
            </option>
          ))}
        </select>
      </div>

      {/* Language */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Language
        </label>
        <select
          value={selectedLanguage || ''}
          onChange={(e) => onSelectLanguage(e.target.value || null)}
          className="w-full text-xs p-2 rounded border border-stone-300 bg-stone-50 text-slate-800 focus:outline-none focus:border-heritage-500"
        >
          {languages.map((l) => (
            <option key={l.label} value={l.value || ''}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Topics */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
          Jurisprudential & Historical Topic
        </label>
        <select
          value={selectedTopic || ''}
          onChange={(e) => onSelectTopic(e.target.value || null)}
          className="w-full text-xs p-2 rounded border border-stone-300 bg-stone-50 text-slate-800 focus:outline-none focus:border-heritage-500"
        >
          {topics.map((t) => (
            <option key={t.label} value={t.value || ''}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
};
