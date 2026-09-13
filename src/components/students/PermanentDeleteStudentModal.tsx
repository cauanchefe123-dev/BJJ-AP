import React, { useState, useEffect, useMemo } from 'react';
import { Student, AttendanceRecord, Graduation, PaymentRecord, TrainingLog, TeacherObservation, RollChallenge } from '../../types';
import { checkStudentDependentRecords } from '../../utils/studentSafety';
import { AlertOctagon, ShieldAlert, UserMinus, Trash2, X, Lock, CheckCircle2 } from 'lucide-react';
import { BeltBadge } from '../belts/BeltBadge';

interface PermanentDeleteStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  attendances: AttendanceRecord[];
  graduations: Graduation[];
  payments: PaymentRecord[];
  trainingLogs?: TrainingLog[];
  observations?: TeacherObservation[];
  challenges?: RollChallenge[];
  onClose: () => void;
  onConfirmPermanentDelete: (student: Student) => void;
  onSwitchToInactivate: (student: Student) => void;
}

export const PermanentDeleteStudentModal: React.FC<PermanentDeleteStudentModalProps> = ({
  isOpen,
  student,
  attendances,
  graduations,
  payments,
  trainingLogs = [],
  observations = [],
  challenges = [],
  onClose,
  onConfirmPermanentDelete,
  onSwitchToInactivate,
}) => {
  const [typedName, setTypedName] = useState('');

  // Reset typed name when modal opens
  useEffect(() => {
    if (isOpen) {
      setTypedName('');
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  const dependencyCheck = useMemo(() => {
    if (!student) return null;
    return checkStudentDependentRecords(
      student,
      attendances,
      graduations,
      payments,
      trainingLogs,
      observations,
      challenges
    );
  }, [student, attendances, graduations, payments, trainingLogs, observations, challenges]);

  if (!isOpen || !student || !dependencyCheck) return null;

  const isNameMatching = typedName.trim() === student.name.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-delete-title"
      aria-describedby="perm-delete-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn"
    >
      <div className="bg-slate-900 border border-rose-500/50 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 mb-1">
                <ShieldAlert className="w-3 h-3" />
                Ação Avançada Destrutiva
              </div>
              <h3 id="perm-delete-title" className="text-lg font-black text-slate-100">
                Excluir definitivamente?
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar modal de exclusão definitiva"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student card */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-800 border border-rose-500/30 flex items-center justify-center font-bold text-sm text-rose-300 overflow-hidden shrink-0">
            {student.photoUrl ? (
              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" />
            ) : (
              student.name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-extrabold text-slate-100 text-sm truncate">{student.name}</p>
              <BeltBadge belt={student.belt} stripes={student.stripes} size="sm" />
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Matrícula: <span className="text-rose-300 font-bold">{student.registrationNumber}</span>
            </p>
          </div>
        </div>

        {/* CASE 1: Deletion is BLOCKED because of dependent records */}
        {dependencyCheck.hasDependents ? (
          <div className="space-y-4">
            <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-black text-xs uppercase tracking-wide">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                Exclusão Definitiva Bloqueada por Segurança
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Este aluno possui histórico e registros dependentes ativos no sistema que não podem ser apagados:
              </p>

              {/* Badges of dependent records */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {dependencyCheck.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-950/70 border border-rose-500/30 rounded-xl p-2.5 flex items-center justify-between gap-2"
                  >
                    <span className="text-[11px] text-slate-300 font-medium truncate">{item.label}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-200 leading-relaxed mt-2">
                <strong>Diretriz de Operação:</strong> Para manter a integridade dos relatórios contábeis, certificados de faixa e frequência no tatame, a exclusão definitiva está desabilitada. Utilize a ação <strong>Inativar Aluno</strong>.
              </div>
            </div>

            {/* Controls when blocked */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToInactivate(student);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <UserMinus className="w-4 h-4" />
                Inativar Aluno em vez de excluir
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: No dependent records - confirmation with exact name typing */
          <div className="space-y-4">
            {/* Warning requirement text */}
            <div
              id="perm-delete-desc"
              className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed space-y-2"
            >
              <p className="font-semibold text-rose-200">
                Esta ação pode remover permanentemente o cadastro e os dados associados. Ela não deve ser usada para alunos que apenas deixaram de treinar. Para preservar o histórico, use <strong>Inativar aluno</strong>.
              </p>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-rose-500/20">
                Como este aluno ainda não possui presenças, graduações ou mensalidades vinculadas, a exclusão permanente é permitida mediante confirmação estrita.
              </p>
            </div>

            {/* Strict Name typing requirement */}
            <div className="space-y-2">
              <label htmlFor="confirm-student-name" className="block text-xs font-bold text-slate-300">
                Para confirmar a exclusão, digite o nome completo do aluno:
              </label>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-amber-400 font-bold select-all">
                {student.name}
              </div>
              <input
                id="confirm-student-name"
                type="text"
                value={typedName}
                onChange={e => setTypedName(e.target.value)}
                placeholder="Digite o nome exatamente como acima"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 outline-none transition-colors"
                autoComplete="off"
              />
              {typedName && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                  {isNameMatching ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Nome correto. Exclusão habilitada.
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertOctagon className="w-3.5 h-3.5" /> O nome digitado ainda não coincide exatamente.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Controls when allowed */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!isNameMatching}
                onClick={() => onConfirmPermanentDelete(student)}
                className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                  isNameMatching
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir definitivamente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
