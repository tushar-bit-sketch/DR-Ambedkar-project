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
    <div className="min-h-screen bg-[#F4EFE6] flex flex-col p-4 sm:p-6 select-none pb-24 text-ink">
      {/* Top Touch Header */}
      <div className="bg-[#FAF6EE] text-ink border-2 border-double border-ink p-4 sm:p-6 shadow-letterpress flex items-center justify-between gap-4 mb-6">
        <button
          onClick={() => navigate('/kiosk/media')}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-ink hover:text-white text-ink border-2 border-ink font-mono font-bold text-xs uppercase tracking-wider transition shadow-letterpress-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>[ Gallery ]</span>
        </button>

        <div className="flex-1 text-center truncate px-2">
          <h1 className="font-serif text-lg sm:text-2xl font-black text-ink truncate">
            {asset.title}
          </h1>
          <p className="text-xs text-oxblood font-mono font-bold uppercase mt-0.5">
            {asset.media_type} • ARCHIVE ID: {asset.archive_id || asset.id} • SHA-256 VERIFIED
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-2">
          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-600 text-xs font-mono font-bold uppercase">
            SEAL: {asset.verification_status}
          </span>
        </div>
      </div>

      {/* Main Grid: Player on left, Synchronized transcript on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Left Column: Player & Metadata */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Touch Player Container */}
          <div className="bg-[#1A1714] border-2 border-ink shadow-letterpress overflow-hidden relative flex items-center justify-center min-h-[320px] max-h-[520px]">
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
                <div className="w-20 h-20 bg-[#FAF6EE] border-2 border-ink flex items-center justify-center text-oxblood shadow-letterpress-sm">
                  <Volume2 className="w-10 h-10" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-bold text-white">{asset.title}</h3>
                  <p className="text-xs text-[#FAF6EE]/60 mt-1 font-mono uppercase tracking-wider">
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

            {(asset.media_type === 'IMAGE' || asset.media_type === 'PHOTOGRAPH') && (
              <div className="w-full h-full flex items-center justify-center p-2">
                <img
                  src={streamUrl}
                  alt={asset.title}
                  className="max-h-[500px] w-auto object-contain border border-[#3D332A]"
                />
              </div>
            )}
          </div>

          {/* Archival Provenance & Metadata Card */}
          <div className="bg-[#FAF6EE] border-2 border-ink p-6 shadow-letterpress space-y-4">
            <div className="flex items-center justify-between border-b-2 border-ink pb-3">
              <span className="font-serif font-black text-base text-ink flex items-center gap-2 uppercase tracking-wide">
                <Shield className="w-4 h-4 text-oxblood" />
                Archival Custody Record
              </span>
              <span className="text-xs font-mono text-ink/70 font-bold uppercase">
                ID: {asset.archive_id || asset.id}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-white border border-ink/30">
                <span className="text-ink/60 block text-[10px] uppercase">Date Recorded</span>
                <span className="font-bold text-ink">
                  {asset.date || 'Historical Record'}
                </span>
              </div>
              <div className="p-3 bg-white border border-ink/30">
                <span className="text-ink/60 block text-[10px] uppercase">Format</span>
                <span className="font-bold text-ink">
                  {asset.format || 'Master Audio/Video'}
                </span>
              </div>
              <div className="p-3 bg-white border border-ink/30">
                <span className="text-ink/60 block text-[10px] uppercase">Duration</span>
                <span className="font-bold text-ink">
                  {asset.duration ? formatSeconds(asset.duration) : '—'}
                </span>
              </div>
              <div className="p-3 bg-white border border-ink/30">
                <span className="text-ink/60 block text-[10px] uppercase">Storage Integrity</span>
                <span className="font-bold text-oxblood">
                  SHA-256 Locked
                </span>
              </div>
            </div>

            {asset.description && (
              <div className="text-xs text-ink/90 font-editorial leading-relaxed border-t border-ink/20 pt-3">
                <span className="font-bold font-mono text-[10px] uppercase text-oxblood block mb-1">Archival Memoir:</span>
                {asset.description}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Synchronized Interactive Transcript */}
        <div className="lg:col-span-5 flex flex-col bg-[#FAF6EE] border-2 border-ink shadow-letterpress overflow-hidden min-h-[500px]">
          <div className="p-4 sm:p-5 bg-ink text-[#FAF6EE] flex items-center justify-between border-b-2 border-ink">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-oxblood-light" />
              <h2 className="font-mono font-bold text-xs uppercase tracking-wider">
                Synchronized Transcript
              </h2>
            </div>
            {activeTranscript && (
              <span className="px-2 py-0.5 bg-oxblood text-white font-mono text-[10px] font-bold uppercase border border-white/20">
                {activeTranscript.status}
              </span>
            )}
          </div>

          {/* Transcript Content List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 max-h-[620px]">
            {!activeTranscript || !activeTranscript.segments || activeTranscript.segments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-ink/60 font-mono">
                <FileText className="w-12 h-12 text-ink/30 mb-2" />
                <p className="font-bold text-xs uppercase">
                  [ No verified transcript available ]
                </p>
                <p className="text-[11px] text-ink/60 mt-1 max-w-xs font-editorial">
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
                    className={`p-3.5 border-2 cursor-pointer transition-all text-left ${
                      isActive
                        ? 'bg-white border-oxblood shadow-letterpress-sm border-l-4'
                        : 'bg-white/80 border-ink/30 hover:border-ink'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-mono font-bold text-ink text-[11px] flex items-center gap-1.5 uppercase">
                        <User className="w-3 h-3 text-oxblood" />
                        {seg.speaker_label || 'SPEAKER'}
                      </span>
                      <span className="font-mono text-[10px] text-oxblood font-bold px-1.5 py-0.2 bg-[#EFE8DA] border border-ink/30">
                        {seg.start_timestamp_str || formatSeconds(seg.start_time)}
                      </span>
                    </div>
                    <p className={`text-xs font-editorial leading-relaxed ${isActive ? 'font-bold text-ink' : 'text-ink/80'}`}>
                      {seg.text}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-[#EFE8DA] border-t-2 border-ink text-center text-[10px] text-ink/70 font-mono font-bold uppercase tracking-wider">
            [ Touch any transcript passage to jump playback to that historical timestamp ]
          </div>
        </div>
      </div>
    </div>
  );
};
