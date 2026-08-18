import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import { UserCheck, Calendar, CheckCircle2, Trash2, Search, Filter, Clock, Sparkles, QrCode } from 'lucide-react';

interface AttendanceManagerProps {
  onOpenCheckin: () => void;
}

export const AttendanceManager: React.FC<AttendanceManagerProps> = ({ onOpenCheckin }) => {
  const { attendances, students, classes, removeAttendance } = useData();
  const { currentUser } = useAuth();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [dateFilterMode, setDateFilterMode] = useState<'SELECTED' | 'ALL'>('SELECTED');
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  const currentStudent = students.find(s => s.id === currentUser?.studentId || s.email.toLowerCase() === currentUser?.email.toLowerCase());

  const filteredAttendances = attendances.filter(a => {
    // Student view isolation
    if (currentUser?.role === 'ALUNO') {
      if (a.studentId !== currentStudent?.id) return false;
    }

    const matchesDate = dateFilterMode === 'ALL' || a.date === selectedDate;
    const matchesClass = selectedClass === 'ALL' || a.classId === selectedClass;
    const student = students.find(s => s.id === a.studentId);
    const studentName = student?.name || a.studentName;
    const matchesSearch = studentName.toLowerCase().includes(search.toLowerCase()) ||
                          a.className.toLowerCase().includes(search.toLowerCase());

    return matchesDate && matchesClass && matchesSearch;
  });

  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            Controle de Frequência & Presenças
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Acompanhe o histórico de chamadas, verifique quem marcou presença em cada data e gerencie o tatame.
          </p>
        </div>

        {isStaff && (
          <button
            onClick={onOpenCheckin}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            Registrar Presença
          </button>
        )}
      </div>

      {/* Date & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedDate(todayStr);
                setDateFilterMode('SELECTED');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                dateFilterMode === 'SELECTED' && selectedDate === todayStr
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Presenças de Hoje
            </button>

            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
                setDateFilterMode('SELECTED');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                dateFilterMode === 'SELECTED' && selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Ontem
            </button>

            <button
              onClick={() => setDateFilterMode('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                dateFilterMode === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todas as Datas
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-400">Data Especificada:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={e => {
                setSelectedDate(e.target.value);
                setDateFilterMode('SELECTED');
              }}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar aluno por nome..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="ALL">Todas as Turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Count */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
        <span className="text-slate-400">
          Visualizando <strong className="text-slate-100">{filteredAttendances.length}</strong> registro(s) {dateFilterMode === 'SELECTED' ? `de ${selectedDate.split('-').reverse().join('/')}` : 'no histórico completo'}:
        </span>
        <span className="text-emerald-400 font-extrabold bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20">
          ✓ {filteredAttendances.length} Presenças
        </span>
      </div>

      {/* Attendance Log List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Atleta</th>
                <th className="py-3.5 px-4">Turma / Aula</th>
                <th className="py-3.5 px-4">Data & Horário</th>
                <th className="py-3.5 px-4">Método</th>
                {isStaff && <th className="py-3.5 px-4 text-right">Ação</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredAttendances.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 5 : 4} className="py-12 text-center text-slate-500 space-y-1">
                    <p className="font-semibold text-xs">Nenhum registro de presença localizado para os filtros selecionados.</p>
                    <p className="text-[11px] text-slate-600">Selecione "Presenças de Hoje" ou escolha outra data no calendário.</p>
                  </td>
                </tr>
              ) : (
                filteredAttendances.map(a => {
                  const student = students.find(s => s.id === a.studentId);
                  const avatar = student ? getStudentAvatar(student) : '/avatar-placeholder.png';

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img src={avatar} alt={a.studentName} className="w-9 h-9 rounded-full object-cover border border-amber-500/40 bg-slate-950 shrink-0" />
                          <div>
                            <p className="font-bold text-slate-100">{student?.name || a.studentName}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {student && <BeltBadge belt={student.belt} stripes={student.stripes} size="sm" />}
                              <span className="text-[10px] text-amber-400 font-mono">#{student?.registrationNumber || 'ATLETA'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-200">
                        {a.className}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-200 block">{a.date ? a.date.split('-').reverse().join('/') : new Date(a.timestamp).toLocaleDateString('pt-BR')}</span>
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                          ✓ {a.method === 'QR_CODE_STUDENT' || a.method === 'QR_CODE_TEACHER' ? 'Via QR Code' : 'Chamada Presencial'}
                        </span>
                      </td>

                      {isStaff && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => removeAttendance(a.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all cursor-pointer"
                            title="Excluir Presença"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
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

