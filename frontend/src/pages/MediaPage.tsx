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
    <div className="min-h-screen bg-[#FAF8F5]">
      {/* Header Banner */}
      <section className="bg-[#1B2A4A] text-white py-12 px-4 sm:px-6 lg:px-8 border-b-2 border-heritage-500">
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-heritage-300 uppercase tracking-wider">
            <Film className="w-4 h-4 text-heritage-400" />
            <span>PHASE 8 AUDIO-VISUAL DIGITAL PRESERVATION TIER</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">
            Audio, Video & Photographic Heritage Archive
          </h1>
          <p className="text-slate-300 text-sm max-w-3xl font-light leading-relaxed">
            Historical audio broadcasts, documentary footage, and authenticated photographic restorations.
            Every media asset is anchored with immutable archival checksums and timestamped provenance.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl flex gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search across media titles, speeches, and transcript texts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white/10 text-white placeholder-slate-400 border border-slate-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-heritage-400"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 bg-heritage-500 hover:bg-heritage-600 text-slate-950 font-semibold text-sm rounded transition"
            >
              Search
            </button>
          </form>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[
              { label: 'All Archives', value: 'ALL' },
              { label: 'Audio Recordings', value: 'AUDIO' },
              { label: 'Video Footage', value: 'VIDEO' },
              { label: 'Historical Photographs', value: 'PHOTOGRAPH' }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveFilter(tab.value as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                  activeFilter === tab.value
                    ? 'bg-heritage-500 text-slate-950 shadow'
                    : 'bg-white/10 hover:bg-white/20 text-slate-200'
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
          <div className="text-center py-20 text-slate-500 font-mono text-sm">
            Scanning authenticated media repository...
          </div>
        ) : mediaItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-slate-200 p-8 space-y-3">
            <Film className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-slate-900">No Archival Media Records Found</h3>
            <p className="text-slate-500 text-xs max-w-md mx-auto">
              No verified media items matched your criteria. Administrators can ingest master recordings via the Admin Media Dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaItems.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/media/${item.id}`)}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col group"
              >
                {/* Thumbnail / Poster Area */}
                <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                  {item.thumbnail_path ? (
                    <img
                      src={mediaApi.getThumbnailUrl(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : item.poster_path ? (
                    <img
                      src={mediaApi.getPosterUrl(item.id)}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="text-slate-500 flex flex-col items-center space-y-2">
                      {item.media_type === 'AUDIO' && <Volume2 className="w-10 h-10 text-heritage-400" />}
                      {item.media_type === 'VIDEO' && <Film className="w-10 h-10 text-heritage-400" />}
                      {(item.media_type === 'IMAGE' || item.media_type === 'PHOTOGRAPH') && <Image className="w-10 h-10 text-heritage-400" />}
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <div className="w-12 h-12 rounded-full bg-heritage-500 text-slate-950 flex items-center justify-center shadow-lg">
                      <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className="px-2 py-0.5 bg-slate-900/80 backdrop-blur text-white text-[10px] font-mono rounded">
                      {item.media_type}
                    </span>
                    <span className="px-2 py-0.5 bg-heritage-500/90 text-slate-950 text-[10px] font-mono font-bold rounded">
                      {item.format}
                    </span>
                  </div>

                  {item.duration && (
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white font-mono text-[10px] rounded">
                      {formatDuration(item.duration)}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      {item.archive_id}
                    </div>
                    <h3 className="font-serif font-bold text-slate-900 text-base line-clamp-2 group-hover:text-heritage-700 transition">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-slate-600 text-xs line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.date || 'Undated Historical'}</span>
                    </div>
                    {item.location && (
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
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
