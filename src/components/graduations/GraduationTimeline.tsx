import React, { useState } from 'react';
import { Graduation, Student } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { Award, Calendar, User, Clock, FileCheck, Edit3, Trash2, ShieldCheck, ChevronRight } from 'lucide-react';
import { formatDateBR } from '../../utils/dateUtils';
import { ConfirmModal } from '../common/ConfirmModal';

interface GraduationTimelineProps {
  graduations: Graduation[];
  student?: Student | null;
  canManage?: boolean;
  onViewCertificate: (grad: Graduation) => void;
  onEditGraduation?: (grad: Graduation) => void;
  onDeleteGraduation?: (grad: Graduation) => void;
}

export const GraduationTimeline: React.FC<GraduationTimelineProps> = ({
  graduations,
  student,
  canManage = false,
  onViewCertificate,
  onEditGraduation,
  onDeleteGraduation,
}) => {
  const [deletingGrad, setDeletingGrad] = useState<Graduation | null>(null);

  // Sort graduations: most recent first or chronological
  const sortedGraduations = [...graduations].sort((a, b) => {
    return new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime();
  });

  if (sortedGraduations.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-slate-950/60 rounded-3xl border border-slate-800/80 space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
          <Award className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h4 className="font-extrabold text-sm text-slate-200">
            Nenhum registro de graduação cadastrado ainda
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {student
              ? `O histórico de faixas e graus de ${student.name} será exibido aqui assim que forem outorgados novos graus ou registradas graduações anteriores.`
              : 'As graduações e exames outorgados aparecerão aqui em ordem cronológica.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-amber-500/50 before:to-slate-800">
      {sortedGraduations.map((grad, index) => {
        const isLatest = index === 0;
        const certNumber = grad.certificateNumber || `CERT-${new Date(grad.promotedAt).getFullYear() || 2026}-${grad.id.slice(-4).toUpperCase()}`;

        return (
          <div
            key={grad.id}
            className="relative group transition-all"
          >
            {/* Timeline Pin Node */}
            <div
              className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center -translate-x-1/2 border-2 transition-all ${
                isLatest
                  ? 'bg-amber-500 border-amber-300 text-slate-950 shadow-lg shadow-amber-500/30 ring-4 ring-amber-500/20'
                  : 'bg-slate-900 border-slate-700 text-amber-400 group-hover:border-amber-500'
              }`}
            >
              <Award className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>

            {/* Event Card */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border transition-all ${
                isLatest
                  ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-amber-500/40 shadow-xl'
                  : 'bg-slate-950/80 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <BeltBadge belt={grad.belt} stripes={grad.stripes} size="md" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-100 uppercase tracking-tight">
                        Faixa {grad.belt} {grad.stripes > 0 ? `• ${grad.stripes}º Grau` : '• Nova Faixa'}
                      </h4>
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                          Graduação Atual
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>Outorgado em {formatDateBR(grad.promotedAt)}</span>
                    </p>
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => onViewCertificate(grad)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                    title="Visualizar e Imprimir Certificado Oficial"
                  >
                    <FileCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Certificado</span>
                  </button>

                  {canManage && onEditGraduation && (
                    <button
                      onClick={() => onEditGraduation(grad)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                      title="Editar dados desta graduação"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canManage && onDeleteGraduation && (
                    <button
                      onClick={() => setDeletingGrad(grad)}
                      className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                      title="Remover do histórico"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Card Details Body */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Mestre Outorgante</span>
                    <span className="font-semibold text-slate-200 truncate block">{grad.promotedBy}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Volume de Treinos</span>
                    <span className="font-semibold text-slate-200">
                      {grad.classesCountAtPromotion > 0 ? `${grad.classesCountAtPromotion} treinos acumulados` : 'Registro inicial'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Autenticação</span>
                    <span className="font-mono text-[11px] font-bold text-amber-400 truncate block">{certNumber}</span>
                  </div>
                </div>
              </div>

              {grad.notes && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/60 text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
                  "{grad.notes}"
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Confirmation Modal for deleting graduation */}
      {deletingGrad && (
        <ConfirmModal
          isOpen={!!deletingGrad}
          onClose={() => setDeletingGrad(null)}
          onConfirm={() => {
            if (deletingGrad && onDeleteGraduation) {
              onDeleteGraduation(deletingGrad);
              setDeletingGrad(null);
            }
          }}
          title="Excluir Registro de Graduação"
          message={`Tem certeza que deseja remover permanentemente o registro de graduação Faixa ${deletingGrad.belt} (${deletingGrad.stripes}º Grau)?`}
          confirmText="Excluir Graduação"
          cancelText="Cancelar"
          type="danger"
        />
      )}
    </div>
  );
};
