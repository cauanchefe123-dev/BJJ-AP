import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltType, Student } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { Award, X, Sparkles, CheckCircle2, Clock, Check, AlertCircle } from 'lucide-react';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';
import { getStudentTotalClasses } from '../../utils/ranking';

interface GraduationModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentToGraduate?: Student | null;
}

export const GraduationModal: React.FC<GraduationModalProps> = ({
  isOpen,
  onClose,
  studentToGraduate,
}) => {
  const { currentUser } = useAuth();
  const { students, attendances, promoteStudent, academyConfig, beltRequests, approveBeltChange, rejectBeltChange } = useData();

  const [activeTab, setActiveTab] = useState<'PROMOTE' | 'REQUESTS'>('PROMOTE');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [newBelt, setNewBelt] = useState<BeltType>('BRANCA');
  const [newStripes, setNewStripes] = useState<number>(0);
  const [promotedBy, setPromotedBy] = useState<string>(academyConfig.headCoachName);
  const [promotedAt, setPromotedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('Outorgado por mérito e dedicação nos treinos.');

  const [isSuccess, setIsSuccess] = useState(false);

  const pendingRequests = beltRequests.filter(r => r.status === 'PENDING');
  const canGraduate = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  useEffect(() => {
    if (!isOpen || !canGraduate) {
      setIsSuccess(false);
      return;
    }

    if (studentToGraduate) {
      setSelectedStudentId(studentToGraduate.id);
      setNewBelt(studentToGraduate.belt);
      setNewStripes(studentToGraduate.stripes < 4 ? studentToGraduate.stripes + 1 : 0);
      setActiveTab('PROMOTE');
    } else if (students.length > 0) {
      const current = students.find(s => s.id === selectedStudentId) || students[0];
      setSelectedStudentId(current.id);
      setNewBelt(current.belt);
      setNewStripes(current.stripes < 4 ? current.stripes + 1 : 0);
      if (pendingRequests.length > 0 && !selectedStudentId) {
        setActiveTab('REQUESTS');
      } else {
        setActiveTab('PROMOTE');
      }
    }
  }, [isOpen, studentToGraduate?.id]);

  if (!isOpen || !canGraduate) return null;

  const currentStudent = students.find(s => s.id === selectedStudentId) || studentToGraduate || students[0];

  const handlePromote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;

    promoteStudent(currentStudent.id, newBelt, newStripes, promotedBy, notes, promotedAt);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-100">Graduação & Alteração de Faixas</h3>
            <p className="text-xs text-slate-400">Gerenciar exames, outorgas e aprovações de faixas</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('PROMOTE')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold transition-all ${
              activeTab === 'PROMOTE'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Promover Atleta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('REQUESTS')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'REQUESTS'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Solicitações de Alunos
            {pendingRequests.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'REQUESTS' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
              }`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'PROMOTE' ? (
          <form onSubmit={handlePromote} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Selecione o Atleta:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  const found = students.find(s => s.id === e.target.value);
                  if (found) {
                    setNewBelt(found.belt);
                    setNewStripes(found.stripes < 4 ? found.stripes + 1 : 0);
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.belt} - {s.stripes}º Grau) - {getStudentTotalClasses(s, attendances)} treinos
                  </option>
                ))}
              </select>
            </div>

            {currentStudent && (() => {
              const target = getStudentGraduationTarget(currentStudent, academyConfig);
              const isEligible = isStudentEligibleForGraduation(currentStudent, academyConfig);
              const hasCustom = typeof currentStudent.customGraduationTargetClasses === 'number' && currentStudent.customGraduationTargetClasses > 0;
              return (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Graduação Atual & Progresso:</span>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{currentStudent.name}</span>
                    <BeltBadge belt={currentStudent.belt} stripes={currentStudent.stripes} size="sm" />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-semibold">
                      {currentStudent.classesSinceLastGraduation} de {target} treinos {hasCustom ? '(Meta Indiv.)' : '(Meta Padrão)'}
                    </span>
                    {isEligible ? (
                      <span className="text-emerald-400 font-extrabold bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/40">
                        ✓ Apto a Graduar
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">
                        Faltam {target - currentStudent.classesSinceLastGraduation} treino(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* New Belt & Stripe Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Nova Faixa:</label>
                <select
                  value={newBelt}
                  onChange={e => setNewBelt(e.target.value as BeltType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                >
                  <optgroup label="Adulto">
                    <option value="BRANCA">Faixa Branca</option>
                    <option value="AZUL">Faixa Azul</option>
                    <option value="ROXA">Faixa Roxa</option>
                    <option value="MARROM">Faixa Marrom</option>
                    <option value="PRETA">Faixa Preta</option>
                    <option value="VERMELHA E PRETA">Faixa Coral (Vermelha e Preta)</option>
                    <option value="VERMELHA E BRANCA">Faixa Coral (Vermelha e Branca)</option>
                    <option value="VERMELHA">Faixa Vermelha (Grande Mestre)</option>
                  </optgroup>
                  <optgroup label="Infantil / Kids">
                    <option value="CINZA">Faixa Cinza (Kids)</option>
                    <option value="AMARELA">Faixa Amarela (Kids)</option>
                    <option value="LARANJA">Faixa Laranja (Kids)</option>
                    <option value="VERDE">Faixa Verde (Kids)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Novos Graus (0 a 4):</label>
                <select
                  value={newStripes}
                  onChange={e => setNewStripes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                >
                  <option value={0}>Sem Grau (Faixa Lisa)</option>
                  <option value={1}>1º Grau</option>
                  <option value={2}>2º Grau</option>
                  <option value={3}>3º Grau</option>
                  <option value={4}>4º Grau</option>
                </select>
              </div>
            </div>

            {/* Preview New Belt */}
            <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/30 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase">Resultado da Promoção:</span>
              <BeltBadge belt={newBelt} stripes={newStripes} size="md" />
            </div>

            {isSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-xs font-bold animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Graduação registrada com sucesso! Atualizando atleta...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Mestre / Professor Outorgante:</label>
                <input
                  type="text"
                  value={promotedBy}
                  onChange={e => setPromotedBy(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-amber-400 font-extrabold block mb-1">🗓️ Data da Graduação / Outorga:</label>
                <input
                  type="date"
                  required
                  value={promotedAt}
                  onChange={e => setPromotedAt(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-2.5 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Anotações / Certificado:</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                Confirmar Graduação
              </button>
            </div>
          </form>
        ) : (
          /* REQUESTS TAB */
          <div className="space-y-4 text-xs">
            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-slate-200">Nenhuma solicitação pendente</h4>
                <p className="text-[11px] text-slate-400">
                  Todas as solicitações de alteração de faixa foram analisadas pelos professores.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-slate-950 rounded-2xl border border-amber-500/40 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-100">{req.studentName}</h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          Solicitado em {req.requestDate}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Faixa Atual:</span>
                        <BeltBadge belt={req.currentBelt} stripes={req.currentStripes} size="sm" />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-300 font-bold">Faixa Solicitada pelo Aluno:</span>
                      <BeltBadge belt={req.requestedBelt} stripes={req.requestedStripes} size="md" />
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                        "{req.notes}"
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => approveBeltChange(req.id, currentUser?.name || academyConfig.headCoachName)}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                      >
                        <Check className="w-4 h-4" />
                        Aprovar e Alterar Faixa
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectBeltChange(req.id, currentUser?.name || academyConfig.headCoachName)}
                        className="py-2 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-extrabold text-xs transition-all"
                      >
                        Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
