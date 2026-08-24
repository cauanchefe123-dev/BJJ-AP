import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { TournamentCategory, TournamentCompetitor, BeltType, Student } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { X, UserPlus, Search, Check, Shield, Award, Users } from 'lucide-react';

interface RegisterCompetitorModalProps {
  category: TournamentCategory;
  initialTab?: 'STUDENTS' | 'CUSTOM';
  onClose: () => void;
  onRegisterCompetitor: (competitor: TournamentCompetitor) => void;
  onRemoveCompetitor: (competitorId: string) => void;
}

const BELT_OPTIONS: BeltType[] = [
  'BRANCA', 'CINZA', 'AMARELA', 'LARANJA', 'VERDE', 
  'AZUL', 'ROXA', 'MARROM', 'PRETA'
];

export const RegisterCompetitorModal: React.FC<RegisterCompetitorModalProps> = ({
  category,
  initialTab = 'STUDENTS',
  onClose,
  onRegisterCompetitor,
  onRemoveCompetitor,
}) => {
  const { students } = useData();
  const [activeTab, setActiveTab] = useState<'STUDENTS' | 'CUSTOM'>(initialTab);

  const [searchQuery, setSearchQuery] = useState('');

  // Custom athlete form
  const [customName, setCustomName] = useState('');
  const [customBelt, setCustomBelt] = useState<BeltType>('BRANCA');
  const [customStripes, setCustomStripes] = useState(0);
  const [customWeight, setCustomWeight] = useState('');
  const [customAcademy, setCustomAcademy] = useState('');

  const registeredIds = useMemo(() => {
    return new Set(category.competitors.map(c => c.id));
  }, [category.competitors]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.belt.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, searchQuery]);

  const handleRegisterStudent = (student: Student) => {
    if (registeredIds.has(student.id)) {
      onRemoveCompetitor(student.id);
      return;
    }

    const competitor: TournamentCompetitor = {
      id: student.id,
      name: student.name,
      belt: student.belt,
      stripes: student.stripes || 0,
      photoUrl: student.photoUrl,
      weightKg: undefined,
      academy: 'BJJCRON Academy',
    };

    onRegisterCompetitor(competitor);
  };

  const handleAddCustomCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert('Informe o nome do atleta.');
      return;
    }

    const competitor: TournamentCompetitor = {
      id: `comp-custom-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      name: customName.trim(),
      belt: customBelt,
      stripes: Number(customStripes),
      weightKg: customWeight ? Number(customWeight) : undefined,
      academy: customAcademy.trim() || undefined,
    };

    onRegisterCompetitor(competitor);
    setCustomName('');
    setCustomWeight('');
    setCustomAcademy('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <UserPlus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Categoria: {category.name}
              </span>
              <h3 className="font-extrabold text-lg text-slate-100">
                Inscrição de Atletas ({category.competitors.length} inscritos)
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

        {/* Tab switch (Alunos da Academia vs Atleta Convidado/Manual) */}
        <div className="px-5 sm:px-6 pt-4 flex gap-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('STUDENTS')}
            className={`pb-3 font-extrabold text-xs transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'STUDENTS'
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Alunos da Academia ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CUSTOM')}
            className={`pb-3 font-extrabold text-xs transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'CUSTOM'
                ? 'text-amber-400 border-amber-500'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Adicionar Convidado / Manual</span>
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {activeTab === 'STUDENTS' ? (
            <div className="space-y-3">
              {/* Search bar & batch actions */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar aluno por nome ou faixa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">
                    {filteredStudents.length} alunos encontrados
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        filteredStudents.forEach(s => {
                          if (!registeredIds.has(s.id)) {
                            handleRegisterStudent(s);
                          }
                        });
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/30 transition-colors cursor-pointer"
                    >
                      ⚡ Inscrever Todos da Lista
                    </button>
                  </div>
                </div>
              </div>

              {/* Student list */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredStudents.map((s) => {
                  const isRegistered = registeredIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleRegisterStudent(s)}
                      className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isRegistered
                          ? 'bg-amber-500/15 border-amber-500 text-white ring-1 ring-amber-500'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={s.photoUrl || '/avatar.png'}
                          alt={s.name}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-slate-100 truncate">{s.name}</p>
                          <div className="mt-0.5">
                            <BeltBadge belt={s.belt} stripes={s.stripes || 0} size="sm" />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors ${
                          isRegistered
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Inscrito</span>
                          </>
                        ) : (
                          <span>+ Inscrever</span>
                        )}
                      </button>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <p className="text-center py-6 text-xs text-slate-500">
                    Nenhum aluno encontrado.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Custom Competitor Form */
            <form onSubmit={handleAddCustomCompetitor} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                  Nome Completo do Atleta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Graduação / Faixa *
                  </label>
                  <select
                    value={customBelt}
                    onChange={(e) => setCustomBelt(e.target.value as BeltType)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
                  >
                    {BELT_OPTIONS.map((belt) => (
                      <option key={belt} value={belt}>{belt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Graus (Stripes)
                  </label>
                  <select
                    value={customStripes}
                    onChange={(e) => setCustomStripes(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value={0}>0 Graus (Lisa)</option>
                    <option value={1}>1º Grau</option>
                    <option value={2}>2º Grau</option>
                    <option value={3}>3º Grau</option>
                    <option value={4}>4º Grau</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 77.5"
                    value={customWeight}
                    onChange={(e) => setCustomWeight(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-slate-300 mb-1">
                    Academia / Filial
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Filial Centro"
                    value={customAcademy}
                    onChange={(e) => setCustomAcademy(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Cadastrar & Inscrever Atleta na Categoria</span>
              </button>
            </form>
          )}

          {/* Currently Enrolled List preview */}
          {category.competitors.length > 0 && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-xs font-black uppercase text-slate-400 block mb-2">
                Atletas Inscritos na Categoria ({category.competitors.length}):
              </span>
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto">
                {category.competitors.map((comp) => (
                  <div
                    key={comp.id}
                    className="pl-3 pr-2 py-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2 text-xs"
                  >
                    <span className="font-bold text-slate-200">{comp.name}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveCompetitor(comp.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors p-0.5"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Concluir Inscrições
          </button>
        </div>
      </div>
    </div>
  );
};
