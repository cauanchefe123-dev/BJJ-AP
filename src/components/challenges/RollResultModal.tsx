import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { RollChallenge, RollOutcomeType, RollChallengeResult } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import { 
  X, 
  Award, 
  Swords, 
  CheckCircle, 
  Sparkles, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';

interface RollResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: RollChallenge | null;
}

const COMMON_BJJ_SUBMISSIONS = [
  'Armlock da Guarda',
  'Armlock do Cem Quilos',
  'Triângulo',
  'Mata-Leão',
  'Kimura',
  'Guilhotina',
  'Chave de Pé Reta (Botinha)',
  'Ezequiel',
  'Katagatame',
  'Omoplata',
  'Americana',
  'Chave de Joelho (Kneebar)',
  'Chave de Calcanhar (Heel Hook)',
  'Estrangulamento Cruzado',
  'Estrangulamento Rodado / Brabo',
  'Mão de Vaca',
  'Gogoplata',
];

export const RollResultModal: React.FC<RollResultModalProps> = ({
  isOpen,
  onClose,
  challenge,
}) => {
  const { completeRollChallenge, students } = useData();
  const { currentUser } = useAuth();

  const [outcomeType, setOutcomeType] = useState<RollOutcomeType>('SUBMISSION');
  const [winnerId, setWinnerId] = useState<string>('');
  const [submissionTechnique, setSubmissionTechnique] = useState<string>('Armlock da Guarda');
  const [customTechnique, setCustomTechnique] = useState<string>('');
  const [submissionMinute, setSubmissionMinute] = useState<number>(3);
  const [scoreChallenger, setScoreChallenger] = useState<number>(0);
  const [scoreChallenged, setScoreChallenged] = useState<number>(0);
  const [technicalNotes, setTechnicalNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !challenge) return null;

  const challengerStudent = students.find(s => s.id === challenge.challengerId);
  const challengedStudent = students.find(s => s.id === challenge.challengedId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let determinedWinnerName: string | undefined = undefined;

    if (outcomeType === 'SUBMISSION' || outcomeType === 'POINTS') {
      if (!winnerId) {
        setErrorMsg('Por favor, selecione qual atleta venceu o confronto ou marque "Rola de Estudo / Empate".');
        return;
      }
      if (winnerId === challenge.challengerId) {
        determinedWinnerName = challenge.challengerName;
      } else if (winnerId === challenge.challengedId) {
        determinedWinnerName = challenge.challengedName;
      }
    }

    const finalTech = customTechnique.trim() || submissionTechnique;

    const result: RollChallengeResult = {
      winnerId: (outcomeType === 'STUDY_ROUND' || outcomeType === 'TECHNICAL_DRAW') ? undefined : winnerId,
      winnerName: determinedWinnerName,
      outcomeType,
      submissionTechnique: outcomeType === 'SUBMISSION' ? finalTech : undefined,
      submissionMinute: outcomeType === 'SUBMISSION' ? Number(submissionMinute) || 1 : undefined,
      scoreChallenger: outcomeType === 'POINTS' ? Number(scoreChallenger) || 0 : undefined,
      scoreChallenged: outcomeType === 'POINTS' ? Number(scoreChallenged) || 0 : undefined,
      technicalNotes: technicalNotes.trim() || undefined,
      registeredBy: currentUser?.name || 'Tatame Staff',
      registeredAt: new Date().toISOString(),
    };

    completeRollChallenge(challenge.id, result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl text-white shadow-2xl overflow-hidden animate-fade-in my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-md shrink-0">
              <Award className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight font-display">
                Registrar Resultado do Rola 📝
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {challenge.challengerName} vs {challenge.challengedName || 'Adversário'}
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

          {/* Outcome Type */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Como terminou o rola?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'SUBMISSION', label: '🥋 Finalização', desc: 'Com golpe aplicado' },
                { id: 'POINTS', label: '⏱️ Por Pontos', desc: 'Regras de pontos' },
                { id: 'STUDY_ROUND', label: '🤝 Rola de Estudo', desc: 'Treino solto / Técnico' },
                { id: 'TECHNICAL_DRAW', label: '⚖️ Empate Técnico', desc: 'Sem pontuação' },
              ].map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => {
                    setOutcomeType(type.id as RollOutcomeType);
                    if (type.id === 'STUDY_ROUND' || type.id === 'TECHNICAL_DRAW') {
                      setWinnerId('');
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    outcomeType === type.id
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-extrabold text-xs text-slate-100">{type.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{type.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Winner Selector (If Submission or Points) */}
          {(outcomeType === 'SUBMISSION' || outcomeType === 'POINTS') && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Atleta Vencedor
              </label>
              <div className="grid grid-cols-2 gap-3">
                {/* Challenger */}
                <button
                  type="button"
                  onClick={() => setWinnerId(challenge.challengerId)}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    winnerId === challenge.challengerId
                      ? 'bg-amber-500/20 border-amber-500 text-white ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={challenge.challengerPhotoUrl || (challengerStudent && getStudentAvatar(challengerStudent)) || '/avatar.png'}
                    alt={challenge.challengerName}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase text-amber-400">Desafiante</span>
                    <p className="font-extrabold text-xs text-slate-100 truncate">{challenge.challengerName}</p>
                    <BeltBadge belt={challenge.challengerBelt} stripes={challenge.challengerStripes} size="sm" />
                  </div>
                </button>

                {/* Challenged */}
                <button
                  type="button"
                  onClick={() => challenge.challengedId && setWinnerId(challenge.challengedId)}
                  disabled={!challenge.challengedId}
                  className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                    winnerId === challenge.challengedId
                      ? 'bg-blue-500/20 border-blue-500 text-white ring-1 ring-blue-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={challenge.challengedPhotoUrl || (challengedStudent && getStudentAvatar(challengedStudent)) || '/avatar.png'}
                    alt={challenge.challengedName || 'Adversário'}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase text-blue-400">Desafiado</span>
                    <p className="font-extrabold text-xs text-slate-100 truncate">{challenge.challengedName || 'Adversário'}</p>
                    {challenge.challengedBelt && (
                      <BeltBadge belt={challenge.challengedBelt} stripes={challenge.challengedStripes || 0} size="sm" />
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Submission Technique Selector (If Submission) */}
          {outcomeType === 'SUBMISSION' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Golpe / Finalização Aplicada
              </label>

              {/* Submissions pills */}
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border border-slate-800/80 rounded-2xl bg-slate-950/40">
                {COMMON_BJJ_SUBMISSIONS.map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => {
                      setSubmissionTechnique(tech);
                      setCustomTechnique('');
                    }}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                      submissionTechnique === tech && !customTechnique
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-sm'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {tech}
                  </button>
                ))}
              </div>

              {/* Custom technique or minute */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">Outro Golpe (Personalizado)</label>
                  <input
                    type="text"
                    value={customTechnique}
                    onChange={(e) => setCustomTechnique(e.target.value)}
                    placeholder="Ex: Triângulo invertido, Berimbolo para costas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">Minuto da Finalização</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={challenge.targetDurationMinutes || 15}
                      value={submissionMinute}
                      onChange={(e) => setSubmissionMinute(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                    />
                    <span className="text-xs text-slate-400">min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Points score inputs (If Points) */}
          {outcomeType === 'POINTS' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Placar de Pontos
              </label>
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-1 text-center">
                  <p className="text-xs font-bold text-slate-300 truncate">{challenge.challengerName}</p>
                  <input
                    type="number"
                    min={0}
                    value={scoreChallenger}
                    onChange={(e) => setScoreChallenger(Number(e.target.value))}
                    className="w-20 mx-auto bg-slate-900 border border-slate-700 rounded-xl py-2 text-center text-base font-black text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-500">Pontos</p>
                </div>

                <div className="space-y-1 text-center">
                  <p className="text-xs font-bold text-slate-300 truncate">{challenge.challengedName || 'Adversário'}</p>
                  <input
                    type="number"
                    min={0}
                    value={scoreChallenged}
                    onChange={(e) => setScoreChallenged(Number(e.target.value))}
                    className="w-20 mx-auto bg-slate-900 border border-slate-700 rounded-xl py-2 text-center text-base font-black text-blue-400 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500">Pontos</p>
                </div>
              </div>
            </div>
          )}

          {/* Technical Notes / Learning Feedback */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Observações Técnicas / Feedback Mútuo
            </label>
            <textarea
              rows={3}
              value={technicalNotes}
              onChange={(e) => setTechnicalNotes(e.target.value)}
              placeholder="Ex: Excelente troca de pegadas, ótima guarda laçada. Destaque para o fair play de ambos os atletas!"
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
              <Award className="w-4 h-4 stroke-[2.5]" />
              Salvar Resultado 🥋
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
