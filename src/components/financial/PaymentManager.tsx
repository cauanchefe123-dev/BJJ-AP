import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { PaymentRecord, Student, BillingType } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import {
  CreditCard,
  Search,
  QrCode,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Plus,
  DollarSign,
  Shield,
  Users,
  Lock,
  Trash2,
  Calendar,
  Check,
  X,
  Sparkles,
  Tag,
  Star,
  Award
} from 'lucide-react';

interface PaymentManagerProps {
  onOpenPixModal: (payment: PaymentRecord) => void;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({ onOpenPixModal }) => {
  const { payments, students, markPaymentAsPaid, addPayment, updatePayment, deletePayment, updateStudent } = useData();
  const { currentUser } = useAuth();

  const isStudentUser = currentUser?.role === 'ALUNO';

  // Tabs: 'PAYMENTS' (Lançamentos) or 'MODALITIES' (Classificação dos Atletas)
  const [activeSubTab, setActiveSubTab] = useState<'PAYMENTS' | 'MODALITIES'>('PAYMENTS');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modalityFilter, setModalityFilter] = useState<'ALL' | BillingType>('ALL');

  // New Payment Modal State
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [paymentModality, setPaymentModality] = useState<BillingType>('MENSALIDADE');
  const [paymentAmount, setPaymentAmount] = useState<number>(240);
  const [paymentRefMonth, setPaymentRefMonth] = useState(() => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [paymentDueDate, setPaymentDueDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 10).toISOString().split('T')[0];
  });
  const [paymentInitialStatus, setPaymentInitialStatus] = useState<'PENDENTE' | 'PAGO'>('PENDENTE');
  const [paymentNotes, setPaymentNotes] = useState('');

  // Payment Method Modal for marking paid
  const [markingPayment, setMarkingPayment] = useState<PaymentRecord | null>(null);

  // Success toast feedback for modality changes
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const currentStudent = students.find(
    s => s.id === currentUser?.studentId || s.email.toLowerCase() === currentUser?.email.toLowerCase()
  );

  // Filter payments
  const filteredPayments = payments.filter(p => {
    if (isStudentUser) {
      if (p.studentId !== currentStudent?.id) return false;
    }

    const student = students.find(s => s.id === p.studentId);
    const itemModality: BillingType = p.billingType || student?.billingType || 'MENSALIDADE';

    const matchesSearch =
      p.studentName.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceMonth.toLowerCase().includes(search.toLowerCase()) ||
      (student?.registrationNumber && student.registrationNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    const matchesModality = modalityFilter === 'ALL' || itemModality === modalityFilter;

    return matchesSearch && matchesStatus && matchesModality;
  });

  // Filter students for Modality tab
  const filteredStudents = students.filter(s => {
    const sModality: BillingType = s.billingType || 'MENSALIDADE';
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registrationNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());

    const matchesModality = modalityFilter === 'ALL' || sModality === modalityFilter;
    return matchesSearch && matchesModality;
  });

  // KPI Calculations
  const totalPaid = payments.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'PENDENTE').reduce((acc, p) => acc + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'ATRASADO').reduce((acc, p) => acc + p.amount, 0);

  // Modality Counts
  const countMensalidade = students.filter(s => (s.billingType || 'MENSALIDADE') === 'MENSALIDADE').length;
  const countPersonal = students.filter(s => s.billingType === 'PERSONAL').length;
  const countBolsista = students.filter(s => s.billingType === 'BOLSISTA').length;

  const handleWhatsAppReminder = (p: PaymentRecord) => {
    const student = students.find(s => s.id === p.studentId);
    if (!student || !student.phone) return;

    if (student.billingType === 'BOLSISTA') {
      alert('Este aluno está classificado como Bolsista e possui isenção de mensalidade.');
      return;
    }

    const text = `Olá, ${p.studentName}! Lembramos que a mensalidade de Jiu-Jitsu referente a ${p.referenceMonth} (R$ ${p.amount.toFixed(2)}) venceu/vence em ${new Date(p.dueDate).toLocaleDateString('pt-BR')}. Chave PIX da academia disponível no BJJCRON. Oss!`;
    const cleanPhone = student.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleQuickChangeModality = (student: Student, newModality: BillingType) => {
    const updates: Partial<Student> = {
      billingType: newModality,
    };
    if (newModality === 'BOLSISTA') {
      updates.planPrice = 0;
    } else if (newModality === 'MENSALIDADE' && student.planPrice === 0) {
      updates.planPrice = 240;
    } else if (newModality === 'PERSONAL' && student.planPrice === 0) {
      updates.planPrice = 350;
    }

    updateStudent(student.id, updates);
    const label = newModality === 'MENSALIDADE' ? 'Mensalidade Padrão' : newModality === 'PERSONAL' ? 'Personal Trainer' : 'Bolsista (Isento)';
    showFeedback(`Modalidade de ${student.name} alterada para ${label} com sucesso!`);
  };

  const handleOpenAddPayment = () => {
    if (students.length > 0) {
      const first = students[0];
      setSelectedStudentId(first.id);
      const mod = first.billingType || 'MENSALIDADE';
      setPaymentModality(mod);
      setPaymentAmount(mod === 'BOLSISTA' ? 0 : (first.planPrice || 240));
    }
    setIsAddPaymentModalOpen(true);
  };

  const handleStudentSelectInModal = (stId: string) => {
    setSelectedStudentId(stId);
    const st = students.find(s => s.id === stId);
    if (st) {
      const mod = st.billingType || 'MENSALIDADE';
      setPaymentModality(mod);
      setPaymentAmount(mod === 'BOLSISTA' ? 0 : (st.planPrice || 240));
    }
  };

  const handleCreatePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    addPayment({
      studentId: student.id,
      studentName: student.name,
      amount: paymentAmount,
      dueDate: paymentDueDate,
      status: paymentInitialStatus,
      referenceMonth: paymentRefMonth,
      billingType: paymentModality,
      notes: paymentNotes || undefined,
      paymentDate: paymentInitialStatus === 'PAGO' ? new Date().toISOString() : undefined,
    });

    setIsAddPaymentModalOpen(false);
    showFeedback(`Lançamento financeiro adicionado para ${student.name}!`);
  };

  const getModalityBadge = (type?: BillingType) => {
    switch (type) {
      case 'PERSONAL':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 w-fit">
            <Star className="w-3 h-3 text-purple-400" />
            Personal
          </span>
        );
      case 'BOLSISTA':
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <Award className="w-3 h-3 text-emerald-400" />
            Bolsista (Isento)
          </span>
        );
      case 'MENSALIDADE':
      default:
        return (
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            <Tag className="w-3 h-3 text-blue-400" />
            Mensalidade
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Confidentiality Reminder Banner for Admins */}
      {!isStudentUser && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 text-white flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-100 flex items-center gap-2">
                Classificação Financeira Confidencial
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  🔒 Oculto para o Aluno
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                A indicação se o atleta é <strong>Mensalista</strong>, <strong>Personal</strong> ou <strong>Bolsista</strong> é de uso exclusivo da academia e jamais é mostrada ao aluno.
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddPayment}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
            <span className="sm:hidden">Lançar</span>
          </button>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">Total Recebido no Mês</span>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500">Mensalidades e pagamentos confirmados</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">A Receber (A Vencer)</span>
          <p className="text-2xl font-black text-amber-400 font-mono">
            R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-slate-500">Aguardando vencimento no período</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-1 shadow-lg">
          <span className="text-xs font-bold text-slate-400 block">Em Atraso (Inadimplência)</span>
          <p className="text-2xl font-black text-rose-400 font-mono">
            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-rose-400">Cobrança pendente de quitação</p>
        </div>
      </div>

      {/* Modality Breakdown Pills (Admin only) */}
      {!isStudentUser && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            Distribuição de Atletas:
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setModalityFilter('MENSALIDADE');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                modalityFilter === 'MENSALIDADE'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-slate-950 text-blue-300 border border-blue-500/30 hover:bg-slate-800'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Mensalidade:</span>
              <span className="font-mono font-black">{countMensalidade}</span>
            </button>

            <button
              onClick={() => {
                setModalityFilter('PERSONAL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                modalityFilter === 'PERSONAL'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-slate-950 text-purple-300 border border-purple-500/30 hover:bg-slate-800'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Personal:</span>
              <span className="font-mono font-black">{countPersonal}</span>
            </button>

            <button
              onClick={() => {
                setModalityFilter('BOLSISTA');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                modalityFilter === 'BOLSISTA'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-emerald-300 border border-emerald-500/30 hover:bg-slate-800'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>Bolsistas (Isentos):</span>
              <span className="font-mono font-black">{countBolsista}</span>
            </button>

            {modalityFilter !== 'ALL' && (
              <button
                onClick={() => setModalityFilter('ALL')}
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 underline font-semibold cursor-pointer"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* SubTab Navigation: Lançamentos vs Classificação de Atletas */}
      {!isStudentUser && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveSubTab('PAYMENTS')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'PAYMENTS'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4 text-amber-400" />
            Cobranças & Pagamentos
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-300 border border-slate-800">
              {filteredPayments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('MODALITIES')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'MODALITIES'
                ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400" />
            Classificação dos Atletas
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 text-slate-300 border border-slate-800">
              {students.length}
            </span>
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por atleta, matrícula ou mês..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {activeSubTab === 'PAYMENTS' && (
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="ALL">Todos os Status</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
              <option value="ATRASADO">Atrasado</option>
            </select>
          </div>
        )}

        {!isStudentUser && (
          <div className={activeSubTab === 'PAYMENTS' ? 'sm:col-span-3' : 'sm:col-span-6'}>
            <select
              value={modalityFilter}
              onChange={e => setModalityFilter(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="ALL">Todas as Modalidades</option>
              <option value="MENSALIDADE">🥋 Mensalidade Padrão</option>
              <option value="PERSONAL">⭐ Personal Trainer</option>
              <option value="BOLSISTA">🎖️ Bolsista (Isento)</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: PAYMENTS TABLE */}
      {activeSubTab === 'PAYMENTS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Atleta</th>
                  {!isStudentUser && <th className="py-3.5 px-4">Modalidade</th>}
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
                    <td colSpan={isStudentUser ? 6 : 7} className="py-10 text-center text-slate-500">
                      Nenhum registro financeiro encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => {
                    const student = students.find(s => s.id === p.studentId);
                    const mod: BillingType = p.billingType || student?.billingType || 'MENSALIDADE';
                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={getStudentAvatar(student)}
                              alt={p.studentName}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 bg-slate-950"
                            />
                            <div>
                              <p className="font-bold text-slate-100">{p.studentName}</p>
                              <span className="text-[10px] text-amber-400 font-mono">
                                {student?.registrationNumber || 'Matrícula'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Modalidade (Hidden from students) */}
                        {!isStudentUser && (
                          <td className="py-3.5 px-4">
                            {getModalityBadge(mod)}
                          </td>
                        )}

                        <td className="py-3.5 px-4 font-semibold text-slate-200">
                          {p.referenceMonth}
                        </td>

                        <td className="py-3.5 px-4 font-bold text-emerald-400 font-mono">
                          {p.amount === 0 ? (
                            <span className="text-slate-400">R$ 0,00 (Isento)</span>
                          ) : (
                            `R$ ${p.amount.toFixed(2)}`
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-300">
                          {new Date(p.dueDate).toLocaleDateString('pt-BR')}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.status === 'PAGO'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : p.status === 'PENDENTE'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== 'PAGO' && (
                              <>
                                <button
                                  onClick={() => setMarkingPayment(p)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition-all active:scale-95"
                                  title="Marcar como Pago"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Baixar
                                </button>

                                <button
                                  onClick={() => onOpenPixModal(p)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  PIX
                                </button>

                                {mod !== 'BOLSISTA' && (
                                  <button
                                    onClick={() => handleWhatsAppReminder(p)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Lembrete WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Cobrar
                                  </button>
                                )}
                              </>
                            )}

                            {p.status === 'PAGO' && (
                              <span className="text-[10px] text-slate-400 font-semibold">
                                Quitado em {p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('pt-BR') : 'no prazo'} ({p.paymentMethod || 'PIX'})
                              </span>
                            )}

                            {!isStudentUser && (
                              <button
                                onClick={() => {
                                  if (confirm(`Deseja remover este lançamento de ${p.studentName}?`)) {
                                    deletePayment(p.id);
                                    showFeedback('Lançamento removido com sucesso.');
                                  }
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Excluir lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
      )}

      {/* VIEW 2: ATHLETE MODALITIES MANAGEMENT (ADMIN/PROFESSOR ONLY) */}
      {!isStudentUser && activeSubTab === 'MODALITIES' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-black text-sm text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  Gerenciador de Modalidades dos Atletas
                </h3>
                <p className="text-xs text-slate-400">
                  Alterne entre <strong>Mensalidade</strong>, <strong>Personal</strong> ou <strong>Bolsista</strong> diretamente nesta tabela com um clique.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>Total: <strong>{filteredStudents.length} atletas</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Atleta</th>
                    <th className="py-3.5 px-4">Graduação</th>
                    <th className="py-3.5 px-4 text-center">Modalidade Financeira (Selecione)</th>
                    <th className="py-3.5 px-4">Valor Mensal</th>
                    <th className="py-3.5 px-4">Dia Venc.</th>
                    <th className="py-3.5 px-4 text-center">Status Confidencial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        Nenhum atleta encontrado para a busca ou filtro selecionado.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const currentMod: BillingType = student.billingType || 'MENSALIDADE';
                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition-all">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={getStudentAvatar(student)}
                                alt={student.name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-950"
                              />
                              <div>
                                <p className="font-bold text-slate-100">{student.name}</p>
                                <span className="text-[10px] text-amber-400 font-mono">
                                  {student.registrationNumber}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <BeltBadge belt={student.belt} stripes={student.stripes} size="sm" />
                          </td>

                          {/* Interactive Segmented Selector for Modality */}
                          <td className="py-3 px-4">
                            <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1">
                              <button
                                onClick={() => handleQuickChangeModality(student, 'MENSALIDADE')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  currentMod === 'MENSALIDADE'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                                title="Atleta pagante regular da mensalidade"
                              >
                                <Tag className="w-3 h-3" />
                                Mensalidade
                              </button>

                              <button
                                onClick={() => handleQuickChangeModality(student, 'PERSONAL')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  currentMod === 'PERSONAL'
                                    ? 'bg-purple-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                                title="Aulas particulares / Personal Trainer"
                              >
                                <Star className="w-3 h-3" />
                                Personal
                              </button>

                              <button
                                onClick={() => handleQuickChangeModality(student, 'BOLSISTA')}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  currentMod === 'BOLSISTA'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                                }`}
                                title="Atleta patrocinado / bolsista isento"
                              >
                                <Award className="w-3 h-3" />
                                Bolsista
                              </button>
                            </div>
                          </td>

                          {/* Plan Price */}
                          <td className="py-3 px-4 font-bold font-mono">
                            {currentMod === 'BOLSISTA' ? (
                              <span className="text-emerald-400 font-bold">R$ 0,00 (Isento)</span>
                            ) : (
                              <span className="text-slate-100">
                                R$ {(student.planPrice ?? 240).toFixed(2)}
                              </span>
                            )}
                          </td>

                          {/* Due Date Day */}
                          <td className="py-3 px-4 font-semibold text-slate-300">
                            Dia {student.paymentDueDateDay || 10}
                          </td>

                          {/* Confidential Status Badge */}
                          <td className="py-3 px-4 text-center">
                            {currentMod === 'BOLSISTA' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Bolsa 100% Isento
                              </span>
                            ) : currentMod === 'PERSONAL' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Particular
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                Mensalista Ativo
                              </span>
                            )}
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
      )}

      {/* MODAL: NOVO LANÇAMENTO FINANCEIRO */}
      {isAddPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg text-white space-y-5 shadow-2xl relative animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
              <div>
                <h3 className="font-black text-base text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-amber-400" />
                  Novo Lançamento Financeiro
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Gere uma cobrança ou registre um pagamento para qualquer atleta.
                </p>
              </div>
              <button
                onClick={() => setIsAddPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePaymentSubmit} className="space-y-4">
              {/* Select Student */}
              <div>
                <label className="text-slate-300 font-bold block text-xs mb-1.5">
                  Selecione o Atleta *
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => handleStudentSelectInModal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.registrationNumber}) - {s.billingType || 'MENSALIDADE'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modality Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold block text-xs">Modalidade do Lançamento</label>
                  <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Confidencial
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModality('MENSALIDADE');
                      if (paymentAmount === 0) setPaymentAmount(240);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center gap-1 ${
                      paymentModality === 'MENSALIDADE'
                        ? 'bg-blue-600/30 border-blue-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Tag className="w-4 h-4 text-blue-400" />
                    <span>Mensalidade</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModality('PERSONAL');
                      if (paymentAmount === 0) setPaymentAmount(350);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center gap-1 ${
                      paymentModality === 'PERSONAL'
                        ? 'bg-purple-600/30 border-purple-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Star className="w-4 h-4 text-purple-400" />
                    <span>Personal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModality('BOLSISTA');
                      setPaymentAmount(0);
                      setPaymentInitialStatus('PAGO');
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer flex flex-col items-center gap-1 ${
                      paymentModality === 'BOLSISTA'
                        ? 'bg-emerald-600/30 border-emerald-500 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Bolsista</span>
                  </button>
                </div>
              </div>

              {/* Amount and Ref Month */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block text-xs mb-1.5">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                  {paymentModality === 'BOLSISTA' && (
                    <span className="text-[10px] text-emerald-400 mt-1 block">
                      ✓ Bolsista: Isento (R$ 0,00)
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-slate-300 font-bold block text-xs mb-1.5">
                    Mês de Referência *
                  </label>
                  <input
                    type="text"
                    placeholder="MM/AAAA (ex: 09/2026)"
                    value={paymentRefMonth}
                    onChange={e => setPaymentRefMonth(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Due Date & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block text-xs mb-1.5">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={paymentDueDate}
                    onChange={e => setPaymentDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block text-xs mb-1.5">
                    Status Inicial *
                  </label>
                  <select
                    value={paymentInitialStatus}
                    onChange={e => setPaymentInitialStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="PENDENTE">Aguardando Pagamento (Pendente)</option>
                    <option value="PAGO">Já Quitado (Pago)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-slate-300 font-bold block text-xs mb-1.5">
                  Observações Internas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bolsa parcial de competição, personal aos sábados..."
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BAIXA MANUAL DE PAGAMENTO */}
      {markingPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-white space-y-4 shadow-2xl relative animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Confirmar Quitação
              </h3>
              <button
                onClick={() => setMarkingPayment(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Confirmar o pagamento de <strong>R$ {markingPayment.amount.toFixed(2)}</strong> de{' '}
              <strong>{markingPayment.studentName}</strong> ref. a {markingPayment.referenceMonth}?
            </p>

            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-slate-400 block">Forma de Pagamento:</span>
              <div className="grid grid-cols-2 gap-2">
                {(['PIX', 'CARTAO', 'DINHEIRO', 'BOLETO'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      markPaymentAsPaid(markingPayment.id, method);
                      setMarkingPayment(null);
                      showFeedback(`Pagamento de ${markingPayment.studentName} confirmado via ${method}!`);
                    }}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
