import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import { X, Calendar, UserCheck, Search, Filter, Clock, QrCode, CheckCircle2, Users } from 'lucide-react';

interface DailyAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
}

export const DailyAttendanceModal: React.FC<DailyAttendanceModalProps> = ({
  isOpen,
  onClose,
  initialDate,
}) => {
  const { attendances, students, classes } = useData();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('ALL');

  if (!isOpen) return null;

  // Filter attendances by selected date and class/search
  const dayAttendances = attendances.filter(a => a.date === selectedDate);

  const filtered = dayAttendances.filter(a => {
    const matchesClass = selectedClassId === 'ALL' || a.classId === selectedClassId;
    const student = students.find(s => s.id === a.studentId);
    const nameToMatch = student?.name || a.studentName;
    const matchesSearch = nameToMatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.className.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const formattedDateDisplay = (() => {
    try {
      const [year, month, day] = selectedDate.split('-');
      const d = new Date(Number(year), Number(month) - 1, Number(day));
      return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  })();

  const isToday = selectedDate === todayStr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                Presenças Registradas do Dia
              </h3>
              <p className="text-xs text-slate-400 capitalize">
                {formattedDateDisplay} {isToday && <span className="text-emerald-400 font-bold ml-1">(Hoje)</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters and Date Bar */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isToday
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Ontem
              </button>
            </div>

            {/* Custom Date Input */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Search Student */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome de atleta..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Class Filter */}
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Todas as Turmas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Total Badge Summary */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Total de presenças em <strong className="text-slate-200">{selectedDate.split('-').reverse().join('/')}</strong>:
          </span>
          <span className="font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            {dayAttendances.length} {dayAttendances.length === 1 ? 'Atleta Presente' : 'Atletas Presentes'}
          </span>
        </div>

        {/* Student Attendance List */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2 min-h-[250px]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
              <p className="text-xs font-semibold">Nenhum check-in registrado para esta data/filtro.</p>
              <p className="text-[11px] text-slate-600">Selecione outra data ou busque por outro nome de aluno.</p>
            </div>
          ) : (
            filtered.map(a => {
              const student = students.find(s => s.id === a.studentId);
              const studentAvatar = student ? getStudentAvatar(student) : undefined;

              return (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={studentAvatar || '/avatar-placeholder.png'}
                      alt={a.studentName}
                      className="w-10 h-10 rounded-full object-cover border border-amber-500/40 bg-slate-900 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-100 truncate">{a.studentName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {student && (
                          <BeltBadge belt={student.belt} stripes={student.stripes} size="sm" />
                        )}
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-medium">
                          {a.className}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                      <Clock className="w-3 h-3" />
                      {a.timestamp ? new Date(a.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block font-medium">
                      {a.method === 'QR_CODE_STUDENT' || a.method === 'QR_CODE_TEACHER' ? '✓ Via QR Code' : '✓ Chamada Presencial'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
