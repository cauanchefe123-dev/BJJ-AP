import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { WeeklyPosition, Student, BJJClass } from '../../types';
import {
  Target,
  Video,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Star,
  Sparkles,
  BookOpen,
  Edit3,
  Trash2,
  Flame,
  Calendar,
  User,
  X,
  UploadCloud,
  Layers,
  ChevronRight,
  Award,
  Users,
  BarChart3,
  CheckSquare,
  Square,
  HelpCircle,
} from 'lucide-react';
import { TechniqueVideoModal } from '../common/TechniqueVideoModal';
import { uploadVideoFile } from '../../lib/videoUpload';

const CATEGORY_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  GUARDA: { label: 'Guarda', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  PASSAGEM: { label: 'Passagem de Guarda', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  FINALIZAÇÃO: { label: 'Finalização', bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' },
  RASPAGEM: { label: 'Raspagem', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  QUEDA: { label: 'Queda / Takedown', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  DEFESA_ESCAPE: { label: 'Defesa & Escape', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  CONTROLE_POSIÇÃO: { label: 'Controle de Posição', bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  NO_GI: { label: 'No-Gi / Submission', bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300', border: 'border-fuchsia-500/30' },
  GERAL: { label: 'Geral', bg: 'bg-slate-500/20', text: 'text-slate-300', border: 'border-slate-500/30' },
};

export const WeeklyFocusPositionsView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    weeklyPositions,
    students,
    classes,
    addWeeklyPosition,
    updateWeeklyPosition,
    deleteWeeklyPosition,
    toggleStudentLearnedPosition,
    updateClass,
  } = useData();

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';
  const currentStudentId = currentUser?.studentId || currentUser?.id;

  // Search and Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedClassId, setSelectedClassId] = useState<string>('TODAS');

  // Favorites Local State
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('bjjcron_fav_positions');
    return saved ? JSON.parse(saved) : [];
  });

  // Video Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ title: string; focusText?: string; videoUrl?: string } | null>(null);

  // Form Modal State (Add/Edit Weekly Focus Position)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<WeeklyPosition | null>(null);

  // Student Learning Management Modal State (Professor View)
  const [studentModalPosition, setStudentModalPosition] = useState<WeeklyPosition | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Form Input States
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<WeeklyPosition['category']>('GUARDA');
  const [formClassId, setFormClassId] = useState('');
  const [formClassName, setFormClassName] = useState('');
  const [formProfessorName, setFormProfessorName] = useState(currentUser?.name || 'Prof. Gabriel Santos');
  const [formWeekLabel, setFormWeekLabel] = useState('Foco da Semana Atual');
  const [formDescription, setFormDescription] = useState('');
  const [formKeyDetails, setFormKeyDetails] = useState<string[]>(['', '', '']);
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formIsCurrentFocus, setFormIsCurrentFocus] = useState(true);

  // Video Upload State
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const toggleFavorite = (id: string) => {
    setFavoriteIds(prev => {
      const updated = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('bjjcron_fav_positions', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenVideoModal = (title: string, focusText?: string, videoUrl?: string) => {
    setActiveVideo({ title, focusText, videoUrl });
    setVideoModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingPosition(null);
    setFormTitle('');
    setFormCategory('GUARDA');
    const firstClass = classes[0];
    setFormClassId(firstClass?.id || '');
    setFormClassName(firstClass?.title || 'Jiu-Jitsu Fundamental');
    setFormProfessorName(currentUser?.name || 'Prof. Gabriel Santos');
    setFormWeekLabel('Semana de ' + new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    setFormDescription('');
    setFormKeyDetails(['', '', '']);
    setFormVideoUrl('');
    setFormIsCurrentFocus(true);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (pos: WeeklyPosition) => {
    setEditingPosition(pos);
    setFormTitle(pos.title);
    setFormCategory(pos.category);
    setFormClassId(pos.classId || '');
    setFormClassName(pos.className || '');
    setFormProfessorName(pos.professorName);
    setFormWeekLabel(pos.weekLabel || 'Foco da Semana');
    setFormDescription(pos.description || '');
    setFormKeyDetails(pos.keyDetails && pos.keyDetails.length > 0 ? [...pos.keyDetails] : ['', '', '']);
    setFormVideoUrl(pos.videoUrl || '');
    setFormIsCurrentFocus(pos.isCurrentFocus ?? true);
    setIsFormModalOpen(true);
  };

  const handleKeyDetailChange = (index: number, val: string) => {
    const next = [...formKeyDetails];
    next[index] = val;
    setFormKeyDetails(next);
  };

  const handleAddKeyDetailRow = () => {
    setFormKeyDetails(prev => [...prev, '']);
  };

  const handleRemoveKeyDetailRow = (index: number) => {
    setFormKeyDetails(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingVideo(true);
      setUploadProgress(0);
      const url = await uploadVideoFile(file, p => setUploadProgress(p));
      setFormVideoUrl(url);
    } catch (err: any) {
      alert(`Erro no upload do vídeo: ${err.message || 'Falha no envio'}`);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      alert('Por favor, informe o nome da posição.');
      return;
    }

    const cleanDetails = formKeyDetails.map(d => d.trim()).filter(d => d !== '');
    const selectedClass = classes.find(c => c.id === formClassId);
    const finalClassName = selectedClass ? selectedClass.title : formClassName || 'Todas as Turmas';

    if (editingPosition) {
      updateWeeklyPosition(editingPosition.id, {
        title: formTitle,
        category: formCategory,
        classId: formClassId,
        className: finalClassName,
        professorName: formProfessorName,
        weekLabel: formWeekLabel,
        description: formDescription,
        keyDetails: cleanDetails,
        videoUrl: formVideoUrl,
        isCurrentFocus: formIsCurrentFocus,
      });

      if (formIsCurrentFocus && formClassId) {
        updateClass(formClassId, {
          weeklyFocus: formTitle,
          weeklyFocusVideoUrl: formVideoUrl,
        });
      }
    } else {
      addWeeklyPosition({
        title: formTitle,
        category: formCategory,
        classId: formClassId,
        className: finalClassName,
        professorName: formProfessorName,
        date: new Date().toISOString().split('T')[0],
        weekLabel: formWeekLabel,
        description: formDescription,
        keyDetails: cleanDetails,
        videoUrl: formVideoUrl,
        isCurrentFocus: formIsCurrentFocus,
        learnedByStudentIds: [],
      });

      if (formIsCurrentFocus && formClassId) {
        updateClass(formClassId, {
          weeklyFocus: formTitle,
          weeklyFocusVideoUrl: formVideoUrl,
        });
      }
    }

    setIsFormModalOpen(false);
  };

  // Derive positions from classes that have an active weeklyFocus set
  const classFocusPositions: WeeklyPosition[] = classes
    .filter(c => c.weeklyFocus && c.weeklyFocus.trim() !== '')
    .filter(c => !weeklyPositions.some(p => p.classId === c.id && p.title.toLowerCase() === c.weeklyFocus?.toLowerCase()))
    .map(c => ({
      id: `class-focus-${c.id}`,
      title: c.weeklyFocus!,
      category: 'GERAL',
      classId: c.id,
      className: c.title,
      professorName: c.professorName || 'Professor',
      date: new Date().toISOString().split('T')[0],
      weekLabel: 'Foco Atual da Turma',
      description: `Foco técnico ativo definido para a turma "${c.title}".`,
      keyDetails: [],
      videoUrl: c.weeklyFocusVideoUrl || '',
      isCurrentFocus: true,
      createdAt: new Date().toISOString(),
      learnedByStudentIds: [],
    }));

  const allPositions = [...weeklyPositions, ...classFocusPositions];

  // Filter positions
  const filteredPositions = allPositions.filter(pos => {
    const matchesSearch =
      pos.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.professorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.className?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pos.keyDetails && pos.keyDetails.some(k => k.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesCategory = selectedCategory === 'TODAS' || pos.category === selectedCategory;
    const matchesClass = selectedClassId === 'TODAS' || pos.classId === selectedClassId;

    return matchesSearch && matchesCategory && matchesClass;
  });

  // Calculate stats
  const totalPositionsTaught = allPositions.length;
  const myLearnedCount = allPositions.filter(p => p.learnedByStudentIds?.includes(currentStudentId || '')).length;
  const myLearnedPercentage = totalPositionsTaught > 0 ? Math.round((myLearnedCount / totalPositionsTaught) * 100) : 0;
  const activeFocusCount = allPositions.filter(p => p.isCurrentFocus).length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Target className="w-5 h-5" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Amostragem do Foco da Semana das Turmas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            Progresso de Aprendizagem
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Exposição completa de todas as posições ensinadas no Foco da Semana das turmas. Acompanhe o histórico do que já foi ministrado e o progresso de aprendizado dos alunos.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-500/10 transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Registrar Posição no Foco</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Posições Ensinadas</span>
            <span className="text-lg font-black text-slate-100">{totalPositionsTaught} técnicas</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Focos Ativos</span>
            <span className="text-lg font-black text-emerald-400">{activeFocusCount} em andamento</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">
              {isStaff ? 'Total Alunos Ativos' : 'Já Aprendidas por Mim'}
            </span>
            <span className="text-lg font-black text-purple-300">
              {isStaff ? `${students.length} alunos` : `${myLearnedCount} de ${totalPositionsTaught}`}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Progresso do Currículo</span>
            <span className="text-lg font-black text-blue-300">{myLearnedPercentage}% concluído</span>
          </div>
        </div>
      </div>

      {/* Progress Bar for Student */}
      {!isStaff && totalPositionsTaught > 0 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-amber-400 flex items-center gap-1.5">
              <Award className="w-4 h-4" />
              Seu Progresso no Foco Técnico da Academia:
            </span>
            <span className="text-slate-200">{myLearnedCount} de {totalPositionsTaught} posições aprendidas ({myLearnedPercentage}%)</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${myLearnedPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por raspagem, passagem, de la riva, professor..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Class Filter */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
            >
              <option value="TODAS">Todas as Turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
              selectedCategory === 'TODAS'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            Todas ({weeklyPositions.length})
          </button>

          {Object.entries(CATEGORY_LABELS).map(([key, val]) => {
            const count = weeklyPositions.filter(p => p.category === key).length;
            const isSelected = selectedCategory === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  isSelected
                    ? `${val.bg} ${val.text} ${val.border} ring-1 ring-amber-500/50 shadow-md`
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {val.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List of Registered Weekly Focus Positions */}
      {filteredPositions.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Target className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-extrabold text-slate-300">Nenhuma posição registrada</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Não encontramos registros com os filtros selecionados.
          </p>
          {isStaff && (
            <button
              onClick={handleOpenAddModal}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              Registrar Primeira Posição
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPositions.map(pos => {
            const categoryInfo = CATEGORY_LABELS[pos.category] || CATEGORY_LABELS.GERAL;
            const learnedList = pos.learnedByStudentIds || [];
            const isLearnedByMe = learnedList.includes(currentStudentId || '');
            const totalStudentsInClass = students.length || 1;
            const learnedCount = learnedList.length;
            const learnedPercent = Math.round((learnedCount / totalStudentsInClass) * 100);
            const isFav = favoriteIds.includes(pos.id);

            return (
              <div
                key={pos.id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all space-y-4 shadow-xl relative group ${
                  pos.isCurrentFocus ? 'border-amber-500/40' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Left Main Content */}
                  <div className="space-y-3 flex-1">
                    {/* Badges Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${categoryInfo.bg} ${categoryInfo.text} ${categoryInfo.border}`}>
                        {categoryInfo.label}
                      </span>

                      {pos.weekLabel && (
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          {pos.weekLabel}
                        </span>
                      )}

                      {pos.className && (
                        <span className="text-[10px] font-bold text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          {pos.className}
                        </span>
                      )}

                      {pos.isCurrentFocus && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3" />
                          Foco Atual da Turma
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-extrabold text-base sm:text-lg text-slate-100 group-hover:text-amber-400 transition-colors leading-snug">
                      {pos.title}
                    </h3>

                    {/* Description */}
                    {pos.description && (
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                        {pos.description}
                      </p>
                    )}

                    {/* Key Technical Steps */}
                    {pos.keyDetails && pos.keyDetails.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                          Passos Técnicos Ensinados:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {pos.keyDetails.map((detail, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-950/40 p-2 rounded-lg border border-slate-800/50">
                              <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                                {idx + 1}
                              </span>
                              <span className="leading-tight">{detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ministrado por: <strong>{pos.professorName}</strong></span>
                    </div>
                  </div>

                  {/* Right Action / Learning Status Column */}
                  <div className="md:w-64 shrink-0 space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    {/* Student Learning Tracker Info */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
                        Status de Aprendizado da Turma:
                      </span>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300 font-bold flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-amber-400" />
                          Alunos que Aprenderam:
                        </span>
                        <span className="font-extrabold text-emerald-400">{learnedCount} / {totalStudentsInClass}</span>
                      </div>

                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${learnedPercent}%` }}
                        />
                      </div>

                      {/* Student Badge / Status */}
                      <div className="pt-2">
                        {isLearnedByMe ? (
                          <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Você Já Aprendeu Esta Posição!</span>
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 text-[11px] text-center">
                            <span>Ainda pendente no seu histórico</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => toggleStudentLearnedPosition(pos.id, currentStudentId || '')}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                          isLearnedByMe
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700'
                        }`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${isLearnedByMe ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <span>{isLearnedByMe ? 'Desmarcar Aprendido' : 'Marcar que Aprendi ✓'}</span>
                      </button>

                      {isStaff && (
                        <button
                          onClick={() => setStudentModalPosition(pos)}
                          className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-amber-400" />
                          <span>Gerenciar Aprendizado dos Alunos</span>
                        </button>
                      )}

                      {pos.videoUrl ? (
                        <button
                          onClick={() => handleOpenVideoModal(pos.title, pos.description, pos.videoUrl)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                        >
                          <Video className="w-4 h-4" />
                          <span>Assistir Vídeo Demonstrativo</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenVideoModal(pos.title, pos.description, '')}
                          className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ver Detalhes</span>
                        </button>
                      )}

                      {isStaff && (
                        <div className="flex items-center justify-end gap-1 pt-1">
                          <button
                            onClick={() => handleOpenEditModal(pos)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all text-xs flex items-center gap-1"
                            title="Editar Posição"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover a posição "${pos.title}" do registro do foco?`)) {
                                deleteWeeklyPosition(pos.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-all text-xs flex items-center gap-1"
                            title="Excluir Posição"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Excluir</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Professor Modal: Manage Which Students Learned This Position */}
      {studentModalPosition && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    Registro de Aprendizado dos Alunos
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-md">
                    Posição: <strong>{studentModalPosition.title}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setStudentModalPosition(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Search Field inside Student Modal */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentSearchTerm}
                  onChange={e => setStudentSearchTerm(e.target.value)}
                  placeholder="Buscar aluno por nome..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Student List Grid */}
              <div className="space-y-2">
                {students
                  .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                  .map(student => {
                    const isLearned = (studentModalPosition.learnedByStudentIds || []).includes(student.id);

                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudentLearnedPosition(studentModalPosition.id, student.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isLearned
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={student.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                            alt={student.name}
                            className="w-9 h-9 rounded-full object-cover border border-slate-700"
                          />
                          <div>
                            <span className="font-extrabold text-xs text-slate-100 block">{student.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              Faixa {student.belt} • {student.stripes} graus
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold ${isLearned ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isLearned ? 'Aprendeu ✓' : 'Não Marcou'}
                          </span>
                          {isLearned ? (
                            <CheckSquare className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => setStudentModalPosition(null)}
                  className="px-5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal: Add or Edit Weekly Position */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full text-slate-100 shadow-2xl overflow-hidden my-8">
            <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Target className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingPosition ? 'Editar Posição do Foco' : 'Registrar Posição no Foco da Semana'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Defina a técnica ensinada para ser registrada no histórico da academia.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Nome da Posição / Técnica *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Raspagem de De La Riva com Tomada de Costas"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Turma *
                  </label>
                  <select
                    value={formClassId}
                    onChange={e => {
                      const id = e.target.value;
                      setFormClassId(id);
                      const cl = classes.find(c => c.id === id);
                      if (cl) setFormClassName(cl.title);
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Categoria Técnica *
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as WeeklyPosition['category'])}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Professor Responsável
                  </label>
                  <input
                    type="text"
                    value={formProfessorName}
                    onChange={e => setFormProfessorName(e.target.value)}
                    placeholder="Prof. Gabriel Santos"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300 block">
                    Identificador da Semana
                  </label>
                  <input
                    type="text"
                    value={formWeekLabel}
                    onChange={e => setFormWeekLabel(e.target.value)}
                    placeholder="Ex: Semana de 11 a 17 de Agosto"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Descrição Geral
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Explicação dos detalhes conceituais da posição..."
                  rows={2}
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Steps */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 block">
                    Passos Técnicos Ensinados
                  </label>
                  <button
                    type="button"
                    onClick={handleAddKeyDetailRow}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    + Adicionar Passo
                  </button>
                </div>

                <div className="space-y-2">
                  {formKeyDetails.map((detail, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 w-5 text-center">{idx + 1}.</span>
                      <input
                        type="text"
                        value={detail}
                        onChange={e => handleKeyDetailChange(idx, e.target.value)}
                        placeholder={`Passo ${idx + 1}: Ex: Domínio de manga e encaixe do gancho...`}
                        className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                      {formKeyDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyDetailRow(idx)}
                          className="p-2 text-slate-500 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Video URL & Upload */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Link do Vídeo Demonstrativo
                </label>
                <input
                  type="text"
                  value={formVideoUrl}
                  onChange={e => setFormVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... ou link MP4"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
                />

                <div className="pt-1">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition-all">
                    <UploadCloud className="w-4 h-4 text-amber-400" />
                    <span>{isUploadingVideo ? `Enviando... (${uploadProgress}%)` : 'Anexar Arquivo de Vídeo do Dispositivo'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      disabled={isUploadingVideo}
                      className="hidden"
                    />
                  </label>

                  {isUploadingVideo && (
                    <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Active Focus Check */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="activeFocusCheck"
                  checked={formIsCurrentFocus}
                  onChange={e => setFormIsCurrentFocus(e.target.checked)}
                  className="mt-0.5 accent-amber-500 w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="activeFocusCheck" className="text-xs text-amber-200 cursor-pointer">
                  <strong className="block text-amber-300">Definir como Foco Ativo da Turma</strong>
                  Ao marcar esta opção, essa técnica será destacada no painel principal dos alunos e atualizará o foco ativo da turma.
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 font-black text-xs shadow-lg active:scale-95"
                >
                  {editingPosition ? 'Salvar Alterações' : 'Registrar Posição'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Video Player Modal */}
      {activeVideo && (
        <TechniqueVideoModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          title={activeVideo.title}
          focusText={activeVideo.focusText}
          videoUrl={activeVideo.videoUrl}
        />
      )}
    </div>
  );
};
