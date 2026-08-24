import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useAuth } from '../../../context/AuthContext';
import { InternalTournament, TournamentCategory, TournamentMatch } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { BracketViewer } from './BracketViewer';
import { PodiumCard } from './PodiumCard';
import { TournamentMatchModal } from './TournamentMatchModal';
import { RegisterCompetitorModal } from './RegisterCompetitorModal';
import { NewCategoryModal } from './NewCategoryModal';
import { 
  Trophy, 
  ArrowLeft, 
  Plus, 
  UserPlus, 
  Users,
  X,
  Zap, 
  RotateCcw, 
  Trash2, 
  Calendar, 
  Clock, 
  MapPin, 
  Award, 
  Swords, 
  Layers,
  Sparkles,
  Play
} from 'lucide-react';

interface TournamentDetailProps {
  tournament: InternalTournament;
  onBack: () => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
}

export const TournamentDetail: React.FC<TournamentDetailProps> = ({
  tournament,
  onBack,
  onNavigateToTimer,
}) => {
  const { 
    updateTournament, 
    deleteTournament, 
    addCategoryToTournament, 
    deleteTournamentCategory,
    registerCompetitorToCategory, 
    removeCompetitorFromCategory,
    generateCategoryBracket,
    updateTournamentMatch,
    resetCategoryBracket,
    academyConfig
  } = useData();
  const { currentUser } = useAuth();

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  // Selected active category
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    return tournament.categories[0]?.id || '';
  });

  const activeCategory = tournament.categories.find(c => c.id === selectedCategoryId) || tournament.categories[0];

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerModalInitialTab, setRegisterModalInitialTab] = useState<'STUDENTS' | 'CUSTOM'>('STUDENTS');
  const [isNewCategoryModalOpen, setIsNewCategoryModalOpen] = useState(false);
  const [activeMatchForScore, setActiveMatchForScore] = useState<TournamentMatch | null>(null);

  // Custom Confirmation Dialog State (replacing window.confirm/alert for iframe safety)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    confirmStyle: 'danger',
    onConfirm: () => {},
  });

  const handleQuickSelectWinner = (match: TournamentMatch, winnerId: string, winnerName: string) => {
    updateTournamentMatch(tournament.id, activeCategory.id, match.id, {
      winnerId,
      winnerName,
      outcomeType: 'POINTS',
      notes: 'Vitória lançada na súmula rápida da chave',
    });
  };

  const handleOpenRegisterStudents = () => {
    setRegisterModalInitialTab('STUDENTS');
    setIsRegisterModalOpen(true);
  };

  const handleOpenAddGuest = () => {
    setRegisterModalInitialTab('CUSTOM');
    setIsRegisterModalOpen(true);
  };

  const handleGenerateBracket = (category: TournamentCategory) => {
    if (category.competitors.length < 2) {
      setConfirmDialog({
        isOpen: true,
        title: 'Mínimo de Atletas Necessário',
        description: 'É necessário ter pelo menos 2 atletas inscritos nesta categoria para gerar a chave eliminatória.',
        confirmText: 'Entendido',
        confirmStyle: 'primary',
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, isOpen: false })),
      });
      return;
    }

    if (category.matches && category.matches.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: 'Regerar Chaveamento',
        description: `A chave da categoria "${category.name}" já foi gerada. Deseja regerar os confrontos e reiniciar o chaveamento?`,
        confirmText: 'Sim, Regerar Chaveamento',
        cancelText: 'Cancelar',
        confirmStyle: 'warning',
        onConfirm: () => {
          generateCategoryBracket(tournament.id, category.id, true);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        },
      });
      return;
    }

    generateCategoryBracket(tournament.id, category.id, true);
  };

  const handleResetBracket = (category: TournamentCategory) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Resetar Chaveamento',
      description: `Tem certeza que deseja resetar o chaveamento da categoria "${category.name}"? Todas as lutas e resultados serão limpos.`,
      confirmText: 'Sim, Resetar Chave',
      cancelText: 'Cancelar',
      confirmStyle: 'warning',
      onConfirm: () => {
        resetCategoryBracket(tournament.id, category.id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleDeleteTournament = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Campeonato',
      description: `Tem certeza que deseja excluir o campeonato "${tournament.title}"? Todos os confrontos, categorias e dados do torneio serão removidos definitivamente.`,
      confirmText: 'Sim, Excluir Torneio',
      cancelText: 'Cancelar',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteTournament(tournament.id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        onBack();
      },
    });
  };

  const handleDeleteCategory = (category: TournamentCategory) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Categoria',
      description: `Tem certeza que deseja excluir a categoria "${category.name}"? As lutas e atletas inscritos nela serão removidos.`,
      confirmText: 'Sim, Excluir Categoria',
      cancelText: 'Cancelar',
      confirmStyle: 'danger',
      onConfirm: () => {
        deleteTournamentCategory(tournament.id, category.id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar aos Campeonatos</span>
        </button>

        {canManage && (
          <button
            onClick={handleDeleteTournament}
            className="px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Torneio</span>
          </button>
        )}
      </div>

      {/* Main Tournament Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl relative overflow-hidden space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                tournament.status === 'COMPLETED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : tournament.status === 'IN_PROGRESS'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {tournament.status === 'COMPLETED' ? 'Finalizado 🏁' : tournament.status === 'IN_PROGRESS' ? 'Em Andamento ⚔️' : 'Inscrições Abertas 📝'}
              </span>

              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider">
                {tournament.modality === 'BOTH' ? 'Gi & No-Gi' : tournament.modality === 'GI' ? 'Kimono (Gi)' : 'Sem Kimono (No-Gi)'}
              </span>

              <span className="text-xs text-slate-400">
                {tournament.categories.length} {tournament.categories.length === 1 ? 'Categoria' : 'Categorias'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-400 stroke-[2.5]" />
              <span>{tournament.title}</span>
            </h1>

            {tournament.description && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
                {tournament.description}
              </p>
            )}
          </div>

          {/* Metadata chips */}
          <div className="flex md:flex-col items-start gap-2 text-xs text-slate-300 shrink-0 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{new Date(tournament.date).toLocaleDateString('pt-BR')}</span>
            </div>
            {tournament.time && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{tournament.time}</span>
              </div>
            )}
            {tournament.location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate max-w-[180px]">{tournament.location}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Selection Tabs Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
            {tournament.categories.map((cat) => {
              const isSelected = activeCategory?.id === cat.id;
              const hasMatches = (cat.matches || []).length > 0;
              const isCompleted = cat.status === 'COMPLETED';

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-4 py-2 rounded-2xl font-bold text-xs whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black ring-2 ring-amber-400'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{cat.name}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {cat.competitors.length}
                  </span>
                  {isCompleted && <span>🥇</span>}
                </button>
              );
            })}
          </div>

          {canManage && (
            <button
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="px-3.5 py-2 rounded-2xl bg-slate-900 border border-slate-700 hover:border-amber-500 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nova Categoria</span>
            </button>
          )}
        </div>

        {/* Active Category Content */}
        {activeCategory ? (
          <div className="space-y-6">
            {/* Category Action & Stats Bar */}
            <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-100">
                    {activeCategory.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px]">
                    {activeCategory.modality === 'GI' ? 'Kimono (Gi)' : 'Sem Kimono (No-Gi)'} • {activeCategory.matchDurationMinutes} min
                  </span>
                  {activeCategory.rulesType && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
                      {activeCategory.rulesType}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {activeCategory.competitors.length} {activeCategory.competitors.length === 1 ? 'atleta inscrito' : 'atletas inscritos'} • {activeCategory.matches?.length || 0} lutas na chave
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {canManage && (
                  <>
                    <button
                      onClick={handleOpenRegisterStudents}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>+ Inscrever Alunos ({activeCategory.competitors.length})</span>
                    </button>

                    <button
                      onClick={handleOpenAddGuest}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
                    >
                      <span>+ Convidado Avulso</span>
                    </button>
                  </>
                )}

                {canManage && (
                  <button
                    onClick={() => handleGenerateBracket(activeCategory)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-slate-950" />
                    <span>{activeCategory.matches?.length ? 'Regerar Chaveamento' : 'Gerar Chaveamento ⚡'}</span>
                  </button>
                )}

                {canManage && activeCategory.matches && activeCategory.matches.length > 0 && (
                  <button
                    onClick={() => handleResetBracket(activeCategory)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
                    title="Resetar Chave da Categoria"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Resetar Chave</span>
                  </button>
                )}

                {canManage && tournament.categories.length > 1 && (
                  <button
                    onClick={() => handleDeleteCategory(activeCategory)}
                    className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-red-500/20"
                    title="Excluir Categoria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir Categoria</span>
                  </button>
                )}
              </div>
            </div>

            {/* Competitor Roster Pill Bar */}
            {activeCategory.competitors.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Atletas Inscritos nesta Categoria ({activeCategory.competitors.length})
                    </span>
                  </div>

                  {canManage && (
                    <button
                      onClick={handleOpenRegisterStudents}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                    >
                      Gerenciar Inscrições
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {activeCategory.competitors.map((comp) => (
                    <div
                      key={comp.id}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 shrink-0 text-xs text-slate-200"
                    >
                      {comp.photoUrl ? (
                        <img src={comp.photoUrl} alt={comp.name} className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-black flex items-center justify-center">
                          {comp.name.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold truncate max-w-[120px]">{comp.name}</span>
                      <BeltBadge belt={comp.belt} stripes={comp.stripes} size="sm" />
                      {canManage && (!activeCategory.matches || activeCategory.matches.length === 0) && (
                        <button
                          type="button"
                          onClick={() => removeCompetitorFromCategory(tournament.id, activeCategory.id, comp.id)}
                          className="text-slate-500 hover:text-red-400 ml-1 cursor-pointer"
                          title="Remover Atleta"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Podium Display if category is completed or has podium */}
            {activeCategory.podium && (
              <PodiumCard podium={activeCategory.podium} categoryName={activeCategory.name} />
            )}

            {/* Interactive Tournament Bracket Visualizer */}
            <BracketViewer
              category={activeCategory}
              onSelectMatch={(match) => setActiveMatchForScore(match)}
              onQuickSelectWinner={handleQuickSelectWinner}
              onNavigateToTimer={onNavigateToTimer}
              canManage={canManage}
            />
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-bold text-slate-300">Nenhuma categoria criada ainda.</p>
            <button
              onClick={() => setIsNewCategoryModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar Primeira Categoria</span>
            </button>
          </div>
        )}
      </div>

      {/* Match Scorekeeper Modal */}
      {activeMatchForScore && activeCategory && (
        <TournamentMatchModal
          match={activeMatchForScore}
          matchDurationMinutes={activeCategory.matchDurationMinutes}
          onClose={() => setActiveMatchForScore(null)}
          onSaveResult={(result) => {
            updateTournamentMatch(tournament.id, activeCategory.id, activeMatchForScore.id, result);
            setActiveMatchForScore(null);
          }}
          onNavigateToTimer={onNavigateToTimer}
        />
      )}

      {/* Register Competitors Modal */}
      {isRegisterModalOpen && activeCategory && (
        <RegisterCompetitorModal
          category={activeCategory}
          initialTab={registerModalInitialTab}
          onClose={() => setIsRegisterModalOpen(false)}
          onRegisterCompetitor={(comp) => registerCompetitorToCategory(tournament.id, activeCategory.id, comp)}
          onRemoveCompetitor={(compId) => removeCompetitorFromCategory(tournament.id, activeCategory.id, compId)}
        />
      )}

      {/* New Category Modal */}
      {isNewCategoryModalOpen && (
        <NewCategoryModal
          onClose={() => setIsNewCategoryModalOpen(false)}
          onAddCategory={(cat) => addCategoryToTournament(tournament.id, cat)}
        />
      )}

      {/* In-App Confirmation / Alert Modal (Iframe-Safe) */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-scale-in">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmDialog.confirmStyle === 'danger'
                  ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                  : confirmDialog.confirmStyle === 'warning'
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                  : 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
              }`}>
                {confirmDialog.confirmStyle === 'danger' ? (
                  <Trash2 className="w-6 h-6" />
                ) : confirmDialog.confirmStyle === 'warning' ? (
                  <RotateCcw className="w-6 h-6" />
                ) : (
                  <Trophy className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-100">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {confirmDialog.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              {confirmDialog.cancelText && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer ${
                  confirmDialog.confirmStyle === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : confirmDialog.confirmStyle === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
