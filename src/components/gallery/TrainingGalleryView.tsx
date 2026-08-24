import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TrainingPhoto } from '../../types';
import { formatDateBR, getLocalDateStr } from '../../utils/dateUtils';
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
  Eye,
  Info,
} from 'lucide-react';

export const TrainingGalleryView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    trainingPhotos,
    classes,
    teachers,
    addTrainingPhoto,
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

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(todayStr);
  const [newTime, setNewTime] = useState<string>('19:30');
  const [newClassId, setNewClassId] = useState<string>('');
  const [newClassName, setNewClassName] = useState<string>('');
  const [newProfessorName, setNewProfessorName] = useState<string>(currentUser?.name || academyConfig.headCoachName || 'Professor');
  const [newCaption, setNewCaption] = useState<string>('');
  const [photoDataUrl, setPhotoDataUrl] = useState<string>('');
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>('');
  const [dimensions, setDimensions] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox / Fullscreen Modal State
  const [lightboxPhoto, setLightboxPhoto] = useState<TrainingPhoto | null>(null);

  // Feedback State
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [downloadSuccessId, setDownloadSuccessId] = useState<string | null>(null);

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

  // Today's or Most Recent Featured Photo
  const latestPhoto = filteredPhotos.length > 0 ? filteredPhotos[0] : null;

  // Handle Image File Selection (Preserving Full High Quality)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Calculate file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    const sizeFormatted = file.size > 1024 * 1024 ? `${sizeInMB} MB` : `${Math.round(file.size / 1024)} KB`;
    setFileSizeFormatted(sizeFormatted);

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target?.result as string;
      setPhotoDataUrl(dataUrl);

      // Extract original image resolution dimensions
      const img = new Image();
      img.onload = () => {
        setDimensions(`${img.naturalWidth} x ${img.naturalHeight}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Submit New Training Photo
  const handleCreatePhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoDataUrl) return;

    setIsUploading(true);

    const finalTitle = newTitle.trim() || (newClassName ? `Treino - ${newClassName}` : `Treino de ${formatDateBR(newDate)}`);

    addTrainingPhoto({
      title: finalTitle,
      date: newDate,
      time: newTime,
      classId: newClassId || undefined,
      className: newClassName || undefined,
      professorName: newProfessorName || 'Professor',
      photoUrl: photoDataUrl,
      caption: newCaption.trim() || undefined,
      fileSizeFormatted: fileSizeFormatted || undefined,
      dimensions: dimensions || undefined,
      uploadedBy: currentUser?.name,
    });

    // Reset Form
    setIsUploading(false);
    setIsUploadModalOpen(false);
    setPhotoDataUrl('');
    setNewTitle('');
    setNewCaption('');
    setFileSizeFormatted('');
    setDimensions('');
  };

  // Direct High-Resolution Download Handler
  const handleDownload = (photo: TrainingPhoto) => {
    try {
      const safeTitle = (photo.title || 'Treino')
        .replace(/[^a-z0-9_-]/gi, '_')
        .toLowerCase();
      const filename = `bjjcron_${photo.date}_${safeTitle}.jpg`;

      // Create download link
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

    // Fallback: Copy Link
    navigator.clipboard.writeText(`${shareText}\n${window.location.href}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

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
                setIsUploadModalOpen(true);
              }}
              className="w-full md:w-auto px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Publicar Foto do Treino
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
            <div className="lg:col-span-7 relative group rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl aspect-video sm:aspect-16/10 cursor-pointer"
                 onClick={() => setLightboxPhoto(latestPhoto)}>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-200">
              Galeria de Treinos ({filteredPhotos.length} {filteredPhotos.length === 1 ? 'Foto' : 'Fotos'})
            </h3>
          </div>
          {(selectedDate || selectedClassId !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedDate('');
                setSelectedClassId('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-amber-400 hover:underline font-bold"
            >
              Limpar Filtros
            </button>
          )}
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
                  ? 'Clique em "Publicar Foto do Treino" para subir a primeira foto oficial do tatame em alta resolução.'
                  : 'Nenhuma foto foi postada ainda para os filtros selecionados. Volte em breve!'}
              </p>
            </div>
            {isStaff && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                Publicar Primeira Foto
              </button>
            )}
          </div>
        ) : (
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
                        onClick={() => {
                          if (window.confirm(`Tem certeza que deseja apagar a foto "${photo.title}"?`)) {
                            deleteTrainingPhoto(photo.id);
                          }
                        }}
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

      {/* Lightbox / Fullscreen Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 animate-fade-in"
          onClick={() => setLightboxPhoto(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between gap-4 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-100 font-display">
                {lightboxPhoto.title}
              </h3>
              <p className="text-xs text-slate-400">
                {formatDateBR(lightboxPhoto.date)} • {lightboxPhoto.professorName} {lightboxPhoto.className ? `• ${lightboxPhoto.className}` : ''}
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
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div
            className="flex-1 flex items-center justify-center my-4 overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhoto.photoUrl}
              alt={lightboxPhoto.title}
              className="max-h-[82vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
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

      {/* Upload Modal (Staff / Admin / Teacher) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-7 text-white shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg font-display text-slate-100">Publicar Foto do Treino</h3>
                  <p className="text-xs text-slate-400">Suba a foto oficial para os alunos baixarem em qualidade máxima.</p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePhoto} className="space-y-4">
              {/* Photo Picker Area */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Foto do Treino (Original / Alta Definição) *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {photoDataUrl ? (
                  <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-amber-500/40 aspect-16/10 group">
                    <img
                      src={photoDataUrl}
                      alt="Prévia"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs cursor-pointer shadow-md"
                      >
                        Trocar Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoDataUrl('');
                          setFileSizeFormatted('');
                          setDimensions('');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-md"
                      >
                        Remover
                      </button>
                    </div>

                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-amber-300 border border-slate-800">
                      <span>✓ 100% Qualidade Preservada</span>
                      {dimensions && <span>{dimensions} ({fileSizeFormatted})</span>}
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-2xl p-6 sm:p-8 text-center bg-slate-950/50 hover:bg-slate-950/80 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-sm text-slate-200">
                      Clique para escolher a foto ou tirar agora
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Aceita JPG, PNG e HEIC. Mantém 100% dos pixels para que nenhum aluno perca qualidade.
                    </p>
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
                      const found = classes.find(c => c.id === cid);
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

              {/* Custom Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Título da Foto / Chamada
                </label>
                <input
                  type="text"
                  placeholder="Ex: Treino Noturno - No-Gi & Rola Livre"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                />
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

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!photoDataUrl || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  {isUploading ? 'Publicando...' : 'Publicar no Mural'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
