import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { Users, UserCheck, UserX, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export const PendingStudentApprovals: React.FC = () => {
  const { students, updateStudent, deleteStudent } = useData();
  const { approveUser, rejectUser } = useAuth();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const pendingStudents = students.filter(s => s.approvalStatus === 'PENDING');

  const handleApprove = (studentId: string, studentName: string) => {
    approveUser(studentId);
    updateStudent(studentId, { approvalStatus: 'APPROVED', active: true });
    setToastMsg(`✅ Atleta ${studentName} aceito(a) na equipe com sucesso!`);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const handleApproveAll = () => {
    if (window.confirm(`Deseja aprovar todos os ${pendingStudents.length} atletas pendentes de uma vez?`)) {
      pendingStudents.forEach(st => {
        approveUser(st.id);
        updateStudent(st.id, { approvalStatus: 'APPROVED', active: true });
      });
      setToastMsg(`✅ Todos os ${pendingStudents.length} atletas foram aprovados na equipe!`);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  const handleReject = (studentId: string, studentName: string) => {
    if (window.confirm(`Deseja realmente recusar e remover a solicitação de ${studentName}?`)) {
      rejectUser(studentId);
      deleteStudent(studentId);
      setToastMsg(`🚫 Solicitação de ${studentName} foi recusada e removida.`);
      setTimeout(() => setToastMsg(null), 5000);
    }
  };

  return (
    <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 text-white space-y-4 shadow-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-100">
                Aprovação de Alunos na Equipe
              </h3>
              {pendingStudents.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 animate-pulse">
                  {pendingStudents.length} pendente(s)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Gerencie solicitações de vínculo e novos cadastros aguardando liberação para o tatame
            </p>
          </div>
        </div>

        {pendingStudents.length > 1 && (
          <button
            onClick={handleApproveAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer self-stretch sm:self-auto justify-center"
          >
            <Sparkles className="w-4 h-4" />
            Aprovar Todos ({pendingStudents.length})
          </button>
        )}
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Pending List or Empty State */}
      {pendingStudents.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs font-bold text-slate-300">
            Nenhuma solicitação pendente no momento
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            Todos os alunos vinculados à equipe já foram avaliados e estão aprovados no sistema.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pendingStudents.map(student => (
            <div
              key={student.id}
              className="bg-slate-950/90 border border-amber-500/40 rounded-2xl p-4.5 hover:border-amber-500/80 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md"
            >
              {/* Student Info */}
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <img
                  src={student.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                  alt={student.name}
                  className="w-12 h-12 rounded-xl object-cover border-2 border-amber-400/80 shrink-0 shadow-sm"
                />
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-extrabold text-sm text-slate-100 truncate">
                      {student.name}
                    </h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                      AGUARDANDO APROVAÇÃO
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                    <span>{student.email}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-300">Matrícula {student.registrationNumber}</span>
                  </div>
                  {student.notes && (
                    <p className="text-[11px] text-amber-300/90 italic bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 mt-1">
                      "{student.notes}"
                    </p>
                  )}
                  <div className="pt-1">
                    <BeltBadge belt={student.belt} stripes={student.stripes} size="sm" />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 border-t border-slate-800/80 sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                <button
                  type="button"
                  onClick={() => handleApprove(student.id, student.name)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  Aceitar na Equipe
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(student.id, student.name)}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <UserX className="w-4 h-4" />
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
