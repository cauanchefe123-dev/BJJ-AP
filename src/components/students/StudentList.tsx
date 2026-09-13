import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { Student, BeltType } from '../../types';
import { DEFAULT_BLACK_GI_AVATAR, getStudentAvatar } from '../../constants/avatar';
import { isDeletedRecord } from '../../lib/deletionTracker';
import { getTrainingTimeText } from '../../utils/trainingTime';
import { getStudentGraduationTarget, isStudentEligibleForGraduation, getStudentClassesSinceLastGraduation } from '../../utils/graduation';
import { getStudentTotalClasses } from '../../utils/ranking';
import {
  Search,
  UserPlus,
  Award,
  Filter,
  ShieldCheck,
  MoreVertical,
  Trash2,
  Edit3,
  Phone,
  Mail,
  IdCard,
  UserCheck,
  UserMinus,
  Check,
  X,
  AlertCircle,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  DollarSign,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { SendEmailModal } from './SendEmailModal';
import { InactivateStudentModal } from './InactivateStudentModal';
import { PermanentDeleteStudentModal } from './PermanentDeleteStudentModal';
import { AuditLogsModal } from './AuditLogsModal';

interface StudentListProps {
  onOpenAddModal: () => void;
  onOpenGraduationModal: (student: Student) => void;
  onOpenCardModal?: (student: Student) => void;
  onOpenEditModal?: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  onOpenAddModal,
  onOpenGraduationModal,
  onOpenCardModal,
  onOpenEditModal,
}) => {
  const {
    students,
    attendances,
    graduations,
    payments,
    trainingLogs,
    teacherObservations,
    rollChallenges,
    deleteStudent,
    updateStudent,
    academyConfig,
    auditLogs,
    addAuditLog,
  } = useData();
  const { approveUser, rejectUser, currentUser, users } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE'); // Default: Active students (AC-03)
  const [emailStudent, setEmailStudent] = useState<Student | null>(null);
  const [inactivatingStudent, setInactivatingStudent] = useState<Student | null>(null);
  const [permanentDeletingStudent, setPermanentDeletingStudent] = useState<Student | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [openMenuStudentId, setOpenMenuStudentId] = useState<string | null>(null);
  const [undoToast, setUndoToast] = useState<{ student: Student; secondsLeft: number } | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Undo Toast Countdown
  useEffect(() => {
    if (!undoToast) return;
    const timer = setInterval(() => {
      setUndoToast(prev => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) return null;
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [undoToast]);

  // Consolidate students list including any ALUNO accounts from users
  const allStudentsCombined: Student[] = React.useMemo(() => {
    const list: Student[] = students.filter(s => !isDeletedRecord(s.id, s.email, s.registrationNumber));
    const addedIds = new Set(list.map(s => s.id));
    const addedEmails = new Set(list.map(s => s.email?.trim().toLowerCase()).filter(Boolean));

    users.forEach(u => {
      if (u.role === 'ALUNO') {
        const emailKey = u.email ? u.email.trim().toLowerCase() : '';
        if (isDeletedRecord(u.id, u.studentId, u.email)) {
          return;
        }
        if ((u.studentId && addedIds.has(u.studentId)) || (emailKey && addedEmails.has(emailKey)) || addedIds.has(u.id)) {
          return;
        }
        const isApproved = u.approvalStatus === 'APPROVED' || (!u.approvalStatus && u.isActivated);
        list.push({
          id: u.studentId || u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          registrationNumber: u.studentId || `BJJ-${new Date().getFullYear()}-${u.id.slice(-4)}`,
          qrCodeToken: `BJJCRON-${u.id}`,
          birthDate: '2000-01-01',
          photoUrl: u.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
          belt: 'BRANCA',
          stripes: 0,
          startDate: new Date().toISOString().split('T')[0],
          totalClassesAttended: 0,
          classesSinceLastGraduation: 0,
          weightCategory: 'MÉDIO',
          ageCategory: 'ADULTO',
          active: isApproved,
          planName: 'Plano Mensal Padrão',
          planPrice: 240,
          paymentDueDateDay: 10,
          paymentStatus: 'PAGO',
          approvalStatus: isApproved ? 'APPROVED' : (u.approvalStatus || 'PENDING'),
          notes: isApproved ? 'Atleta da equipe.' : 'Novo cadastro aguardando aprovação no tatame.',
          hasActivatedAccount: true,
        });
      }
    });

    return list;
  }, [students, users]);

  const pendingStudents = allStudentsCombined.filter(s => s.approvalStatus === 'PENDING');
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  const handleApprove = (student: Student) => {
    approveUser(student.id);
    updateStudent(student.id, {
      ...student,
      approvalStatus: 'APPROVED',
      active: true,
      registrationNumber: (student.registrationNumber && student.registrationNumber !== 'SOLICITAÇÃO')
        ? student.registrationNumber
        : `BJJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
    });
  };

  const handleReject = (student: Student) => {
    rejectUser(student.id);
    deleteStudent(student.id);
  };

  const handleInactivate = (student: Student) => {
    updateStudent(student.id, { active: false });
    addAuditLog({
      action: 'INACTIVATE_STUDENT',
      studentId: student.id,
      studentName: student.name,
      studentRegistrationNumber: student.registrationNumber,
      performedBy: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Administrador',
        role: currentUser?.role || 'ADMIN',
        email: currentUser?.email,
      },
      details: 'Aluno inativado administrativamente. Histórico de treinos, presenças e graduações preservado.',
    });
    setInactivatingStudent(null);
    setUndoToast({ student, secondsLeft: 8 });
  };

  const handleUndoInactivate = (student: Student) => {
    updateStudent(student.id, { active: true });
    addAuditLog({
      action: 'REACTIVATE_STUDENT',
      studentId: student.id,
      studentName: student.name,
      studentRegistrationNumber: student.registrationNumber,
      performedBy: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Administrador',
        role: currentUser?.role || 'ADMIN',
        email: currentUser?.email,
      },
      details: 'Inativação desfeita pelo operador (Desfazer).',
    });
    setUndoToast(null);
    setSuccessBanner(`Inativação desfeita! A matrícula de "${student.name}" está ativa novamente.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleReactivate = (student: Student) => {
    updateStudent(student.id, { active: true });
    addAuditLog({
      action: 'REACTIVATE_STUDENT',
      studentId: student.id,
      studentName: student.name,
      studentRegistrationNumber: student.registrationNumber,
      performedBy: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Administrador',
        role: currentUser?.role || 'ADMIN',
        email: currentUser?.email,
      },
      details: 'Aluno reativado no sistema pelo administrador.',
    });
    setSuccessBanner(`Aluno "${student.name}" reativado com sucesso! Matrícula agora está ativa.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleConfirmPermanentDelete = (student: Student) => {
    deleteStudent(student.id);
    if (student.email) {
      rejectUser(student.email);
    }
    rejectUser(student.id);
    addAuditLog({
      action: 'DELETE_STUDENT',
      studentId: student.id,
      studentName: student.name,
      studentRegistrationNumber: student.registrationNumber,
      performedBy: {
        id: currentUser?.id || 'admin',
        name: currentUser?.name || 'Administrador',
        role: currentUser?.role || 'ADMIN',
        email: currentUser?.email,
      },
      details: 'Cadastro sem histórico removido permanentemente.',
    });
    setPermanentDeletingStudent(null);
    setSuccessBanner(`Cadastro de "${student.name}" excluído definitivamente.`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const filteredStudents = allStudentsCombined.filter(s => {
    const sName = s.name || '';
    const sReg = s.registrationNumber || '';
    const sEmail = s.email || '';
    const sPhone = s.phone || '';

    const matchesSearch = sName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sReg.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sPhone.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBelt = beltFilter === 'ALL' || s.belt === beltFilter;

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = s.active && s.approvalStatus !== 'PENDING';
    } else if (statusFilter === 'INACTIVE') {
      matchesStatus = !s.active || s.approvalStatus === 'REJECTED';
    } else if (statusFilter === 'PENDING') {
      matchesStatus = s.approvalStatus === 'PENDING';
    }

    return matchesSearch && matchesBelt && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Pending Approvals Card for Professors/Admins */}
      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR') && pendingStudents.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 border-2 border-amber-500/50 rounded-2xl p-6 text-white space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-amber-300">
                  Solicitações de Matrícula Pendentes ({pendingStudents.length})
                </h4>
                <p className="text-xs text-slate-300">
                  Novos alunos que se cadastraram via site e aguardam aprovação para acessar a academia.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              Ação Requerida
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {pendingStudents.map(s => (
              <div
                key={s.id}
                className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={getStudentAvatar(s)}
                    alt={s.name}
                    className="w-10 h-10 rounded-full object-cover border border-amber-400/50 bg-slate-900"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-100 text-xs">{s.name}</p>
                      <BeltBadge belt={s.belt} stripes={0} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.email} • {s.phone}</p>
                    <span className="text-[10px] text-amber-400 font-mono block mt-0.5">
                      {s.registrationNumber}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleApprove(s)}
                    className="px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Aprovar
                  </button>

                  <button
                    onClick={() => handleReject(s)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Recusar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c121e] border border-slate-800/80 rounded-2xl p-5 sm:p-6 text-white shadow-lg">
        <div>
          <h3 className="text-xl font-black text-slate-100 tracking-tight">Atletas e Alunos Cadastrados</h3>
          <p className="text-xs text-slate-400 mt-0.5 font-medium">Total de {students.length} atletas vinculados à academia</p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold text-xs border border-slate-800 transition-all cursor-pointer active:scale-95 shadow-xs"
              title="Histórico de Auditoria Operacional"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Auditoria</span>
              {auditLogs.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {auditLogs.length}
                </span>
              )}
            </button>

            {students.length > 0 && (
              <button
                onClick={() => onOpenGraduationModal(students[0])}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs border border-slate-800 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <Award className="w-4 h-4" />
                <span>Graduar Atleta</span>
              </button>
            )}
            <button
              onClick={onOpenAddModal}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/10 transition-all cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2.5]" />
              <span>Cadastrar Aluno</span>
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="space-y-3">
        <div className="bg-[#0c121e] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Search Input */}
            <div className="md:col-span-6">
              <label className="block text-xs text-slate-400 font-semibold mb-1">Buscar</label>
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome, matrícula..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Belt Filter */}
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-400 font-semibold mb-1">Faixa</label>
              <div className="relative flex items-center">
                <select
                  value={beltFilter}
                  onChange={e => setBeltFilter(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-slate-100 focus:border-amber-500 outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="ALL">Todas as Faixas</option>
                  <option value="BRANCA">Branca</option>
                  <option value="AZUL">Azul</option>
                  <option value="ROXA">Roxa</option>
                  <option value="MARROM">Marrom</option>
                  <option value="PRETA">Preta</option>
                  <option value="AMARELA">Amarela/Cinza/Verde (Kids)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="md:col-span-3">
              <label className="block text-xs text-slate-400 font-semibold mb-1">Status</label>
              <div className="relative flex items-center">
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full bg-[#070b14] border border-slate-800 rounded-xl pl-3.5 pr-8 py-2.5 text-xs text-slate-100 focus:border-amber-500 outline-none transition-colors appearance-none cursor-pointer"
                >
                  <option value="ACTIVE">Matrículas Ativas ({allStudentsCombined.filter(s => s.active && s.approvalStatus !== 'PENDING').length})</option>
                  <option value="INACTIVE">Inativos ({allStudentsCombined.filter(s => !s.active || s.approvalStatus === 'REJECTED').length})</option>
                  <option value="ALL">Todos os Alunos ({allStudentsCombined.length})</option>
                  {pendingStudents.length > 0 && (
                    <option value="PENDING">Aguardando Aprovação ({pendingStudents.length})</option>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Status Tabs (AC-03 & AC-04) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ACTIVE'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-[#0c121e] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Matrículas Ativas ({allStudentsCombined.filter(s => s.active && s.approvalStatus !== 'PENDING').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'INACTIVE'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-[#0c121e] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserMinus className="w-3.5 h-3.5" />
            <span>Inativos ({allStudentsCombined.filter(s => !s.active || s.approvalStatus === 'REJECTED').length})</span>
          </button>

          {pendingStudents.length > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 shadow-sm animate-pulse'
                  : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/40'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Aguardando Aprovação ({pendingStudents.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-[#0c121e] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Todos ({allStudentsCombined.length})</span>
          </button>
        </div>
      </div>

      {/* Lista de Atletas (Tabela com rolagem horizontal e ajuste compacto) */}
      <div className="bg-[#0c121e] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070b14] text-slate-400 font-bold uppercase text-[11px] tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-4">ATLETA & CONTATO</th>
                <th className="py-3.5 px-3">MATRÍCULA</th>
                <th className="py-3.5 px-3">FAIXA & GRAUS</th>
                <th className="py-3.5 px-3">TREINOS</th>
                <th className="py-3.5 px-3">SITUAÇÃO</th>
                <th className="py-3.5 px-4 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    Nenhum atleta encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Atleta & Contato */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={getStudentAvatar(s)}
                          alt={s.name}
                          className="w-10 h-10 rounded-full object-cover border border-slate-700/80 bg-slate-900 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-100 uppercase tracking-tight text-xs">{s.name}</p>
                          </div>
                          {s.email && (
                            <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                              <span className="truncate">{s.email}</span>
                            </p>
                          )}
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                            {s.phone && (
                              <a
                                href={`https://wa.me/55${s.phone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold transition-colors"
                                title="Abrir WhatsApp do atleta"
                              >
                                <MessageCircle className="w-3 h-3 shrink-0" />
                                <span>{s.phone}</span>
                              </a>
                            )}
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-300 font-semibold">{s.ageCategory || 'ADULTO'}</span>
                            {s.weightCategory && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className="text-slate-400">{s.weightCategory}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Matrícula */}
                    <td className="py-4 px-3 font-mono font-bold text-amber-400 text-xs whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-[#070b14] border border-slate-800">
                        {s.registrationNumber}
                      </span>
                    </td>

                    {/* Faixa & Graus & Tempo de Treino */}
                    <td className="py-4 px-4">
                      <div className="space-y-1.5">
                        <BeltBadge belt={s.belt} stripes={s.stripes} size="sm" showLabel={true} />
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070b14] border border-slate-800 text-amber-400 text-[11px] font-medium whitespace-nowrap">
                          <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{getTrainingTimeText(s.startDate, s.initialMonthsTrained)}</span>
                        </div>
                      </div>
                    </td>

                    {/* Treinos Presenciais & Meta */}
                    <td className="py-4 px-3 font-bold text-slate-200">
                      {(() => {
                        const totalClasses = getStudentTotalClasses(s, attendances);
                        const target = getStudentGraduationTarget(s, academyConfig);
                        const classesSince = getStudentClassesSinceLastGraduation(s, attendances, graduations);
                        const isEligible = isStudentEligibleForGraduation(s, academyConfig, attendances, graduations);
                        return (
                          <div className="text-xs">
                            <p className="font-bold text-slate-100 whitespace-nowrap">{totalClasses} treinos total</p>
                            <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                              <span className={`text-[11px] font-medium ${isEligible ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                                {classesSince}/{target} pós-grau
                              </span>
                              {isEligible && (
                                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] px-1.5 py-0.2 rounded font-black uppercase">
                                  Apto
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Situação Cadastral */}
                    <td className="py-4 px-3 whitespace-nowrap">
                      {s.approvalStatus === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          AGUARDANDO
                        </span>
                      ) : s.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          ATIVO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-800 text-slate-400 border border-slate-700">
                          <UserMinus className="w-3 h-3" />
                          INATIVO
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        {s.approvalStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(s)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-md cursor-pointer animate-pulse"
                            title="Aprovar Vínculo do Aluno na Equipe"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aprovar</span>
                          </button>
                        )}

                        {onOpenCardModal && (
                          <button
                            type="button"
                            onClick={() => onOpenCardModal(s)}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Carteirinha Digital com QR Code"
                            aria-label={`Carteirinha de ${s.name}`}
                          >
                            <IdCard className="w-3.5 h-3.5 text-amber-400" />
                            <span>Carteirinha</span>
                          </button>
                        )}

                        {onOpenEditModal && (
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(s)}
                            className="px-2.5 py-1.5 rounded-lg border border-blue-500/40 bg-blue-950/20 hover:bg-blue-900/30 text-blue-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Editar Cadastro do Aluno"
                            aria-label={`Editar cadastro de ${s.name}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        )}

                        {canManage && (
                          <button
                            type="button"
                            onClick={() => onOpenGraduationModal(s)}
                            className="px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-900/30 text-emerald-400 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Graduar / Graus"
                            aria-label={`Graduar ${s.name}`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Graduar</span>
                          </button>
                        )}

                        {/* Menu Dropdown de Mais Opções */}
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() => setOpenMenuStudentId(openMenuStudentId === s.id ? null : s.id)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                            title="Mais opções"
                            aria-label={`Mais opções para ${s.name}`}
                            aria-expanded={openMenuStudentId === s.id}
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {openMenuStudentId === s.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenMenuStudentId(null)}
                              />
                              <div className="absolute right-0 top-full mt-1.5 w-56 bg-[#0c121e] border border-slate-700 rounded-xl shadow-2xl p-1.5 z-30 space-y-1 text-left animate-fadeIn">
                                <div className="px-2.5 py-1 text-[9px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-1">
                                  Ações do Aluno
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuStudentId(null);
                                    setEmailStudent(s);
                                  }}
                                  className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>Enviar E-mail</span>
                                </button>

                                {s.phone && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuStudentId(null);
                                      const clean = s.phone.replace(/\D/g, '');
                                      window.open(`https://wa.me/55${clean}`, '_blank');
                                    }}
                                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-slate-200 hover:bg-slate-800 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Conversar no WhatsApp</span>
                                  </button>
                                )}

                                {canManage && (
                                  s.active ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuStudentId(null);
                                        setInactivatingStudent(s);
                                      }}
                                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-amber-300 hover:bg-amber-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <UserMinus className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>Inativar Matrícula</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenMenuStudentId(null);
                                        handleReactivate(s);
                                      }}
                                      className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-medium text-emerald-300 hover:bg-emerald-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span>Reativar Matrícula</span>
                                    </button>
                                  )
                                )}

                                {canManage && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuStudentId(null);
                                      setPermanentDeletingStudent(s);
                                    }}
                                    className="w-full px-2.5 py-2 rounded-lg text-left text-xs font-semibold text-rose-300 hover:bg-rose-950/50 hover:text-rose-200 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Excluir definitivamente</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Email Modal */}
      {emailStudent && (
        <SendEmailModal
          student={emailStudent}
          onClose={() => setEmailStudent(null)}
        />
      )}

      {/* Inactivate Student Modal (Administrative Safe Action) */}
      <InactivateStudentModal
        isOpen={!!inactivatingStudent}
        student={inactivatingStudent}
        onClose={() => setInactivatingStudent(null)}
        onConfirm={handleInactivate}
      />

      {/* Permanent Delete Student Modal (Destructive Advanced Action with Dependent Check & Strict Name Typing) */}
      <PermanentDeleteStudentModal
        isOpen={!!permanentDeletingStudent}
        student={permanentDeletingStudent}
        attendances={attendances}
        graduations={graduations}
        payments={payments}
        trainingLogs={trainingLogs}
        observations={teacherObservations}
        challenges={rollChallenges}
        onClose={() => setPermanentDeletingStudent(null)}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
        onSwitchToInactivate={student => {
          setPermanentDeletingStudent(null);
          setInactivatingStudent(student);
        }}
      />

      {/* Operational Audit Logs Modal */}
      <AuditLogsModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
      />

      {/* Inactivation Success Toast with Undo Option (AC-07) */}
      {undoToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 text-white shadow-2xl flex items-center gap-4 animate-bounce-short max-w-md"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <UserMinus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-extrabold text-slate-100 truncate">
              Aluno inativado com sucesso
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5 truncate">
              Histórico de <strong className="text-amber-300">{undoToast.student.name}</strong> preservado.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleUndoInactivate(undoToast.student)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Desfazer ({undoToast.secondsLeft}s)
            </button>
            <button
              type="button"
              onClick={() => setUndoToast(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label="Fechar aviso"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successBanner && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-4 text-white shadow-2xl flex items-center gap-3 animate-fadeIn max-w-md"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-100 flex-1">{successBanner}</p>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
