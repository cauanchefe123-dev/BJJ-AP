import React, { useState, useEffect } from 'react';
import { AuditLog, AuditAction } from '../../types';
import { ShieldCheck, Search, Filter, Calendar, User, UserMinus, UserCheck, Trash2, X, Clock, FileText } from 'lucide-react';

interface AuditLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ isOpen, onClose, logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'ALL' | AuditAction>('ALL');

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    const sName = log.studentName?.toLowerCase() || '';
    const sReg = log.studentRegistrationNumber?.toLowerCase() || '';
    const opName = log.performedBy?.name?.toLowerCase() || '';
    const opEmail = log.performedBy?.email?.toLowerCase() || '';
    const term = searchTerm.toLowerCase();

    const matchesSearch =
      !term ||
      sName.includes(term) ||
      sReg.includes(term) ||
      opName.includes(term) ||
      opEmail.includes(term);

    return matchesAction && matchesSearch;
  });

  const getActionBadge = (action: AuditAction) => {
    switch (action) {
      case 'INACTIVATE_STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
            <UserMinus className="w-3 h-3" />
            Inativação
          </span>
        );
      case 'REACTIVATE_STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <UserCheck className="w-3 h-3" />
            Reativação
          </span>
        );
      case 'DELETE_STUDENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
            <Trash2 className="w-3 h-3" />
            Exclusão Definitiva
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col text-white shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="audit-modal-title" className="text-base font-black text-slate-100">
                Auditoria Operacional de Alunos
              </h3>
              <p className="text-xs text-slate-400">
                Registro imutável de inativações, reativações e exclusões realizadas na academia.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar histórico de auditoria"
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-900/95 border-b border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por aluno ou operador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-amber-500/80 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500/80 outline-none transition-colors"
            >
              <option value="ALL">Todas as Operações ({logs.length})</option>
              <option value="INACTIVATE_STUDENT">Apenas Inativações</option>
              <option value="REACTIVATE_STUDENT">Apenas Reativações</option>
              <option value="DELETE_STUDENT">Apenas Exclusões Definitivas</option>
            </select>
          </div>
        </div>

        {/* List of logs */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <FileText className="w-8 h-8 mx-auto opacity-50" />
              <p className="text-xs">Nenhum registro de auditoria encontrado.</p>
            </div>
          ) : (
            filteredLogs.map(log => (
              <div
                key={log.id}
                className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2.5 transition-all hover:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="font-extrabold text-xs text-slate-100">
                      {log.studentName}
                    </span>
                    {log.studentRegistrationNumber && (
                      <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {log.studentRegistrationNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{formatDate(log.timestamp)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Executado por: <strong className="text-slate-200">{log.performedBy.name}</strong> ({log.performedBy.role})
                    </span>
                  </div>
                  {log.details && (
                    <span className="text-slate-400 italic text-[11px]">
                      {log.details}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
