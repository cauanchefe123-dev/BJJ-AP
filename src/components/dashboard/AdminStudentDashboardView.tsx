import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { StudentDashboard } from './StudentDashboard';
import { Users, Search, GraduationCap, ArrowRight } from 'lucide-react';

interface AdminStudentDashboardViewProps {
  onNavigate: (tab: string) => void;
  onOpenPixModal?: (paymentId: string) => void;
  onOpenEditModal?: (student: any) => void;
}

export const AdminStudentDashboardView: React.FC<AdminStudentDashboardViewProps> = ({
  onNavigate,
  onOpenPixModal,
  onOpenEditModal,
}) => {
  const { students } = useData();
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    students.length > 0 ? students[0].id : ''
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.belt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];

  return (
    <div className="space-y-6">
      {/* Selector Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
              <GraduationCap className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
                Dashboard dos Alunos
                <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Modo Gestão (Admin)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Como responsável pela academia, visualize o painel individual e histórico completo de qualquer aluno.
              </p>
            </div>
          </div>

          {/* Student Selector Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar aluno por nome..."
                className="pl-9 pr-3 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-semibold focus:outline-none focus:border-amber-500 w-full sm:w-48"
              />
            </div>

            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-none focus:border-amber-500 min-w-[220px]"
            >
              {filteredStudents.length > 0 ? (
                filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} — Faixa {s.belt}
                  </option>
                ))
              ) : (
                <option value="">Nenhum aluno encontrado</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Render selected student dashboard */}
      {activeStudent ? (
        <StudentDashboard
          onNavigate={onNavigate}
          onOpenPixModal={onOpenPixModal}
          onOpenEditModal={onOpenEditModal}
          selectedStudentId={activeStudent.id}
        />
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-500 opacity-50" />
          <p className="font-bold text-slate-300">Nenhum aluno matriculado ou encontrado na busca.</p>
        </div>
      )}
    </div>
  );
};
