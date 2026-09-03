import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Graduation, Student } from '../../types';
import { resolveStudentForUser, getStudentAvatar } from '../../constants/avatar';
import { BeltBadge } from '../belts/BeltBadge';
import { GraduationTimeline } from './GraduationTimeline';
import { GraduationCertificateModal } from './GraduationCertificateModal';
import { AddEditGraduationModal } from './AddEditGraduationModal';
import { GraduationModal } from '../students/GraduationModal';
import { isStudentEligibleForGraduation, getStudentGraduationTarget, getStudentClassesSinceLastGraduation } from '../../utils/graduation';
import { getStudentTotalClasses } from '../../utils/ranking';
import { getTrainingTimeText } from '../../utils/trainingTime';
import {
  Award,
  Plus,
  UserCheck,
  BookOpen,
  Send,
  Search,
  Filter,
  Users,
  Sparkles,
  CheckCircle2,
  Trash2,
  ListOrdered,
} from 'lucide-react';

export const GraduationHistoryView: React.FC = () => {
  const { currentUser } = useAuth();
  const {
    students,
    attendances,
    graduations,
    academyConfig,
    deleteGraduation,
    cleanDuplicateGraduations,
    requestBeltChange,
  } = useData();

  const isTeacherOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';
  const currentStudent = resolveStudentForUser(currentUser, students);

  // View mode tab for teachers/admins
  const [activeTab, setActiveTab] = useState<'all' | 'passport'>('all');

  // Filter and selection states
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => {
    if (!isTeacherOrAdmin && currentStudent) {
      return currentStudent.id;
    }
    return students.length > 0 ? students[0].id : '';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState<string>('ALL');
  const [consolidateDuplicates, setConsolidateDuplicates] = useState<boolean>(true);

  // Modals
  const [selectedCertificateGrad, setSelectedCertificateGrad] = useState<Graduation | null>(null);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [graduationToEdit, setGraduationToEdit] = useState<Graduation | null>(null);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

  // Belt Request feedback
  const [requestFeedback, setRequestFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  // Active athlete in focus for passport
  const targetStudent: Student | null = useMemo(() => {
    if (!isTeacherOrAdmin && currentStudent) return currentStudent;
    return students.find(s => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);
  }, [isTeacherOrAdmin, currentStudent, students, selectedStudentId]);

  // Graduations for target athlete (deduplicated by default)
  const studentGraduations: Graduation[] = useMemo(() => {
    if (!targetStudent) return [];
    const list = graduations.filter(g => g.studentId === targetStudent.id || (targetStudent.name && g.studentName === targetStudent.name));
    if (!consolidateDuplicates) return list;

    const seen = new Set<string>();
    const result: Graduation[] = [];
    const sorted = [...list].sort((a, b) => new Date(b.promotedAt || 0).getTime() - new Date(a.promotedAt || 0).getTime());
    for (const g of sorted) {
      const key = `${g.belt}_${Number(g.stripes || 0)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(g);
      }
    }
    return result;
  }, [graduations, targetStudent, consolidateDuplicates]);

  // Filtered list of all graduations across the academy
  const filteredAllGraduations = useMemo(() => {
    const rawMatches = graduations.filter(g => {
      const athlete = students.find(s => s.id === g.studentId);
      const athleteName = athlete?.name || g.studentName || '';
      const promotedBy = g.promotedBy || '';
      const cert = g.certificateNumber || '';

      const matchesSearch =
        !searchTerm.trim() ||
        athleteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promotedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cert.toLowerCase().includes(searchTerm.toLowerCase()) ||
        g.belt.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesBelt = beltFilter === 'ALL' || g.belt === beltFilter;

      return matchesSearch && matchesBelt;
    });

    if (!consolidateDuplicates) return rawMatches;

    const seen = new Set<string>();
    const result: Graduation[] = [];
    const sorted = [...rawMatches].sort((a, b) => new Date(b.promotedAt || 0).getTime() - new Date(a.promotedAt || 0).getTime());
    for (const g of sorted) {
      const studentKey = (g.studentId || g.studentName || '').trim().toLowerCase();
      const key = `${studentKey}_${g.belt}_${Number(g.stripes || 0)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(g);
      }
    }
    return result;
  }, [graduations, students, searchTerm, beltFilter, consolidateDuplicates]);

  // Detect duplicate records stored in database (same student, belt, stripes)
  const duplicateGraduationCount = useMemo(() => {
    const seen = new Set<string>();
    let count = 0;
    const sorted = [...graduations].sort((a, b) => new Date(b.promotedAt || 0).getTime() - new Date(a.promotedAt || 0).getTime());

    sorted.forEach(g => {
      const studentKey = (g.studentId || g.studentName || '').trim().toLowerCase();
      const key = `${studentKey}_${g.belt}_${Number(g.stripes || 0)}`;
      if (seen.has(key)) {
        count++;
      } else {
        seen.add(key);
      }
    });

    return count;
  }, [graduations]);

  const handleCleanDuplicates = () => {
    const count = cleanDuplicateGraduations();
    setCleanupMessage(`Limpeza concluída com sucesso! ${count} registro(s) repetido(s) da mesma faixa/grau foram unificados e excluídos do banco de dados.`);
    setTimeout(() => setCleanupMessage(null), 6000);
  };

  // General academy stats for teachers/admins
  const totalGraduationsCount = graduations.length;
  const currentYear = new Date().getFullYear();
  const graduationsThisYear = graduations.filter(g => g.promotedAt && g.promotedAt.startsWith(String(currentYear))).length;
  const eligibleStudentsCount = students.filter(s => isStudentEligibleForGraduation(s, academyConfig, attendances, graduations)).length;

  const handleOpenCertificate = (grad: Graduation) => {
    setSelectedCertificateGrad(grad);
  };

  const handleOpenEdit = (grad: Graduation) => {
    setGraduationToEdit(grad);
    setIsAddEditModalOpen(true);
  };

  const handleOpenAddHistorical = () => {
    setGraduationToEdit(null);
    setIsAddEditModalOpen(true);
  };

  const handleQuickBeltRequest = () => {
    if (!targetStudent) return;
    const nextStripes = targetStudent.stripes < 4 ? targetStudent.stripes + 1 : 0;
    const res = requestBeltChange(
      targetStudent.id,
      targetStudent.belt,
      nextStripes,
      'Solicitação de avaliação para o próximo grau gerada a partir do Passaporte de Graduação.'
    );
    setRequestFeedback(res);
    setTimeout(() => setRequestFeedback(null), 5000);
  };

  // Resolved student for the active certificate modal
  const certificateStudent = useMemo(() => {
    if (!selectedCertificateGrad) return targetStudent;
    return students.find(s => s.id === selectedCertificateGrad.studentId) || targetStudent;
  }, [selectedCertificateGrad, students, targetStudent]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-xl shadow-inner shrink-0">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-xl sm:text-2xl text-slate-100">
                {isTeacherOrAdmin ? 'Histórico & Passaportes de Graduação' : 'Passaporte de Graduações & Faixas'}
              </h2>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wide">
                BJJ Diploma & Timeline
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Registro oficial de exames de faixa, outorga de graus e emissão de certificados oficiais de Jiu-Jitsu.
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          {isTeacherOrAdmin ? (
            <>
              <button
                onClick={handleOpenAddHistorical}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700/80 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Graduação Histórica</span>
              </button>

              <button
                onClick={() => setIsPromoteModalOpen(true)}
                className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
              >
                <Award className="w-4 h-4 stroke-[2.5]" />
                <span>Promover Atleta</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleQuickBeltRequest}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
              <span>Solicitar Avaliação de Grau</span>
            </button>
          )}
        </div>
      </div>

      {/* Teacher / Admin KPI Summary Bar */}
      {isTeacherOrAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4.5 space-y-1.5 shadow-md">
            <span className="text-xs font-bold text-slate-400 block">Total de Graduações</span>
            <p className="text-2xl font-black text-amber-300">{totalGraduationsCount}</p>
            <p className="text-[11px] text-slate-400">Registradas no histórico da academia</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4.5 space-y-1.5 shadow-md">
            <span className="text-xs font-bold text-slate-400 block">Graduações em {currentYear}</span>
            <p className="text-2xl font-black text-slate-100">{graduationsThisYear}</p>
            <p className="text-[11px] text-emerald-400 font-semibold">Exames e outorgas neste ano</p>
          </div>

          <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-4.5 space-y-1.5 shadow-md">
            <span className="text-xs font-bold text-slate-400 block">Atletas Aptos para Exame</span>
            <p className="text-2xl font-black text-emerald-400">{eligibleStudentsCount}</p>
            <p className="text-[11px] text-slate-400">Atingiram meta de presença pós-grau</p>
          </div>
        </div>
      )}

      {/* Duplicate Cleanup Alert / Banner */}
      {isTeacherOrAdmin && duplicateGraduationCount > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-300">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">
                Detectamos {duplicateGraduationCount} registro(s) excedente(s) de mesma faixa e grau cadastrados repetidamente.
              </p>
              <p className="text-[11px] text-amber-400/80">
                A visualização já está unificada automaticamente. Clique no botão ao lado para limpar e remover as duplicatas do banco de dados definitivamente.
              </p>
            </div>
          </div>
          <button
            onClick={handleCleanDuplicates}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Unificar e Limpar do Banco ({duplicateGraduationCount})</span>
          </button>
        </div>
      )}

      {/* Cleanup confirmation message */}
      {cleanupMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{cleanupMessage}</span>
        </div>
      )}

      {/* Request Feedback Alert */}
      {requestFeedback && (
        <div className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
          requestFeedback.success
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
            : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
        }`}>
          <span>{requestFeedback.message}</span>
        </div>
      )}

      {/* Teacher / Admin Mode Tabs */}
      {isTeacherOrAdmin && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Todas as Graduações ({graduations.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('passport')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'passport'
                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Passaporte por Atleta</span>
          </button>
        </div>
      )}

      {/* TAB 1: ALL GRADUATIONS IN THE ACADEMY */}
      {isTeacherOrAdmin && activeTab === 'all' && (
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 sm:p-6 text-white space-y-5 shadow-xl">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por atleta, mestre outorgante ou certificado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9.5 pr-4 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setConsolidateDuplicates(prev => !prev)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  consolidateDuplicates
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Unifica registros múltiplos da mesma faixa e grau em um único card limpo"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${consolidateDuplicates ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>Unificar Repetidos</span>
              </button>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-400 shrink-0" />
                <select
                  value={beltFilter}
                  onChange={(e) => setBeltFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                >
                  <option value="ALL">Todas as Faixas</option>
                  <option value="BRANCA">Faixa Branca</option>
                  <option value="CINZA">Faixa Cinza</option>
                  <option value="AMARELA">Faixa Amarela</option>
                  <option value="LARANJA">Faixa Laranja</option>
                  <option value="VERDE">Faixa Verde</option>
                  <option value="AZUL">Faixa Azul</option>
                  <option value="ROXA">Faixa Roxa</option>
                  <option value="MARROM">Faixa Marrom</option>
                  <option value="PRETA">Faixa Preta</option>
                </select>
              </div>
            </div>
          </div>

          {/* Graduations count info */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Exibindo <strong className="text-slate-200">{filteredAllGraduations.length}</strong> de <strong className="text-slate-200">{graduations.length}</strong> graduações registradas
            </span>
          </div>

          {/* Render Timeline / List of all graduations with full Athlete Info */}
          <GraduationTimeline
            graduations={filteredAllGraduations}
            students={students}
            canManage={isTeacherOrAdmin}
            showAthleteInfo={true}
            onViewCertificate={handleOpenCertificate}
            onEditGraduation={handleOpenEdit}
            onDeleteGraduation={(grad) => deleteGraduation(grad.id)}
          />
        </div>
      )}

      {/* TAB 2: INDIVIDUAL ATHLETE PASSPORT (Or student view) */}
      {(!isTeacherOrAdmin || activeTab === 'passport') && (
        <div className="space-y-6">
          {/* Athlete Selector for Teachers / Admins */}
          {isTeacherOrAdmin && (
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 space-y-3 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <label className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-amber-400" />
                  <span>Selecione o Atleta em Foco:</span>
                </label>

                <span className="text-xs text-slate-400">
                  {students.length} atletas cadastrados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.belt} - {s.stripes}º Grau) • {getStudentTotalClasses(s, attendances)} treinos
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={beltFilter}
                    onChange={(e) => {
                      setBeltFilter(e.target.value);
                      if (e.target.value !== 'ALL') {
                        const firstMatch = students.find(s => s.belt === e.target.value);
                        if (firstMatch) setSelectedStudentId(firstMatch.id);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="ALL">Filtrar por Faixa...</option>
                    <option value="BRANCA">Faixa Branca</option>
                    <option value="AZUL">Faixa Azul</option>
                    <option value="ROXA">Faixa Roxa</option>
                    <option value="MARROM">Faixa Marrom</option>
                    <option value="PRETA">Faixa Preta</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Target Athlete Passport Card & Graduation Timeline */}
          {targetStudent && (() => {
            const totalClasses = getStudentTotalClasses(targetStudent, attendances);
            const classesSince = getStudentClassesSinceLastGraduation(targetStudent, attendances, graduations);
            const target = getStudentGraduationTarget(targetStudent, academyConfig);
            const isEligible = isStudentEligibleForGraduation(targetStudent, academyConfig, attendances, graduations);

            return (
              <div className="space-y-6">
                {/* Athlete Passport Identity Header */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 rounded-3xl p-6 text-white shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={getStudentAvatar(targetStudent)}
                        alt={targetStudent.name}
                        className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover border-2 border-amber-400/40 bg-slate-950 shadow-md shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-lg sm:text-xl text-slate-100">
                            {targetStudent.name}
                          </h3>
                          {isTeacherOrAdmin ? (
                            isEligible ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                                ✓ Apto para Exame ({classesSince}/{target})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                {classesSince}/{target} treinos pós-grau
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {classesSince} treinos no grau atual
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          Matrícula: <span className="text-amber-400 font-bold">{targetStudent.registrationNumber}</span> • Categoria: {targetStudent.ageCategory}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <BeltBadge belt={targetStudent.belt} stripes={targetStudent.stripes} size="md" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 w-full sm:w-auto">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Treinos Totais</span>
                        <span className="text-xl font-black text-amber-300">{totalClasses}</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Pós-Grau</span>
                        <span className="text-xl font-black text-emerald-400">{classesSince}</span>
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo de Tatame</span>
                        <span className="text-xs font-black text-slate-200 block mt-1 truncate">
                          {getTrainingTimeText(targetStudent.startDate, targetStudent.initialMonthsTrained)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline of Athlete's Graduations */}
                <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 text-white space-y-6 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 flex-wrap gap-3">
                    <div>
                      <h3 className="font-black text-base sm:text-lg text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-amber-400" />
                        Linha do Tempo de Conquistas & Diplomas
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Histórico cronológico de faixas, graus outorgados e certificados oficiais de {targetStudent.name}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">
                        {studentGraduations.length} registro(s) de outorga
                      </span>
                    </div>
                  </div>

                  <GraduationTimeline
                    graduations={studentGraduations}
                    student={targetStudent}
                    canManage={isTeacherOrAdmin}
                    showAthleteInfo={false}
                    onViewCertificate={handleOpenCertificate}
                    onEditGraduation={handleOpenEdit}
                    onDeleteGraduation={(grad) => deleteGraduation(grad.id)}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Certificate Modal */}
      <GraduationCertificateModal
        isOpen={Boolean(selectedCertificateGrad)}
        onClose={() => setSelectedCertificateGrad(null)}
        graduation={selectedCertificateGrad}
        student={certificateStudent}
        academyConfig={academyConfig}
      />

      {/* Add / Edit Historical Graduation Modal */}
      <AddEditGraduationModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setGraduationToEdit(null);
        }}
        graduationToEdit={graduationToEdit}
        defaultStudent={targetStudent}
      />

      {/* Standard Promotion Modal */}
      <GraduationModal
        isOpen={isPromoteModalOpen}
        onClose={() => setIsPromoteModalOpen(false)}
        studentToGraduate={targetStudent}
      />
    </div>
  );
};

