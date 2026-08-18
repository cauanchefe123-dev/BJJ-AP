import React from 'react';
import { Student, AcademyConfig, BeltType } from '../../types';
import { Award, Printer, ShieldCheck, Sparkles } from 'lucide-react';

interface OfficialGraduationCertificateProps {
  student: Student;
  academyConfig: AcademyConfig;
  belt?: BeltType;
  stripes?: number;
}

export const OfficialGraduationCertificate: React.FC<OfficialGraduationCertificateProps> = ({
  student,
  academyConfig,
  belt = student.belt,
  stripes = student.stripes,
}) => {
  const getBeltLabel = (b: BeltType) => {
    switch (b) {
      case 'BRANCA': return 'Faixa Branca';
      case 'CINZA': return 'Faixa Cinza';
      case 'AMARELA': return 'Faixa Amarela';
      case 'LARANJA': return 'Faixa Laranja';
      case 'VERDE': return 'Faixa Verde';
      case 'AZUL': return 'Faixa Azul';
      case 'ROXA': return 'Faixa Roxa';
      case 'MARROM': return 'Faixa Marrom';
      case 'PRETA': return 'Faixa Preta';
      default: return `Faixa ${b}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action bar (hidden on print) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl print:hidden">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            Certificado Oficial de Graduação / Diploma Timbrado
          </h4>
          <p className="text-xs text-slate-400">
            Documento de honra timbrado para impressão e entrega oficial ao atleta.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all"
        >
          <Printer className="w-4 h-4" />
          Imprimir Diploma em Alta Resolução
        </button>
      </div>

      {/* Diploma Printable A4 Landscape Card */}
      <div className="bg-white text-slate-900 p-10 rounded-3xl border-8 border-amber-600 shadow-2xl max-w-4xl mx-auto space-y-6 relative overflow-hidden print:shadow-none print:border-4 print:border-amber-700 print:p-8 print:m-0 print:max-w-none print:bg-white print:text-black">
        
        {/* Subtle Watermark BG */}
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
          <Award className="w-96 h-96 text-amber-600" />
        </div>

        {/* Certificate Header */}
        <div className="flex items-center justify-between border-b-2 border-amber-500/40 pb-4 relative z-10">
          <div className="flex items-center gap-4">
            {academyConfig.logoUrl ? (
              <img
                src={academyConfig.logoUrl}
                alt={academyConfig.name}
                className="w-16 h-16 object-contain rounded-xl border-2 border-amber-500"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center font-black text-2xl border-2 border-amber-500">
                BJJ
              </div>
            )}
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">
                {academyConfig.fantasyName || academyConfig.name}
              </h2>
              <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                CONFEDERAÇÃO OFICIAL DE ARTES MARCIAIS & JIU-JITSU
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">DIPLOMA REGISTRO</span>
            <span className="text-xs font-mono font-black text-amber-800">
              DIP-{student.registrationNumber}-{new Date().getFullYear()}
            </span>
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center space-y-2 py-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Certificado de Graduação de Faixa
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          </div>

          <p className="text-xs text-slate-600 italic pt-2">
            A comissão técnica da academia <strong>{academyConfig.fantasyName || academyConfig.name}</strong>, sob supervisão do Mestre Head Coach, confere publicamente a:
          </p>

          <h1 className="text-3xl font-black text-slate-950 uppercase tracking-tight py-2 underline decoration-amber-500 decoration-4 underline-offset-8">
            {student.name}
          </h1>

          <p className="text-xs text-slate-700 leading-relaxed max-w-2xl mx-auto pt-2">
            A outorga oficial da <strong className="text-amber-900 text-sm font-black uppercase">{getBeltLabel(belt)}</strong> com <strong>{stripes} grau(s)</strong> na Arte Suave Jiu-Jitsu, em reconhecimento à sua exemplar disciplina, superação técnica e honra demonstradas nos tatames.
          </p>
        </div>

        {/* Graduation Specs Box */}
        <div className="grid grid-cols-3 gap-4 bg-slate-50 border border-amber-200 p-4 rounded-xl text-center relative z-10">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">FAIXA CONFERIDA</span>
            <span className="text-sm font-black text-amber-900 uppercase">{belt}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">GRAUS / STRIPES</span>
            <span className="text-sm font-black text-slate-900">{stripes} GRAU(S)</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">DATA DA OUTORGA</span>
            <span className="text-sm font-bold text-slate-900">
              {student.lastGraduationDate 
                ? new Date(student.lastGraduationDate + 'T00:00:00').toLocaleDateString('pt-BR') 
                : new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Signatures & Seal */}
        <div className="pt-8 grid grid-cols-3 items-end gap-6 text-center relative z-10">
          <div className="space-y-1">
            <div className="border-b-2 border-slate-900 h-8"></div>
            <p className="font-black text-xs text-slate-900">{student.name}</p>
            <p className="text-[10px] text-slate-500">Atleta Graduado</p>
          </div>

          {/* Official Emblem Seal */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full border-4 border-amber-600 bg-amber-50 flex flex-col items-center justify-center text-amber-900 shadow-lg p-1">
              <ShieldCheck className="w-8 h-8 text-amber-600" />
              <span className="text-[8px] font-black uppercase tracking-tighter">BJJCRON SEAL</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="border-b-2 border-slate-900 h-8"></div>
            <p className="font-black text-xs text-slate-900">{academyConfig.headCoachName || 'Mestre Head Coach'}</p>
            <p className="text-[10px] text-slate-500">{academyConfig.headCoachBelt || 'Faixa Preta'} • Head Coach</p>
          </div>
        </div>

      </div>
    </div>
  );
};
