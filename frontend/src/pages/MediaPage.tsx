import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Volume2, Image, Play, Calendar, MapPin, Search, Tag, Eye } from 'lucide-react';
import { mediaApi } from '../services/mediaApi';
import { MediaAsset } from '../types/media';

export const MediaPage: React.FC = () => {
  const navigate = useNavigate();
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'AUDIO' | 'VIDEO' | 'PHOTOGRAPH'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadMedia();
  }, [activeFilter]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      if (searchQuery.trim()) {
        const results = await mediaApi.searchMedia(searchQuery, activeFilter === 'ALL' ? undefined : activeFilter);
        setMediaItems(results);
      } else {
        const items = await mediaApi.getMediaList({
          media_type: activeFilter === 'ALL' ? undefined : activeFilter,
          verification_status: 'VERIFIED'
        });
        setMediaItems(items);
      }
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadMedia();
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return null;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink">
      {/* Broadsheet Masthead */}
      <section className="bg-[#FAF6EE] text-ink py-8 px-4 sm:px-6 lg:px-8 border-b-2 border-double border-ink shadow-sm">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-[11px] font-mono text-oxblood uppercase tracking-widest font-bold">
            <Film className="w-3.5 h-3.5 text-oxblood" />
            <span>RECORD DIVISION • MULTIMEDIA REPOSITORY & GRAMOPHONE DISPATCHES</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-black tracking-tight text-ink">
            Audio, Gramophone & Film Dispatch Archive
          </h1>
          <p className="text-stone-700 text-xs sm:text-sm max-w-3xl font-editorial italic leading-relaxed">
            Historical audio recordings, All India Radio broadcasts, newsreel footage, and authenticated photographic restorations.
            Every media asset is anchored with immutable cryptographic checksums and custodial provenance.
          </p>

          {/* Typewriter Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-500" />
              <input
                type="text"
                placeholder="Search across broadcast dispatches, audio speeches, transcript texts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white text-ink placeholder-stone-400 border-2 border-ink text-xs font-mono focus:outline-none focus:ring-1 focus:ring-oxblood shadow-letterpress-sm"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-ink hover:bg-oxblood text-white font-mono font-bold uppercase text-xs transition border border-ink shadow-letterpress-sm"
            >
              [ Inquire ]
            </button>
          </form>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: 'All Dispatches', value: 'ALL' },
              { label: 'Audio & Speeches', value: 'AUDIO' },
              { label: 'Newsreel & Video', value: 'VIDEO' },
              { label: 'Historical Photographs', value: 'PHOTOGRAPH' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value as any)}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase transition border ${
                  activeFilter === tab.value
                    ? 'bg-ink text-white border-ink shadow-letterpress-sm'
                    : 'bg-[#FAF6EE] text-ink border-ink/40 hover:border-ink hover:bg-[#EFE8DA]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="text-center py-20 text-stone-600 font-mono text-xs">
            Scanning authenticated archival media registers...
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="text-center py-16 bg-[#FAF6EE] border-2 border-ink p-8 space-y-3 shadow-letterpress">
            <Film className="w-12 h-12 text-oxblood mx-auto" />
            <h3 className="font-serif text-lg font-bold text-ink">No Archival Media Dispatches Found</h3>
            <p className="text-stone-600 text-xs font-editorial max-w-md mx-auto">
              No verified media items matched your criteria. Custodians can register audio-visual master recordings via the Admin Media Registry.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/media/${item.id}`)}
                className="bg-[#FAF6EE] border-2 border-ink overflow-hidden shadow-letterpress-sm hover:shadow-letterpress transition cursor-pointer flex flex-col group"
              >
                {/* Thumbnail / Poster Area */}
                <div className="relative aspect-video bg-[#1A1714] flex items-center justify-center overflow-hidden border-b-2 border-ink">
                  {item.thumbnail_path ? (
                    <img
                      src={mediaApi.getThumbnailUrl(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300 filter contrast-105"
                    />
                  ) : item.poster_path ? (
                    <img
                      src={mediaApi.getPosterUrl(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300 filter contrast-105"
                    />
                  ) : (
                    <div className="text-stone-400 flex flex-col items-center space-y-2">
                      {item.media_type === 'AUDIO' && <Volume2 className="w-10 h-10 text-oxblood" />}
                      {item.media_type === 'VIDEO' && <Film className="w-10 h-10 text-oxblood" />}
                      {(item.media_type === 'IMAGE' || item.media_type === 'PHOTOGRAPH') && <Image className="w-10 h-10 text-oxblood" />}
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <div className="w-12 h-12 bg-white text-ink flex items-center justify-center shadow-letterpress-sm border border-ink">
                      <Play className="w-6 h-6 fill-ink ml-0.5" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1 font-mono">
                    <span className="px-2 py-0.5 bg-ink text-white text-[10px] font-bold border border-ink uppercase">
                      {item.media_type}
                    </span>
                    <span className="px-2 py-0.5 bg-oxblood text-white text-[10px] font-bold border border-ink uppercase">
                      {item.format}
                    </span>
                  </div>

                  {item.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-ink text-white font-mono text-[10px] border border-ink font-bold">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-mono text-oxblood uppercase font-bold tracking-wider">
                      {item.archive_id}
                    </div>
                    <h3 className="font-serif font-bold text-ink text-base line-clamp-2 group-hover:text-oxblood transition">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-stone-700 text-xs font-editorial line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-ink/20 flex items-center justify-between text-[11px] font-mono text-stone-600">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-oxblood" />
                      <span>{item.date || 'Historical Record'}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-oxblood" />
                        <span className="truncate max-w-[120px]">{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
