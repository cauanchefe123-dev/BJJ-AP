import React, { useState, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { InternalTournament, RollModality, TournamentCategory, TournamentCompetitor, BeltType, Student } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { generateSingleEliminationBracket } from '../../../utils/bracketUtils';
import { 
  X, 
  Trophy, 
  Sparkles, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  Swords, 
  UserPlus, 
  Users, 
  Search, 
  Check, 
  Trash2,
  ChevronRight,
  Shield
} from 'lucide-react';

interface NewTournamentModalProps {
  onClose: () => void;
  onCreateTournament: (tournamentData: Omit<InternalTournament, 'id' | 'createdAt'>) => void;
}

const BELT_OPTIONS: BeltType[] = [
  'BRANCA', 'CINZA', 'AMARELA', 'LARANJA', 'VERDE', 
  'AZUL', 'ROXA', 'MARROM', 'PRETA'
];

export const NewTournamentModal: React.FC<NewTournamentModalProps> = ({
  onClose,
  onCreateTournament,
}) => {
  const { currentUser } = useAuth();
  const { students } = useData();

  // Wizard tab
  const [modalTab, setModalTab] = useState<'INFO' | 'ATHLETES'>('INFO');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('09:00');
  const [location, setLocation] = useState('Tatame Principal - Mat 1 & Mat 2');
  const [modality, setModality] = useState<'GI' | 'NO_GI' | 'BOTH'>('BOTH');
  const [createDefaultCategories, setCreateDefaultCategories] = useState(true);
  const [autoGenerateBrackets, setAutoGenerateBrackets] = useState(true);

  // Selected enrolled students
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
    // Pre-select first 4 active students by default for quick test/setup if available
    return new Set(students.slice(0, 4).map(s => s.id));
  });

  // Guest/avulso athletes added during creation
  const [guestAthletes, setGuestAthletes] = useState<TournamentCompetitor[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestBelt, setGuestBelt] = useState<BeltType>('BRANCA');
  const [guestStripes, setGuestStripes] = useState(0);
  const [guestAcademy, setGuestAcademy] = useState('');

  // Search in athletes list
  const [searchStudent, setSearchStudent] = useState('');
  const [beltFilter, setBeltFilter] = useState<string>('ALL');

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (beltFilter !== 'ALL' && s.belt !== beltFilter) return false;
      if (searchStudent.trim()) {
        const q = searchStudent.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.belt.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, beltFilter, searchStudent]);

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllStudents = () => {
    setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
  };

  const handleDeselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      alert('Informe o nome do atleta convidado.');
      return;
    }

    const newGuest: TournamentCompetitor = {
      id: `guest-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      name: guestName.trim(),
      belt: guestBelt,
      stripes: Number(guestStripes),
      academy: guestAcademy.trim() || 'Convidado Especial',
    };

    setGuestAthletes(prev => [...prev, newGuest]);
    setGuestName('');
    setGuestAcademy('');
  };

  const handleRemoveGuest = (guestId: string) => {
    setGuestAthletes(prev => prev.filter(g => g.id !== guestId));
  };

  const totalAthletesCount = selectedStudentIds.size + guestAthletes.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Informe o nome do Campeonato Interno.');
      setModalTab('INFO');
      return;
    }

    // Build competitor objects
    const allCompetitors: TournamentCompetitor[] = [
      ...students
        .filter(s => selectedStudentIds.has(s.id))
        .map(s => ({
          id: s.id,
          studentId: s.id,
          name: s.name,
          belt: s.belt,
          stripes: s.stripes || 0,
          photoUrl: s.photoUrl,
          academy: 'BJJCRON Academy',
        })),
      ...guestAthletes
    ];

    const categories: TournamentCategory[] = [];

    if (createDefaultCategories) {
      if (modality === 'GI' || modality === 'BOTH') {
        // Cat 1: Branca & Azul
        const cat1Id = `cat-init-1-${Date.now().toString(36)}`;
        const cat1Comps = allCompetitors.filter(c => c.belt === 'BRANCA' || c.belt === 'AZUL' || c.belt === 'CINZA' || c.belt === 'AMARELA' || c.belt === 'LARANJA' || c.belt === 'VERDE');
        
        let cat1Matches = undefined;
        let cat1Status: 'REGISTRATION' | 'IN_PROGRESS' = 'REGISTRATION';

        if (autoGenerateBrackets && cat1Comps.length >= 2) {
          cat1Matches = generateSingleEliminationBracket(cat1Id, cat1Comps, true);
          cat1Status = 'IN_PROGRESS';
        }

        categories.push({
          id: cat1Id,
          name: 'Absoluto Faixa Branca & Azul (Gi)',
          modality: 'GI',
          beltGroup: 'BRANCA a AZUL',
          gender: 'MISTO',
          matchDurationMinutes: 5,
          rulesType: 'PONTOS_IBJJF',
          competitors: cat1Comps,
          matches: cat1Matches,
          status: cat1Status,
        });

        // Cat 2: Graduados
        const cat2Id = `cat-init-2-${Date.now().toString(36)}`;
        const cat2Comps = allCompetitors.filter(c => c.belt === 'ROXA' || c.belt === 'MARROM' || c.belt === 'PRETA');
        
        let cat2Matches = undefined;
        let cat2Status: 'REGISTRATION' | 'IN_PROGRESS' = 'REGISTRATION';

        if (autoGenerateBrackets && cat2Comps.length >= 2) {
          cat2Matches = generateSingleEliminationBracket(cat2Id, cat2Comps, true);
          cat2Status = 'IN_PROGRESS';
        }

        categories.push({
          id: cat2Id,
          name: 'Absoluto Graduados (Roxa, Marrom & Preta - Gi)',
          modality: 'GI',
          beltGroup: 'ROXA a PRETA',
          gender: 'MISTO',
          matchDurationMinutes: 6,
          rulesType: 'PONTOS_IBJJF',
          competitors: cat2Comps,
          matches: cat2Matches,
          status: cat2Status,
        });
      }

      if (modality === 'NO_GI' || modality === 'BOTH') {
        const cat3Id = `cat-init-3-${Date.now().toString(36)}`;
        let cat3Matches = undefined;
        let cat3Status: 'REGISTRATION' | 'IN_PROGRESS' = 'REGISTRATION';

        if (autoGenerateBrackets && allCompetitors.length >= 2) {
          cat3Matches = generateSingleEliminationBracket(cat3Id, allCompetitors, true);
          cat3Status = 'IN_PROGRESS';
        }

        categories.push({
          id: cat3Id,
          name: 'Open Weight No-Gi (Sem Kimono Geral)',
          modality: 'NO_GI',
          beltGroup: 'Livre',
          gender: 'MISTO',
          matchDurationMinutes: 5,
          rulesType: 'PONTOS_IBJJF',
          competitors: allCompetitors,
          matches: cat3Matches,
          status: cat3Status,
        });
      }
    } else {
      // Single open category with all competitors
      const singleCatId = `cat-main-${Date.now().toString(36)}`;
      let singleMatches = undefined;
      let singleStatus: 'REGISTRATION' | 'IN_PROGRESS' = 'REGISTRATION';

      if (autoGenerateBrackets && allCompetitors.length >= 2) {
        singleMatches = generateSingleEliminationBracket(singleCatId, allCompetitors, true);
        singleStatus = 'IN_PROGRESS';
      }

      categories.push({
        id: singleCatId,
        name: 'Categoria Geral do Torneio',
        modality: modality === 'NO_GI' ? 'NO_GI' : 'GI',
        beltGroup: 'Livre',
        gender: 'MISTO',
        matchDurationMinutes: 5,
        rulesType: 'PONTOS_IBJJF',
        competitors: allCompetitors,
        matches: singleMatches,
        status: singleStatus,
      });
    }

    const hasMatchesCreated = categories.some(c => (c.matches || []).length > 0);

    onCreateTournament({
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      time: time || undefined,
      location: location.trim() || undefined,
      modality,
      status: hasMatchesCreated ? 'IN_PROGRESS' : 'REGISTRATION',
      categories,
      createdBy: currentUser?.name || currentUser?.email || 'Professor / Coordenação',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Exclusivo para Professor / Gestão
              </span>
              <h3 className="font-extrabold text-lg text-slate-100">
                Criar Campeonato & Chaveamento
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

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-4 flex gap-2 border-b border-slate-800 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setModalTab('INFO')}
            className={`pb-3 font-extrabold text-xs transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              modalTab === 'INFO'
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>1. Informações do Evento</span>
          </button>

          <button
            type="button"
            onClick={() => setModalTab('ATHLETES')}
            className={`pb-3 font-extrabold text-xs transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              modalTab === 'ATHLETES'
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>2. Atletas & Convidados</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              totalAthletesCount > 0
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {totalAthletesCount}
            </span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* TAB 1: Informações do Torneio */}
          {modalTab === 'INFO' && (
            <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Title */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Nome do Torneio / Campeonato *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: I Copa Interna de Jiu-Jitsu BJJCRON 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Data do Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  />
                </div>
              </div>

              {/* Modality */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Modalidade Principal
                </label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                >
                  <option value="BOTH">Com & Sem Kimono (Gi & No-Gi)</option>
                  <option value="GI">Apenas Com Kimono (Gi)</option>
                  <option value="NO_GI">Apenas Sem Kimono (No-Gi)</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Local / Tatames
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tatame Principal - Unidade Centro"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                  Regulamento & Informações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Evento exclusivo para alunos e convidados. Chaves eliminatórias simples com medalhas para 1º, 2º e 3º lugares."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              {/* Default categories toggle */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-amber-300">Gerar Categorias Padrão</p>
                    <p className="text-[10px] text-slate-400">
                      Cria divisões automáticas de Faixas Branca/Azul, Graduados e No-Gi.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={createDefaultCategories}
                  onChange={(e) => setCreateDefaultCategories(e.target.checked)}
                  className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              {/* Prompt to advance to athlete selection */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="font-bold text-xs text-slate-200">
                      {totalAthletesCount > 0 ? `${totalAthletesCount} atletas selecionados` : 'Adicionar atletas agora?'}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Você pode selecionar alunos e convidados agora ou adicionar depois.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalTab('ATHLETES')}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1 border border-amber-500/30 transition-colors cursor-pointer"
                >
                  <span>Ver Atletas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Atletas & Convidados */}
          {modalTab === 'ATHLETES' && (
            <div className="p-5 sm:p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Top Auto-generate option */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold text-xs text-emerald-300">
                      Gerar Chaveamento Automático Já no Início ⚡
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Cria as lutas eliminatórias automaticamente com os atletas selecionados.
                    </p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoGenerateBrackets}
                  onChange={(e) => setAutoGenerateBrackets(e.target.checked)}
                  className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                />
              </div>

              {/* SECTION A: Alunos da Academia */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Alunos da Academia ({selectedStudentIds.size} selecionados)
                    </h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllStudents}
                      className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Selecionar Todos
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllStudents}
                      className="text-[10px] font-bold text-slate-400 hover:text-slate-300 underline cursor-pointer"
                    >
                      Desmarcar Todos
                    </button>
                  </div>
                </div>

                {/* Search & Belt filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar aluno por nome..."
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <select
                    value={beltFilter}
                    onChange={(e) => setBeltFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="ALL">Todas as Faixas</option>
                    {BELT_OPTIONS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Students list */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-slate-950 border border-slate-800/80 scrollbar-thin">
                  {filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.has(student.id);

                    return (
                      <div
                        key={student.id}
                        onClick={() => toggleStudent(student.id)}
                        className={`p-2 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-900/60 border-slate-800/60 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div click
                            className="w-4 h-4 accent-amber-500 rounded pointer-events-none"
                          />

                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-[10px] text-amber-400 shrink-0">
                              {student.name.charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate">{student.name}</p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          <BeltBadge belt={student.belt} stripes={student.stripes || 0} size="sm" />
                        </div>
                      </div>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Nenhum aluno encontrado com os filtros atuais.
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: Atleta Convidado (Avulso / Outra Academia) */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Acrescentar Atleta Convidado / Avulso
                  </h4>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Nome do Convidado *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Carlos Gracie Filho"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Equipe / Academia
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Gracie Barra, Alliance..."
                        value={guestAcademy}
                        onChange={(e) => setGuestAcademy(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Faixa
                      </label>
                      <select
                        value={guestBelt}
                        onChange={(e) => setGuestBelt(e.target.value as BeltType)}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      >
                        {BELT_OPTIONS.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        Graus (0 a 4)
                      </label>
                      <select
                        value={guestStripes}
                        onChange={(e) => setGuestStripes(Number(e.target.value))}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                      >
                        {[0, 1, 2, 3, 4].map(st => (
                          <option key={st} value={st}>{st} {st === 1 ? 'Grau' : 'Graus'}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex items-end">
                      <button
                        type="button"
                        onClick={handleAddGuest}
                        className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Adicionar Convidado</span>
                      </button>
                    </div>
                  </div>

                  {/* Added guests list */}
                  {guestAthletes.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                        Convidados Adicionados ({guestAthletes.length}):
                      </p>
                      <div className="space-y-1">
                        {guestAthletes.map(g => (
                          <div
                            key={g.id}
                            className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                                Convidado
                              </span>
                              <span className="font-bold text-xs text-slate-100">{g.name}</span>
                              <span className="text-[11px] text-slate-400">({g.academy})</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <BeltBadge belt={g.belt} stripes={g.stripes} size="sm" />
                              <button
                                type="button"
                                onClick={() => handleRemoveGuest(g.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="p-5 sm:p-6 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-slate-400 font-medium">
                Total de Atletas: <strong className="text-amber-400">{totalAthletesCount}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              {modalTab === 'INFO' ? (
                <button
                  type="button"
                  onClick={() => setModalTab('ATHLETES')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs transition-colors cursor-pointer flex items-center gap-1.5 border border-amber-500/30"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Escolher Atletas ({totalAthletesCount})</span>
                </button>
              ) : null}

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Trophy className="w-4 h-4 stroke-[2.5]" />
                <span>Criar Campeonato & Abrir Chaves</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

