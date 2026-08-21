import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { PendingStudentApprovals } from '../students/PendingStudentApprovals';
import { QrCode, CalendarDays, Award, Users, CheckCircle, Flame, Clock, Megaphone, Send, X, Sparkles, Target, Edit3, Video, Play, Loader2, ArrowUpRight, UserCheck } from 'lucide-react';
import { TechniqueVideoModal } from '../common/TechniqueVideoModal';
import { EditAttendanceModal } from '../attendance/EditAttendanceModal';
import { BJJClass, AttendanceRecord } from '../../types';
import { uploadVideoFile } from '../../lib/videoUpload';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';
import { getLocalDateStr, getAttendanceLocalDate, getAttendanceLocalTime } from '../../utils/dateUtils';

interface TeacherDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenCheckin: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ onNavigate, onOpenCheckin }) => {
  const { students, classes, attendances, addNotification, updateClass, academyConfig } = useData();
  const { currentUser } = useAuth();

  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeData, setNoticeData] = useState({
    title: '',
    message: '',
    targetClassId: 'ALL',
  });

  const [quickFocusClassId, setQuickFocusClassId] = useState<string | null>(null);
  const [quickFocusText, setQuickFocusText] = useState('');
  const [quickFocusVideoUrl, setQuickFocusVideoUrl] = useState('');
  const [selectedVideoClass, setSelectedVideoClass] = useState<BJJClass | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);

  const todayStr = getLocalDateStr();
  const todayAttendances = attendances.filter(a => getAttendanceLocalDate(a) === todayStr);

  const handleSendNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeData.title || !noticeData.message) return;

    const targetClass = classes.find(c => c.id === noticeData.targetClassId);

    addNotification({
      title: noticeData.title,
      message: noticeData.message,
      type: 'TEACHER_NOTICE',
      targetClassId: noticeData.targetClassId === 'ALL' ? undefined : noticeData.targetClassId,
      targetClassName: targetClass ? targetClass.title : 'Todas as Turmas',
      authorName: currentUser?.name || 'Professor / Mestre',
    });

    setIsNoticeModalOpen(false);
    setNoticeData({ title: '', message: '', targetClassId: 'ALL' });
  };

  const handleSaveQuickFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFocusClassId) return;
    updateClass(quickFocusClassId, {
      weeklyFocus: quickFocusText,
      weeklyFocusVideoUrl: quickFocusVideoUrl,
    });
    setQuickFocusClassId(null);
    setQuickFocusText('');
    setQuickFocusVideoUrl('');
  };

  return (
    <div className="space-y-6">
      {/* Teacher Banner */}
      <div className="bg-gradient-to-r from-slate-900/95 via-slate-900/80 to-slate-950 border border-slate-800/90 rounded-3xl p-6 sm:p-7 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-lg">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Painel do Mestre
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
            Controle de Tatame e Treinos
          </h2>
          <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
            Realize chamadas rápidas, acompanhe a evolução técnica dos atletas e agende graduações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-white text-slate-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-slate-950" />
            <span>Disparar Comunicado</span>
          </button>
          <button
            onClick={onOpenCheckin}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>Registrar Presença</span>
          </button>
          <button
            onClick={() => onNavigate('timer')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700/80 transition-all cursor-pointer active:scale-95"
          >
            <Flame className="w-4 h-4" />
            <span>Cronômetro</span>
          </button>
        </div>
      </div>

      {/* Student Approvals Interface */}
      <PendingStudentApprovals />

      {/* Classes Schedule */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-400" />
              Turmas Cadastradas
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Horários, categorias de aula e foco técnico semanal</p>
          </div>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs text-amber-400 font-bold hover:underline cursor-pointer"
          >
            Gerenciar Turmas →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {classes.map(c => (
            <div key={c.id} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 space-y-3 shadow-xs transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {c.time} ({c.durationMinutes} min)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {c.category}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-100">{c.title}</h4>
                <p className="text-xs text-slate-400">{c.professorName}</p>
              </div>

              {/* Foco da Semana */}
              <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400">
                    🎯 Foco & Vídeo da Semana:
                  </span>
                  <button
                    onClick={() => {
                      setQuickFocusClassId(c.id);
                      setQuickFocusText(c.weeklyFocus || '');
                      setQuickFocusVideoUrl(c.weeklyFocusVideoUrl || '');
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                    title="Editar Foco / Anexar Vídeo"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-200">
                  {c.weeklyFocus || 'Nenhum foco definido.'}
                </p>

                {c.weeklyFocusVideoUrl && (
                  <button
                    onClick={() => setSelectedVideoClass(c)}
                    className="w-full mt-1 py-1.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Vídeo da Posição</span>
                    <Play className="w-3 h-3 fill-amber-400 text-amber-400 ml-0.5" />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Capacidade: {c.maxCapacity} atletas</span>
                <button
                  onClick={onOpenCheckin}
                  className="text-amber-400 font-bold hover:underline cursor-pointer"
                >
                  Fazer Chamada →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Presences Today */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
          <div>
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Presenças Registradas Hoje ({todayAttendances.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Check-ins de atletas validados no dia de hoje</p>
          </div>
          <button
            onClick={() => onNavigate('attendance')}
            className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Ver Todas / Histórico <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayAttendances.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800/60">
            <p className="text-xs text-slate-400">Nenhum check-in de atleta realizado hoje até o momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {todayAttendances.map(a => {
              const student = students.find(s => s.id === a.studentId);
              return (
                <div key={a.id} className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between shadow-xs hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={student?.photoUrl} alt={a.studentName} className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{a.studentName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{a.className}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30">
                      {getAttendanceLocalTime(a)}
                    </span>
                    <button
                      onClick={() => setEditingAttendance(a)}
                      className="p-1 rounded-lg bg-slate-900 hover:bg-amber-950/80 text-slate-400 hover:text-amber-400 border border-slate-800 hover:border-amber-500/40 transition-all cursor-pointer"
                      title="Editar / Alterar Presença"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aptos a Graduar */}
      {(() => {
        const studentsReadyForGraduation = students.filter(s =>
          isStudentEligibleForGraduation(s, academyConfig)
        );
        return (
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-4 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3.5">
              <div>
                <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Alunos Aptos a Graduar ({studentsReadyForGraduation.length})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Atletas que atingiram ou ultrapassaram a meta de treinos pós-grau</p>
              </div>
              <button
                onClick={() => onNavigate('students')}
                className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Gerenciar Graduações <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {studentsReadyForGraduation.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800/60 col-span-full">
                  <p className="text-xs text-slate-400">Nenhum aluno atingiu a meta de treinos no momento.</p>
                </div>
              ) : (
                studentsReadyForGraduation.map(s => {
                  const target = getStudentGraduationTarget(s, academyConfig);
                  const hasCustom = typeof s.customGraduationTargetClasses === 'number' && s.customGraduationTargetClasses > 0;
                  return (
                    <div key={s.id} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2.5">
                        <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-xl object-cover border border-amber-400/40 bg-slate-900" />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-slate-100 truncate max-w-[100px]">{s.name}</p>
                            {hasCustom && (
                              <span className="text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded font-bold" title="Meta individual de treinos">
                                🎯
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5">
                            <BeltBadge belt={s.belt} stripes={s.stripes} size="sm" showLabel={false} />
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 block font-mono">
                          {s.classesSinceLastGraduation}/{target}
                        </span>
                        <span className="text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-black uppercase">
                          Apto
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* Disparar Aviso Push Modal */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsNoticeModalOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400">
              <Megaphone className="w-5 h-5" />
              <h3 className="font-black text-lg text-slate-100">Disparar Aviso aos Alunos</h3>
            </div>
            <p className="text-xs text-slate-400">
              Sua mensagem será enviada instantaneamente para a Central de Notificações dos alunos.
            </p>

            <form onSubmit={handleSendNotice} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Turma Destino *</label>
                <select
                  value={noticeData.targetClassId}
                  onChange={e => setNoticeData({ ...noticeData, targetClassId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none"
                >
                  <option value="ALL">📢 Todas as Turmas e Alunos</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      🥋 {c.title} ({c.time})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Título do Aviso *</label>
                <input
                  type="text"
                  required
                  value={noticeData.title}
                  onChange={e => setNoticeData({ ...noticeData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none"
                  placeholder="Ex: Treino Especial de Sábado com Kimono Branco"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Mensagem do Comunicado *</label>
                <textarea
                  required
                  rows={3}
                  value={noticeData.message}
                  onChange={e => setNoticeData({ ...noticeData, message: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none"
                  placeholder="Ex: Pessoal, neste sábado teremos seminário de raspagens às 10h. Não percam!"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Aviso</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Edit Focus & Video Modal */}
      {quickFocusClassId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQuickFocusClassId(null)}
              className="absolute top-5 right-5 p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400">
              <Target className="w-5 h-5" />
              <h3 className="font-black text-lg text-slate-100">Foco Técnico da Semana</h3>
            </div>
            <p className="text-xs text-slate-400">
              Defina a técnica e anexe um link de vídeo para os alunos assistirem.
            </p>

            <form onSubmit={handleSaveQuickFocus} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Técnica / Posição da Semana *</label>
                <textarea
                  required
                  rows={3}
                  value={quickFocusText}
                  onChange={e => setQuickFocusText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none"
                  placeholder="Ex: Passagem de Guarda Emborcada & Raspagem De La Riva"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">🎥 Vídeo da Posição (Link ou Upload)</label>
                
                <input
                  type="url"
                  value={quickFocusVideoUrl}
                  onChange={e => setQuickFocusVideoUrl(e.target.value)}
                  disabled={isUploadingVideo}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:border-amber-500 outline-none mb-2 text-xs"
                  placeholder="Cole um link do YouTube, Instagram ou Drive"
                />

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">ou</span>
                  <label className={`flex-1 cursor-pointer bg-slate-950 border border-dashed border-amber-500/40 hover:border-amber-400 rounded-xl p-2.5 text-center text-xs text-amber-400 hover:text-amber-300 font-bold transition-all flex items-center justify-center gap-2 ${isUploadingVideo ? 'opacity-50 pointer-events-none' : ''}`}>
                    {isUploadingVideo ? (
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    ) : (
                      <Video className="w-4 h-4" />
                    )}
                    <span>{isUploadingVideo ? `Enviando Vídeo... (${uploadProgress}%)` : 'Anexar Arquivo de Vídeo'}</span>
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
                            const cloudUrl = await uploadVideoFile(file, (percent) => {
                              setUploadProgress(percent);
                            });
                            setQuickFocusVideoUrl(cloudUrl);
                          } catch (err: any) {
                            console.error("Erro ao enviar vídeo:", err);
                            alert(err?.message || "Não foi possível processar o arquivo de vídeo.");
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
                      <span>Processando vídeo...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-amber-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {quickFocusVideoUrl && !isUploadingVideo && (
                  <div className="mt-2 text-[11px] text-emerald-400 font-bold flex items-center justify-between bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-500/30">
                    <span className="truncate">✓ Vídeo pronto para os alunos</span>
                    <button
                      type="button"
                      onClick={() => setQuickFocusVideoUrl('')}
                      className="text-rose-400 hover:underline ml-2 shrink-0 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickFocusClassId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Salvar Foco</span>
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

      {/* Edit Attendance Modal for Professor */}
      <EditAttendanceModal
        isOpen={!!editingAttendance}
        onClose={() => setEditingAttendance(null)}
        attendance={editingAttendance}
      />
    </div>
  );
};
