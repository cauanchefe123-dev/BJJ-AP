import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Student, BeltType, RollModality, RollRulesType } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import { getLocalDateStr } from '../../utils/dateUtils';
import { 
  X, 
  Swords, 
  Users, 
  Clock, 
  Calendar, 
  Sparkles, 
  Flame, 
  Shield, 
  Search, 
  Check, 
  MessageSquare,
  AlertCircle 
} from 'lucide-react';

interface NewChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  challengerStudent?: Student | null;
}

export const NewChallengeModal: React.FC<NewChallengeModalProps> = ({
  isOpen,
  onClose,
  challengerStudent,
}) => {
  const { students, classes, createRollChallenge, academyConfig } = useData();

  const [isPublicOpen, setIsPublicOpen] = useState(false);
  const [selectedOpponentId, setSelectedOpponentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('Desafio Amistoso de Tatame');
  const [modality, setModality] = useState<RollModality>('GI');
  const [rulesType, setRulesType] = useState<RollRulesType>('ESTUDO_LEVE');
  const [durationMinutes, setDurationMinutes] = useState(6);
  const [scheduledDate, setScheduledDate] = useState(getLocalDateStr());
  const [scheduledTime, setScheduledTime] = useState('19:30');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Filter available opponents (exclude challenger)
  const availableOpponents = students.filter(s => {
    if (challengerStudent && s.id === challengerStudent.id) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.belt.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedOpponent = students.find(s => s.id === selectedOpponentId);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!challengerStudent) {
      setErrorMsg('Identificação do atleta desafiante não encontrada.');
      return;
    }

    if (!isPublicOpen && !selectedOpponentId) {
      setErrorMsg('Selecione um colega para desafiar ou marque a opção "Desafio Aberto no Mural".');
      return;
    }

    const newChallenge = createRollChallenge({
      challengerId: challengerStudent.id,
      challengerName: challengerStudent.name,
      challengerBelt: challengerStudent.belt,
      challengerStripes: challengerStudent.stripes,
      challengerPhotoUrl: getStudentAvatar(challengerStudent),
      isPublicOpenChallenge: isPublicOpen,
      challengedId: isPublicOpen ? undefined : selectedOpponent?.id,
      challengedName: isPublicOpen ? undefined : selectedOpponent?.name,
      challengedBelt: isPublicOpen ? undefined : selectedOpponent?.belt,
      challengedStripes: isPublicOpen ? undefined : selectedOpponent?.stripes,
      challengedPhotoUrl: isPublicOpen || !selectedOpponent ? undefined : getStudentAvatar(selectedOpponent),
      title: title.trim() || 'Desafio de Rola',
      scheduledDate,
      scheduledTime,
      classId: selectedClassId || undefined,
      className: selectedClass?.title || undefined,
      modality,
      rulesType,
      targetDurationMinutes: Number(durationMinutes) || 6,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden animate-fade-in my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-md shrink-0">
              <Swords className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100 tracking-tight font-display">
                Lançar Desafio de Rola 🥋
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Convide um colega ou abra um desafio no mural do tatame
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

          {/* Type Selector: Direct vs Open Mural */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Tipo do Desafio
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsPublicOpen(false)}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  !isPublicOpen
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-md'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  !isPublicOpen ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs text-slate-100">Desafio Direto</p>
                  <p className="text-[11px] text-slate-400">Escolher colega específico</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPublicOpen(true);
                  setSelectedOpponentId('');
                }}
                className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                  isPublicOpen
                    ? 'bg-blue-500/15 border-blue-500/50 text-white shadow-md'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  isPublicOpen ? 'bg-blue-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs text-slate-100">Mural Aberto</p>
                  <p className="text-[11px] text-slate-400">Quem topar no tatame</p>
                </div>
              </button>
            </div>
          </div>

          {/* Opponent Selector (When Direct Challenge) */}
          {!isPublicOpen && (
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Selecione o Colega de Tatame
              </label>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou faixa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Opponent list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 border border-slate-800/80 rounded-2xl bg-slate-950/40">
                {availableOpponents.length === 0 ? (
                  <p className="p-4 text-center text-xs text-slate-500 col-span-2">
                    Nenhum aluno encontrado.
                  </p>
                ) : (
                  availableOpponents.map((st) => {
                    const isSelected = selectedOpponentId === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedOpponentId(st.id)}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/40'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <img
                          src={getStudentAvatar(st)}
                          alt={st.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate text-slate-100">{st.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BeltBadge belt={st.belt} stripes={st.stripes} size="sm" />
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 stroke-[3]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Title / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Título / Foco do Rola
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Rola de 6min Gi, Treino específico de guarda, etc."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          {/* Modality & Rules Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Modality */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Modalidade
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModality('GI')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modality === 'GI'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  🥋 Com Kimono (Gi)
                </button>
                <button
                  type="button"
                  onClick={() => setModality('NO_GI')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    modality === 'NO_GI'
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  🤼 No-Gi (Sem Kimono)
                </button>
              </div>
            </div>

            {/* Target Duration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Tempo do Rola (Minutos)
              </label>
              <div className="flex items-center gap-2">
                {[5, 6, 8, 10, 12].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDurationMinutes(min)}
                    className={`flex-1 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      durationMinutes === min
                        ? 'bg-amber-500 text-slate-950 border-amber-500 font-extrabold shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Rules style */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Estilo / Regras do Rola
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'ESTUDO_LEVE', label: 'Rola de Estudo', desc: 'Solto e técnico' },
                { id: 'SUBMISSION_ONLY', label: 'Sub-Only', desc: 'Finalização apenas' },
                { id: 'PONTOS_IBJJF', label: 'Regras IBJJF', desc: 'Pontos e vantagens' },
                { id: 'TEMPO_LIVRE', label: 'Treino Livre', desc: 'Ritmo combinado' },
              ].map((rule) => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setRulesType(rule.id as RollRulesType)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    rulesType === rule.id
                      ? 'bg-amber-500/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <p className="font-extrabold text-xs text-slate-100">{rule.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{rule.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time & Class */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Data do Rola</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Horário Previsto</label>
              <input
                type="text"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                placeholder="Ex: 19:30 ou pós-treino"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">Vincular a Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="">Qualquer Turma / Treino Livre</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes / Message */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-400">
              Recado / Combinação Especial (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Puxo guarda no início, vamos treinar defesa de passagem de guarda!"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Respect & Martial Ethos Notice */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-300 text-[11px] flex items-center gap-2.5">
            <span className="text-base">🥋</span>
            <p className="leading-relaxed">
              O objetivo do desafio é a evolução técnica, companheirismo e respeito no tatame. Oss!
            </p>
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
              <Swords className="w-4 h-4 stroke-[2.5]" />
              Lançar Desafio 🥋
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
