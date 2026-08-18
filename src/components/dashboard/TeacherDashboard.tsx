import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { PendingStudentApprovals } from '../students/PendingStudentApprovals';
import { QrCode, CalendarDays, Award, Users, CheckCircle, Flame, Clock, Megaphone, Send, X, Sparkles, Target, Edit3, Video, Play, Loader2, ArrowUpRight, UserCheck } from 'lucide-react';
import { TechniqueVideoModal } from '../common/TechniqueVideoModal';
import { BJJClass } from '../../types';
import { uploadVideoFile } from '../../lib/videoUpload';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';

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

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendances = attendances.filter(a => a.date === todayStr);

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
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Painel do Professor / Mestre
          </span>
          <h2 className="text-xl font-bold text-slate-100">
            Controle de Tatame e Aulas
          </h2>
          <p className="text-xs text-slate-400">
            Realize chamadas de aula, acompanhe a evolução técnica e agende exames de faixa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsNoticeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-slate-900" />
            Disparar Comunicado
          </button>
          <button
            onClick={onOpenCheckin}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-slate-400" />
            Registrar Presença
          </button>
          <button
            onClick={() => onNavigate('timer')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700/60 transition-all"
          >
            <Flame className="w-4 h-4 text-slate-400" />
            Cronômetro
          </button>
        </div>
      </div>

      {/* Student Approvals Interface */}
      <PendingStudentApprovals />

      {/* Classes Schedule Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-400" />
              Turmas Cadastradas
            </h3>
            <p className="text-xs text-slate-400">Horários e categorias de aula na academia</p>
          </div>
          <button
            onClick={() => onNavigate('classes')}
            className="text-xs text-amber-400 font-semibold hover:underline"
          >
            Gerenciar Turmas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map(c => (
            <div key={c.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
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
                <h4 className="font-bold text-sm text-slate-100">{c.title}</h4>
                <p className="text-xs text-slate-400">{c.professorName}</p>
              </div>

              {/* Foco da Semana */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5 space-y-1.5">
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
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
                    title="Editar Foco / Anexar Vídeo"
                  >
                    <Edit3 className="w-3 h-3" />
                    Editar
                  </button>
                </div>
                <p className="text-xs font-bold text-amber-100">
                  {c.weeklyFocus || 'Nenhum foco definido.'}
                </p>

                {c.weeklyFocusVideoUrl && (
                  <button
                    onClick={() => setSelectedVideoClass(c)}
                    className="w-full mt-1 py-1 px-2.5 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <Video className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Vídeo Anexado</span>
                    <Play className="w-3 h-3 fill-amber-400 text-amber-400 ml-0.5" />
                  </button>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Capacidade: {c.maxCapacity} atletas</span>
                <button
                  onClick={onOpenCheckin}
                  className="text-amber-400 font-bold hover:underline"
                >
                  Fazer Chamada →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Presences Today */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
        <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          Presenças Registradas Hoje ({todayAttendances.length})
        </h3>

        {todayAttendances.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">Nenhum check-in de atleta realizado hoje até o momento.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {todayAttendances.map(a => {
              const student = students.find(s => s.id === a.studentId);
              return (
                <div key={a.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={student?.photoUrl} alt={a.studentName} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-xs font-bold text-slate-200">{a.studentName}</p>
                      <p className="text-[10px] text-slate-400">{a.className}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                    {new Date(a.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aptos a Graduar (Atletas que Atingiram a Meta de Treinos) */}
      {(() => {
        const studentsReadyForGraduation = students.filter(s =>
          isStudentEligibleForGraduation(s, academyConfig)
        );
        return (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Alunos Aptos a Graduar ({studentsReadyForGraduation.length})
                </h3>
                <p className="text-xs text-slate-400">Atletas que atingiram ou ultrapassaram a meta de treinos pós-grau</p>
              </div>
              <button
                onClick={() => onNavigate('students')}
                className="text-xs text-amber-400 font-semibold hover:underline flex items-center gap-1"
              >
                Gerenciar Graduações <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {studentsReadyForGraduation.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 col-span-full text-center">Nenhum aluno atingiu a meta de treinos no momento.</p>
              ) : (
                studentsReadyForGraduation.map(s => {
                  const target = getStudentGraduationTarget(s, academyConfig);
                  const hasCustom = typeof s.customGraduationTargetClasses === 'number' && s.customGraduationTargetClasses > 0;
                  return (
                    <div key={s.id} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={s.photoUrl} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-amber-400/40" />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-slate-100 truncate max-w-[100px]">{s.name}</p>
                            {hasCustom && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 py-0.2 rounded font-bold" title="Meta individual de treinos">
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
                        <span className="text-xs font-extrabold text-emerald-400 block">
                          {s.classesSinceLastGraduation}/{target}
                        </span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-black uppercase">
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
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setIsNoticeModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400">
              <Megaphone className="w-6 h-6" />
              <h3 className="font-extrabold text-lg text-slate-100">Disparar Aviso Push aos Alunos</h3>
            </div>
            <p className="text-xs text-slate-400">
              Sua mensagem será enviada instantaneamente para a Central de Notificações dos alunos e como Alerta Push no navegador.
            </p>

            <form onSubmit={handleSendNotice} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Turma Destino *</label>
                <select
                  value={noticeData.targetClassId}
                  onChange={e => setNoticeData({ ...noticeData, targetClassId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="Ex: Pessoal, neste sábado teremos seminário de raspagens e entrega de graus às 10h. Não percam!"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Enviar Notificação Push
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick Edit Focus & Video Modal */}
      {quickFocusClassId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl relative">
            <button
              onClick={() => setQuickFocusClassId(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400">
              <Target className="w-6 h-6" />
              <h3 className="font-bold text-lg text-slate-100">Foco Técnico & Vídeo da Semana</h3>
            </div>
            <p className="text-xs text-slate-400">
              Defina a técnica e anexe um link de vídeo para os alunos assistirem no aplicativo.
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
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none mb-2 text-xs"
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
                    <span>{isUploadingVideo ? `Enviando Vídeo... (${uploadProgress}%)` : 'Anexar Arquivo de Vídeo do Dispositivo'}</span>
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
                            console.error("Erro ao enviar vídeo para nuvem:", err);
                            alert(err?.message || "Não foi possível processar o arquivo de vídeo. Tente colar o link do YouTube ou Drive.");
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
                      <span>Processando e otimizando para celulares...</span>
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
                    <span className="truncate">✓ Vídeo pronto para os alunos ({quickFocusVideoUrl.startsWith('http') ? 'Cloud/Link' : 'Anexo Local'})</span>
                    <button
                      type="button"
                      onClick={() => setQuickFocusVideoUrl('')}
                      className="text-rose-400 hover:underline ml-2 shrink-0"
                    >
                      Remover
                    </button>
                  </div>
                )}

                <span className="text-[10px] text-slate-400 mt-1 block">
                  Alunos poderão assistir o vídeo diretamente no aplicativo na Central de Turmas.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickFocusClassId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-md flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  Salvar Foco & Vídeo
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
