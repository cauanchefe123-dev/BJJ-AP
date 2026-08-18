import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PaymentRecord, PaymentStatus } from '../../types';
import { CreditCard, Search, QrCode, AlertCircle, CheckCircle2, MessageSquare, Plus, DollarSign } from 'lucide-react';

interface PaymentManagerProps {
  onOpenPixModal: (payment: PaymentRecord) => void;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({ onOpenPixModal }) => {
  const { payments, students, markPaymentAsPaid, addPayment } = useData();
  const { currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const currentStudent = students.find(s => s.id === currentUser?.studentId || s.email.toLowerCase() === currentUser?.email.toLowerCase());

  const filteredPayments = payments.filter(p => {
    // Student view isolation
    if (currentUser?.role === 'ALUNO') {
      if (p.studentId !== currentStudent?.id) return false;
    }

    const matchesSearch = p.studentName.toLowerCase().includes(search.toLowerCase()) ||
                          p.referenceMonth.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPaid = payments.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDENTE').reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'ATRASADO').reduce((acc, p) => acc + p.amount, 0);

  const handleWhatsAppReminder = (p: PaymentRecord) => {
    const student = students.find(s => s.id === p.studentId);
    if (!student || !student.phone) return;

    const text = `Olá, ${p.studentName}! Lembramos que a mensalidade de Jiu-Jitsu referente a ${p.referenceMonth} (R$ ${p.amount.toFixed(2)}) venceu/vence em ${new Date(p.dueDate).toLocaleDateString('pt-BR')}. Chave PIX da academia disponível no BJJCRON. Oss!`;
    const cleanPhone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">Total Recebido no Mês</span>
          <p className="text-2xl font-black text-emerald-400">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500">Mensalidades confirmadas</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">A Receber (A Vencer)</span>
          <p className="text-2xl font-black text-amber-400">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500">Aguardando vencimento</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">Em Atraso (Inadimplência)</span>
          <p className="text-2xl font-black text-rose-400">
            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-rose-400">Cobrança pendente</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por atleta ou mês referência..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PAGO">Pago</option>
            <option value="PENDENTE">Pendente</option>
            <option value="ATRASADO">Atrasado</option>
          </select>
        </div>
      </div>

      {/* Payment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Atleta</th>
                <th className="py-3.5 px-4">Mês Ref.</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Vencimento</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Nenhum registro financeiro encontrado.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => {
                  const student = students.find(s => s.id === p.studentId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={student?.photoUrl} alt={p.studentName} className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <p className="font-bold text-slate-100">{p.studentName}</p>
                            <span className="text-[10px] text-amber-400 font-mono">{student?.registrationNumber}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {p.referenceMonth}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        R$ {p.amount.toFixed(2)}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'PAGO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          p.status === 'PENDENTE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {p.status !== 'PAGO' && (
                            <>
                              <button
                                onClick={() => onOpenPixModal(p)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                PIX
                              </button>

                              <button
                                onClick={() => handleWhatsAppReminder(p)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                                title="Lembrete WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Cobrar
                              </button>
                            </>
                          )}

                          {p.status === 'PAGO' && (
                            <span className="text-[10px] text-slate-500 font-semibold">
                              Quitado em {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('pt-BR') : 'no prazo'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
