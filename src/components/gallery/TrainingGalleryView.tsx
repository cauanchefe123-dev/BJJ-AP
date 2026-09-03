import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TrainingPhoto } from '../../types';
import { formatDateBR, getLocalDateStr } from '../../utils/dateUtils';
import { compressImage } from '../../utils/imageCompressor';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Camera,
  Download,
  Share2,
  Heart,
  Plus,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  User,
  Image as ImageIcon,
  CheckCircle,
  X,
  Maximize2,
  Search,
  Filter,
  Layers,
  ArrowDownToLine,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  CheckSquare,
  Square,
  Loader2,
  Eye,
} from 'lucide-react';

interface DayAlbum {
  date: string;
  formattedDate: string;
  isToday: boolean;
  isYesterday: boolean;
  title: string;
  className?: string;
  professorName: string;
  caption?: string;
  photos: TrainingPhoto[];
  coverPhoto: TrainingPhoto;
  totalPhotos: number;
  totalLikes: number;
}

interface PendingUploadPhoto {
  id: string;
  file: File;
  dataUrl: string;
  sizeFormatted: string;
  dimensions: string;
  customTitle?: string;
}

export const TrainingGalleryView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    trainingPhotos,
    classes,
    addTrainingPhoto,
    addTrainingPhotosBatch,
    deleteTrainingPhoto,
    toggleLikeTrainingPhoto,
    academyConfig,
  } = useData();

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';
  const currentUserId = currentUser?.studentId || currentUser?.id || 'guest';
  const todayStr = getLocalDateStr();

  // Search & Filter State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Upload Modal State (Multiple Photos)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingUploadPhoto[]>([]);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(todayStr);
  const [newTime, setNewTime] = useState<string>('19:30');
  const [newClassId, setNewClassId] = useState<string>('');
  const [newClassName, setNewClassName] = useState<string>('');
  const [newProfessorName, setNewProfessorName] = useState<string>(currentUser?.name || academyConfig.headCoachName || 'Professor');
  const [newCaption, setNewCaption] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);

  // Lightbox / Fullscreen Modal State with Navigation
  const [lightboxPhoto, setLightboxPhoto] = useState<TrainingPhoto | null>(null);

  // Feedback State
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<TrainingPhoto | null>(null);

  // Grouping by Day / View Mode State: 'BY_DAY' (Default - Uma caixa por dia) or 'ALL_PHOTOS'
  const [viewMode, setViewMode] = useState<'BY_DAY' | 'ALL_PHOTOS'>('BY_DAY');
  // Selected Day Album (when clicked to see all photos of that day)
  const [selectedDayAlbumDate, setSelectedDayAlbumDate] = useState<string | null>(null);
  // Download in progress for whole day
  const [downloadingDayDate, setDownloadingDayDate] = useState<string | null>(null);

  // Filtered Photos List
  const filteredPhotos = trainingPhotos
    .filter((photo) => {
      if (selectedDate && photo.date !== selectedDate) return false;
      if (selectedClassId !== 'ALL' && photo.classId && photo.classId !== selectedClassId) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchTitle = photo.title?.toLowerCase().includes(query);
        const matchClass = photo.className?.toLowerCase().includes(query);
        const matchProf = photo.professorName?.toLowerCase().includes(query);
        const matchCaption = photo.caption?.toLowerCase().includes(query);
        if (!matchTitle && !matchClass && !matchProf && !matchCaption) return false;
      }
      return true;
    })
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

  // Group photos by day into albums (Uma caixa por dia)
  const dayAlbums: DayAlbum[] = React.useMemo(() => {
    const groups: { [date: string]: TrainingPhoto[] } = {};

    filteredPhotos.forEach((photo) => {
      const d = photo.date || 'sem-data';
      if (!groups[d]) {
        groups[d] = [];
      }
      groups[d].push(photo);
    });

    const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    return sortedDates.map((d) => {
      const photos = [...groups[d]].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );

      const coverPhoto = photos[0];
      // Clean base title by removing trailing (1/4), (2/3), etc.
      let baseTitle = coverPhoto.title || '';
      baseTitle = baseTitle.replace(/\s*\(\d+\/\d+\)\s*$/, '').trim();
      if (!baseTitle) {
        baseTitle = coverPhoto.className ? `Treino - ${coverPhoto.className}` : `Treino de ${formatDateBR(d)}`;
      }

      const totalLikes = photos.reduce((acc, p) => acc + (p.likesCount || 0), 0);

      return {
        date: d,
        formattedDate: formatDateBR(d),
        isToday: d === todayStr,
        isYesterday: d === yesterdayStr,
        title: baseTitle,
        className: coverPhoto.className,
        professorName: coverPhoto.professorName || 'Professor',
        caption: photos.find((p) => p.caption)?.caption,
        photos,
        coverPhoto,
        totalPhotos: photos.length,
        totalLikes,
      };
    });
  }, [filteredPhotos, todayStr]);

  // Current active day album (when clicked to see all photos of that day)
  const currentDayAlbum = React.useMemo(() => {
    if (!selectedDayAlbumDate) return null;
    return dayAlbums.find((a) => a.date === selectedDayAlbumDate) || null;
  }, [dayAlbums, selectedDayAlbumDate]);

  // Today's or Most Recent Featured Photo
  const latestPhoto = filteredPhotos.length > 0 ? filteredPhotos[0] : null;

  // Process and append multiple files to pending list (Compressed to HD 1600px, under 1MB Firestore limit)
  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newPendingItems: PendingUploadPhoto[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      try {
        // Compress to crisp HD (max 1600px width/height, 0.82 JPEG) to ensure document stays safely under Firestore 1MB limit
        const dataUrl = await compressImage(file, 1600, 1600, 0.82);
        
        // Calculate compressed size in KB/MB
        const approxBytes = Math.round((dataUrl.length * 3) / 4);
        const sizeFormatted = approxBytes > 1024 * 1024 
          ? `${(approxBytes / (1024 * 1024)).toFixed(2)} MB` 
          : `${Math.round(approxBytes / 1024)} KB HD`;

        // Get dimensions
        const dimensions = await new Promise<string>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(`${img.naturalWidth} x ${img.naturalHeight}`);
          img.onerror = () => resolve('Alta Definição');
          img.src = dataUrl;
        });

        newPendingItems.push({
          id: `pending-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          file,
          dataUrl,
          sizeFormatted,
          dimensions,
        });
      } catch (err) {
        console.error('Erro ao processar foto:', err);
      }
    }

    setIsUploading(false);
    setPendingPhotos((prev) => [...prev, ...newPendingItems]);
  };

  // File input change handler (Multiple files supported)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (addMoreInputRef.current) addMoreInputRef.current.value = '';
    }
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  // Remove a photo from the pending upload list
  const handleRemovePendingPhoto = (id: string) => {
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Submit All Selected Training Photos in Batch
  const handleCreatePhotosBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingPhotos.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: pendingPhotos.length });

    const totalCount = pendingPhotos.length;
    const baseTitle = newTitle.trim() || (newClassName ? `Treino - ${newClassName}` : `Treino de ${formatDateBR(newDate)}`);

    const photosToInsert = pendingPhotos.map((photo, idx) => {
      let finalPhotoTitle = photo.customTitle?.trim();
      if (!finalPhotoTitle) {
        finalPhotoTitle = totalCount > 1 ? `${baseTitle} (${idx + 1}/${totalCount})` : baseTitle;
      }

      return {
        title: finalPhotoTitle,
        date: newDate,
        time: newTime,
        classId: newClassId || undefined,
        className: newClassName || undefined,
        professorName: newProfessorName || 'Professor',
        photoUrl: photo.dataUrl,
        caption: newCaption.trim() || undefined,
        fileSizeFormatted: photo.sizeFormatted || undefined,
        dimensions: photo.dimensions || undefined,
        uploadedBy: currentUser?.name,
      };
    });

    addTrainingPhotosBatch(photosToInsert);

    // Reset Form and Modal
    setIsUploading(false);
    setUploadProgress(null);
    setIsUploadModalOpen(false);
    setPendingPhotos([]);
    setNewTitle('');
    setNewCaption('');
  };

  // Direct High-Resolution Download Handler
  const handleDownload = (photo: TrainingPhoto) => {
    try {
      const safeTitle = (photo.title || 'Treino')
        .replace(/[^a-z0-9_-]/gi, '_')
        .toLowerCase();
      const filename = `bjjcron_${photo.date}_${safeTitle}.jpg`;

      const link = document.createElement('a');
      link.href = photo.photoUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccessId(photo.id);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err) {
      console.error('Erro ao baixar foto:', err);
    }
  };

  // Share photo
  const handleShare = async (photo: TrainingPhoto) => {
    const shareText = `📸 Foto do Treino de Jiu-Jitsu (${photo.title}) na ${academyConfig.name}! Data: ${formatDateBR(photo.date)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: photo.title,
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Download All Photos of a Specific Day
  const handleDownloadAllDayPhotos = async (photos: TrainingPhoto[], dateStr: string) => {
    if (!photos || photos.length === 0) return;
    setDownloadingDayDate(dateStr);

    try {
      for (let i = 0; i < photos.length; i++) {
        handleDownload(photos[i]);
        if (i < photos.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }
    } finally {
      setTimeout(() => {
        setDownloadingDayDate(null);
      }, 2500);
    }
  };

  // Lightbox Navigation (Next / Prev)
  // When inside a day album, navigates within that day; otherwise across all filtered photos
  const activePhotosList = currentDayAlbum ? currentDayAlbum.photos : filteredPhotos;

  const currentLightboxIndex = lightboxPhoto
    ? activePhotosList.findIndex((p) => p.id === lightboxPhoto.id)
    : -1;

  const handleNextPhoto = useCallback(() => {
    if (currentLightboxIndex >= 0 && currentLightboxIndex < activePhotosList.length - 1) {
      setLightboxPhoto(activePhotosList[currentLightboxIndex + 1]);
    }
  }, [currentLightboxIndex, activePhotosList]);

  const handlePrevPhoto = useCallback(() => {
    if (currentLightboxIndex > 0) {
      setLightboxPhoto(activePhotosList[currentLightboxIndex - 1]);
    }
  }, [currentLightboxIndex, activePhotosList]);

  // Keyboard navigation for Lightbox and Day Album
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxPhoto) {
          setLightboxPhoto(null);
        } else if (selectedDayAlbumDate) {
          setSelectedDayAlbumDate(null);
        }
        return;
      }
      if (lightboxPhoto) {
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxPhoto, selectedDayAlbumDate, handleNextPhoto, handlePrevPhoto]);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Camera className="w-5 h-5" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-display text-slate-100">
                Fotos dos Treinos & Mural
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Acesse e baixe as fotos oficiais dos treinos da <strong>{academyConfig.name}</strong> em <span className="text-amber-400 font-semibold">100% de resolução original</span>, sem compressão e prontas para compartilhar nas suas redes sociais.
            </p>
          </div>

          {isStaff && (
            <button
              onClick={() => {
                setNewDate(todayStr);
                setPendingPhotos([]);
                setIsUploadModalOpen(true);
              }}
              className="w-full md:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Publicar Fotos do Treino
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search by text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por turma, professor ou tema..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {/* Filter by class */}
          <div className="relative">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            >
              <option value="ALL">Todas as Turmas & Horários</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.time})
                </option>
              ))}
            </select>
          </div>

          {/* Filter by date */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 hover:text-amber-300 font-bold"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Featured / Most Recent Hero Photo Banner */}
      {latestPhoto && !selectedDate && selectedClassId === 'ALL' && !searchTerm && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                {latestPhoto.date === todayStr ? '📸 Foto do Treino de Hoje' : '📸 Foto Mais Recente'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {latestPhoto.dimensions && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {latestPhoto.dimensions}
                </span>
              )}
              {latestPhoto.fileSizeFormatted && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  {latestPhoto.fileSizeFormatted} Original
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Image Preview with Zoom Overlay */}
            <div
              className="lg:col-span-7 relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video sm:aspect-16/10 cursor-pointer"
              onClick={() => setLightboxPhoto(latestPhoto)}
            >
              <img
                src={latestPhoto.photoUrl}
                alt={latestPhoto.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                <span className="font-semibold drop-shadow-md flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                  Clique para ampliar em tela cheia
                </span>
                <span className="text-[11px] text-slate-300 drop-shadow-md">
                  {formatDateBR(latestPhoto.date)} {latestPhoto.time ? `às ${latestPhoto.time}` : ''}
                </span>
              </div>
            </div>

            {/* Info & Direct Download Actions */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display">
                  {latestPhoto.title}
                </h2>
                {latestPhoto.caption && (
                  <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    "{latestPhoto.caption}"
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Professor</p>
                  <p className="font-bold text-slate-200 mt-0.5 truncate">{latestPhoto.professorName}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Turma / Horário</p>
                  <p className="font-bold text-slate-200 mt-0.5 truncate">{latestPhoto.className || latestPhoto.time || 'Geral'}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  onClick={() => handleDownload(latestPhoto)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <ArrowDownToLine className="w-5 h-5 stroke-[2.5]" />
                  {downloadSuccessId === latestPhoto.id ? 'Baixado com Sucesso! ✓' : 'Baixar Foto em Alta Resolução (Original)'}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleLikeTrainingPhoto(latestPhoto.id, currentUserId)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      latestPhoto.likedBy?.includes(currentUserId)
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:text-rose-400 hover:border-rose-500/30'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${latestPhoto.likedBy?.includes(currentUserId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    Curtir ({latestPhoto.likesCount || 0})
                  </button>

                  <button
                    onClick={() => handleShare(latestPhoto)}
                    className="py-2.5 px-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-amber-400" />
                    {copiedLink ? 'Link Copiado!' : 'Compartilhar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-200">
              Galeria de Treinos
            </h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold border border-slate-700/80">
              {viewMode === 'BY_DAY'
                ? `${dayAlbums.length} ${dayAlbums.length === 1 ? 'Dia' : 'Dias'} • ${filteredPhotos.length} fotos`
                : `${filteredPhotos.length} ${filteredPhotos.length === 1 ? 'Foto' : 'Fotos'}`}
            </span>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* View Mode Toggle: Uma caixa por dia vs Todas as Fotos */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('BY_DAY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'BY_DAY'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar organizado em caixas por dia"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Por Dia ({dayAlbums.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('ALL_PHOTOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'ALL_PHOTOS'
                    ? 'bg-amber-500 text-slate-950 shadow font-black'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Visualizar todas as fotos individuais soltas"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Todas as Fotos ({filteredPhotos.length})</span>
              </button>
            </div>

            {(selectedDate || selectedClassId !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setSelectedClassId('ALL');
                  setSearchTerm('');
                }}
                className="text-xs text-amber-400 hover:underline font-bold ml-1"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        </div>

        {filteredPhotos.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-3xl p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              📷
            </div>
            <div className="space-y-1">
              <p className="font-black text-slate-200 text-base">Nenhuma foto encontrada</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isStaff
                  ? 'Clique em "Publicar Fotos do Treino" para subir fotos oficiais do tatame em alta resolução (uma ou várias fotos de uma vez).'
                  : 'Nenhuma foto foi postada ainda para os filtros selecionados. Volte em breve!'}
              </p>
            </div>
            {isStaff && (
              <button
                onClick={() => {
                  setNewDate(todayStr);
                  setPendingPhotos([]);
                  setIsUploadModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                Publicar Fotos
              </button>
            )}
          </div>
        ) : viewMode === 'BY_DAY' ? (
          /* Grouped by Day: One Box per Day (Uma caixa por dia) */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {dayAlbums.map((album) => (
              <div
                key={album.date}
                onClick={() => setSelectedDayAlbumDate(album.date)}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-amber-500/60 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col group cursor-pointer"
              >
                {/* Album Cover Photo */}
                <div className="relative aspect-16/10 bg-slate-950 overflow-hidden">
                  <img
                    src={album.coverPhoto.photoUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-75 group-hover:opacity-60 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    {album.isToday ? (
                      <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 border border-amber-400 shadow-md flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                        HOJE • {album.formattedDate}
                      </span>
                    ) : album.isYesterday ? (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800/90 text-amber-300 border border-slate-700/90 backdrop-blur-md">
                        ONTEM • {album.formattedDate}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/90 text-amber-300 border border-slate-800/90 backdrop-blur-md flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-400" />
                        {album.formattedDate}
                      </span>
                    )}

                    {/* Total photos badge */}
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-950/90 text-white border border-amber-500/40 backdrop-blur-md shadow-md flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      {album.totalPhotos} {album.totalPhotos === 1 ? 'Foto' : 'Fotos'}
                    </span>
                  </div>

                  {/* Mini thumbnails preview on bottom of card if multiple photos */}
                  {album.totalPhotos > 1 && (
                    <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                      <div className="flex items-center -space-x-2">
                        {album.photos.slice(0, 4).map((p) => (
                          <div
                            key={p.id}
                            className="w-7 h-7 rounded-lg border-2 border-slate-950 overflow-hidden shadow-md bg-slate-800 shrink-0"
                          >
                            <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {album.totalPhotos > 4 && (
                          <div className="w-7 h-7 rounded-lg border-2 border-slate-950 bg-slate-800 text-amber-300 text-[10px] font-bold flex items-center justify-center shadow-md">
                            +{album.totalPhotos - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-bold text-amber-300 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800 backdrop-blur-md flex items-center gap-1">
                        Ver todas
                        <ChevronRight className="w-3 h-3 text-amber-400" />
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div>
                    <h4 className="font-black text-slate-100 text-base tracking-tight group-hover:text-amber-400 transition-colors">
                      {album.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-300">
                        <User className="w-3 h-3 text-amber-400" />
                        {album.professorName}
                      </span>
                      {album.className && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300">{album.className}</span>
                        </>
                      )}
                    </div>

                    {album.caption && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        "{album.caption}"
                      </p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayAlbumDate(album.date);
                      }}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                      Ver Fotos do Dia ({album.totalPhotos})
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAllDayPhotos(album.photos, album.date);
                      }}
                      disabled={downloadingDayDate === album.date}
                      className="py-2.5 px-3 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      title="Baixar todas as fotos deste dia"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">
                        {downloadingDayDate === album.date ? 'Baixando...' : 'Baixar'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Flat list of all individual photos */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-slate-700/90 rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col group"
              >
                {/* Photo Thumbnail Container */}
                <div
                  className="relative aspect-16/10 bg-slate-950 overflow-hidden cursor-pointer"
                  onClick={() => setLightboxPhoto(photo)}
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-950/90 text-amber-300 border border-slate-800/90 backdrop-blur-md">
                      {formatDateBR(photo.date)}
                    </span>
                    {photo.fileSizeFormatted && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-md">
                        {photo.fileSizeFormatted}
                      </span>
                    )}
                  </div>

                  {/* Quick Expand Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxPhoto(photo);
                    }}
                    className="absolute bottom-3 right-3 p-2 rounded-xl bg-slate-950/80 text-white hover:text-amber-400 border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Ver em Tela Cheia"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3.5">
                  <div>
                    <h4 className="font-black text-slate-100 text-sm tracking-tight truncate">
                      {photo.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {photo.professorName}
                      </span>
                      {photo.className && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">{photo.className}</span>
                        </>
                      )}
                    </div>

                    {photo.caption && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                        {photo.caption}
                      </p>
                    )}
                  </div>

                  {/* Footer Buttons */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleDownload(photo)}
                      className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      title="Download em Alta Definição"
                    >
                      <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                      {downloadSuccessId === photo.id ? 'Baixado! ✓' : 'Baixar Original'}
                    </button>

                    <button
                      onClick={() => toggleLikeTrainingPhoto(photo.id, currentUserId)}
                      className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        photo.likedBy?.includes(currentUserId)
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-rose-400'
                      }`}
                      title="Curtir foto"
                    >
                      <Heart className={`w-3.5 h-3.5 ${photo.likedBy?.includes(currentUserId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{photo.likesCount || 0}</span>
                    </button>

                    <button
                      onClick={() => handleShare(photo)}
                      className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
                      title="Compartilhar"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>

                    {isStaff && (
                      <button
                        onClick={() => setDeletingPhoto(photo)}
                        className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                        title="Excluir Foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day Album Modal - Click to see ALL photos of that specific day */}
      {currentDayAlbum && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-start overflow-y-auto p-3 sm:p-6 animate-fade-in"
          onClick={() => setSelectedDayAlbumDate(null)}
        >
          <div
            className="max-w-7xl mx-auto w-full space-y-6 my-auto py-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Day Album Header */}
            <div className="bg-slate-900/95 border border-slate-800/90 rounded-3xl p-5 sm:p-6 text-white shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedDayAlbumDate(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer border border-slate-700/80"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Voltar para Todos os Dias</span>
                  </button>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    {currentDayAlbum.formattedDate}
                    {currentDayAlbum.isToday && ' (Hoje)'}
                    {currentDayAlbum.isYesterday && ' (Ontem)'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-100 font-display">
                  {currentDayAlbum.title}
                </h2>
                <p className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-400">{currentDayAlbum.totalPhotos} {currentDayAlbum.totalPhotos === 1 ? 'foto registrada' : 'fotos registradas'}</span>
                  <span>•</span>
                  <span>Professor: <strong className="text-slate-200">{currentDayAlbum.professorName}</strong></span>
                  {currentDayAlbum.className && (
                    <>
                      <span>•</span>
                      <span>Turma: <strong className="text-slate-200">{currentDayAlbum.className}</strong></span>
                    </>
                  )}
                </p>
                {currentDayAlbum.caption && (
                  <p className="text-xs text-slate-300 italic pt-1">
                    "{currentDayAlbum.caption}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <button
                  onClick={() => handleDownloadAllDayPhotos(currentDayAlbum.photos, currentDayAlbum.date)}
                  disabled={downloadingDayDate === currentDayAlbum.date}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  {downloadingDayDate === currentDayAlbum.date
                    ? 'Baixando Fotos...'
                    : `Baixar Todas (${currentDayAlbum.totalPhotos})`}
                </button>

                <button
                  onClick={() => setSelectedDayAlbumDate(null)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 cursor-pointer transition-colors"
                  title="Fechar (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of ALL photos of that specific day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 max-h-[70vh] overflow-y-auto pr-1">
              {currentDayAlbum.photos.map((photo, idx) => (
                <div
                  key={photo.id}
                  className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-lg hover:border-amber-500/50 transition-all flex flex-col group"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-16/10 bg-slate-950 overflow-hidden cursor-pointer"
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                    {/* Photo number badge & size */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-slate-950/90 text-amber-300 border border-slate-800">
                        Foto {idx + 1} de {currentDayAlbum.totalPhotos}
                      </span>
                      {photo.fileSizeFormatted && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950/80 text-slate-300 border border-slate-800">
                          {photo.fileSizeFormatted}
                        </span>
                      )}
                    </div>

                    {/* Click to expand overlay */}
                    <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-950/80 text-white hover:text-amber-400 border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Photo Card Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <h4 className="font-bold text-slate-100 text-xs truncate">
                        {photo.title}
                      </h4>
                      {photo.caption && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                          {photo.caption}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                      <button
                        onClick={() => handleDownload(photo)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center justify-center gap-1 shadow cursor-pointer active:scale-95"
                      >
                        <Download className="w-3 h-3 stroke-[2.5]" />
                        {downloadSuccessId === photo.id ? 'Baixado! ✓' : 'Baixar Original'}
                      </button>

                      <button
                        onClick={() => toggleLikeTrainingPhoto(photo.id, currentUserId)}
                        className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          photo.likedBy?.includes(currentUserId)
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                            : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-rose-400'
                        }`}
                        title="Curtir"
                      >
                        <Heart className={`w-3 h-3 ${photo.likedBy?.includes(currentUserId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                        <span className="text-[10px]">{photo.likesCount || 0}</span>
                      </button>

                      <button
                        onClick={() => handleShare(photo)}
                        className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
                        title="Compartilhar"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => setDeletingPhoto(photo)}
                          className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                          title="Excluir Foto"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Fullscreen Modal with Next/Prev Carousel */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between gap-4 text-white z-20"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-100 font-display">
                {lightboxPhoto.title}
              </h3>
              <p className="text-xs text-slate-400">
                {formatDateBR(lightboxPhoto.date)} • {lightboxPhoto.professorName} {lightboxPhoto.className ? `• ${lightboxPhoto.className}` : ''}
                {activePhotosList.length > 1 && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold">
                    {currentLightboxIndex + 1} de {activePhotosList.length}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownload(lightboxPhoto)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                Baixar Alta Resolução
              </button>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Container with Prev/Next Buttons */}
          <div
            className="flex-1 flex items-center justify-center my-4 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev Button */}
            {currentLightboxIndex > 0 && (
              <button
                onClick={handlePrevPhoto}
                className="absolute left-2 sm:left-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700/80 backdrop-blur-md shadow-2xl transition-all cursor-pointer active:scale-90"
                title="Foto Anterior (Seta Esquerda)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            <img
              src={lightboxPhoto.photoUrl}
              alt={lightboxPhoto.title}
              className="max-h-[80vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />

            {/* Next Button */}
            {currentLightboxIndex < activePhotosList.length - 1 && (
              <button
                onClick={handleNextPhoto}
                className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white border border-slate-700/80 backdrop-blur-md shadow-2xl transition-all cursor-pointer active:scale-90"
                title="Próxima Foto (Seta Direita)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Details Bar */}
          <div
            className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3 sm:p-4 max-w-3xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-0.5 text-center sm:text-left">
              {lightboxPhoto.caption && <p className="font-medium text-slate-200">"{lightboxPhoto.caption}"</p>}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center sm:justify-start">
                {lightboxPhoto.dimensions && <span>Resolução: {lightboxPhoto.dimensions}</span>}
                {lightboxPhoto.fileSizeFormatted && <span>• Tamanho: {lightboxPhoto.fileSizeFormatted}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleLikeTrainingPhoto(lightboxPhoto.id, currentUserId)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  lightboxPhoto.likedBy?.includes(currentUserId)
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300'
                }`}
              >
                <Heart className={`w-4 h-4 ${lightboxPhoto.likedBy?.includes(currentUserId) ? 'fill-rose-500 text-rose-500' : ''}`} />
                Curtir ({lightboxPhoto.likesCount || 0})
              </button>

              <button
                onClick={() => handleShare(lightboxPhoto)}
                className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Photos Upload Modal (Staff / Admin / Teacher) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-5 sm:p-7 text-white shadow-2xl space-y-5 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg font-display text-slate-100">
                    Publicar Fotos do Treino
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione uma ou várias fotos de uma vez em máxima qualidade original.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isUploading) {
                    setIsUploadModalOpen(false);
                    setPendingPhotos([]);
                  }
                }}
                disabled={isUploading}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePhotosBatch} className="space-y-4">
              {/* Multi-Photo Picker & Drag-Drop Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Fotos Selecionadas ({pendingPhotos.length})</span>
                    {pendingPhotos.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {pendingPhotos.length} {pendingPhotos.length === 1 ? 'foto pronta' : 'fotos prontas'}
                      </span>
                    )}
                  </label>

                  {pendingPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => addMoreInputRef.current?.click()}
                      className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar Mais Fotos
                    </button>
                  )}
                </div>

                {/* Hidden Multi-file inputs */}
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={addMoreInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {pendingPhotos.length === 0 ? (
                  /* Empty state / dropzone */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer group ${
                      isDragging
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-slate-700 hover:border-amber-500/60 bg-slate-950/50 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="w-14 h-14 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-7 h-7 stroke-[2]" />
                    </div>
                    <p className="font-extrabold text-sm sm:text-base text-slate-100">
                      Clique aqui para selecionar uma ou VÁRIAS fotos do treino
                    </p>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                      Você pode selecionar múltiplos arquivos ao mesmo tempo ou arrastar diretamente para cá. Mantém 100% da resolução original.
                    </p>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-[11px] text-amber-300 border border-slate-700">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>Suporta múltiplas fotos (JPG, PNG, HEIC)</span>
                    </div>
                  </div>
                ) : (
                  /* Grid of selected photos */
                  <div className="space-y-3">
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto p-2 bg-slate-950/80 rounded-2xl border border-slate-800"
                    >
                      {pendingPhotos.map((photo, index) => (
                        <div
                          key={photo.id}
                          className="relative group rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-16/10"
                        >
                          <img
                            src={photo.dataUrl}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />

                          {/* Index Number Badge */}
                          <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-slate-950/90 text-amber-300 font-mono text-[10px] font-bold border border-slate-800">
                            #{index + 1}
                          </span>

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemovePendingPhoto(photo.id)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-rose-500/90 hover:bg-rose-500 text-white cursor-pointer shadow-md"
                            title="Remover esta foto"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          {/* Resolution & Size info */}
                          <div className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-mono text-slate-300 truncate">
                            {photo.dimensions} • {photo.sizeFormatted}
                          </div>
                        </div>
                      ))}

                      {/* Add More Tile */}
                      <button
                        type="button"
                        onClick={() => addMoreInputRef.current?.click()}
                        className="rounded-xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-900/50 hover:bg-slate-900 flex flex-col items-center justify-center p-3 text-slate-400 hover:text-amber-300 transition-all aspect-16/10 cursor-pointer"
                      >
                        <Plus className="w-5 h-5 mb-1" />
                        <span className="text-[11px] font-bold">+ Adicionar</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>{pendingPhotos.length} {pendingPhotos.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</span>
                      <button
                        type="button"
                        onClick={() => setPendingPhotos([])}
                        className="text-rose-400 hover:underline cursor-pointer"
                      >
                        Limpar todas as fotos
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Data do Treino *
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Horário da Aula
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 19:30, Meio-Dia, Manhã"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Class & Professor Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Turma / Categoria
                  </label>
                  <select
                    value={newClassId}
                    onChange={(e) => {
                      const cid = e.target.value;
                      setNewClassId(cid);
                      const found = classes.find((c) => c.id === cid);
                      if (found) {
                        setNewClassName(found.title);
                        if (found.time) setNewTime(found.time);
                        if (found.professorName) setNewProfessorName(found.professorName);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Selecionar Turma Cadastrada...</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.time})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Professor Responsável
                  </label>
                  <input
                    type="text"
                    value={newProfessorName}
                    onChange={(e) => setNewProfessorName(e.target.value)}
                    placeholder="Nome do Professor"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Custom Base Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Título da Foto / Álbum
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treino Noturno - No-Gi & Rola Livre"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                {pendingPhotos.length > 1 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Como foram selecionadas {pendingPhotos.length} fotos, elas serão numeradas automaticamente (ex: "{newTitle || 'Treino'} (1/{pendingPhotos.length})").
                  </p>
                )}
              </div>

              {/* Caption / Technique Highlights */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Legenda / Destaques do Treino
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Casa cheia hoje! Foco em passagens de guarda emborcando e finalizações no armlock."
                  value={newCaption}
                  onChange={(e) => setNewCaption(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
                  <div className="text-xs text-slate-200">
                    <p className="font-bold">Publicando fotos em alta definição original...</p>
                    <p className="text-slate-400 text-[11px]">Salvando e sincronizando com o Mural do Tatame.</p>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setPendingPhotos([]);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pendingPhotos.length === 0 || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {pendingPhotos.length > 1
                        ? `Publicar ${pendingPhotos.length} Fotos no Mural`
                        : 'Publicar Foto no Mural'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      {deletingPhoto && (
        <ConfirmModal
          isOpen={!!deletingPhoto}
          onClose={() => setDeletingPhoto(null)}
          onConfirm={() => {
            if (deletingPhoto) {
              deleteTrainingPhoto(deletingPhoto.id);
              setDeletingPhoto(null);
            }
          }}
          title="Excluir Foto do Mural"
          message={`Tem certeza que deseja apagar permanentemente a foto "${deletingPhoto.title}"?`}
          confirmText="Excluir Foto"
          cancelText="Cancelar"
          type="danger"
        />
      )}
    </div>
  );
};
