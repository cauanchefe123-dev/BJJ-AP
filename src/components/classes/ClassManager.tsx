import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BJJClass } from '../../types';
import { CalendarDays, Clock, Plus, Users, Trash2, Edit3, Target, Sparkles, X, Video, Play, ExternalLink, Loader2 } from 'lucide-react';
import { TechniqueVideoModal } from '../common/TechniqueVideoModal';
import { uploadVideoFile } from '../../lib/videoUpload';

export const ClassManager: React.FC = () => {
  const { classes, teachers, addClass, updateClass, deleteClass } = useData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [selectedVideoClass, setSelectedVideoClass] = useState<BJJClass | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    professorName: teachers[0]?.name || 'Prof. Gabriel "Fera" Santos',
    professorId: teachers[0]?.id || 'prof-1',
    daysOfWeek: [1, 3, 5], // Seg, Qua, Sex
    time: '19:00',
    durationMinutes: 90,
    category: 'FUNDAMENTAL' as BJJClass['category'],
    maxCapacity: 30,
    active: true,
    description: '',
    weeklyFocus: '',
    weeklyFocusVideoUrl: '',
  });

  const [quickFocusClass, setQuickFocusClass] = useState<BJJClass | null>(null);
  const [quickFocusText, setQuickFocusText] = useState('');
  const [quickFocusVideoUrl, setQuickFocusVideoUrl] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const daysLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const handleOpenAdd = () => {
    setEditingClassId(null);
    setFormData({
      title: '',
      professorName: teachers[0]?.name || 'Prof. Gabriel "Fera" Santos',
      professorId: teachers[0]?.id || 'prof-1',
      daysOfWeek: [1, 3, 5],
      time: '19:00',
      durationMinutes: 90,
      category: 'FUNDAMENTAL',
      maxCapacity: 30,
      active: true,
      description: '',
      weeklyFocus: '',
      weeklyFocusVideoUrl: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: BJJClass) => {
    setEditingClassId(c.id);
    setFormData({
      title: c.title,
      professorName: c.professorName,
      professorId: c.professorId,
      daysOfWeek: [...c.daysOfWeek],
      time: c.time,
      durationMinutes: c.durationMinutes,
      category: c.category,
      maxCapacity: c.maxCapacity,
      active: c.active,
      description: c.description || '',
      weeklyFocus: c.weeklyFocus || '',
      weeklyFocusVideoUrl: c.weeklyFocusVideoUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    if (editingClassId) {
      updateClass(editingClassId, formData);
    } else {
      addClass(formData);
    }

    setIsModalOpen(false);
    setEditingClassId(null);
  };

  const handleSaveQuickFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFocusClass) return;
    updateClass(quickFocusClass.id, {
      weeklyFocus: quickFocusText,
      weeklyFocusVideoUrl: quickFocusVideoUrl,
    });
    setQuickFocusClass(null);
    setQuickFocusText('');
    setQuickFocusVideoUrl('');
  };

  const toggleDay = (dayIndex: number) => {
    setFormData(prev => {
      const exists = prev.daysOfWeek.includes(dayIndex);
      return {
        ...prev,
        daysOfWeek: exists
          ? prev.daysOfWeek.filter(d => d !== dayIndex)
          : [...prev.daysOfWeek, dayIndex].sort(),
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-amber-400" />
            Turmas e Grade de Aulas
          </h3>
          <p className="text-xs text-slate-400">
            Gerencie horários de kimono, No-Gi, Kids, Open Mat e defina o <strong>Foco da Semana</strong> para os alunos!
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
        >
          <Plus className="w-4 h-4" />
          Nova Turma
        </button>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4 shadow-lg flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {c.time} ({c.durationMinutes} min)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {c.category}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-base text-slate-100">{c.title}</h4>
                <p className="text-xs text-slate-400">Instrutor: {c.professorName}</p>
              </div>

              {c.description && (
                <p className="text-xs text-slate-400 line-clamp-2">{c.description}</p>
              )}

              {/* Weekly Focus Box */}
              <div className="bg-gradient-to-r from-amber-950/60 via-slate-950 to-amber-950/40 border border-amber-500/40 rounded-xl p-3 space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    Foco da Semana
                  </span>
                  <button
                    onClick={() => {
                      setQuickFocusClass(c);
                      setQuickFocusText(c.weeklyFocus || '');
                      setQuickFocusVideoUrl(c.weeklyFocusVideoUrl || '');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold hover:underline flex items-center gap-1"
                    title="Editar Foco da Semana"
                  >
                    <Edit3 className="w-3 h-3" />
                    {c.weeklyFocus ? 'Alterar' : '+ Definir Foco'}
                  </button>
                </div>
                <p className="text-xs font-bold text-slate-200">
                  {c.weeklyFocus ? (
                    <span>🎯 {c.weeklyFocus}</span>
                  ) : (
                    <span className="text-slate-500 italic font-normal">Nenhum foco definido para esta semana.</span>
                  )}
                </p>

                {c.weeklyFocusVideoUrl && (
                  <button
                    onClick={() => setSelectedVideoClass(c)}
                    className="w-full mt-1.5 py-1.5 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Vídeo da Posição</span>
                    <Play className="w-3 h-3 fill-amber-400 text-amber-400 ml-0.5" />
                  </button>
                )}
              </div>

              {/* Days badging */}
              <div className="flex items-center gap-1 pt-1">
                {daysLabels.map((label, idx) => {
                  const isDay = c.daysOfWeek.includes(idx);
                  return (
                    <span
                      key={idx}
                      className={`text-[9px] font-bold px-2 py-1 rounded-md border ${
                        isDay
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : 'bg-slate-950/60 text-slate-600 border-slate-800'
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                Limite: {c.maxCapacity} alunos
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 hover:text-white border border-blue-700/50 text-xs font-bold transition-all"
                  title="Editar Turma Completa"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-300" />
                  Editar
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Excluir a turma ${c.title}?`)) {
                      deleteClass(c.id);
                    }
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                  title="Excluir Turma"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Edit Weekly Focus Modal */}
      {quickFocusClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQuickFocusClass(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400">
              <Target className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-100">Foco Técnico da Semana</h3>
            </div>
            <p className="text-xs text-slate-400">
              Turma: <strong>{quickFocusClass.title}</strong> — Esse foco aparecerá em destaque no painel dos alunos!
            </p>

            <form onSubmit={handleSaveQuickFocus} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Técnica / Posição da Semana *</label>
                <textarea
                  required
                  rows={3}
                  value={quickFocusText}
                  onChange={e => setQuickFocusText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Passagem de Guarda Emborcada & Raspagem De La Riva"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">🎥 Vídeo da Posição (Link ou Upload de Arquivo)</label>
                <input
                  type="url"
                  value={quickFocusVideoUrl}
                  onChange={e => setQuickFocusVideoUrl(e.target.value)}
                  disabled={isUploadingVideo}
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs mb-2"
                  placeholder="Cole um link do YouTube, Instagram, MP4 ou Google Drive"
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ou</span>
                  <label className={`flex-1 cursor-pointer bg-slate-950 border border-dashed border-amber-500/40 hover:border-amber-400 rounded-xl p-2 text-center text-xs text-amber-400 hover:text-amber-300 font-bold transition-all flex items-center justify-center gap-2 ${isUploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploadingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    <span>{isUploadingVideo ? `Enviando Vídeo... (${uploadProgress}%)` : 'Anexar Arquivo do Dispositivo'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={isUploadingVideo}
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsUploadingVideo(true);
                            setUploadProgress(0);
                            const cloudUrl = await uploadVideoFile(file, (p) => setUploadProgress(p));
                            setQuickFocusVideoUrl(cloudUrl);
                          } catch (err: any) {
                            console.error("Erro ao enviar vídeo (Quick):", err);
                            alert(err?.message || "Não foi possível processar o vídeo. Cole o link do YouTube ou Drive.");
                          } finally {
                            setIsUploadingVideo(false);
                            setUploadProgress(0);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {isUploadingVideo && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                      <span>Processando para o celular dos alunos...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {quickFocusVideoUrl && !isUploadingVideo && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-bold flex items-center justify-between bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    <span className="truncate">✓ Vídeo pronto para os alunos</span>
                    <button
                      type="button"
                      onClick={() => setQuickFocusVideoUrl('')}
                      className="text-rose-400 hover:underline ml-2 shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickFocusClass(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Salvar Foco da Semana
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-lg text-slate-100">
              {editingClassId ? 'Atualizar Turma de Jiu-Jitsu' : 'Criar Nova Turma de Jiu-Jitsu'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nome / Título da Turma *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Jiu-Jitsu Avançado & Competição"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Professor Responsável *</label>
                <select
                  value={formData.professorId}
                  onChange={e => {
                    const selectedProf = teachers.find(t => t.id === e.target.value);
                    setFormData({
                      ...formData,
                      professorId: e.target.value,
                      professorName: selectedProf ? selectedProf.name : e.target.value
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.belt})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Horário (HH:MM)</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Duração (Minutos)</label>
                  <input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={e => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 60 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Dias de Treino da Semana:</label>
                <div className="flex gap-1">
                  {daysLabels.map((label, idx) => {
                    const selected = formData.daysOfWeek.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDay(idx)}
                        className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                          selected
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Categoria:</label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="FUNDAMENTAL">Fundamental</option>
                  <option value="INTERMEDIÁRIO">Intermediário</option>
                  <option value="AVANÇADO">Avançado</option>
                  <option value="NO_GI">No-Gi / Submission</option>
                  <option value="KIDS">Kids</option>
                  <option value="OPEN_MAT">Open Mat / Treino Livre</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">🎯 Foco Técnico da Semana</label>
                <input
                  type="text"
                  value={formData.weeklyFocus}
                  onChange={e => setFormData({ ...formData, weeklyFocus: e.target.value })}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-lg p-2.5 text-amber-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Passagem de Guarda Emborcada & Raspagem De La Riva"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Aparece em destaque no painel do aluno.</span>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">🎥 Vídeo da Posição do Dia/Semana</label>
                <input
                  type="url"
                  value={formData.weeklyFocusVideoUrl}
                  onChange={e => setFormData({ ...formData, weeklyFocusVideoUrl: e.target.value })}
                  disabled={isUploadingVideo}
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs mb-1"
                  placeholder="https://www.youtube.com/watch?v=... ou link do Drive/Instagram"
                />
                <span className="text-[10px] text-amber-400 font-medium block mb-2">
                  💡 Dica Safari/iOS: Cole preferencialmente links do YouTube, Instagram ou Google Drive para compatibilidade 100% no celular dos alunos.
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ou</span>
                  <label className={`flex-1 cursor-pointer bg-slate-950 border border-dashed border-amber-500/40 hover:border-amber-400 rounded-lg p-2 text-center text-xs text-amber-400 hover:text-amber-300 font-bold transition-all flex items-center justify-center gap-2 ${isUploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploadingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    <span>{isUploadingVideo ? `Enviando Vídeo... (${uploadProgress}%)` : 'Upload de Arquivo de Vídeo'}</span>
                    <input
                      type="file"
                      accept="video/*"
                      disabled={isUploadingVideo}
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            setIsUploadingVideo(true);
                            setUploadProgress(0);
                            const cloudUrl = await uploadVideoFile(file, (p) => setUploadProgress(p));
                            setFormData({ ...formData, weeklyFocusVideoUrl: cloudUrl });
                          } catch (err: any) {
                            console.error("Erro ao enviar vídeo (Form):", err);
                            alert(err?.message || "Não foi possível processar o vídeo. Cole o link do YouTube ou Drive.");
                          } finally {
                            setIsUploadingVideo(false);
                            setUploadProgress(0);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {isUploadingVideo && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-amber-400 font-bold">
                      <span>Processando para o celular dos alunos...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {formData.weeklyFocusVideoUrl && !isUploadingVideo && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-bold flex items-center justify-between bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    <span className="truncate">✓ Vídeo pronto para os alunos</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, weeklyFocusVideoUrl: '' })}
                      className="text-rose-400 hover:underline ml-2 shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Descrição Geral da Turma</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  {editingClassId ? 'Salvar Alterações' : 'Criar Turma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Technique Video Modal */}
      <TechniqueVideoModal
        isOpen={!!selectedVideoClass}
        onClose={() => setSelectedVideoClass(null)}
        title={selectedVideoClass?.title || 'Vídeo da Posição'}
        focusText={selectedVideoClass?.weeklyFocus}
        videoUrl={selectedVideoClass?.weeklyFocusVideoUrl}
      />
    </div>
  );
};

