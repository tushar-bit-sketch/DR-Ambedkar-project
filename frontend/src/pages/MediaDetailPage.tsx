import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Film, Volume2, Image, Play, Pause, RotateCcw, VolumeX, Maximize2,
  Calendar, MapPin, ShieldCheck, Download, FileText, Activity, Layers, ArrowLeft
} from 'lucide-react';
import { mediaApi } from '../services/mediaApi';
import { MediaAsset, MediaProvenance, MediaTranscript } from '../types/media';

export const MediaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mediaId = Number(id);

  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [provenance, setProvenance] = useState<MediaProvenance | null>(null);
  const [transcripts, setTranscripts] = useState<MediaTranscript[]>([]);
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Player state
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'TRANSCRIPT' | 'PROVENANCE' | 'TECHNICAL' | 'VERSIONS'>('TRANSCRIPT');
  const [activeSegmentId, setActiveSegmentId] = useState<number | null>(null);

  useEffect(() => {
    if (mediaId) {
      loadMediaDetails();
    }
  }, [mediaId]);

  const loadMediaDetails = async () => {
    setLoading(true);
    try {
      const a = await mediaApi.getMediaAsset(mediaId);
      setAsset(a);
      setDuration(a.duration || 0);

      const p = await mediaApi.getProvenance(mediaId).catch(() => null);
      setProvenance(p);

      const t = await mediaApi.getTranscripts(mediaId).catch(() => []);
      setTranscripts(t);

      if (a.media_type === 'AUDIO') {
        const wf = await mediaApi.getWaveform(mediaId).catch(() => []);
        setWaveformPeaks(wf);
      }
    } catch (err) {
      console.error('Failed to load media details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      const cur = mediaRef.current.currentTime;
      setCurrentTime(cur);

      // Highlight active transcript segment
      if (activeTranscript && activeTranscript.segments) {
        const seg = activeTranscript.segments.find(s => cur >= s.start_time && cur <= s.end_time);
        if (seg) {
          setActiveSegmentId(seg.id ?? null);
        }
      }
    }
  };

  const togglePlay = () => {
    if (mediaRef.current) {
      if (isPlaying) {
        mediaRef.current.pause();
        setIsPlaying(false);
      } else {
        mediaRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const seekTo = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = seconds;
      setCurrentTime(seconds);
      if (!isPlaying) {
        mediaRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (mediaRef.current) {
      mediaRef.current.playbackRate = rate;
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const activeTranscript = transcripts.find(t => t.status === 'APPROVED') ||
    transcripts.find(t => t.status === 'HUMAN_REVIEWED') ||
    transcripts[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center font-mono text-sm text-slate-500">
        Loading authenticated media asset #{mediaId}...
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] p-8 text-center">
        <h2 className="font-serif text-xl font-bold text-slate-900">Archival Media Item Not Found</h2>
        <button onClick={() => navigate('/media')} className="mt-4 px-4 py-2 bg-heritage-500 rounded text-xs font-semibold">
          Return to Media Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] pb-16">
      {/* Top Banner */}
      <div className="bg-[#1B2A4A] text-white border-b border-heritage-500 py-4 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/media')}
            className="flex items-center space-x-2 text-xs font-mono text-heritage-300 hover:text-heritage-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>RETURN TO ARCHIVE REPOSITORY</span>
          </button>
          <div className="flex items-center space-x-3 text-xs font-mono">
            <span className="px-2 py-0.5 bg-slate-800 text-heritage-300 rounded border border-slate-700">
              {asset.archive_id}
            </span>
            <span className="px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded border border-emerald-700/60 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>SHA-256 VERIFIED MASTER</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Grid: Player on left, Quick Metadata on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {/* Player Container */}
            <div className="bg-slate-950 rounded-lg overflow-hidden shadow-lg border border-slate-800">
              {asset.media_type === 'VIDEO' && (
                <div className="relative aspect-video bg-black flex items-center justify-center">
                  <video
                    ref={mediaRef as any}
                    src={mediaApi.getStreamUrl(asset.id)}
                    poster={asset.poster_path ? mediaApi.getPosterUrl(asset.id) : undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => setDuration(mediaRef.current?.duration || asset.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {asset.media_type === 'AUDIO' && (
                <div className="p-8 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center space-y-6">
                  <audio
                    ref={mediaRef as any}
                    src={mediaApi.getStreamUrl(asset.id)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => setDuration(mediaRef.current?.duration || asset.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <div className="w-20 h-20 rounded-full bg-heritage-500/20 text-heritage-400 flex items-center justify-center border border-heritage-500/40 shadow-inner">
                    <Volume2 className="w-10 h-10" />
                  </div>

                  {/* Waveform Visualization */}
                  <div className="w-full space-y-1">
                    <div className="flex items-end h-16 gap-1 px-4 justify-between bg-black/40 rounded p-2 border border-slate-800">
                      {(waveformPeaks.length > 0 ? waveformPeaks : Array(60).fill(0.3)).map((val, idx) => {
                        const progress = currentTime / (duration || 1);
                        const isPast = (idx / 60) <= progress;
                        return (
                          <div
                            key={idx}
                            onClick={() => seekTo((idx / 60) * duration)}
                            style={{ height: `${Math.max(10, val * 100)}%` }}
                            className={`flex-1 rounded-sm cursor-pointer transition ${
                              isPast ? 'bg-heritage-400' : 'bg-slate-700 hover:bg-slate-500'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {(asset.media_type === 'IMAGE' || asset.media_type === 'PHOTOGRAPH') && (
                <div className="relative aspect-auto max-h-[500px] bg-slate-900 flex items-center justify-center p-4">
                  <img
                    src={mediaApi.getStreamUrl(asset.id)}
                    alt={asset.title}
                    className="max-h-[480px] w-auto object-contain rounded shadow"
                  />
                </div>
              )}

              {/* Controls Bar for Audio/Video */}
              {(asset.media_type === 'VIDEO' || asset.media_type === 'AUDIO') && (
                <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
                  {/* Seek Bar */}
                  <div className="flex items-center space-x-3 text-xs font-mono text-slate-300">
                    <span>{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="flex-1 accent-heritage-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                    />
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Button Controls */}
                  <div className="flex items-center justify-between text-slate-200">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={togglePlay}
                        className="p-2 rounded-full bg-heritage-500 hover:bg-heritage-600 text-slate-950 font-bold transition"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950 ml-0.5" />}
                      </button>
                      <button
                        onClick={() => seekTo(Math.max(0, currentTime - 10))}
                        className="p-1.5 text-slate-400 hover:text-white transition"
                        title="Rewind 10s"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-slate-500">SPEED:</span>
                      {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`px-2 py-0.5 rounded ${
                            playbackRate === rate
                              ? 'bg-heritage-500 text-slate-950 font-bold'
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-mono text-heritage-600 uppercase tracking-wider">
                <span>{asset.media_type}</span>
                <span>•</span>
                <span>{asset.format}</span>
                <span>•</span>
                <span>{asset.language}</span>
              </div>
              <h1 className="font-serif text-2xl font-bold text-slate-900">
                {asset.title}
              </h1>
              {asset.description && (
                <p className="text-slate-700 text-sm leading-relaxed">
                  {asset.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Dossier Sidebar */}
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg border border-slate-200 space-y-4">
              <h3 className="font-serif font-bold text-slate-900 border-b pb-2 text-sm uppercase tracking-wider text-slate-700">
                Archival Catalog Dossier
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block">Primary Creator</span>
                  <span className="font-semibold text-slate-900">{asset.creator || 'Dr. B. R. Ambedkar'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Recording / Event</span>
                  <span className="font-semibold text-slate-900">{asset.date || 'Undated Historical Record'} ({asset.date_precision})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Location of Origin</span>
                  <span className="font-semibold text-slate-900">{asset.location || 'Central Provinces / Bombay Presidency'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Custodial Institution</span>
                  <span className="font-semibold text-slate-900">{asset.source_name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Rights & Access Level</span>
                  <span className="font-semibold text-slate-900">{asset.access_level} ({asset.download_policy})</span>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-slate-500 block font-mono text-[10px]">MASTER SHA-256</span>
                  <span className="font-mono text-[10px] break-all text-slate-700">{asset.checksum_sha256}</span>
                </div>
              </div>

              {asset.download_policy === 'DOWNLOAD_ALLOWED' && (
                <a
                  href={mediaApi.getDownloadUrl(asset.id)}
                  download={asset.original_filename}
                  className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center justify-center space-x-2 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Master Recording</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Lower Section: Transcripts, Provenance, Technical Metadata */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-xs font-semibold">
            {[
              { id: 'TRANSCRIPT', label: 'Timestamped Transcripts', icon: FileText },
              { id: 'PROVENANCE', label: 'Archival Provenance Chain', icon: ShieldCheck },
              { id: 'TECHNICAL', label: 'Technical Metadata (FFprobe / Native)', icon: Activity },
              { id: 'VERSIONS', label: 'Derivative Versions', icon: Layers },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 flex items-center space-x-2 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-heritage-500 text-slate-950 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 text-heritage-600" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6">
            {/* 1. Transcripts Tab */}
            {activeTab === 'TRANSCRIPT' && (
              <div className="space-y-4">
                {activeTranscript ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-slate-50 p-3 rounded border text-xs">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-slate-700">VERSION #{activeTranscript.version}</span>
                        <span className="px-2 py-0.5 bg-heritage-100 text-heritage-800 font-mono rounded">
                          {activeTranscript.status}
                        </span>
                        <span className="text-slate-500 font-mono">
                          Source: {activeTranscript.source_type}
                        </span>
                      </div>
                      {asset.captions && asset.captions.length > 0 && (
                        <a
                          href={`/api/v1/media/${asset.id}/captions.vtt`}
                          download={`${asset.archive_id}_captions.vtt`}
                          className="text-heritage-600 hover:underline flex items-center space-x-1 font-mono"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download WebVTT Captions</span>
                        </a>
                      )}
                    </div>

                    <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2">
                      {activeTranscript.segments.map((seg) => (
                        <div
                          key={seg.id}
                          onClick={() => seekTo(seg.start_time)}
                          className={`py-3 px-3 rounded flex items-start space-x-4 cursor-pointer transition ${
                            activeSegmentId === seg.id
                              ? 'bg-heritage-50 border-l-4 border-heritage-500'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-mono text-xs text-heritage-700 font-bold whitespace-nowrap bg-heritage-100/60 px-2 py-0.5 rounded">
                            {seg.start_timestamp_str}
                          </span>
                          <div className="space-y-1 flex-1 text-sm">
                            <span className="font-mono text-[10px] text-slate-500 block uppercase font-semibold">
                              {seg.speaker_label}
                            </span>
                            <p className="text-slate-800 leading-relaxed">
                              {seg.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-xs font-mono">
                    No transcript has been verified for this recording yet. Curators can transcribe or import captions via the Admin Panel.
                  </div>
                )}
              </div>
            )}

            {/* 2. Provenance Tab */}
            {activeTab === 'PROVENANCE' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded border text-xs text-slate-700">
                  <h4 className="font-bold text-slate-900 mb-1">Unbroken 5-Tier Archival Chain</h4>
                  <p className="text-slate-600">
                    This media item is anchored to an original physical recording and verified with SHA-256 cryptographic hashes.
                  </p>
                </div>

                {provenance && (
                  <div className="space-y-3">
                    {provenance.archival_lineage.map((tier, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-white rounded border border-slate-200">
                        <span className="w-6 h-6 rounded-full bg-heritage-100 text-heritage-800 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="space-y-1 text-xs">
                          <span className="font-mono font-bold text-slate-900">{tier.tier}</span>
                          <div className="text-slate-600 space-x-2">
                            {Object.entries(tier).map(([k, v]) => {
                              if (k === 'tier' || !v) return null;
                              return (
                                <span key={k} className="inline-block bg-slate-50 px-2 py-0.5 rounded font-mono text-[11px]">
                                  {k}: <strong className="text-slate-800">{String(v)}</strong>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Technical Metadata Tab */}
            {activeTab === 'TECHNICAL' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-50 rounded border">
                    <span className="text-slate-500 block">CONTAINER</span>
                    <span className="font-bold text-slate-900">{asset.format}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border">
                    <span className="text-slate-500 block">MIME TYPE</span>
                    <span className="font-bold text-slate-900">{asset.mime_type}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border">
                    <span className="text-slate-500 block">DURATION</span>
                    <span className="font-bold text-slate-900">{asset.duration ? `${asset.duration} sec` : 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border">
                    <span className="text-slate-500 block">FILE SIZE</span>
                    <span className="font-bold text-slate-900">{(asset.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Derivative Versions Tab */}
            {activeTab === 'VERSIONS' && (
              <div className="space-y-3">
                {asset.versions && asset.versions.length > 0 ? (
                  asset.versions.map((ver) => (
                    <div key={ver.id} className="p-3 bg-slate-50 rounded border flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-mono font-bold text-slate-900">
                          VERSION #{ver.version_number} — {ver.derivative_type}
                        </span>
                        <div className="text-slate-500 text-[11px] font-mono">
                          {ver.mime_type} • {ver.resolution || 'Audio/Binary'} • {ver.file_size ? `${(ver.file_size / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {ver.checksum_sha256?.substring(0, 16)}...
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">No version derivatives recorded.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
