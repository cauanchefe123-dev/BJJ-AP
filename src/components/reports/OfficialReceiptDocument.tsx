import React from 'react';
import { PaymentRecord, Student, AcademyConfig } from '../../types';
import { CreditCard, Printer, CheckCircle, QrCode, Building, Award } from 'lucide-react';

interface OfficialReceiptDocumentProps {
  payment: PaymentRecord;
  student: Student;
  academyConfig: AcademyConfig;
}

export const OfficialReceiptDocument: React.FC<OfficialReceiptDocumentProps> = ({ payment, student, academyConfig }) => {
  return (
    <div className="space-y-4">
      {/* Control bar (hidden on print) */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl print:hidden">
        <div>
          <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            Recibo Oficial de Pagamento Timbrado
          </h4>
          <p className="text-xs text-slate-400">
            Comprovante fiscal/financeiro oficial emitido para o aluno.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all"
        >
          <Printer className="w-4 h-4" />
          Imprimir / Salvar PDF
        </button>
      </div>

      {/* Printable Receipt Card */}
      <div className="bg-white text-slate-900 p-8 rounded-2xl border-2 border-slate-300 shadow-2xl max-w-2xl mx-auto space-y-6 print:shadow-none print:border-2 print:border-slate-900 print:p-6 print:m-0 print:max-w-none print:bg-white print:text-black">
        
        {/* Receipt Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            {academyConfig.logoUrl ? (
              <img
                src={academyConfig.logoUrl}
                alt={academyConfig.name}
                className="w-14 h-14 object-contain rounded-lg border border-slate-300"
              />
            ) : (
              <div className="w-14 h-14 bg-slate-900 text-amber-400 rounded-lg flex items-center justify-center font-black text-xl">
                BJJ
              </div>
            )}
            <div>
              <h1 className="text-base font-black uppercase text-slate-900 leading-tight">
                {academyConfig.fantasyName || academyConfig.name}
              </h1>
              <p className="text-[11px] text-slate-600 font-bold">
                CNPJ: {academyConfig.cnpj || '12.345.678/0001-90'}
              </p>
              <p className="text-[10px] text-slate-500">
                {academyConfig.address || 'Centro de Treinamento Oficial'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">RECIBO Nº</span>
            <span className="text-lg font-mono font-black text-slate-900">
              REC-{payment.id.padStart(5, '0')}
            </span>
            <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 rounded border border-emerald-300">
              {payment.status === 'PAGO' ? 'PAGAMENTO CONFIRMADO' : payment.status}
            </span>
          </div>
        </div>

        {/* Title & Amount Box */}
        <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-slate-500 block">VALOR PAGO</span>
            <span className="text-2xl font-black text-emerald-700">
              R$ {payment.amount.toFixed(2)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-500 block">COMPETÊNCIA / MÊS</span>
            <span className="text-sm font-bold text-slate-900">{payment.referenceMonth}</span>
          </div>
        </div>

        {/* Receipt Body text */}
        <div className="space-y-3 text-xs text-slate-800 leading-relaxed border-b border-slate-200 pb-4">
          <p>
            Recebemos de <strong>{student.name}</strong> (Matrícula Nº <strong>{student.registrationNumber}</strong>, CPF: <strong>{student.cpf || 'Não informado'}</strong>) a quantia de <strong>R$ {payment.amount.toFixed(2)}</strong> referente à mensalidade do plano <strong>{student.planName}</strong> para a academia <strong>{academyConfig.fantasyName || academyConfig.name}</strong>.
          </p>
        </div>

        {/* Payment Details Table */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Forma de Pagamento</span>
            <span className="font-bold text-slate-900">{payment.paymentMethod || 'PIX / Transferência'}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Data do Pagamento</span>
            <span className="font-bold text-slate-900">
              {payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Validation QR Code & Signatures */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-slate-900 text-white p-1 rounded-lg flex flex-col items-center justify-center text-[9px] font-mono text-center">
              <QrCode className="w-8 h-8 text-amber-400 mb-0.5" />
              <span>BJJ-VERIFY</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold block">Autenticação Digital</span>
              <span className="text-[9px] font-mono text-slate-400 block">HASH: {student.qrCodeToken}</span>
              <span className="text-[9px] text-emerald-700 font-semibold block">✓ Autenticado via BJJCRON</span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="w-48 border-b border-slate-900 h-6"></div>
            <p className="font-bold text-xs text-slate-900">{academyConfig.headCoachName || 'Depto. Financeiro'}</p>
            <p className="text-[10px] text-slate-500">Gestão de Caixas BJJCRON</p>
          </div>
        </div>

      </div>
    </div>
  );
};
