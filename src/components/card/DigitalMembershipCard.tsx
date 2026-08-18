import React, { useRef } from 'react';
import { Student } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { useData } from '../../context/DataContext';
import { DEFAULT_BLACK_GI_AVATAR, getStudentAvatar } from '../../constants/avatar';
import { getTrainingTimeText } from '../../utils/trainingTime';
import { ShieldCheck, QrCode, Download, Printer, Award, Calendar, CheckCircle, Hash, Clock, Edit3, UserCheck } from 'lucide-react';

interface DigitalMembershipCardProps {
  student: Student;
  onOpenEditModal?: () => void;
  onOpenCheckin?: () => void;
}

export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({ student, onOpenEditModal, onOpenCheckin }) => {
  const { academyConfig } = useData();
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">Carteirinha Digital do Atleta</h3>
          <p className="text-xs text-slate-400">Apresente seu QR Code no leitor da academia para registrar presença.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenCheckin && (
            <button
              onClick={onOpenCheckin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Bater Presença
            </button>
          )}
          {onOpenEditModal && (
            <button
              onClick={onOpenEditModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Cadastro
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Imprimir
          </button>
        </div>
      </div>

      {/* Front Card */}
      <div
        ref={cardRef}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-neutral-900 border-2 border-amber-500/40 shadow-2xl p-6 text-white space-y-6"
      >
        {/* Subtle Watermark */}
        <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-9xl font-black text-amber-400">
          BJJ
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-xl shadow-md">
              BJJ
            </div>
            <div>
              <h4 className="font-extrabold text-slate-100 text-base tracking-wider">
                {academyConfig.name}
              </h4>
              <p className="text-[10px] text-amber-400 uppercase font-bold tracking-widest">
                Carteira Oficial de Afiliado
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3" />
              {student.active ? 'MATRÍCULA ATIVA' : 'INATIVO'}
            </span>
          </div>
        </div>

        {/* Card Main Body */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
          {/* Photo & Belt */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="relative">
              <img
                src={getStudentAvatar(student)}
                alt={student.name}
                className="w-24 h-24 rounded-xl object-cover border-2 border-amber-400 shadow-md bg-slate-900"
              />
              <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-slate-900 border border-amber-400 flex items-center justify-center text-amber-400" title="Atleta Verificado">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>

            <div className="pt-1">
              <BeltBadge belt={student.belt} stripes={student.stripes} size="md" />
            </div>
          </div>

          {/* Student Info */}
          <div className="sm:col-span-2 space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Nome do Atleta
              </span>
              <h3 className="text-lg font-black text-slate-100 leading-snug">
                {student.name}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Matrícula</span>
                <span className="font-mono font-bold text-amber-400 text-xs">{student.registrationNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Tempo de Treino</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  {getTrainingTimeText(student.startDate, student.initialMonthsTrained)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Início na Academia</span>
                <span className="font-semibold text-slate-300">
                  {new Date(student.startDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Categoria / Peso</span>
                <span className="font-semibold text-slate-300">{student.ageCategory} • {student.weightCategory}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer with QR Code */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-1">
            <p className="text-[10px] font-semibold text-slate-400">
              CÓDIGO DE CHECK-IN RÁPIDO
            </p>
            <p className="text-xs font-mono font-bold text-slate-200 tracking-wider">
              {student.qrCodeToken}
            </p>
            <p className="text-[9px] text-slate-500">
              Válido para todas as aulas do plano {student.planName}
            </p>
          </div>

          {/* Simulated QR Code Canvas Visual */}
          <div className="bg-white p-2 rounded-xl shadow-inner border border-stone-300 flex flex-col items-center">
            <div className="w-20 h-20 bg-slate-900 rounded-md p-1.5 flex items-center justify-center text-white relative">
              {/* QR Pattern visual */}
              <div className="grid grid-cols-5 gap-1 w-full h-full">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-2xs ${
                      (i % 2 === 0 || i % 7 === 0 || i === 0 || i === 4 || i === 20 || i === 24)
                        ? 'bg-amber-400'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-slate-950 border border-amber-400 flex items-center justify-center font-bold text-[8px] text-amber-400">
                  BJJ
                </div>
              </div>
            </div>
            <span className="text-[9px] font-mono font-extrabold text-slate-900 mt-1">
              QR CHECK-IN
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
