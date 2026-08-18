import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import {
  FileBarChart2,
  Users,
  CreditCard,
  Award,
  TrendingUp,
  Calendar,
  Download,
  FileText,
  Printer,
  Sparkles,
  Search,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  IdCard
} from 'lucide-react';
import { OfficialWaiverDocument } from './OfficialWaiverDocument';
import { OfficialReceiptDocument } from './OfficialReceiptDocument';
import { OfficialGraduationCertificate } from './OfficialGraduationCertificate';
import { DigitalMembershipCard } from '../card/DigitalMembershipCard';
import { Student, PaymentRecord } from '../../types';

export const ReportsView: React.FC = () => {
  const { students, payments, attendances, graduations, academyConfig } = useData();

  const [activeTab, setActiveTab] = useState<'executive' | 'waiver' | 'receipt' | 'certificate' | 'card'>('executive');
  
  // Selection states for documents
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(payments[0]?.id || '');

  const selectedStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const selectedPayment = payments.find(p => p.id === selectedPaymentId) || payments[0];

  // Calculated Real Dynamic Statistics
  const activeStudents = students.filter(s => s.active);
  const inactiveStudents = students.filter(s => !s.active);
  
  const paidPayments = payments.filter(p => p.status === 'PAGO');
  const pendingPayments = payments.filter(p => p.status === 'PENDENTE');
  const overduePayments = payments.filter(p => p.status === 'ATRASADO');

  const totalRevenuePaid = paidPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalRevenuePending = pendingPayments.reduce((acc, p) => acc + p.amount, 0);
  const totalRevenueOverdue = overduePayments.reduce((acc, p) => acc + p.amount, 0);

  const adimplenciaRate = payments.length > 0 
    ? Math.round((paidPayments.length / payments.length) * 100)
    : 100;

  const beltCounts: Record<string, number> = {
    BRANCA: students.filter(s => s.belt === 'BRANCA').length,
    AZUL: students.filter(s => s.belt === 'AZUL').length,
    ROXA: students.filter(s => s.belt === 'ROXA').length,
    MARROM: students.filter(s => s.belt === 'MARROM').length,
    PRETA: students.filter(s => s.belt === 'PRETA').length,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <FileBarChart2 className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-100">
              Central de Documentos & Relatórios Oficiais
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Geração de relatórios gerenciais, fichas de inscrição, recibos de pagamento e certificados de graduação timbrados.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab('executive')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'executive'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Relatório Gerencial
          </button>

          <button
            onClick={() => setActiveTab('waiver')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'waiver'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Ficha & Termo (Waiver)
          </button>

          <button
            onClick={() => setActiveTab('receipt')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'receipt'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Recibo Timbrado
          </button>

          <button
            onClick={() => setActiveTab('certificate')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'certificate'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            Certificado
          </button>

          <button
            onClick={() => setActiveTab('card')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'card'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <IdCard className="w-3.5 h-3.5" />
            Carteirinha
          </button>
        </div>
      </div>

      {/* TAB 1: EXECUTIVE DASHBOARD REPORT */}
      {activeTab === 'executive' && (
        <div className="space-y-6">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Alunos Matriculados</span>
                <Users className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-slate-100">{students.length}</div>
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">{activeStudents.length} Ativos</span>
                <span>•</span>
                <span className="text-rose-400 font-bold">{inactiveStudents.length} Inativos</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Receita Arrecadada</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                R$ {totalRevenuePaid.toFixed(2)}
              </div>
              <div className="text-[11px] text-slate-400">
                Pendente: <span className="text-amber-300 font-bold">R$ {totalRevenuePending.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Taxa de Adimplência</span>
                <CheckCircle className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-black text-blue-400">{adimplenciaRate}%</div>
              <div className="text-[11px] text-slate-400">
                Atrasados: <span className="text-rose-400 font-bold">{overduePayments.length} alunos</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-2">
              <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
                <span>Treinos Registrados</span>
                <Calendar className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300">{attendances.length}</div>
              <div className="text-[11px] text-slate-400">
                Frequência Total nos Tatames
              </div>
            </div>
          </div>

          {/* Detailed Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Belt Distribution Report */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Distribuição da Equipe por Faixa
                </h4>
                <span className="text-xs text-slate-400 font-mono">{students.length} Total</span>
              </div>

              <div className="space-y-3">
                {Object.entries(beltCounts).map(([belt, count]) => {
                  const percent = students.length > 0 ? Math.round((count / students.length) * 100) : 0;
                  return (
                    <div key={belt} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-300">Faixa {belt}</span>
                        <span className="text-slate-400">{count} atleta(s) ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            belt === 'BRANCA' ? 'bg-slate-200' :
                            belt === 'AZUL' ? 'bg-blue-500' :
                            belt === 'ROXA' ? 'bg-purple-500' :
                            belt === 'MARROM' ? 'bg-amber-800' :
                            'bg-rose-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Overview Detailed */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  Balanço das Mensalidades
                </h4>
                <button
                  onClick={() => window.print()}
                  className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Balanço
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Mensalidades Quitadas (Pago):</span>
                  <span className="font-bold text-emerald-400">R$ {totalRevenuePaid.toFixed(2)} ({paidPayments.length} registros)</span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Mensalidades Pendentes:</span>
                  <span className="font-bold text-amber-300">R$ {totalRevenuePending.toFixed(2)} ({pendingPayments.length} registros)</span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 font-medium">Mensalidades em Atraso:</span>
                  <span className="font-bold text-rose-400">R$ {totalRevenueOverdue.toFixed(2)} ({overduePayments.length} registros)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT WAIVER & ENROLLMENT DOCUMENT */}
      {activeTab === 'waiver' && (
        <div className="space-y-6">
          {/* Student Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 print:hidden">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Selecionar Atleta para a Ficha:
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none max-w-xs"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registrationNumber}) - {s.belt}
                </option>
              ))}
            </select>
          </div>

          {selectedStudent ? (
            <OfficialWaiverDocument student={selectedStudent} academyConfig={academyConfig} />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Nenhum aluno cadastrado.</div>
          )}
        </div>
      )}

      {/* TAB 3: OFFICIAL RECEIPT */}
      {activeTab === 'receipt' && (
        <div className="space-y-6">
          {/* Payment Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 print:hidden">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Selecionar Comprovante / Pagamento:
            </label>
            <select
              value={selectedPaymentId}
              onChange={e => setSelectedPaymentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none max-w-md"
            >
              {payments.map(p => (
                <option key={p.id} value={p.id}>
                  {p.studentName} - R$ {p.amount.toFixed(2)} ({p.referenceMonth}) - [{p.status}]
                </option>
              ))}
            </select>
          </div>

          {selectedPayment ? (
            <OfficialReceiptDocument
              payment={selectedPayment}
              student={students.find(s => String(s.id) === String(selectedPayment.studentId)) || selectedStudent}
              academyConfig={academyConfig}
            />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Nenhum pagamento encontrado.</div>
          )}
        </div>
      )}

      {/* TAB 4: GRADUATION CERTIFICATE */}
      {activeTab === 'certificate' && (
        <div className="space-y-6">
          {/* Student Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 print:hidden">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Selecionar Graduando para o Diploma:
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none max-w-xs"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.belt} ({s.stripes} Graus)
                </option>
              ))}
            </select>
          </div>

          {selectedStudent ? (
            <OfficialGraduationCertificate student={selectedStudent} academyConfig={academyConfig} />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Nenhum atleta cadastrado.</div>
          )}
        </div>
      )}

      {/* TAB 5: MEMBERSHIP CARD */}
      {activeTab === 'card' && (
        <div className="space-y-6">
          {/* Student Selector Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4 print:hidden">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <IdCard className="w-4 h-4 text-amber-400" />
              Selecionar Carteirinha de Atleta:
            </label>
            <select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none max-w-xs"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.registrationNumber})
                </option>
              ))}
            </select>
          </div>

          {selectedStudent ? (
            <DigitalMembershipCard student={selectedStudent} />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">Nenhum atleta cadastrado.</div>
          )}
        </div>
      )}
    </div>
  );
};
