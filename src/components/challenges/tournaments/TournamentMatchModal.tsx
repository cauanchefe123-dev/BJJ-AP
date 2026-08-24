import React, { useState } from 'react';
import { TournamentMatch, RollOutcomeType, BeltType } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { X, Trophy, Swords, CheckCircle2, Clock, ShieldAlert, Award, Play } from 'lucide-react';

interface TournamentMatchModalProps {
  match: TournamentMatch;
  matchDurationMinutes: number;
  onClose: () => void;
  onSaveResult: (result: {
    winnerId: string;
    winnerName: string;
    outcomeType?: RollOutcomeType;
    submissionTechnique?: string;
    submissionMinute?: number;
    score1?: number;
    score2?: number;
    advantages1?: number;
    advantages2?: number;
    penalties1?: number;
    penalties2?: number;
    notes?: string;
  }) => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
}

const COMMON_SUBMISSIONS = [
  'Armlock (Chave de Braço)',
  'Triângulo',
  'Mata-Leão',
  'Kimura',
  'Guilhotina',
  'Americana',
  'Ezequiel',
  'Katagatame',
  'Omoplata',
  'Estrangulamento Cruzado',
  'Chave de Pé Reta (Botinha)',
  'Mão de Vaca',
  'Chave de Joelho',
  'Mata-Leão no Pé (Toe Hold)',
  'Calf Slicer (Chave de Panturrilha)'
];

