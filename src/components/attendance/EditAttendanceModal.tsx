import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar } from '../../constants/avatar';
import { X, Calendar, Clock, UserCheck, CheckCircle2, AlertCircle, Save, Trash2, Edit3 } from 'lucide-react';

interface EditAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendance: AttendanceRecord | null;
}

export const EditAttendanceModal: React.FC<EditAttendanceModalProps> = ({
  isOpen,
  onClose,
  attendance,
}) => {
  const { students, classes, updateAttendance, removeAttendance } = useData();
  const { currentUser } = useAuth();

  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [method, setMethod] = useState<'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER'>('MANUAL');
  const [verifiedBy, setVerifiedBy] = useState('');
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isTeacherOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  useEffect(() => {
    if (attendance) {
      setStudentId(attendance.studentId || '');
      setClassId(attendance.classId || '');
      
      let dateVal = attendance.date;
      if (!dateVal && attendance.timestamp) {
        dateVal = attendance.timestamp.split('T')[0];
      }
      setDate(dateVal || new Date().toISOString().split('T')[0]);

      if (attendance.timestamp && attendance.timestamp.includes('T')) {
        const timePart = attendance.timestamp.split('T')[1]?.slice(0, 5);
        setTime(timePart || '19:00');
      } else {
        setTime('19:00');
      }

      setMethod(attendance.method || 'MANUAL');
      setVerifiedBy(attendance.verifiedBy || currentUser?.name || 'Professor');
      setFeedback(null);
      setIsDeleting(false);
    }
  }, [attendance, currentUser]);

  if (!isOpen || !attendance || !isTeacherOrAdmin) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setFeedback({ success: false, message: 'Selecione um atleta para a presença.' });
      return;
    }
    if (!date) {
      setFeedback({ success: false, message: 'Informe a data da presença.' });
      return;
    }

    const selectedStudent = students.find(s => s.id === studentId);
    const selectedClass = classes.find(c => c.id === classId);

    const fullTimestamp = new Date(`${date}T${time || '12:00'}:00`).toISOString();

    updateAttendance(attendance.id, {
      studentId,
      studentName: selectedStudent ? selectedStudent.name : attendance.studentName,
      classId: selectedClass ? selectedClass.id : classId,
      className: selectedClass ? selectedClass.title : attendance.className,
      date,
      timestamp: fullTimestamp,
      method,
      verifiedBy: verifiedBy.trim() || currentUser?.name || 'Professor',
    });

    setFeedback({
      success: true,
      message: 'Presença atualizada com sucesso no banco de dados!',
    });

    setTimeout(() => {
      onClose();
    }, 900);
  };

  const handleDelete = () => {
    removeAttendance(attendance.id);
    onClose();
  };

  const selectedStudentObj = students.find(s => s.id === studentId);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                Alterar Presença do Aluno
              </h3>
              <p className="text-xs text-amber-400 font-medium">
                Controle exclusivo do Professor / Responsável
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

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
                feedback.success
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300'
              }`}
            >
              {feedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-bold">{feedback.message}</span>
            </div>
          )}

          {/* Student Selector */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Atleta / Aluno:
            </label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (#{s.registrationNumber}) - Faixa {s.belt}
                </option>
              ))}
            </select>
          </div>

          {selectedStudentObj && (
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center gap-3">
              <img
                src={getStudentAvatar(selectedStudentObj)}
                alt={selectedStudentObj.name}
                className="w-9 h-9 rounded-full object-cover border border-amber-500/40"
              />
              <div className="text-xs">
                <p className="font-bold text-slate-100">{selectedStudentObj.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <BeltBadge belt={selectedStudentObj.belt} stripes={selectedStudentObj.stripes} size="sm" />
                  <span className="text-[10px] text-slate-400 font-mono">#{selectedStudentObj.registrationNumber}</span>
                </div>
              </div>
            </div>
          )}

          {/* Date & Quick Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Data da Presença:
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDate(todayStr)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    date === todayStr ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    setDate(d.toISOString().split('T')[0]);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                >
                  Ontem
                </button>
              </div>
            </div>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              required
            />
          </div>

          {/* Time & Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Horário do Treino:
              </label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Turma / Categoria:
              </label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.time})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Method & Verifier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Método de Registro:
              </label>
              <select
                value={method}
                onChange={e => setMethod(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="MANUAL">Chamada Presencial</option>
                <option value="QR_CODE_STUDENT">QR Code (Aluno)</option>
                <option value="QR_CODE_TEACHER">QR Code (Tatame)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Lançado / Verificado por:
              </label>
              <input
                type="text"
                value={verifiedBy}
                onChange={e => setVerifiedBy(e.target.value)}
                placeholder="Ex: Professor Cauan"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Delete Danger Section */}
          {isDeleting ? (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl space-y-2">
              <p className="text-xs font-bold text-rose-300">
                Tem certeza que deseja excluir este registro de presença?
              </p>
              <p className="text-[11px] text-rose-400/80">
                A contagem de treinos do atleta será recalculada automaticamente no banco de dados.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer transition-all"
                >
                  Sim, Excluir Registro
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 font-bold cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir esta Presença
              </button>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
