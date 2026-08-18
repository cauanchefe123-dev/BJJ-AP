import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { Student, BeltType } from '../../types';
import { DEFAULT_BLACK_GI_AVATAR, getStudentAvatar } from '../../constants/avatar';
import { getTrainingTimeText } from '../../utils/trainingTime';
import { getStudentGraduationTarget, isStudentEligibleForGraduation } from '../../utils/graduation';
import { getStudentTotalClasses } from '../../utils/ranking';
import { Search, UserPlus, Award, Filter, ShieldCheck, MoreVertical, Trash2, Edit3, Phone, Mail, IdCard, UserCheck, Check, X, AlertCircle, Clock } from 'lucide-react';
import { SendEmailModal } from './SendEmailModal';

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
  const { students, attendances, deleteStudent, updateStudent, academyConfig } = useData();
  const { approveUser, rejectUser, currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [beltFilter, setBeltFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [emailStudent, setEmailStudent] = useState<Student | null>(null);

  const pendingStudents = students.filter(s => s.approvalStatus === 'PENDING');
  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  const handleApprove = (student: Student) => {
    approveUser(student.id);
    updateStudent(student.id, { approvalStatus: 'APPROVED', active: true });
  };

  const handleReject = (student: Student) => {
    rejectUser(student.id);
    deleteStudent(student.id);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()));

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white">
        <div>
          <h3 className="text-xl font-bold text-slate-100">Atletas e Alunos Cadastrados</h3>
          <p className="text-xs text-slate-400">Total de {students.length} atletas vinculados à academia</p>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            {students.length > 0 && (
              <button
                onClick={() => onOpenGraduationModal(students[0])}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4" />
                Graduar Atleta
              </button>
            )}
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar Novo Aluno
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, matrícula..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Belt Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Faixa:</span>
          <select
            value={beltFilter}
            onChange={e => setBeltFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="ALL">Todas as Faixas</option>
            <option value="BRANCA">Branca</option>
            <option value="AZUL">Azul</option>
            <option value="ROXA">Roxa</option>
            <option value="MARROM">Marrom</option>
            <option value="PRETA">Preta</option>
            <option value="AMARELA">Amarela/Cinza/Verde (Kids)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Matrícula Ativa</option>
            <option value="INACTIVE">Inativo</option>
            <option value="PENDING">Aguardando Aprovação ({pendingStudents.length})</option>
          </select>
        </div>
      </div>

      {/* Table / Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Atleta</th>
                <th className="py-3.5 px-4">Matrícula</th>
                <th className="py-3.5 px-4">Faixa & Graus</th>
                <th className="py-3.5 px-4">Tempo de Treino</th>
                <th className="py-3.5 px-4">Aulas Presenciais</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum atleta encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img src={getStudentAvatar(s)} alt={s.name} className="w-10 h-10 rounded-full object-cover border border-amber-400/40 bg-slate-900" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-100">{s.name}</p>
                            {s.approvalStatus === 'PENDING' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                PENDENTE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{s.phone}</span> • <span>{s.ageCategory}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {s.registrationNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <BeltBadge belt={s.belt} stripes={s.stripes} size="sm" />
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-extrabold text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 px-2.5 py-1.5 rounded-xl inline-flex items-center gap-1.5 shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        {getTrainingTimeText(s.startDate, s.initialMonthsTrained)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {(() => {
                        const totalClasses = getStudentTotalClasses(s, attendances);
                        const target = getStudentGraduationTarget(s, academyConfig);
                        const isEligible = isStudentEligibleForGraduation(s, academyConfig);
                        return (
                          <div>
                            <span>{totalClasses} treinos total</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[10px] ${isEligible ? 'text-emerald-400 font-extrabold' : 'text-slate-400 font-semibold'}`}>
                                {s.classesSinceLastGraduation}/{target} pós-grau
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

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.approvalStatus === 'PENDING' && (
                          <button
                            onClick={() => handleApprove(s)}
                            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow-md cursor-pointer animate-pulse"
                            title="Aprovar Vínculo do Aluno na Equipe"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Aprovar
                          </button>
                        )}

                        {onOpenEditModal && (
                          <button
                            onClick={() => onOpenEditModal(s)}
                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1"
                            title="Editar Cadastro do Aluno"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        )}

                        <button
                          onClick={() => setEmailStudent(s)}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          title="Enviar E-mail para Aluno"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          E-mail
                        </button>

                        {canManage && (
                          <button
                            onClick={() => onOpenGraduationModal(s)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Graduar / Graus"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Graduar
                          </button>
                        )}

                        {onOpenCardModal && (
                          <button
                            onClick={() => onOpenCardModal(s)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                            title="Carteirinha"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManage && (
                          <button
                            onClick={() => {
                              if (confirm(`Deseja remover a matrícula de ${s.name}?`)) {
                                deleteStudent(s.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 cursor-pointer"
                            title="Excluir Aluno"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
    </div>
  );
};
