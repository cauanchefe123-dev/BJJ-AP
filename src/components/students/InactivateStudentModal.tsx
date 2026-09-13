import React, { useEffect, useRef } from 'react';
import { Student } from '../../types';
import { UserMinus, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { BeltBadge } from '../belts/BeltBadge';

interface InactivateStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
  onConfirm: (student: Student) => void;
}

export const InactivateStudentModal: React.FC<InactivateStudentModalProps> = ({
  isOpen,
  student,
  onClose,
  onConfirm,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Auto focus on confirm button or handle Esc key
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivate-modal-title"
      aria-describedby="inactivate-modal-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-slate-900 border border-amber-500/40 rounded-3xl max-w-lg w-full p-6 text-white shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <UserMinus className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 mb-1">
                <AlertTriangle className="w-3 h-3" />
                Ação Administrativa Segura
              </div>
              <h3 id="inactivate-modal-title" className="text-lg font-black text-slate-100">
                Inativar aluno?
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar modal de inativação"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student identification card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-slate-800 border border-amber-500/30 flex items-center justify-center font-bold text-sm text-amber-300 overflow-hidden shrink-0">
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
              Matrícula: <span className="text-amber-400 font-bold">{student.registrationNumber}</span>
            </p>
          </div>
        </div>

        {/* Specification message */}
        <div
          id="inactivate-modal-desc"
          className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 text-xs text-slate-200 leading-relaxed space-y-2"
        >
          <p>
            O aluno <strong className="text-amber-300 font-bold">{student.name}</strong> deixará de aparecer nas listas ativas e não poderá ser incluído em novos registros operacionais.
          </p>
          <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-semibold pt-1 border-t border-amber-500/20">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>O histórico de presenças, graduações e treinos será preservado.</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={() => onConfirm(student)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <UserMinus className="w-4 h-4" />
            Inativar aluno
          </button>
        </div>
      </div>
    </div>
  );
};
