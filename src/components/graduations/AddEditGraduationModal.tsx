import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltType, Graduation, Student } from '../../types';
import { BeltBadge } from '../belts/BeltBadge';
import { Award, X, Check, Calendar, User, FileText, Hash } from 'lucide-react';
import { getLocalDateStr } from '../../utils/dateUtils';

interface AddEditGraduationModalProps {
  isOpen: boolean;
  onClose: () => void;
  graduationToEdit?: Graduation | null;
  defaultStudent?: Student | null;
}

export const AddEditGraduationModal: React.FC<AddEditGraduationModalProps> = ({
  isOpen,
  onClose,
  graduationToEdit,
  defaultStudent,
}) => {
  const { currentUser } = useAuth();
  const { students, academyConfig, addGraduationRecord, updateGraduation } = useData();

  const [studentId, setStudentId] = useState<string>('');
  const [belt, setBelt] = useState<BeltType>('BRANCA');
  const [stripes, setStripes] = useState<number>(0);
  const [promotedBy, setPromotedBy] = useState<string>('');
  const [promotedAt, setPromotedAt] = useState<string>(getLocalDateStr());
  const [notes, setNotes] = useState<string>('');
  const [classesCountAtPromotion, setClassesCountAtPromotion] = useState<number>(0);
  const [certificateNumber, setCertificateNumber] = useState<string>('');

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'PROFESSOR';

  useEffect(() => {
    if (!isOpen) return;

    if (graduationToEdit) {
      setStudentId(graduationToEdit.studentId);
      setBelt(graduationToEdit.belt);
      setStripes(graduationToEdit.stripes);
      setPromotedBy(graduationToEdit.promotedBy || academyConfig.headCoachName);
      setPromotedAt(graduationToEdit.promotedAt || getLocalDateStr());
      setNotes(graduationToEdit.notes || '');
      setClassesCountAtPromotion(graduationToEdit.classesCountAtPromotion || 0);
      setCertificateNumber(graduationToEdit.certificateNumber || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      const initialStudent = defaultStudent || (students.length > 0 ? students[0] : null);
      if (initialStudent) {
        setStudentId(initialStudent.id);
        setBelt(initialStudent.belt);
        setStripes(initialStudent.stripes);
        setClassesCountAtPromotion(initialStudent.totalClassesAttended || 0);
      }
      setPromotedBy(academyConfig.headCoachName || 'Mestre Responsável');
      setPromotedAt(getLocalDateStr());
      setNotes('Graduação registrada no histórico.');
      setCertificateNumber(`CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [isOpen, graduationToEdit, defaultStudent, academyConfig.headCoachName]);

  if (!isOpen || !canManage) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;

    const selectedStudent = students.find(s => s.id === studentId);
    const studentName = selectedStudent?.name || defaultStudent?.name || 'Atleta';

    if (graduationToEdit) {
      updateGraduation(graduationToEdit.id, {
        studentId,
        studentName,
        belt,
        stripes: Number(stripes),
        promotedBy: promotedBy.trim() || academyConfig.headCoachName,
        promotedAt,
        notes: notes.trim(),
        classesCountAtPromotion: Number(classesCountAtPromotion),
        certificateNumber: certificateNumber.trim() || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } else {
      addGraduationRecord({
        studentId,
        studentName,
        belt,
        stripes: Number(stripes),
        promotedBy: promotedBy.trim() || academyConfig.headCoachName,
        promotedAt,
        notes: notes.trim() || 'Graduação histórica outorgada.',
        classesCountAtPromotion: Number(classesCountAtPromotion),
        certificateNumber: certificateNumber.trim() || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg text-slate-100">
              {graduationToEdit ? 'Editar Registro de Graduação' : 'Cadastrar Graduação Histórica'}
            </h3>
            <p className="text-xs text-slate-400">
              {graduationToEdit ? 'Atualize os dados e a outorga desta faixa' : 'Registre graduações anteriores e exames realizados'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Atleta:</label>
            <select
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                const st = students.find(s => s.id === e.target.value);
                if (st && !graduationToEdit) {
                  setClassesCountAtPromotion(st.totalClassesAttended || 0);
                }
              }}
              disabled={!!graduationToEdit}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-60"
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.belt} - {s.stripes}º Grau)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Faixa Outorgada:</label>
              <select
                value={belt}
                onChange={(e) => setBelt(e.target.value as BeltType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="BRANCA">Branca</option>
                <option value="CINZA">Cinza (Kids)</option>
                <option value="AMARELA">Amarela (Kids)</option>
                <option value="LARANJA">Laranja (Kids)</option>
                <option value="VERDE">Verde (Kids)</option>
                <option value="AZUL">Azul</option>
                <option value="ROXA">Roxa</option>
                <option value="MARROM">Marrom</option>
                <option value="PRETA">Preta</option>
                <option value="VERMELHA E PRETA">Vermelha e Preta (Coral)</option>
                <option value="VERMELHA E BRANCA">Vermelha e Branca</option>
                <option value="VERMELHA">Vermelha (Grande Mestre)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Graus (Stripes):</label>
              <select
                value={stripes}
                onChange={(e) => setStripes(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value={0}>0 Graus (Faixa Nova)</option>
                <option value={1}>1º Grau</option>
                <option value={2}>2º Grau</option>
                <option value={3}>3º Grau</option>
                <option value={4}>4º Grau</option>
              </select>
            </div>
          </div>

          {/* Visual Belt Preview */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Prévia da Faixa:</span>
            <BeltBadge belt={belt} stripes={stripes} size="md" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Data da Outorga:</label>
              <input
                type="date"
                value={promotedAt}
                onChange={(e) => setPromotedAt(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Mestre / Outorgante:</label>
              <input
                type="text"
                value={promotedBy}
                onChange={(e) => setPromotedBy(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Nome do Professor"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Código do Certificado:</label>
            <input
              type="text"
              value={certificateNumber}
              onChange={(e) => setCertificateNumber(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-mono"
              placeholder="CERT-2026-XXXX"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Observações do Mestre / Exame:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              placeholder="Ex: Aprovado com honra no exame técnico de faixas."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{graduationToEdit ? 'Salvar Alterações' : 'Salvar no Histórico'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
