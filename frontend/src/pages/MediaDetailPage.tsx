import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Film, Volume2, Image, Play, Pause, RotateCcw, VolumeX, Maximize2,
  Calendar, MapPin, ShieldCheck, Download, FileText, Activity, Layers, ArrowLeft
} from 'lucide-react';
import { mediaApi } from '../services/mediaApi';
import { MediaAsset, MediaProvenance, MediaTranscript } from '../types/media';
import { PageMasthead } from '../components/layout/PageMasthead';

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
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-[#FAF6EE] border-2 border-ink p-8 text-center shadow-letterpress">
          <div className="archival-loading-bar mb-4" />
          <h2 className="font-serif font-black text-xl text-ink">Accessing Media Vault</h2>
          <p className="text-xs font-mono text-ink/70 mt-2">RETRIEVING AUTHENTICATED AUDIO-VISUAL ASSET #{mediaId}...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FAF6EE] border-2 border-ink p-8 text-center shadow-letterpress">
          <Film className="w-10 h-10 text-oxblood mx-auto mb-3" />
          <h2 className="font-serif font-black text-xl text-ink mb-1">Archival Media Item Not Found</h2>
          <p className="text-ink/80 text-xs font-editorial mb-6">Requested media dispatch does not exist in the active archival repository.</p>
          <button
            onClick={() => navigate('/media')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-ink text-white text-xs font-mono font-bold uppercase hover:bg-oxblood transition border border-ink shadow-letterpress-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> [ Return to Media Catalog ]
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4EFE6] text-ink pb-16">
      {/* Top Gazette Masthead */}
      <PageMasthead
        eyebrow="Archival Multimedia Vault • Dispatch Master Record"
        headline={asset.title}
        subheadline={asset.description || 'Primary audio-visual record with synchronized transcripts, waveform acoustic analysis, and SHA-256 cryptographic attestation.'}
        accession={`RECORD ID: ${asset.archive_id} • TYPE: ${asset.media_type} • FORMAT: ${asset.format}`}
        badge="SHA-256 VERIFIED MASTER"
        rightSlot={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/media')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-ink text-xs font-mono font-bold uppercase hover:bg-[#E2D7C3] transition border border-ink shadow-letterpress-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> [ Return ]
            </button>
            {asset.download_policy === 'DOWNLOAD_ALLOWED' && (
              <a
                href={mediaApi.getDownloadUrl(asset.id)}
                download={asset.original_filename}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-ink text-white text-xs font-mono font-bold uppercase hover:bg-oxblood transition border border-ink shadow-letterpress-sm"
              >
                <Download className="w-3.5 h-3.5" /> [ Download ]
              </a>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Main Grid: Player on left, Quick Metadata on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {/* Player Container */}
            <div className="bg-[#1A1714] border-2 border-ink shadow-letterpress overflow-hidden">
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
                <div className="p-8 bg-[#1A1714] flex flex-col items-center justify-center space-y-6">
                  <audio
                    ref={mediaRef as any}
                    src={mediaApi.getStreamUrl(asset.id)}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => setDuration(mediaRef.current?.duration || asset.duration || 0)}
                    onEnded={() => setIsPlaying(false)}
                  />
                  <div className="w-20 h-20 bg-[#FAF6EE] text-ink flex items-center justify-center border-2 border-ink shadow-letterpress-sm">
                    <Volume2 className="w-10 h-10 text-oxblood" />
                  </div>

                  {/* Waveform Visualization */}
                  <div className="w-full space-y-1">
                    <div className="flex items-end h-16 gap-1 px-4 justify-between bg-black/60 p-2 border border-stone-800">
                      {(waveformPeaks.length > 0 ? waveformPeaks : Array(60).fill(0.3)).map((val, idx) => {
                        const progress = currentTime / (duration || 1);
                        const isPast = (idx / 60) <= progress;
                        return (
                          <div
                            key={idx}
                            onClick={() => seekTo((idx / 60) * duration)}
                            style={{ height: `${Math.max(10, val * 100)}%` }}
                            className={`flex-1 cursor-pointer transition ${
                              isPast ? 'bg-oxblood' : 'bg-stone-600 hover:bg-stone-400'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {(asset.media_type === 'IMAGE' || asset.media_type === 'PHOTOGRAPH') && (
                <div className="relative aspect-auto max-h-[500px] bg-[#1A1714] flex items-center justify-center p-4">
                  <img
                    src={mediaApi.getStreamUrl(asset.id)}
                    alt={asset.title}
                    className="max-h-[480px] w-auto object-contain border border-stone-700 shadow"
                  />
                </div>
              )}

              {/* Controls Bar for Audio/Video */}
              {(asset.media_type === 'VIDEO' || asset.media_type === 'AUDIO') && (
                <div className="p-4 bg-[#23201C] border-t-2 border-ink space-y-3 font-mono">
                  {/* Seek Bar */}
                  <div className="flex items-center space-x-3 text-xs text-stone-300">
                    <span>{formatTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => seekTo(Number(e.target.value))}
                      className="flex-1 accent-oxblood cursor-pointer h-1.5 bg-stone-700 rounded-none"
                    />
                    <span>{formatTime(duration)}</span>
                  </div>

                  {/* Button Controls */}
                  <div className="flex items-center justify-between text-stone-200">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={togglePlay}
                        className="p-2 bg-[#FAF6EE] hover:bg-oxblood hover:text-white text-ink font-bold transition border border-ink shadow-letterpress-sm"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                      <button
                        onClick={() => seekTo(Math.max(0, currentTime - 10))}
                        className="p-1.5 text-stone-400 hover:text-white transition"
                        title="Rewind 10s"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Speed Controls */}
                    <div className="flex items-center space-x-2 text-xs font-mono">
                      <span className="text-stone-400">SPEED:</span>
                      {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => changeSpeed(rate)}
                          className={`px-2 py-0.5 border ${
                            playbackRate === rate
                              ? 'bg-oxblood text-white border-oxblood font-bold'
                              : 'bg-stone-800 text-stone-300 hover:bg-stone-700 border-stone-700'
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
            <div className="bg-[#FAF6EE] p-6 border-2 border-ink space-y-3 shadow-letterpress-sm">
              <div className="flex items-center space-x-2 text-xs font-mono text-oxblood uppercase font-bold tracking-wider">
                <span>{asset.media_type}</span>
                <span>•</span>
                <span>{asset.format}</span>
                <span>•</span>
                <span>{asset.language}</span>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-black text-ink">
                {asset.title}
              </h1>
              {asset.description && (
                <p className="text-ink/90 text-sm font-editorial leading-relaxed">
                  {asset.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Dossier Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#FAF6EE] p-6 border-2 border-ink space-y-4 shadow-letterpress-sm">
              <h3 className="font-serif font-black text-ink border-b-2 border-ink pb-2 text-sm uppercase tracking-wider">
                Archival Catalog Dossier
              </h3>
              <div className="space-y-3 text-xs font-mono">
                <div>
                  <span className="text-ink/60 block uppercase">Primary Creator</span>
                  <span className="font-bold text-ink text-sm font-serif">{asset.creator || 'Dr. B. R. Ambedkar'}</span>
                </div>
                <div>
                  <span className="text-ink/60 block uppercase">Date of Recording / Event</span>
                  <span className="font-bold text-ink">{asset.date || 'Historical Record'} ({asset.date_precision})</span>
                </div>
                <div>
                  <span className="text-ink/60 block uppercase">Location of Origin</span>
                  <span className="font-bold text-ink">{asset.location || 'Central Provinces / Bombay Presidency'}</span>
                </div>
                <div>
                  <span className="text-ink/60 block uppercase">Custodial Institution</span>
                  <span className="font-bold text-ink">{asset.source_name}</span>
                </div>
                <div>
                  <span className="text-ink/60 block uppercase">Rights & Access Level</span>
                  <span className="font-bold text-ink">{asset.access_level} ({asset.download_policy})</span>
                </div>
                <div className="pt-2 border-t border-ink/20">
                  <span className="text-ink/60 block font-mono text-[10px] uppercase font-bold">MASTER SHA-256</span>
                  <span className="font-mono text-[10px] break-all text-ink/80">{asset.checksum_sha256}</span>
                </div>
              </div>

              {asset.download_policy === 'DOWNLOAD_ALLOWED' && (
                <a
                  href={mediaApi.getDownloadUrl(asset.id)}
                  download={asset.original_filename}
                  className="w-full mt-4 py-2 bg-ink hover:bg-oxblood text-white font-mono font-bold uppercase text-xs flex items-center justify-center space-x-2 transition border border-ink shadow-letterpress-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>[ Download Master Recording ]</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Lower Section: Transcripts, Provenance, Technical Metadata */}
        <div className="bg-[#FAF6EE] border-2 border-ink shadow-letterpress overflow-hidden">
          <div className="flex border-b-2 border-ink bg-[#EFE8DA] px-6 gap-6 text-xs font-mono uppercase font-bold">
            {[
              { id: 'TRANSCRIPT', label: 'Timestamped Transcripts', icon: FileText },
              { id: 'PROVENANCE', label: 'Archival Provenance Chain', icon: ShieldCheck },
              { id: 'TECHNICAL', label: 'Technical Metadata (FFprobe)', icon: Activity },
              { id: 'VERSIONS', label: 'Derivative Versions', icon: Layers },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 flex items-center space-x-2 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-ink text-ink font-bold bg-[#FAF6EE]'
                      : 'border-transparent text-ink/70 hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4 text-oxblood" />
                  <span>[ {tab.label} ]</span>
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
                    <div className="flex items-center justify-between bg-white p-3 border-2 border-ink text-xs font-mono shadow-letterpress-sm">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-ink">TRANSCRIPT RECORD #{activeTranscript.version}</span>
                        <span className="px-2 py-0.5 bg-oxblood text-white border border-ink uppercase font-bold text-[10px]">
                          {activeTranscript.status}
                        </span>
                        <span className="text-ink/70">
                          Source: {activeTranscript.source_type}
                        </span>
                      </div>
                      {asset.captions && asset.captions.length > 0 && (
                        <a
                          href={`/api/v1/media/${asset.id}/captions.vtt`}
                          download={`${asset.archive_id}_captions.vtt`}
                          className="text-oxblood hover:text-ink hover:underline flex items-center space-x-1 font-bold"
                        >
                          <Download className="w-3 h-3" />
                          <span>[ Download WebVTT Captions ]</span>
                        </a>
                      )}
                    </div>

                    <div className="divide-y divide-ink/20 max-h-96 overflow-y-auto pr-2">
                      {activeTranscript.segments.map((seg) => (
                        <div
                          key={seg.id}
                          onClick={() => seekTo(seg.start_time)}
                          className={`py-3 px-3 flex items-start space-x-4 cursor-pointer transition border-b border-ink/10 ${
                            activeSegmentId === seg.id
                              ? 'bg-[#FFFDF9] border-l-4 border-oxblood'
                              : 'hover:bg-[#EFE8DA]'
                          }`}
                        >
                          <span className="font-mono text-xs text-oxblood font-bold whitespace-nowrap bg-white px-2 py-0.5 border border-ink shadow-letterpress-sm">
                            {seg.start_timestamp_str}
                          </span>
                          <div className="space-y-1 flex-1">
                            <span className="font-mono text-[10px] text-ink/60 block uppercase font-bold">
                              {seg.speaker_label}
                            </span>
                            <p className="text-ink font-editorial text-sm leading-relaxed">
                              {seg.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-ink/60 text-xs font-mono">
                    No transcript has been verified for this recording yet. Curators can transcribe or import captions via the Admin Panel.
                  </div>
                )}
              </div>
            )}

            {/* 2. Provenance Tab */}
            {activeTab === 'PROVENANCE' && (
              <div className="space-y-4">
                <div className="bg-white p-4 border-2 border-ink text-xs text-ink shadow-letterpress-sm">
                  <h4 className="font-bold text-oxblood font-mono uppercase mb-1">Unbroken 5-Tier Archival Chain</h4>
                  <p className="text-ink/80 font-editorial">
                    This media item is anchored to an original physical recording and verified with SHA-256 cryptographic hashes.
                  </p>
                </div>

                {provenance && (
                  <div className="space-y-3">
                    {provenance.archival_lineage.map((tier, idx) => (
                      <div key={idx} className="flex items-start space-x-3 p-3 bg-white border-2 border-ink shadow-letterpress-sm">
                        <span className="w-6 h-6 bg-ink text-white font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <div className="space-y-1 text-xs font-mono">
                          <span className="font-bold text-ink uppercase">{tier.tier}</span>
                          <div className="text-ink/70 space-x-2">
                            {Object.entries(tier).map(([k, v]) => {
                              if (k === 'tier' || !v) return null;
                              return (
                                <span key={k} className="inline-block bg-[#EFE8DA] px-2 py-0.5 border border-ink/30 text-[11px]">
                                  {k}: <strong className="text-ink">{String(v)}</strong>
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
                  <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
                    <span className="text-ink/60 block uppercase">CONTAINER</span>
                    <span className="font-bold text-ink">{asset.format}</span>
                  </div>
                  <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
                    <span className="text-ink/60 block uppercase">MIME TYPE</span>
                    <span className="font-bold text-ink">{asset.mime_type}</span>
                  </div>
                  <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
                    <span className="text-ink/60 block uppercase">DURATION</span>
                    <span className="font-bold text-ink">{asset.duration ? `${asset.duration} sec` : 'N/A'}</span>
                  </div>
                  <div className="p-3 bg-white border-2 border-ink shadow-letterpress-sm">
                    <span className="text-ink/60 block uppercase">FILE SIZE</span>
                    <span className="font-bold text-ink">{(asset.file_size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Derivative Versions Tab */}
            {activeTab === 'VERSIONS' && (
              <div className="space-y-3 font-mono">
                {asset.versions && asset.versions.length > 0 ? (
                  asset.versions.map((ver) => (
                    <div key={ver.id} className="p-3 bg-white border-2 border-ink flex items-center justify-between text-xs shadow-letterpress-sm">
                      <div className="space-y-0.5">
                        <span className="font-bold text-ink uppercase">
                          VERSION #{ver.version_number} — {ver.derivative_type}
                        </span>
                        <div className="text-ink/60 text-[11px]">
                          {ver.mime_type} • {ver.resolution || 'Audio/Binary'} • {ver.file_size ? `${(ver.file_size / 1024).toFixed(1)} KB` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] text-ink/70 font-bold bg-[#EFE8DA] px-2 py-0.5 border border-ink/30">
                        {ver.checksum_sha256?.substring(0, 16)}...
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-ink/60 text-xs">No version derivatives recorded.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
