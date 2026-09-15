import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { RollChallenge, RollModality, RollRulesType } from '../../types';
import { 
  X, 
  Swords, 
  Clock, 
  Calendar, 
  Sparkles, 
  Shield, 
  MessageSquare,
  AlertCircle,
  Award,
  Save
} from 'lucide-react';

interface EditChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: RollChallenge | null;
  onOpenResultModal?: (challenge: RollChallenge) => void;
}

export const EditChallengeModal: React.FC<EditChallengeModalProps> = ({
  isOpen,
  onClose,
  challenge,
  onOpenResultModal,
}) => {
  const { classes, updateRollChallenge } = useData();

  const [title, setTitle] = useState('');
  const [modality, setModality] = useState<RollModality>('GI');
  const [rulesType, setRulesType] = useState<RollRulesType>('ESTUDO_LEVE');
  const [durationMinutes, setDurationMinutes] = useState(6);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('19:30');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (challenge && isOpen) {
      setTitle(challenge.title || 'Desafio de Rola');
      setModality(challenge.modality || 'GI');
      setRulesType(challenge.rulesType || 'ESTUDO_LEVE');
      setDurationMinutes(challenge.targetDurationMinutes || 6);
      setScheduledDate(challenge.scheduledDate || '');
      setScheduledTime(challenge.scheduledTime || '19:30');
      setSelectedClassId(challenge.classId || '');
      setNotes(challenge.notes || '');
      setErrorMsg('');
    }
  }, [challenge, isOpen]);

  if (!isOpen || !challenge) return null;

  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    updateRollChallenge(challenge.id, {
      title: title.trim() || 'Desafio de Rola',
      modality,
      rulesType,
      targetDurationMinutes: Number(durationMinutes) || 6,
      scheduledDate,
      scheduledTime,
      classId: selectedClassId || undefined,
      className: selectedClass?.title || undefined,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl text-white shadow-2xl overflow-hidden animate-fade-in my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-md shrink-0">
              <Swords className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight font-display">
                Atualizar Desafio de Rola 🥋
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {challenge.challengerName} vs {challenge.challengedName || (challenge.isPublicOpenChallenge ? 'Mural Aberto' : 'Adversário')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-xs sm:text-sm">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              {errorMsg}
            </div>
          )}

          {/* Quick Outcome Shortcut if challenge is already accepted or in progress */}
          {onOpenResultModal && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 flex items-center justify-between gap-3">
              <div>
                <p className="font-extrabold text-xs text-amber-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  {challenge.status === 'COMPLETED' ? 'O rola já foi realizado?' : 'Já rolou no tatame?'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {challenge.status === 'COMPLETED' 
                    ? 'Você pode atualizar o vencedor, técnica ou pontuação do desfecho.'
                    : 'Coloque o desfecho agora para destacar o resultado por 3 dias no Painel Geral!'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenResultModal(challenge);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all active:scale-95 cursor-pointer shrink-0 shadow-md flex items-center gap-1.5"
              >
                <Award className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{challenge.result ? 'Atualizar Desfecho' : 'Colocar Desfecho'}</span>
              </button>
            </div>
          )}

          {/* Challenge Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Título / Motivação do Desafio
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rola de Estudo de Guarda / Treino Específico"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Modality Selector (Kimono vs No-Gi) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Modalidade
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setModality('GI')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  modality === 'GI'
                    ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                  modality === 'GI' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                }`}>
                  🥋
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-xs text-slate-100">Com Kimono (Gi)</p>
                  <p className="text-[10px] text-slate-400">Pegadas tradicionais</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setModality('NO_GI')}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                  modality === 'NO_GI'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black ${
                  modality === 'NO_GI' ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  ⚡
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-xs text-slate-100">Sem Kimono (No-Gi)</p>
                  <p className="text-[10px] text-slate-400">Submission / Grappling</p>
                </div>
              </button>
            </div>
          </div>

          {/* Rules & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Regra / Estilo do Rola
              </label>
              <select
                value={rulesType}
                onChange={(e) => setRulesType(e.target.value as RollRulesType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ESTUDO_LEVE">🤝 Estudo Leve (Treino Solto)</option>
                <option value="REGULAR_PONTOS">⏱️ Com Pontos (IBJJF)</option>
                <option value="SUB_ONLY">🥋 Submission Only (Só Pega)</option>
                <option value="POSICIONAL">🎯 Posicional / Específico</option>
                <option value="CAMP_RITMO">🔥 Ritmo de Competição</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Duração Prevista (Minutos)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={2}
                  max={30}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-9 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <Clock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Data do Treino
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pl-9 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
                <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Horário Aprox.
              </label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="Ex: 19:30"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Class Assignment */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Turma Relacionada (Opcional)
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="">Tatame Livre / Qualquer Treino</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.time})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Observações / Combinados
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Rola focado em transições da meia-guarda, sem chaves de calcanhar..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              Salvar Alterações 🥋
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
