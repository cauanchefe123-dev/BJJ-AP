import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { resolveStudentForUser } from '../../constants/avatar';
import {
  Shield,
  Award,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Search,
  Building2,
  UserCheck,
  Check,
  Sparkles,
  ArrowRight,
  Plus,
  X
} from 'lucide-react';

export interface AcademyItem {
  id: string;
  name: string;
  fantasyName: string;
  logoUrl: string;
  headCoachName: string;
  city: string;
  address?: string;
  studentsCount: number;
  isDefault?: boolean;
}

const TEST_ACADEMY_NAMES = [
  'gracie barra - matriz principal',
  'alliance jiu-jitsu team - matriz',
  'atos jiu-jitsu headquarters',
  'checkmat bjj team - sp',
  'nova união jiu-jitsu - matriz'
];

export const getStoredAcademiesList = (): AcademyItem[] => {
  try {
    const saved = localStorage.getItem('bjjcron_academies_list');
    const parsed: AcademyItem[] = saved ? JSON.parse(saved) : [];
    
    // Filter out any previously stored test/mock academies (isDefault or matching test names)
    const realOnly = parsed.filter(a => 
      !a.isDefault && 
      !TEST_ACADEMY_NAMES.includes(a.name.toLowerCase())
    );

    // Get current academy configured in system
    const savedConfig = localStorage.getItem('bjjcron_academy_config');
    const config = savedConfig ? JSON.parse(savedConfig) : {
      name: 'BJJCRON ACADEMY',
      fantasyName: 'BJJCRON Jiu-Jitsu Headquarter',
      logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=200',
      headCoachName: 'Mestre Gabriel "Fera" Santos',
      address: 'São Paulo - SP'
    };

    // Ensure the real configured academy is always listed first
    if (config.name && !realOnly.some(a => a.name.toLowerCase() === config.name.toLowerCase())) {
      realOnly.unshift({
        id: 'real-academy-matriz',
        name: config.name,
        fantasyName: config.fantasyName || config.name,
        logoUrl: config.logoUrl || 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=200',
        headCoachName: config.headCoachName || 'Professor Responsável',
        city: config.address || 'São Paulo - SP',
        address: config.address,
        studentsCount: 1,
        isDefault: false
      });
    }

    return realOnly;
  } catch (e) {
    return [{
      id: 'real-academy-matriz',
      name: 'BJJCRON ACADEMY',
      fantasyName: 'BJJCRON Jiu-Jitsu Headquarter',
      logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=200',
      headCoachName: 'Mestre Gabriel "Fera" Santos',
      city: 'São Paulo - SP',
      studentsCount: 1,
      isDefault: false
    }];
  }
};

export const saveAcademyToList = (academy: {
  name: string;
  fantasyName?: string;
  logoUrl?: string;
  headCoachName?: string;
  address?: string;
}) => {
  try {
    const list = getStoredAcademiesList();
    const existingIndex = list.findIndex(
      a => a.name.toLowerCase() === academy.name.toLowerCase() || a.fantasyName?.toLowerCase() === academy.fantasyName?.toLowerCase()
    );
    const id = existingIndex >= 0 ? list[existingIndex].id : `acad-${Date.now()}`;
    const newItem: AcademyItem = {
      id,
      name: academy.name || 'Jiu-Jitsu Academy',
      fantasyName: academy.fantasyName || academy.name || 'BJJ Team',
      logoUrl: academy.logoUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=300',
      headCoachName: academy.headCoachName || 'Professor Responsável',
      city: academy.address || 'São Paulo - SP',
      address: academy.address,
      studentsCount: existingIndex >= 0 ? list[existingIndex].studentsCount : 15,
      isDefault: false
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...newItem };
    } else {
      list.unshift(newItem);
    }
    localStorage.setItem('bjjcron_academies_list', JSON.stringify(list));
  } catch (e) {
    console.error('Erro ao salvar academia:', e);
  }
};

interface AcademyLinkViewProps {
  onNavigateHome?: () => void;
}

