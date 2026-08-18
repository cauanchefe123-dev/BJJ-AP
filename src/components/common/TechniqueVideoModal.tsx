import React, { useState, useEffect, useRef } from 'react';
import { X, Video, ExternalLink, Sparkles, ShieldAlert, Play } from 'lucide-react';

interface TechniqueVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  focusText?: string;
  videoUrl?: string;
}

export const TechniqueVideoModal: React.FC<TechniqueVideoModalProps> = ({
  isOpen,
  onClose,
  title,
  focusText,
  videoUrl,
}) => {
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoError(false);
  }, [videoUrl, isOpen]);

  if (!isOpen) return null;

  const cleanUrl = videoUrl?.trim() || '';

  const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(cleanUrl);
  const isGoogleDrive = /(?:drive\.google\.com|docs\.google\.com)/i.test(cleanUrl);
  const isInstagram = /instagram\.com/i.test(cleanUrl);
  const isTikTok = /tiktok\.com/i.test(cleanUrl);
  const isVimeo = /vimeo\.com/i.test(cleanUrl);

  const isBlob = cleanUrl.startsWith('blob:');
  const isDataUrl = cleanUrl.startsWith('data:video');
  const isFirebaseStorage = cleanUrl.includes('firebasestorage.googleapis.com');
  const isServerUpload = cleanUrl.startsWith('/uploads/') || cleanUrl.includes('/uploads/videos/');
  const isDirectFile =
    isDataUrl ||
    isBlob ||
    isFirebaseStorage ||
    isServerUpload ||
    /\.(mp4|webm|ogg|mov|m4v|3gp)(\?.*)?$/i.test(cleanUrl);

  // Extract Direct Link for Native App launch or browser open
  const getDirectNativeUrl = (url: string) => {
    if (!url) return '';

    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/watch?v=${ytMatch[1]}`;
    }

    // Google Drive
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/view`;
    }

    // Instagram
    const instaMatch = url.match(/instagram\.com\/(?:reel|p)\/([^/?#&]+)/i);
    if (instaMatch && instaMatch[1]) {
      return `https://www.instagram.com/reel/${instaMatch[1]}/`;
    }

    return url;
  };

  const getAbsoluteOpenUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    const native = getDirectNativeUrl(trimmed);
    if (native && native.startsWith('http')) return native;

    if (trimmed.startsWith('/')) {
      return window.location.origin + trimmed;
    }
    return trimmed;
  };

  const handleOpenExternal = (rawUrl: string) => {
    const targetUrl = getAbsoluteOpenUrl(rawUrl);
    if (!targetUrl) return;

    if (targetUrl.startsWith('blob:') || targetUrl.startsWith('data:video')) {
      if (videoRef.current) {
        try {
          if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen().catch(() => {});
          } else if (
            // @ts-ignore
            videoRef.current.webkitEnterFullscreen
          ) {
            // @ts-ignore
            videoRef.current.webkitEnterFullscreen();
          }
        } catch (e) {}
        videoRef.current.play().catch(console.warn);
      }
      return;
    }

    try {
      const win = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!win || win.closed || typeof win.closed === 'undefined') {
        window.top?.location.assign(targetUrl);
      }
    } catch (e) {
      window.location.href = targetUrl;
    }
  };

  // Generate Embed URL for iframes
  const parseEmbedUrl = (url: string) => {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|shorts\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}?playsinline=1`;
    }

    // Google Drive
    const driveMatch = url.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)|docs\.google\.com\/file\/d\/)([a-zA-Z0-9_-]+)/i);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }

    // Instagram
    const instaMatch = url.match(/instagram\.com\/(?:reel|p)\/([^/?#&]+)/i);
    if (instaMatch && instaMatch[1]) {
      return `https://www.instagram.com/p/${instaMatch[1]}/embed/captioned/`;
    }

    // TikTok
    const tiktokMatch = url.match(/tiktok\.com\/.*\/video\/([0-9]+)/i);
    if (tiktokMatch && tiktokMatch[1]) {
      return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
    }

    return null;
  };

  const embedUrl = parseEmbedUrl(cleanUrl);

  const getButtonLabel = () => {
    if (isYouTube) return 'Assistir no App do YouTube 📱';
    if (isGoogleDrive) return 'Abrir no Google Drive 📱';
    if (isInstagram) return 'Abrir no Instagram 📱';
    if (isTikTok) return 'Abrir no TikTok 📱';
    if (isVimeo) return 'Abrir no Vimeo 📱';
    return 'Abrir Vídeo em Tela Cheia / App 📱';
  };

  const directVideoSourceUrl = cleanUrl.startsWith('/')
    ? window.location.origin + cleanUrl
    : cleanUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full text-white shadow-2xl overflow-hidden relative flex flex-col my-auto max-h-[95vh]">
        
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block truncate">
                Player de Vídeo — BJJCRON
              </span>
              <h3 className="font-extrabold text-xs sm:text-base text-slate-100 truncate">{title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0"
            title="Fechar Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto flex-1">
          {/* Technique Focus Badge */}
          {focusText && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-[11px] font-bold text-amber-400 block">Foco Técnico da Posição:</span>
                <p className="text-xs text-slate-200 font-medium">{focusText}</p>
              </div>
            </div>
          )}

          {/* Warning for local blob URLs */}
          {isBlob && (
            <div className="bg-amber-950/80 border border-amber-500/50 rounded-xl p-3 text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-0.5">⚠️ Anexo de Vídeo Local (Blob)</span>
                <p className="text-[11px] leading-relaxed">
                  Este vídeo está em formato temporário do navegador. Para garantir que <strong>todos os alunos</strong> consigam assistir ao vídeo em qualquer celular, cole o link do <strong>YouTube, Instagram, Google Drive</strong> ou reenvie o arquivo no painel do professor.
                </p>
              </div>
            </div>
          )}

          {/* Main Player Container */}
          <div className="bg-black rounded-xl overflow-hidden border border-slate-800 aspect-video relative flex items-center justify-center shadow-2xl min-h-[220px]">
            {videoError ? (
              /* Fallback view if iframe fails */
              <div className="p-6 text-center space-y-4 my-auto">
                <Video className="w-12 h-12 text-amber-400 mx-auto opacity-90" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-100">Vídeo da Posição</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Toque no botão abaixo para assistir ao vídeo diretamente.
                  </p>
                </div>
                {cleanUrl && (
                  <button
                    onClick={() => handleOpenExternal(cleanUrl)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-xl active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{getButtonLabel()}</span>
                  </button>
                )}
              </div>
            ) : isDirectFile && cleanUrl ? (
              /* Direct HTML5 Player */
              <div className="w-full h-full relative flex items-center justify-center bg-black">
                <video
                  ref={videoRef}
                  src={directVideoSourceUrl}
                  controls
                  autoPlay
                  playsInline
                  // @ts-ignore
                  webkit-playsinline="true"
                  preload="auto"
                  controlsList="nodownload"
                  className="w-full h-full object-contain max-h-[60vh] rounded-xl"
                >
                  <source src={directVideoSourceUrl} type="video/mp4" />
                  <source src={directVideoSourceUrl} type="video/quicktime" />
                  <source src={directVideoSourceUrl} type="video/webm" />
                  Seu navegador não suporta reprodução de vídeo MP4.
                </video>
              </div>
            ) : embedUrl ? (
              /* Embed Player (YouTube, Vimeo, Drive, Insta) */
              <div className="w-full h-full relative bg-black">
                <iframe
                  src={embedUrl}
                  title={`Vídeo: ${title}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                  allowFullScreen
                  onError={() => setVideoError(true)}
                />
              </div>
            ) : cleanUrl ? (
              /* Direct Action Box for external URLs without standard embed */
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-950">
                <Video className="w-12 h-12 text-amber-400 animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-100">Vídeo Disponível</h4>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Toque no botão abaixo para reproduzir diretamente no seu dispositivo.
                  </p>
                </div>
                <button
                  onClick={() => handleOpenExternal(cleanUrl)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xl transition-all active:scale-95"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{getButtonLabel()}</span>
                </button>
              </div>
            ) : (
              /* No video attached */
              <div className="text-center p-8 space-y-2 text-slate-500 my-auto">
                <Video className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-xs">Nenhum vídeo anexado para esta posição.</p>
              </div>
            )}
          </div>

          {/* Direct Action Link Button (Always visible below player for maximum compatibility) */}
          {cleanUrl && (
            <button
              onClick={() => handleOpenExternal(cleanUrl)}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 active:scale-98"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{getButtonLabel()}</span>
            </button>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
          >
            Fechar Player
          </button>
        </div>

      </div>
    </div>
  );
};
