import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { resolveStudentForUser } from '../../constants/avatar';
import { checkClassCheckinAvailability } from '../../utils/checkin';
import { UserCheck, CheckCircle2, AlertCircle, X, Search, Sparkles, Clock, Lock, Check } from 'lucide-react';

interface QRCodeCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeCheckinModal: React.FC<QRCodeCheckinModalProps> = ({ isOpen, onClose }) => {
  const { students, classes, recordAttendance, attendances } = useData();
  const { currentUser } = useAuth();

  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [inputToken, setInputToken] = useState('');
  const [feedback, setFeedback] = useState<{ success?: boolean; message?: string } | null>(null);
  const [teacherBypass, setTeacherBypass] = useState(false);

  if (!isOpen) return null;

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const availability = currentClass ? checkClassCheckinAvailability(currentClass) : null;
  const loggedInStudent = resolveStudentForUser(currentUser, students);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = loggedInStudent ? attendances.find(a => a.studentId === loggedInStudent.id && a.date === todayStr) : null;

  const handleCheckin = (tokenToUse?: string) => {
    const token = tokenToUse || inputToken.trim();
    
    // If student logged in and clicks check-in without token, use their own token/id
    const effectiveToken = token || (currentUser?.role === 'ALUNO' ? (loggedInStudent?.id || loggedInStudent?.registrationNumber) : '');

    if (!effectiveToken) {
      setFeedback({
        success: false,
        message: 'Por favor, informe o nome ou matrícula do atleta.',
      });
      return;
    }

    // Search student by registration number, id, token, or name match
    const cleanSearch = effectiveToken.toLowerCase();
    const found = students.find(
      s => s.id === effectiveToken ||
           s.registrationNumber.toLowerCase() === cleanSearch ||
           s.qrCodeToken.toLowerCase() === cleanSearch ||
           s.name.toLowerCase() === cleanSearch ||
           s.name.toLowerCase().includes(cleanSearch)
    );

    if (!found) {
      setFeedback({
        success: false,
        message: 'Atleta não localizado com essa matrícula ou nome.',
      });
      return;
    }

    const isTeacherRole = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';
    const method = currentUser?.role === 'ALUNO' ? 'QR_CODE_STUDENT' : 'MANUAL';
    const verifierName = currentUser?.name || 'Sistema';

    const res = recordAttendance(
      found.id,
      selectedClassId || currentClass?.id,
      method,
      verifierName,
      isTeacherRole && teacherBypass
    );

    setFeedback(res);
    if (res.success) {
      setInputToken('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">
              {currentUser?.role === 'ALUNO' ? 'Bater Frequência (Check-in)' : 'Registrar Presença na Aula'}
            </h3>
            <p className="text-xs text-slate-400">
              {currentUser?.role === 'ALUNO' ? 'Confirme sua presença no treino de hoje' : 'Chamada normal e confirmação de frequência'}
            </p>
          </div>
        </div>

        {/* Already Checked In Banner for Students */}
        {currentUser?.role === 'ALUNO' && todayAttendance && (
          <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-emerald-300">Presença Confirmada Hoje!</p>
              <p className="text-xs text-emerald-400/90 mt-0.5">
                Você já registrou sua presença na aula <strong>"{todayAttendance.className}"</strong> às {todayAttendance.timestamp ? new Date(todayAttendance.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}.
              </p>
            </div>
          </div>
        )}

        {/* Select Class */}
        <div>
          <label className="text-xs font-bold text-slate-300 block mb-1">
            Selecione a Turma / Aula:
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setFeedback(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:ring-2 focus:ring-amber-500 outline-none"
          >
            {classes.map(c => {
              const avail = checkClassCheckinAvailability(c);
              const tag = avail.isAvailable ? '🟢 Aberto' : avail.status === 'TOO_EARLY' ? `🔒 Abre às ${avail.opensAtStr}` : '❌ Indisponível';
              return (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.time}) - {tag}
                </option>
              );
            })}
          </select>
        </div>

        {/* Class Availability Banner */}
        {availability && (
          <div
            className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs font-medium ${
              availability.isAvailable
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : availability.status === 'TOO_EARLY'
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            {availability.isAvailable ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : availability.status === 'TOO_EARLY' ? (
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold text-xs">
                {availability.isAvailable
                  ? `Presença LIBERADA para ${currentClass?.title}`
                  : availability.status === 'TOO_EARLY'
                  ? `Liberado a partir das ${availability.opensAtStr}`
                  : 'Presença Bloqueada'}
              </p>
              <p className="text-[11px] opacity-90">
                {availability.isAvailable
                  ? `Janela de presença aberta até às ${availability.closesAtStr}.`
                  : availability.reason}
              </p>
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
              feedback.success
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
            }`}
          >
            {feedback.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{feedback.message}</p>
            </div>
          </div>
        )}

        {/* Self-service Student Check-in Button */}
        {currentUser?.role === 'ALUNO' && loggedInStudent && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2">
              <img
                src={loggedInStudent.photoUrl}
                alt={loggedInStudent.name}
                className="w-8 h-8 rounded-full object-cover border border-amber-400"
              />
              <span className="font-extrabold text-sm text-slate-100">{loggedInStudent.name}</span>
            </div>

            <button
              onClick={() => handleCheckin(loggedInStudent.id)}
              disabled={!availability?.isAvailable || !!todayAttendance}
              className={`w-full py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                todayAttendance
                  ? 'bg-emerald-800/50 text-emerald-300 border border-emerald-700/50 cursor-default'
                  : availability?.isAvailable
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 cursor-pointer active:scale-95'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              {todayAttendance
                ? '✓ Presença de Hoje já Gravada'
                : availability?.isAvailable
                ? 'Confirmar Minha Presença na Aula'
                : `Presença Bloqueada (Abre às ${availability?.opensAtStr})`}
            </button>
          </div>
        )}

        {/* Staff Option & Manual Search */}
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-300 font-medium">Lançamento Especial (Professor / Admin):</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={teacherBypass}
                  onChange={(e) => setTeacherBypass(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-[11px] text-amber-400 font-bold">Ignorar Horário</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Digitação de Nome ou Matrícula do Atleta:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex: Nome do aluno ou BJJ-2026-001"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckin()}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
                <button
                  onClick={() => handleCheckin()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>

            {/* Fast Quick Select Student list */}
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Lista de Atletas para Chamada Rápida:
              </span>
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {students.filter(s => s.active).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleCheckin(s.id)}
                    className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800/80 text-left text-xs text-slate-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <img src={s.photoUrl} alt={s.name} className="w-6 h-6 rounded-full object-cover" />
                      <span className="font-semibold">{s.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400">{s.registrationNumber}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

