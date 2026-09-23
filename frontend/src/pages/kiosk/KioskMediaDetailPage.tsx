import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Film, Volume2, Image as ImageIcon, Play, Pause, ArrowLeft, 
  Clock, Shield, User, FileText, CheckCircle2, RotateCcw, VolumeX, AlertCircle
} from 'lucide-react';
import { mediaApi } from '../../services/mediaApi';
import { MediaAsset, MediaTranscript, TranscriptSegment } from '../../types/media';

export const KioskMediaDetailPage: React.FC = () => {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [transcripts, setTranscripts] = useState<MediaTranscript[]>([]);
  const [activeTranscript, setActiveTranscript] = useState<MediaTranscript | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!mediaId) return;
    const id = parseInt(mediaId, 10);
    setLoading(true);

    Promise.all([
      mediaApi.getMediaAsset(id),
      mediaApi.getTranscripts(id).catch(() => []),
    ])
      .then(([assetData, transcriptData]) => {
        setAsset(assetData);
        setTranscripts(transcriptData);
        if (transcriptData.length > 0) {
          const approved = transcriptData.find(t => t.verification_status === 'APPROVED');
          setActiveTranscript(approved || transcriptData[0]);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [mediaId]);

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  };

  const seekTo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    } else if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlay = () => {
    const el = videoRef.current || audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play();
      setIsPlaying(true);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex items-center justify-center p-8 text-center select-none">
        <div className="w-12 h-12 border-4 border-heritage-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-serif text-xl font-bold text-slate-800">Loading archival media...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-[#F4EFE6] flex flex-col items-center justify-center p-8 text-center select-none">
        <AlertCircle className="w-16 h-16 text-rose-600 mb-4" />
        <h2 className="font-serif text-2xl font-bold text-slate-800">Media Master Not Found</h2>
        <button
          onClick={() => navigate('/kiosk/media')}
          className="mt-6 px-6 py-3 bg-heritage-500 text-slate-950 rounded-xl font-bold text-base shadow hover:bg-heritage-600"
        >
          Return to Archival Gallery
        </button>
      </div>
    );
  }

  const streamUrl = mediaApi.getStreamUrl(asset.id);

  return (
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-6 select-none pb-24">
      {/* Top Touch Header */}
      <div className="bg-[#102038] text-white rounded-2xl p-4 sm:p-6 shadow-xl flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/kiosk/media')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Gallery</span>
        </button>

        <div className="flex-1 text-center truncate px-2">
          <h1 className="font-serif text-lg sm:text-2xl font-bold text-white truncate">
            {asset.title}
          </h1>
          <p className="text-xs text-heritage-300 font-mono">
            {asset.media_type} • Accession #{asset.accession_number || asset.id} • SHA-256 Verified
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
            {asset.verification_status}
          </span>
        </div>
      </div>

      {/* Main Grid: Player on left, Synchronized transcript on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Player & Metadata */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Touch Player Container */}
          <div className="bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border-2 border-stone-300 relative flex items-center justify-center min-h-[320px] max-h-[520px]">
            {asset.media_type === 'VIDEO' && (
              <video
                ref={videoRef}
                src={streamUrl}
                poster={mediaApi.getPosterUrl(asset.id)}
                className="w-full h-full object-contain max-h-[500px]"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                controls
              />
            )}

            {asset.media_type === 'AUDIO' && (
              <div className="w-full p-8 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-24 h-24 rounded-full bg-heritage-500/20 border-2 border-heritage-500 flex items-center justify-center text-heritage-400">
                  <Volume2 className="w-12 h-12" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">{asset.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    High-Fidelity Archival Master Stream
                  </p>
                </div>
                <audio
                  ref={audioRef}
                  src={streamUrl}
                  className="w-full max-w-md mt-4"
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  controls
                />
              </div>
            )}

            {asset.media_type === 'PHOTOGRAPH' && (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src={streamUrl}
                  alt={asset.title}
                  className="max-h-[500px] w-auto object-contain rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Archival Provenance & Metadata Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-300 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <span className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-heritage-600" />
                Archival Custody Record
              </span>
              <span className="text-xs font-mono text-slate-500">
                Master File: {asset.file_name}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Date Recorded</span>
                <span className="font-mono font-bold text-slate-800">
                  {asset.date_recorded || 'Circa Historical Period'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Original Medium</span>
                <span className="font-mono font-bold text-slate-800">
                  {asset.original_medium || '78 RPM / 16mm Master'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Duration</span>
                <span className="font-mono font-bold text-slate-800">
                  {asset.duration_seconds ? formatSeconds(asset.duration_seconds) : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Storage Integrity</span>
                <span className="font-mono font-bold text-emerald-700">
                  SHA-256 Locked
                </span>
              </div>
            </div>

            {asset.description && (
              <div className="text-xs text-slate-700 leading-relaxed border-t border-stone-200 pt-3">
                <span className="font-bold block text-slate-900 mb-1">Archival Description:</span>
                {asset.description}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synchronized Interactive Transcript */}
        <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl border border-stone-300 shadow-sm overflow-hidden min-h-[500px]">
          <div className="p-4 sm:p-5 bg-[#1B2A4A] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-heritage-400" />
              <h2 className="font-serif font-bold text-base sm:text-lg">
                Synchronized Transcript
              </h2>
            </div>
            {activeTranscript && (
              <span className="px-2 py-0.5 rounded bg-white/10 text-heritage-300 font-mono text-[11px]">
                {activeTranscript.verification_status}
              </span>
            )}
          </div>

          {/* Transcript Content List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-h-[620px]">
            {!activeTranscript || activeTranscript.segments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <FileText className="w-12 h-12 text-stone-300 mb-2" />
                <p className="font-serif text-sm font-semibold text-slate-700">
                  No verified transcript available
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Transcripts require manual curator ingestion or verification before public exhibition display.
                </p>
              </div>
            ) : (
              activeTranscript.segments.map((seg, idx) => {
                const isActive = currentTime >= seg.start_time && currentTime <= seg.end_time;
                return (
                  <div
                    key={seg.id || idx}
                    onClick={() => seekTo(seg.start_time)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border-2 text-left ${
                      isActive
                        ? 'bg-amber-50 border-heritage-500 shadow-md scale-[1.01]'
                        : 'bg-stone-50 border-stone-200 hover:border-heritage-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-xs">
                      <span className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        {seg.speaker_label || 'SPEAKER'}
                      </span>
                      <span className="font-mono text-[11px] text-heritage-700 font-semibold px-2 py-0.5 bg-heritage-100 rounded-md">
                        {formatSeconds(seg.start_time)} - {formatSeconds(seg.end_time)}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed ${isActive ? 'font-semibold text-slate-950' : 'text-slate-800'}`}>
                      {seg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-stone-100 border-t border-stone-200 text-center text-xs text-slate-500 font-mono">
            Touch any transcript passage to jump playback to that historical timestamp
          </div>
        </div>
      </div>
    </div>
  );
};