export const AcademyLinkView: React.FC<AcademyLinkViewProps> = ({ onNavigateHome }) => {
  const { currentUser } = useAuth();
  const { academyConfig, students, updateStudent, updateAcademyConfig } = useData();

  const currentStudent = resolveStudentForUser(currentUser, students);
  const [searchTerm, setSearchTerm] = useState('');
  const [academiesList, setAcademiesList] = useState<AcademyItem[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [linkedAcademyId, setLinkedAcademyId] = useState<string>('real-academy-matriz');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAcademyData, setNewAcademyData] = useState({
    name: '',
    fantasyName: '',
    headCoachName: '',
    address: '',
    logoUrl: ''
  });

  const canCreateAcademy = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  const handleUnlinkAcademy = (academy: AcademyItem) => {
    setLinkedAcademyId('');
    localStorage.setItem(`bjjcron_student_academy_${currentUser?.id}`, '');

    if (currentStudent) {
      updateStudent(currentStudent.id, {
        approvalStatus: 'PENDING',
        notes: `Desvinculado da academia ${academy.name}. Aguardando novo vínculo.`
      });
    }

    setToastMsg(`ℹ️ Você se desvinculou de "${academy.name}". Agora pode solicitar vínculo a outra academia.`);
    setTimeout(() => setToastMsg(null), 7000);
  };

  const handleCreateNewAcademy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAcademy) {
      setToastMsg('❌ Apenas Mestres ou Administradores podem cadastrar novas academias.');
      setTimeout(() => setToastMsg(null), 5000);
      return;
    }
    if (!newAcademyData.name.trim()) return;
    saveAcademyToList(newAcademyData);
    const updatedList = getStoredAcademiesList();
    setAcademiesList(updatedList);
    const created = updatedList.find(a => a.name.toLowerCase() === newAcademyData.name.trim().toLowerCase());
    if (created) {
      handleSelectAcademy(created);
    }
    setNewAcademyData({ name: '', fantasyName: '', headCoachName: '', address: '', logoUrl: '' });
    setIsCreateModalOpen(false);
    setToastMsg('✅ Nova academia cadastrada na rede com sucesso!');
    setTimeout(() => setToastMsg(null), 7000);
  };

  useEffect(() => {
    const list = getStoredAcademiesList();
    // Ensure current active academyConfig is in the list
    const hasCurrent = list.some(a => a.name.toLowerCase() === academyConfig.name.toLowerCase());
    if (!hasCurrent && academyConfig.name) {
      const currentItem: AcademyItem = {
        id: 'current-academy',
        name: academyConfig.name,
        fantasyName: academyConfig.fantasyName || academyConfig.name,
        logoUrl: academyConfig.logoUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&q=80&w=300',
        headCoachName: academyConfig.headCoachName || 'Prof. Gabriel "Fera" Santos',
        city: academyConfig.address || 'São Paulo - SP',
        studentsCount: students.length,
        isDefault: false
      };
      list.unshift(currentItem);
    }
    setAcademiesList(list);

    // Determine stored linked academy ID
    const savedLinked = localStorage.getItem(`bjjcron_student_academy_${currentUser?.id}`);
    if (savedLinked) {
      setLinkedAcademyId(savedLinked);
    } else {
      // Check if one matches academyConfig
      const match = list.find(a => a.name.toLowerCase() === academyConfig.name.toLowerCase());
      if (match) {
        setLinkedAcademyId(match.id);
      }
    }
  }, [academyConfig, students.length, currentUser?.id]);

  const handleSelectAcademy = (academy: AcademyItem) => {
    setLinkedAcademyId(academy.id);
    localStorage.setItem(`bjjcron_student_academy_${currentUser?.id}`, academy.id);

    const isAluno = currentUser?.role === 'ALUNO';
    const newStatus = isAluno ? 'PENDING' : 'APPROVED';

    // If student is logged in, update their status to pending or approved based on academy
    if (currentStudent) {
      updateStudent(currentStudent.id, {
        approvalStatus: newStatus,
        notes: isAluno
          ? `Solicitou vínculo com a equipe ${academy.name} (Prof. ${academy.headCoachName}). Aguardando aprovação.`
          : `Atuando pela equipe ${academy.name}.`
      });
    }

    // Also update current active view so they see this academy's name/logo if desired
    updateAcademyConfig({
      name: academy.name,
      fantasyName: academy.fantasyName,
      logoUrl: academy.logoUrl,
      headCoachName: academy.headCoachName,
      address: academy.city
    });

    if (isAluno) {
      setToastMsg(`⏳ Solicitação de vínculo enviada para "${academy.name}"! Seu status agora é PENDENTE e você deve aguardar o Professor ou Admin da equipe aprovar o seu vínculo.`);
    } else {
      setToastMsg(`✅ Equipe "${academy.name}" selecionada com sucesso!`);
    }
    setTimeout(() => setToastMsg(null), 7000);
  };

  const filteredAcademies = academiesList.filter(a => {
    const query = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(query) ||
      a.fantasyName.toLowerCase().includes(query) ||
      a.headCoachName.toLowerCase().includes(query) ||
      a.city.toLowerCase().includes(query)
    );
  });

  const activeAcademy = academiesList.find(a => a.id === linkedAcademyId) || academiesList[0];
  const isStudentPending = currentUser?.role === 'ALUNO' && currentStudent?.approvalStatus === 'PENDING';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-neutral-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-black text-slate-100">
              Vincular-se à Academia / Equipe
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Rede de Academias BJJCRON
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Selecione a academia em que você treina e solicite vínculo oficial com seu professor. Ao solicitar vínculo como Aluno, seu pedido entra como <strong>PENDENTE</strong> e aguarda a aprovação do Professor ou Admin da equipe.
          </p>
        </div>

        {onNavigateHome && (
          <button
            onClick={onNavigateHome}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all shrink-0"
          >
            ← Voltar ao Painel
          </button>
        )}
      </div>

      {toastMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Current Linked Academy Card */}
      {activeAcademy && (
        <div className="bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-500/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={activeAcademy.logoUrl}
              alt={activeAcademy.name}
              className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 bg-slate-950 shadow-lg shrink-0"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {isStudentPending ? (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                    SOLICITAÇÃO PENDENTE DE APROVAÇÃO
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-sm">
                    SUA ACADEMIA ATIVA
                  </span>
                )}
                <span className="text-xs text-amber-300 font-semibold">
                  • {activeAcademy.city}
                </span>
              </div>
              <h4 className="text-xl font-black text-slate-100 mt-1">
                {activeAcademy.name}
              </h4>
              <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5 mt-1">
                <UserCheck className="w-4 h-4" />
                Professor / Mestre: <span className="text-slate-200 font-normal">{activeAcademy.headCoachName}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-2 shrink-0 bg-slate-950/80 p-4 rounded-xl border border-slate-800 w-full md:w-auto">
            {isStudentPending ? (
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>Aguardando Aprovação do Mestre/Admin</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Vínculo Registrado</span>
              </div>
            )}
            <p className="text-[11px] text-slate-400">
              {isStudentPending
                ? 'Sua solicitação está na fila de análise desta academia'
                : `${activeAcademy.studentsCount} alunos treinando nesta equipe`}
            </p>
            {currentUser?.role !== 'ADMIN' ? (
              <button
                type="button"
                onClick={() => handleUnlinkAcademy(activeAcademy)}
                className="mt-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {isStudentPending ? 'Cancelar Solicitação' : 'Desvincular Academia'}
              </button>
            ) : (
              <span className="mt-1 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold inline-block">
                🔒 Responsável (Não desvinculável)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar academia por nome, professor responsável ou cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xs text-slate-400 font-medium">
            Exibindo <strong className="text-amber-400">{filteredAcademies.length}</strong> academias reais
          </div>
          {canCreateAcademy && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Cadastrar Academia
            </button>
          )}
        </div>
      </div>

      {/* Grid of All Academies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAcademies.map(academy => {
          const isCurrent = academy.id === linkedAcademyId;
          return (
            <div
              key={academy.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl ${
                isCurrent
                  ? 'border-amber-500/80 bg-slate-900/90 shadow-amber-500/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header Logo + Name */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={academy.logoUrl}
                    alt={academy.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-700 bg-slate-950 shadow-md shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-extrabold text-slate-100 text-sm truncate w-full" title={academy.name}>
                        {academy.name}
                      </h5>
                    </div>
                    <p className="text-[11px] text-amber-400 font-semibold truncate mt-0.5">
                      {academy.fantasyName}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {academy.city}
                    </span>
                  </div>
                </div>

                {/* Professor box */}
                <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1 mb-4">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Professor / Mestre Responsável
                  </div>
                  <div className="text-xs font-extrabold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{academy.headCoachName}</span>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  {academy.studentsCount} alunos
                </span>

                {isCurrent ? (
                  <div className="flex items-center gap-1.5">
                    {isStudentPending ? (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1" title="Aguardando aprovação do Professor ou Admin da Equipe">
                        ⏳ Pendente de Aprovação
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Vinculado
                      </span>
                    )}
                    {currentUser?.role !== 'ADMIN' ? (
                      <button
                        type="button"
                        onClick={() => handleUnlinkAcademy(academy)}
                        className="px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold transition-all"
                      >
                        {isStudentPending ? 'Cancelar' : 'Desvincular'}
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
                        Responsável
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectAcademy(academy)}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all hover:scale-105 flex items-center gap-1"
                  >
                    Solicitar Vínculo
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create New Academy Modal */}
      {canCreateAcademy && isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-6 h-6 text-amber-400" />
              <h3 className="text-base font-black text-white">Cadastrar Academia na Rede</h3>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Insira os dados reais da sua academia ou equipe. Ela ficará visível para outros alunos se vincularem e para a gestão.
            </p>

            <form onSubmit={handleCreateNewAcademy} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome da Academia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gracie Barra Centro"
                  value={newAcademyData.name}
                  onChange={e => setNewAcademyData({ ...newAcademyData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nome de Fantasia / Equipe</label>
                <input
                  type="text"
                  placeholder="Ex: Gracie Barra HQ"
                  value={newAcademyData.fantasyName}
                  onChange={e => setNewAcademyData({ ...newAcademyData, fantasyName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Mestre / Professor Responsável *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Gabriel Santos"
                  value={newAcademyData.headCoachName}
                  onChange={e => setNewAcademyData({ ...newAcademyData, headCoachName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cidade / Estado</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={newAcademyData.address}
                  onChange={e => setNewAcademyData({ ...newAcademyData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">URL da Logomarca (Opçional)</label>
                <input
                  type="url"
                  placeholder="https://sua-logo.com/logo.png"
                  value={newAcademyData.logoUrl}
                  onChange={e => setNewAcademyData({ ...newAcademyData, logoUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md"
                >
                  Cadastrar Academia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
