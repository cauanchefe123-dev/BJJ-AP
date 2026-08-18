import React from 'react';
import { Student, AcademyConfig } from '../../types';
import { Shield, FileText, Printer, CheckCircle2, User, Phone, Calendar, HeartPulse } from 'lucide-react';

interface OfficialWaiverDocumentProps {
  student: Student;
  academyConfig: AcademyConfig;
}

export const OfficialWaiverDocument: React.FC<OfficialWaiverDocumentProps> = ({ student, academyConfig }) => {
  return (
    <div className="space-y-4">
      {/* Action Bar (Hidden on print) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl print:hidden">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Ficha de Matrícula e Termo de Responsabilidade Timbrado
          </h4>
          <p className="text-xs text-slate-400">
            Documento oficial para impressão física, arquivo da academia ou assinatura do aluno.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition-all"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Printable Official Paper Layout */}
      <div className="bg-white text-slate-900 p-8 rounded-2xl border border-slate-200 shadow-2xl max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:bg-white print:text-black">
        
        {/* Paper Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-4">
            {academyConfig.logoUrl ? (
              <img
                src={academyConfig.logoUrl}
                alt={academyConfig.name}
                className="w-16 h-16 object-contain rounded-lg border border-slate-300"
              />
            ) : (
              <div className="w-16 h-16 bg-slate-900 text-amber-400 rounded-lg flex items-center justify-center font-black text-2xl">
                BJJ
              </div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
                {academyConfig.fantasyName || academyConfig.name}
              </h1>
              <p className="text-xs text-slate-600 font-bold">
                {academyConfig.name} • CNPJ: {academyConfig.cnpj || '12.345.678/0001-90'}
              </p>
              <p className="text-[11px] text-slate-500">
                {academyConfig.address || 'CT Principal de Jiu-Jitsu'} • Tel: {academyConfig.phone || '(11) 99999-9999'}
              </p>
            </div>
          </div>

          <div className="text-right border-l-2 border-slate-200 pl-4">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
              TERMO OFICIAL Nº
            </span>
            <span className="text-base font-mono font-black text-slate-900">
              MAT-{student.registrationNumber}
            </span>
            <span className="block text-[10px] text-emerald-700 font-bold mt-1">
              STATUS: MATRÍCULA ATIVA
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-200">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            FICHA CADASTRAL DE ATLETA E TERMO DE ISENÇÃO DE RESPONSABILIDADE (WAIVER)
          </h2>
        </div>

        {/* Section 1: Dados Pessoais */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1">
            1. Dados Cadastrais do Atleta
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Nome Completo</span>
              <span className="font-bold text-slate-900">{student.name}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">CPF</span>
              <span className="font-mono font-bold text-slate-900">{student.cpf || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Data de Nascimento</span>
              <span className="font-bold text-slate-900">{student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Telefone / WhatsApp</span>
              <span className="font-bold text-slate-900">{student.phone || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">E-mail</span>
              <span className="font-bold text-slate-900">{student.email || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Faixa & Graduação</span>
              <span className="font-bold text-amber-800 uppercase">{student.belt} ({student.stripes} Graus)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Plano Contratado</span>
              <span className="font-bold text-slate-900">{student.planName} (R$ {student.planPrice}/mês)</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Vencimento</span>
              <span className="font-bold text-slate-900">Dia {student.paymentDueDateDay} de cada mês</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Categoria de Competição</span>
              <span className="font-bold text-slate-900">{student.ageCategory} • {student.weightCategory}</span>
            </div>
          </div>
        </div>

        {/* Section 2: Ficha Médica / Anamnese */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-300 pb-1 flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
            2. Anamnese de Tatame & Informações de Emergência
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Contato de Emergência</span>
              <span className="font-bold text-slate-900">{student.emergencyContact || 'Responsável cadastrado'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Restrições Médicas / Lesões</span>
              <span className="font-bold text-slate-900">{student.notes || 'Nenhuma restrição declarada'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase block">Apto para Treino de Alto Impacto</span>
              <span className="font-bold text-emerald-700">SIM — DECLARADO APTO</span>
            </div>
          </div>
        </div>

        {/* Section 3: Termo de Responsabilidade Legal BJJ */}
        <div className="space-y-2 text-[11px] leading-relaxed text-slate-700 bg-slate-50/70 p-4 rounded-lg border border-slate-300">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-1">
            3. Termo de Adesão, Conduta e Isenção de Responsabilidade
          </h3>
          <p>
            1. Declaro estar em plenas condições físicas e mentais para a prática de artes marciais (Jiu-Jitsu / Grappling / Preparação Física), estando ciente de que se trata de uma atividade esportiva de contato direto, sujeita a riscos inerentes de lesões corporais.
          </p>
          <p>
            2. Isento expressamente a academia <strong>{academyConfig.fantasyName || academyConfig.name}</strong>, seus professores, instrutores e colaboradores de qualquer responsabilidade civil ou criminal por lesões ocorridas durante o treino regular ou eventos esportivos internos.
          </p>
          <p>
            3. Comprometo-me a respeitar o código de conduta do tatame, manter a higiene do kimono e equipamentos, e acatar rigorosamente os comandos da comissão técnica e do Head Coach <strong>{academyConfig.headCoachName || 'Mestre Responsável'}</strong>.
          </p>
          <p>
            4. Autorizo o uso de minha imagem e áudio para fins institucionais e de divulgação nas redes sociais oficiais da academia.
          </p>
        </div>

        {/* Signatures */}
        <div className="pt-8 grid grid-cols-2 gap-12 text-center text-xs">
          <div className="space-y-1">
            <div className="border-b border-slate-900 h-8"></div>
            <p className="font-bold text-slate-900">{student.name}</p>
            <p className="text-[10px] text-slate-500">Assinatura do Atleta ou Responsável Legal</p>
          </div>

          <div className="space-y-1">
            <div className="border-b border-slate-900 h-8"></div>
            <p className="font-bold text-slate-900">{academyConfig.headCoachName || 'Mestre Head Coach'}</p>
            <p className="text-[10px] text-slate-500">{academyConfig.headCoachBelt || 'Faixa Preta'} • Responsável Técnico</p>
          </div>
        </div>

        {/* Footer date */}
        <div className="text-center text-[10px] text-slate-500 pt-4 border-t border-slate-200">
          Documento gerado em {new Date().toLocaleDateString('pt-BR')} pelo Sistema Oficial BJJCRON • Autenticidade Registrada.
        </div>
      </div>
    </div>
  );
};
