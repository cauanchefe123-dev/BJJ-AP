import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStudentForUser } from '../../constants/avatar';
import { TrainingLog } from '../../types';
import {
  BookOpen,
  Plus,
  Flame,
  Sparkles,
  Star,
  Calendar,
  Check,
  Search,
  Filter,
  Trash2,
  Edit3,
  Clock,
  Shield,
  Zap,
  Tag,
  X,
  Dumbbell,
  Award,
  ChevronDown,
  ChevronUp,
  Users,
  AlertCircle,
  TrendingUp,
  Target
} from 'lucide-react';

const QUICK_TECHNIQUES = [
  { category: 'Raspagens', items: ['Raspagem De La Riva', 'Raspagem Guarda Aranha', 'Raspagem Tesourinha', 'Raspagem Meia-Guarda', 'Raspagem X-Guard'] },
  { category: 'Passagens', items: ['Passagem Emborcando', 'Passagem Toureada', 'Passagem Joelho no Chão', 'Passagem Over-Under', 'Passagem de Meia-Guarda'] },
  { category: 'Finalizações', items: ['Armlock da Guarda', 'Triângulo', 'Mata-Leão', 'Kimura', 'Guilhotina', 'Omoplata', 'Chave de Pé (Botinha)'] },
  { category: 'Quedas & Defesas', items: ['Single Leg', 'Double Leg', 'Upa / Escapada da Montada', 'Defesa de Costas', 'Escapada do Armlock'] },
];

