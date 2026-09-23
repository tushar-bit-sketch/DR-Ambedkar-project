import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Film, Volume2, Image as ImageIcon, Play, Search, 
  CheckCircle2, Clock, Calendar, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import { mediaApi } from '../../services/mediaApi';
import { MediaAsset } from '../../types/media';

export const KioskMediaPage: React.FC = () => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    mediaApi.getKioskFeed(mediaTypeFilter === 'ALL' ? undefined : mediaTypeFilter)
      .then(res => {
        if (mounted) {
          setAssets(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [mediaTypeFilter]);

  const filteredAssets = searchQuery.trim() === ''
    ? assets
    : assets.filter(a => 
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.historical_context?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Film className="w-8 h-8 text-amber-400" />;
      case 'AUDIO': return <Volume2 className="w-8 h-8 text-emerald-400" />;
      case 'PHOTOGRAPH': return <ImageIcon className="w-8 h-8 text-blue-400" />;
      default: return <Film className="w-8 h-8 text-stone-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-8 select-none">
      {/* Kiosk Header Banner */}
      <div className="bg-[#102038] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 border-2 border-heritage-500/40">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-heritage-500 text-slate-950 flex items-center justify-center font-bold shadow-inner">
            <Film className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-heritage-500/20 text-heritage-300 font-mono text-xs font-semibold uppercase tracking-wider">
                Touchscreen Archival Gallery
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-semibold">
                Authentic Masters
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-white mt-1">
              Historical Audiovisual Vault
            </h1>
            <p className="text-xs sm:text-sm text-heritage-200 mt-1">
              Verified original recordings, speeches, ceremonies, and photographic glass plates
            </p>
          </div>
        </div>

        {/* Media Type Filter Pills (Touch-Friendly Large Buttons) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Media' },
            { id: 'VIDEO', label: 'Film & Video' },
            { id: 'AUDIO', label: 'Audio Records' },
            { id: 'PHOTOGRAPH', label: 'Photographs' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setMediaTypeFilter(f.id)}
              className={`flex-1 md:flex-initial px-4 py-3 rounded-xl font-bold text-sm transition-all text-center ${
                mediaTypeFilter === f.id
                  ? 'bg-heritage-500 text-slate-950 shadow-md scale-105'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Touch Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="w-6 h-6 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Touch to search speeches, titles, historical context..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border-2 border-stone-300 focus:border-heritage-500 shadow-sm text-base sm:text-lg font-medium text-slate-900 focus:outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-stone-200 hover:bg-stone-300 rounded-lg text-xs font-bold text-stone-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid of Media Cards */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-12 h-12 border-4 border-heritage-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-serif text-lg text-slate-700">Loading verified archival media...</p>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-stone-300 max-w-xl mx-auto my-12">
          <Film className="w-12 h-12 text-stone-400 mx-auto mb-3" />
          <h3 className="font-serif text-xl font-bold text-slate-800">No archival recordings found</h3>
          <p className="text-xs text-slate-500 mt-2">
            No media matches the selected criteria. Try selecting another filter or clearing the search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <div
              key={asset.id}
              onClick={() => navigate(`/kiosk/media/${asset.id}`)}
              className="bg-white rounded-3xl overflow-hidden shadow-md hover:shadow-2xl border-2 border-stone-200 hover:border-heritage-500 transition cursor-pointer flex flex-col transform hover:-translate-y-1 active:scale-[0.99]"
            >
              {/* Thumbnail / Poster Area */}
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                <img
                  src={mediaApi.getPosterUrl(asset.id)}
                  alt={asset.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if thumbnail is unavailable
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />
                
                {/* Media Icon & Play Indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-heritage-500/90 text-slate-950 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/20">
                    {getMediaIcon(asset.media_type)}
                    <span className="text-[11px]">{asset.media_type}</span>
                  </span>
                </div>

                {/* Duration Badge */}
                {asset.duration_seconds && (
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-white font-mono text-xs flex items-center gap-1 border border-white/20">
                    <Clock className="w-3.5 h-3.5 text-heritage-400" />
                    <span>{formatDuration(asset.duration_seconds)}</span>
                  </div>
                )}
              </div>

              {/* Details Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                    {asset.date_recorded && (
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-heritage-600" />
                        {asset.date_recorded}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
                      {asset.verification_status}
                    </span>
                  </div>

                  <h3 className="font-serif font-bold text-lg text-slate-900 line-clamp-2 leading-snug">
                    {asset.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                    {asset.description || asset.historical_context || 'Verified archival accession.'}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-stone-200 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-500 uppercase">
                    Format: {asset.file_format || 'Original Master'}
                  </span>
                  <div className="flex items-center gap-1 text-heritage-700 font-bold text-sm">
                    <span>Touch to Play</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
