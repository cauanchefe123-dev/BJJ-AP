import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { TeacherObservation } from '../../types';
import {
  MessageSquareQuote,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  UserCheck,
  Calendar,
  Sparkles,
  BookOpen,
  X,
  CheckCircle2,
  Award
} from 'lucide-react';

export const TeacherObservationsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { students, teacherObservations, addTeacherObservation, updateTeacherObservation, deleteTeacherObservation } = useData();

  const isTeacherOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  // Filters
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingObservationId, setEditingObservationId] = useState<string | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [category, setCategory] = useState<'TÉCNICA' | 'EVOLUÇÃO' | 'COMPORTAMENTO' | 'GERAL'>('TÉCNICA');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Find student ID associated with logged in student
  const currentStudentObj = students.find(
    s => s.id === currentUser?.studentId || (s.email && s.email.trim().toLowerCase() === currentUser?.email.trim().toLowerCase())
  );
  const currentStudentId = currentStudentObj?.id || currentUser?.studentId;

  // Filter observations
  const displayedObservations = teacherObservations.filter(obs => {
    // If student, only show observations for this student
    if (!isTeacherOrAdmin) {
      if (currentStudentId) {
        if (obs.studentId !== currentStudentId && obs.studentName !== currentUser?.name) return false;
      } else {
        if (obs.studentName?.toLowerCase() !== currentUser?.name.toLowerCase()) return false;
      }
    } else {
      // If teacher/admin filter by student dropdown
      if (selectedStudentFilter !== 'ALL' && obs.studentId !== selectedStudentFilter) {
        return false;
      }
    }

    // Category filter
    if (selectedCategoryFilter !== 'ALL' && obs.category !== selectedCategoryFilter) {
      return false;
    }

    // Text Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = obs.title.toLowerCase().includes(q);
      const matchContent = obs.content.toLowerCase().includes(q);
      const matchStudent = obs.studentName?.toLowerCase().includes(q);
      const matchTeacher = obs.teacherName.toLowerCase().includes(q);
      return matchTitle || matchContent || matchStudent || matchTeacher;
    }

    return true;
  });

  const handleOpenCreateModal = () => {
    setEditingObservationId(null);
    setTargetStudentId('');
    setCategory('TÉCNICA');
    setTitle('');
    setContent('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (obs: TeacherObservation) => {
    setEditingObservationId(obs.id);
    setTargetStudentId(obs.studentId);
    setCategory(obs.category);
    setTitle(obs.title);
    setContent(obs.content);
    setIsModalOpen(true);
  };

  const handleSubmitObservation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || !title.trim() || !content.trim()) return;

    const selectedStudent = students.find(s => s.id === targetStudentId);

    if (editingObservationId) {
      updateTeacherObservation(editingObservationId, {
        studentId: targetStudentId,
        studentName: selectedStudent ? selectedStudent.name : 'Aluno',
        title: title.trim(),
        content: content.trim(),
        category,
      });
      setSuccessMessage('Observação atualizada com sucesso!');
    } else {
      addTeacherObservation({
        studentId: targetStudentId,
        studentName: selectedStudent ? selectedStudent.name : 'Aluno',
        teacherId: currentUser?.id || 'tch-1',
        teacherName: currentUser?.name || 'Professor',
        title: title.trim(),
        content: content.trim(),
        category,
      });
      setSuccessMessage('Observação enviada com sucesso para o aluno!');
    }

    setTimeout(() => setSuccessMessage(null), 3000);

    // Reset Form
    setTitle('');
    setContent('');
    setTargetStudentId('');
    setEditingObservationId(null);
    setIsModalOpen(false);
  };

  const getCategoryBadge = (cat: 'TÉCNICA' | 'EVOLUÇÃO' | 'COMPORTAMENTO' | 'GERAL') => {
    switch (cat) {
      case 'TÉCNICA':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">Técnica</span>;
      case 'EVOLUÇÃO':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Evolução</span>;
      case 'COMPORTAMENTO':
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">Comportamento</span>;
      case 'GERAL':
      default:
        return <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">Geral</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <MessageSquareQuote className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                Observações do Professor
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {isTeacherOrAdmin
                  ? 'Cadastre avaliações, dicas técnicas e feedbacks de evolução para os seus alunos.'
                  : 'Acompanhe as observações, dicas técnicas e feedback deixados pelos seus professores.'}
              </p>
            </div>
          </div>

          {isTeacherOrAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nova Observação
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar observações..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedCategoryFilter}
              onChange={e => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todas Categoria</option>
              <option value="TÉCNICA">Técnica</option>
              <option value="EVOLUÇÃO">Evolução</option>
              <option value="COMPORTAMENTO">Comportamento</option>
              <option value="GERAL">Geral</option>
            </select>
          </div>

          {/* Student Filter (Only for Teachers/Admin) */}
          {isTeacherOrAdmin && (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <UserCheck className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedStudentFilter}
                onChange={e => setSelectedStudentFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer max-w-[180px] truncate"
              >
                <option value="ALL">Todos os Alunos</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.belt})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Observations Grid / List */}
      {displayedObservations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-200">Nenhuma observação encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isTeacherOrAdmin
              ? 'Nenhuma observação foi cadastrada para os filtros selecionados. Clique em "Nova Observação" para adicionar um feedback para um aluno.'
              : 'Seus professores ainda não registraram observações técnicas para a sua conta.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedObservations.map(obs => {
            const student = students.find(s => s.id === obs.studentId);
            return (
              <div
                key={obs.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-4 transition-all shadow-md relative group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(obs.category)}
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        {new Date(obs.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white pt-1">{obs.title}</h3>
                  </div>

                  {isTeacherOrAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(obs)}
                        title="Editar observação"
                        className="text-slate-500 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/10 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTeacherObservation(obs.id)}
                        title="Excluir observação"
                        className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950/30 transition-all opacity-70 group-hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Content */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                  {obs.content}
                </p>

                {/* Author & Recipient Info */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Prof: <strong className="text-slate-200">{obs.teacherName}</strong></span>
                  </div>

                  {isTeacherOrAdmin && (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Aluno: <strong className="text-slate-200">{student ? student.name : obs.studentName}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal to Add/Edit Observation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">
                  {editingObservationId ? 'Editar Observação do Professor' : 'Nova Observação do Professor'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitObservation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Selecione o Aluno *
                </label>
                <select
                  required
                  value={targetStudentId}
                  onChange={e => setTargetStudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Escolha um Aluno --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} - Faixa {s.belt} ({s.registrationNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Categoria da Observação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['TÉCNICA', 'EVOLUÇÃO', 'COMPORTAMENTO', 'GERAL'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        category === cat
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-xs'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Título do Feedback *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Ajuste na passagem de guarda emborcando"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Detalhes / Observação do Professor *
                </label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Escreva orientações técnicas, elogios pela constância, pontos de melhoria no rola, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
                >
                  {editingObservationId ? 'Salvar Alterações' : 'Enviar Observação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