export const StudentTrainingJournal: React.FC = () => {
  const { currentUser } = useAuth();
  const { students, trainingLogs, addTrainingLog, updateTrainingLog, deleteTrainingLog } = useData();

  const isStudentUser = currentUser?.role === 'ALUNO';
  const resolvedStudent = resolveStudentForUser(currentUser, students) || (currentUser?.studentId ? students.find(s => s.id === currentUser.studentId) : null);

  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (isStudentUser) return resolvedStudent?.id || '';
    return resolvedStudent?.id || (students.length > 0 ? students[0].id : '');
  });

  const activeStudent = isStudentUser 
    ? resolvedStudent 
    : (students.find(s => s.id === selectedStudentId) || resolvedStudent || (students.length > 0 ? students[0] : null));

  const student = activeStudent;
  const myLogs = activeStudent ? trainingLogs.filter(l => l.studentId === activeStudent.id) : [];

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState(90);
  const [rounds, setRounds] = useState(5);
  const [modality, setModality] = useState<'GI' | 'NO_GI'>('GI');
  const [sessionType, setSessionType] = useState<'AULA_REGULAR' | 'OPEN_MAT' | 'COMPETICAO' | 'PARTICULAR' | 'TREINO_LIVRE'>('AULA_REGULAR');
  
  const [techInput, setTechInput] = useState('');
  const [techniques, setTechniques] = useState<string[]>([]);

  const [subAppliedInput, setSubAppliedInput] = useState('');
  const [submissionsApplied, setSubmissionsApplied] = useState<string[]>([]);

  const [subDefendedInput, setSubDefendedInput] = useState('');
  const [submissionsReceived, setSubmissionsReceived] = useState<string[]>([]);

  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState(5);

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModality, setFilterModality] = useState<'ALL' | 'GI' | 'NO_GI'>('ALL');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  // Delete Confirmation Modal State
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Metrics calculation
  const totalMinutes = myLogs.reduce((acc, l) => acc + (l.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const totalRounds = myLogs.reduce((acc, l) => acc + (l.roundsCount || 0), 0);
  
  const allTechsSet = new Set<string>();
  myLogs.forEach(l => (l.techniquesLearned || []).forEach(t => allTechsSet.add(t)));
  
  const avgRating = myLogs.length > 0 
    ? (myLogs.reduce((acc, l) => acc + (l.moodRating || 5), 0) / myLogs.length).toFixed(1)
    : '5.0';

  const handleAddTech = (techToAdd?: string) => {
    const val = techToAdd || techInput.trim();
    if (val && !techniques.includes(val)) {
      setTechniques([...techniques, val]);
      setTechInput('');
    }
  };

  const handleRemoveTech = (index: number) => {
    setTechniques(techniques.filter((_, i) => i !== index));
  };

  const handleAddSubApplied = () => {
    if (subAppliedInput.trim() && !submissionsApplied.includes(subAppliedInput.trim())) {
      setSubmissionsApplied([...submissionsApplied, subAppliedInput.trim()]);
      setSubAppliedInput('');
    }
  };

  const handleRemoveSubApplied = (index: number) => {
    setSubmissionsApplied(submissionsApplied.filter((_, i) => i !== index));
  };

  const handleAddSubDefended = () => {
    if (subDefendedInput.trim() && !submissionsReceived.includes(subDefendedInput.trim())) {
      setSubmissionsReceived([...submissionsReceived, subDefendedInput.trim()]);
      setSubDefendedInput('');
    }
  };

  const handleRemoveSubDefended = (index: number) => {
    setSubmissionsReceived(submissionsReceived.filter((_, i) => i !== index));
  };

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;

    if (editingLogId) {
      updateTrainingLog(editingLogId, {
        date,
        durationMinutes: duration,
        roundsCount: rounds,
        modality,
        sessionType,
        techniquesLearned: techniques,
        submissionsApplied,
        submissionsReceived,
        notes,
        moodRating: rating,
      });
      setEditingLogId(null);
    } else {
      addTrainingLog({
        studentId: student.id,
        date,
        durationMinutes: duration,
        roundsCount: rounds,
        modality,
        sessionType,
        techniquesLearned: techniques,
        submissionsApplied,
        submissionsReceived,
        notes,
        moodRating: rating,
      });
    }

    // Reset Form
    resetForm();
  };

  const resetForm = () => {
    setEditingLogId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setDuration(90);
    setRounds(5);
    setModality('GI');
    setSessionType('AULA_REGULAR');
    setTechniques([]);
    setSubmissionsApplied([]);
    setSubmissionsReceived([]);
    setNotes('');
    setRating(5);
  };

  const handleEditClick = (log: TrainingLog) => {
    setEditingLogId(log.id);
    setDate(log.date || new Date().toISOString().split('T')[0]);
    setDuration(log.durationMinutes || 90);
    setRounds(log.roundsCount || 5);
    setModality(log.modality || 'GI');
    setSessionType(log.sessionType || 'AULA_REGULAR');
    setTechniques(log.techniquesLearned || []);
    setSubmissionsApplied(log.submissionsApplied || []);
    setSubmissionsReceived(log.submissionsReceived || []);
    setNotes(log.notes || '');
    setRating(log.moodRating || 5);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmDeleteLog = () => {
    if (deletingLogId) {
      deleteTrainingLog(deletingLogId);
      setDeletingLogId(null);
    }
  };

  // Filtered Logs
  const filteredLogs = myLogs.filter(log => {
    if (filterModality !== 'ALL' && log.modality && log.modality !== filterModality) return false;
    if (filterRating !== null && log.moodRating !== filterRating) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchNotes = log.notes?.toLowerCase().includes(term);
      const matchTechs = log.techniquesLearned?.some(t => t.toLowerCase().includes(term));
      const matchSubsApp = log.submissionsApplied?.some(s => s.toLowerCase().includes(term));
      const matchSubsRec = log.submissionsReceived?.some(s => s.toLowerCase().includes(term));
      return matchNotes || matchTechs || matchSubsApp || matchSubsRec;
    }

    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold mb-2">
              <BookOpen className="w-3.5 h-3.5" /> Caderno de Tatame do Atleta
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Diário de Treinos & Evolução Técnica
            </h2>
            <p className="text-xs text-slate-400 max-w-xl mt-1">
              {isStudentUser
                ? 'Registre suas posições aprendidas, quantidade de rolas, submissões e reflexões de treino para acelerar sua caminhada na arte suave.'
                : `Visualizando diário técnico do atleta: ${activeStudent?.name || 'Selecione um aluno abaixo'}`}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isFormOpen && editingLogId) resetForm();
              setIsFormOpen(!isFormOpen);
            }}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            {isFormOpen ? (
              <>
                <ChevronUp className="w-4 h-4" /> Minimizar Formulário
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Anotar Treino Hoje
              </>
            )}
          </button>
        </div>
      </div>

      {/* Professor/Admin Athlete Switcher */}
      {!isStudentUser && students.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Users className="w-4 h-4" />
            <span>Visualizar Diário do Atleta:</span>
          </div>
          <select
            value={activeStudent?.id || ''}
            onChange={e => setSelectedStudentId(e.target.value)}
            className="w-full sm:w-auto bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 font-bold text-xs focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.belt} - {s.stripes}º Grau)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Athlete Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Tatame Acumulado</span>
            <span className="text-lg font-black text-slate-100">{totalHours} hrs</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Rolas Realizados</span>
            <span className="text-lg font-black text-slate-100">{totalRounds} rounds</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Técnicas Anotadas</span>
            <span className="text-lg font-black text-slate-100">{allTechsSet.size} posições</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white shadow-sm flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-400/10 text-amber-300 border border-amber-400/20">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Média de Desempenho</span>
            <span className="text-lg font-black text-slate-100">{avgRating} / 5.0</span>
          </div>
        </div>
      </div>

      {/* Form Section */}
      {isFormOpen && (
        <form onSubmit={handleSaveLog} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl text-xs transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h4 className="font-black text-sm text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {editingLogId ? 'Editar Registro de Treino' : 'Registrar Novo Treino no Tatame'}
            </h4>
            {editingLogId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg"
              >
                <X className="w-3.5 h-3.5" /> Cancelar Edição
              </button>
            )}
          </div>

          {/* Row 1: Date, Duration, Rounds, Modality, Session Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Data do Treino:</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Duração (Minutos):</label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none pr-10"
                />
                <span className="absolute right-3 top-3 text-[10px] text-slate-500 font-bold">min</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Rolas (Rounds):</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={rounds}
                  onChange={e => setRounds(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none pr-12"
                />
                <span className="absolute right-3 top-3 text-[10px] text-slate-500 font-bold">rd</span>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Modalidade:</label>
              <select
                value={modality}
                onChange={e => setModality(e.target.value as 'GI' | 'NO_GI')}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
              >
                <option value="GI">🥋 GI (Com Kimono)</option>
                <option value="NO_GI">🩳 NO-GI (Sem Kimono)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Tipo de Aula:</label>
              <select
                value={sessionType}
                onChange={e => setSessionType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold text-[11px]"
              >
                <option value="AULA_REGULAR">Aula Regular</option>
                <option value="OPEN_MAT">Open Mat</option>
                <option value="TREINO_LIVRE">Treino Livre / Sparring</option>
                <option value="COMPETICAO">Treino de Competição</option>
                <option value="PARTICULAR">Aula Particular</option>
              </select>
            </div>
          </div>

          {/* Quick Preset Selector */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Sugestões Rápidas de Posições (Clique para Adicionar):
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {QUICK_TECHNIQUES.map((grp, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{grp.category}</span>
                  <div className="flex flex-wrap gap-1">
                    {grp.items.map((item, i) => {
                      const isSelected = techniques.includes(item);
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleAddTech(item)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 opacity-60 cursor-default'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-amber-500/30'
                          }`}
                        >
                          + {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Techniques Custom Input & List */}
          <div>
            <label className="text-slate-300 font-bold block mb-1">
              Técnicas Aprendidas / Estudadas Hoje:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Digite outra técnica (Ex: Raspagem de Guarda Aranha com Lasso)"
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTech())}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="button"
                onClick={() => handleAddTech()}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {techniques.length === 0 ? (
                <span className="text-slate-500 text-[11px] italic">Nenhuma técnica adicionada ainda.</span>
              ) : (
                techniques.map((t, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold"
                  >
                    <Tag className="w-3 h-3 text-amber-400" />
                    {t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTech(i)}
                      className="hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Submissions Applied & Defended */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Submissions Applied */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <label className="text-emerald-400 font-bold block text-xs flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Submissões Aplicadas no Rola:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: 2x Armlock, 1x Mata-Leão"
                  value={subAppliedInput}
                  onChange={e => setSubAppliedInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubApplied())}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSubApplied}
                  className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-bold rounded-lg border border-emerald-800/60"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {submissionsApplied.map((sub, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ {sub}
                    <button type="button" onClick={() => handleRemoveSubApplied(i)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Submissions Defended */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <label className="text-amber-300 font-bold block text-xs flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Batidas / Defesas a Trabalhar:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Pegaram no Triângulo (fechar o cotovelo)"
                  value={subDefendedInput}
                  onChange={e => setSubDefendedInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddSubDefended())}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSubDefended}
                  className="px-3 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-300 font-bold rounded-lg border border-amber-800/60"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {submissionsReceived.map((sub, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-200 border border-amber-500/30 text-[10px] font-bold">
                    ⚠️ {sub}
                    <button type="button" onClick={() => handleRemoveSubDefended(i)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-slate-300 font-bold block mb-1">
              Observações Gerais & Sensação do Rola:
            </label>
            <textarea
              rows={3}
              placeholder="Descreva como foi seu ritmo no rola, gás, ajustes de pegada, dicas do professor durante o treino..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs leading-relaxed"
            />
          </div>

          {/* Rating and Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-300 font-bold">Sensação / Desempenho:</span>
              <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`p-1 transition-transform hover:scale-110 ${
                      star <= rating ? 'text-amber-400' : 'text-slate-700'
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-amber-400 font-bold ml-1">
                {rating === 1 && 'Cansado'}
                {rating === 2 && 'Regular'}
                {rating === 3 && 'Bom Treino'}
                {rating === 4 && 'Ótimo Rola'}
                {rating === 5 && 'No Gás Total! 🚀'}
              </span>
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              {editingLogId ? 'Salvar Alterações no Diário' : 'Salvar Registro no Diário'}
            </button>
          </div>
        </form>
      )}

      {/* Training Journal History List & Search/Filters */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h4 className="font-black text-sm text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" />
            Seu Histórico de Registros ({filteredLogs.length})
          </h4>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar posição ou nota..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            onClick={() => setFilterModality('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              filterModality === 'ALL'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Todas Modalidades
          </button>
          <button
            onClick={() => setFilterModality('GI')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              filterModality === 'GI'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            🥋 Somente GI
          </button>
          <button
            onClick={() => setFilterModality('NO_GI')}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all ${
              filterModality === 'NO_GI'
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            🩳 Somente NO-GI
          </button>

          <button
            onClick={() => setFilterRating(filterRating === 5 ? null : 5)}
            className={`px-3 py-1.5 rounded-xl font-bold border transition-all flex items-center gap-1 ${
              filterRating === 5
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Star className="w-3 h-3 fill-current" /> 5 Estrelas
          </button>
        </div>

        {/* Logs Cards List */}
        {filteredLogs.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-sm text-slate-300">Nenhum treino encontrado no diário</p>
            <p className="text-xs text-slate-500">
              {myLogs.length === 0
                ? 'Você ainda não possui anotações de treino. Clique em "Anotar Treino Hoje" acima!'
                : 'Nenhum registro corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map(log => {
              const formattedDate = new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

              return (
                <div
                  key={log.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-white space-y-3.5 shadow-lg relative group"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-amber-400 text-xs flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold border border-slate-700">
                        ⏱️ {log.durationMinutes} min
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                        🔥 {log.roundsCount} rounds
                      </span>

                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold">
                        {log.modality === 'NO_GI' ? '🩳 NO-GI' : '🥋 GI (Kimono)'}
                      </span>

                      {log.sessionType && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 text-slate-400 text-[10px] font-semibold border border-slate-800">
                          {log.sessionType.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    {/* Rating & Actions */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= (log.moodRating || 5)
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-800'
                            }`}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClick(log)}
                          title="Editar Registro"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingLogId(log.id)}
                          title="Excluir Registro"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Techniques learned */}
                  {log.techniquesLearned && log.techniquesLearned.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                        Técnicas Estudadas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {log.techniquesLearned.map((t, i) => (
                          <span
                            key={i}
                            className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-950 text-amber-300 border border-slate-800 flex items-center gap-1"
                          >
                            <Tag className="w-3 h-3 text-amber-400" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submissions Applied & Defended */}
                  {((log.submissionsApplied && log.submissionsApplied.length > 0) ||
                    (log.submissionsReceived && log.submissionsReceived.length > 0)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {log.submissionsApplied && log.submissionsApplied.length > 0 && (
                        <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-900/40">
                          <span className="text-[10px] text-emerald-400 font-bold block mb-1">
                            ✓ Submissões Aplicadas:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {log.submissionsApplied.map((s, i) => (
                              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {log.submissionsReceived && log.submissionsReceived.length > 0 && (
                        <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-900/40">
                          <span className="text-[10px] text-amber-300 font-bold block mb-1">
                            ⚠️ Pontos a Ajustar:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {log.submissionsReceived.map((s, i) => (
                              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-200">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  {log.notes && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {log.notes}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingLogId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full text-white space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Excluir Registro de Treino?</h3>
                <p className="text-xs text-slate-400">Esta ação removerá a anotação do seu diário.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingLogId(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteLog}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/20"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