export const TournamentMatchModal: React.FC<TournamentMatchModalProps> = ({
  match,
  matchDurationMinutes,
  onClose,
  onSaveResult,
  onNavigateToTimer,
}) => {
  const c1 = match.competitor1;
  const c2 = match.competitor2;

  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(match.winnerId || (c1 ? c1.id : ''));
  const [outcomeType, setOutcomeType] = useState<RollOutcomeType>(match.outcomeType || 'POINTS');
  const [submissionTechnique, setSubmissionTechnique] = useState(match.submissionTechnique || COMMON_SUBMISSIONS[0]);
  const [customSubmission, setCustomSubmission] = useState('');
  const [submissionMinute, setSubmissionMinute] = useState(match.submissionMinute || 3);
  
  const [score1, setScore1] = useState(match.score1 || 0);
  const [score2, setScore2] = useState(match.score2 || 0);
  const [advantages1, setAdvantages1] = useState(match.advantages1 || 0);
  const [advantages2, setAdvantages2] = useState(match.advantages2 || 0);
  const [penalties1, setPenalties1] = useState(match.penalties1 || 0);
  const [penalties2, setPenalties2] = useState(match.penalties2 || 0);
  
  const [notes, setNotes] = useState(match.notes || '');

  const winnerCompetitor = selectedWinnerId === c1?.id ? c1 : selectedWinnerId === c2?.id ? c2 : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWinnerId || !winnerCompetitor) {
      alert('Por favor, selecione o vencedor do confronto.');
      return;
    }

    const finalTechnique = outcomeType === 'SUBMISSION'
      ? (customSubmission.trim() ? customSubmission.trim() : submissionTechnique)
      : undefined;

    onSaveResult({
      winnerId: selectedWinnerId,
      winnerName: winnerCompetitor.name,
      outcomeType,
      submissionTechnique: finalTechnique,
      submissionMinute: outcomeType === 'SUBMISSION' ? Number(submissionMinute) : undefined,
      score1: Number(score1),
      score2: Number(score2),
      advantages1: Number(advantages1),
      advantages2: Number(advantages2),
      penalties1: Number(penalties1),
      penalties2: Number(penalties2),
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Luta #{match.matchNumber} • {match.roundLabel || `Round ${match.round}`}
              </span>
              <h3 className="font-extrabold text-lg text-slate-100">
                Registrar Resultado do Confronto
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          {/* Confrontation Match Display / Winner Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
              Selecione o Vencedor da Luta:
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Competitor 1 */}
              <button
                type="button"
                disabled={!c1}
                onClick={() => c1 && setSelectedWinnerId(c1.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  !c1 
                    ? 'opacity-40 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                    : selectedWinnerId === c1.id
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg ring-1 ring-amber-500'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {selectedWinnerId === c1?.id && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                    Vencedor 👑
                  </span>
                )}
                <div>
                  <span className="text-[10px] font-bold text-amber-400 block mb-1">Canto Azul</span>
                  <p className="font-black text-sm text-slate-100 truncate">{c1?.name || 'Aguardando Atleta'}</p>
                </div>
                {c1 && (
                  <div className="mt-3">
                    <BeltBadge belt={c1.belt} stripes={c1.stripes} size="sm" />
                  </div>
                )}
              </button>

              {/* Competitor 2 */}
              <button
                type="button"
                disabled={!c2}
                onClick={() => c2 && setSelectedWinnerId(c2.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  !c2 
                    ? 'opacity-40 border-slate-800 bg-slate-950/40 cursor-not-allowed'
                    : selectedWinnerId === c2.id
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg ring-1 ring-amber-500'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {selectedWinnerId === c2?.id && (
                  <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider">
                    Vencedor 👑
                  </span>
                )}
                <div>
                  <span className="text-[10px] font-bold text-blue-400 block mb-1">Canto Branco</span>
                  <p className="font-black text-sm text-slate-100 truncate">{c2?.name || 'Aguardando Atleta'}</p>
                </div>
                {c2 && (
                  <div className="mt-3">
                    <BeltBadge belt={c2.belt} stripes={c2.stripes} size="sm" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Outcome Type */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
              Tipo de Vitória / Desfecho:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'POINTS', label: 'Pontos IBJJF', icon: Trophy },
                { id: 'SUBMISSION', label: 'Finalização 🥋', icon: Swords },
                { id: 'TECHNICAL_DRAW', label: 'Decisão Árbitro', icon: Award },
                { id: 'DISQUALIFICATION', label: 'Desclassificação / W.O.', icon: ShieldAlert },
              ].map(opt => {
                const Icon = opt.icon;
                const isSelected = outcomeType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOutcomeType(opt.id as RollOutcomeType)}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submission Details if SUBMISSION */}
          {outcomeType === 'SUBMISSION' && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" /> Detalhes da Finalização
                </span>
                <div className="flex items-center gap-1.5 text-xs text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Aos</span>
                  <input
                    type="number"
                    min="1"
                    max={matchDurationMinutes}
                    value={submissionMinute}
                    onChange={(e) => setSubmissionMinute(Number(e.target.value))}
                    className="w-12 px-1.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-center text-xs font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <span>min</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Golpe Aplicado:</label>
                <select
                  value={submissionTechnique}
                  onChange={(e) => setSubmissionTechnique(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium focus:outline-none focus:border-amber-500"
                >
                  {COMMON_SUBMISSIONS.map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                  <option value="OUTRO">Outro golpe...</option>
                </select>
              </div>

              {submissionTechnique === 'OUTRO' && (
                <input
                  type="text"
                  placeholder="Especifique o golpe (ex: Chave de calcanhar, Crucifixo...)"
                  value={customSubmission}
                  onChange={(e) => setCustomSubmission(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-amber-500/50 text-slate-100 text-xs focus:outline-none"
                />
              )}
            </div>
          )}

          {/* Points & Score Details (Pontuação IBJJF) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <span className="text-xs font-black uppercase text-slate-300 block">
              Placar Oficial do Combate (Pontos / Vantagens / Punições)
            </span>

            <div className="grid grid-cols-2 gap-4">
              {/* Score Competitor 1 */}
              <div className="space-y-2 text-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs font-bold text-amber-400 truncate">{c1?.name || 'Atleta 1'}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Pontos</span>
                    <input
                      type="number"
                      min="0"
                      value={score1}
                      onChange={(e) => setScore1(Number(e.target.value))}
                      className="w-12 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-white"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-amber-400 block">Vant.</span>
                    <input
                      type="number"
                      min="0"
                      value={advantages1}
                      onChange={(e) => setAdvantages1(Number(e.target.value))}
                      className="w-10 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-amber-400"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-red-400 block">Pun.</span>
                    <input
                      type="number"
                      min="0"
                      value={penalties1}
                      onChange={(e) => setPenalties1(Number(e.target.value))}
                      className="w-10 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-red-400"
                    />
                  </div>
                </div>
              </div>

              {/* Score Competitor 2 */}
              <div className="space-y-2 text-center p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <p className="text-xs font-bold text-blue-400 truncate">{c2?.name || 'Atleta 2'}</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block">Pontos</span>
                    <input
                      type="number"
                      min="0"
                      value={score2}
                      onChange={(e) => setScore2(Number(e.target.value))}
                      className="w-12 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-white"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-amber-400 block">Vant.</span>
                    <input
                      type="number"
                      min="0"
                      value={advantages2}
                      onChange={(e) => setAdvantages2(Number(e.target.value))}
                      className="w-10 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-amber-400"
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-red-400 block">Pun.</span>
                    <input
                      type="number"
                      min="0"
                      value={penalties2}
                      onChange={(e) => setPenalties2(Number(e.target.value))}
                      className="w-10 px-1 py-1 rounded-lg bg-slate-950 border border-slate-700 text-center font-black text-sm text-red-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Observations */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              Observações Técnicas do Árbitro / Mesário (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Luta movimentada, raspagem no último minuto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {onNavigateToTimer && c1 && c2 && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToTimer(matchDurationMinutes, `${c1.name} vs ${c2.name}`);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <Play className="w-3.5 h-3.5 fill-amber-400" />
                <span>Cronômetro</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Salvar & Avançar Chave</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
