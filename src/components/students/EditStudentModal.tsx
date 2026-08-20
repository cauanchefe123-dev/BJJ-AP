import React, { useState, useEffect } from 'react';
import { Student, BeltType, AgeCategory, WeightCategory } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_BLACK_GI_AVATAR, getStudentAvatar, getGiAvatarForBelt } from '../../constants/avatar';
import { compressImage } from '../../utils/imageCompressor';
import { BeltBadge } from '../belts/BeltBadge';
import { getTrainingTimeText } from '../../utils/trainingTime';
import {
  X,
  Save,
  User,
  Mail,
  Phone,
  Calendar,
  Award,
  DollarSign,
  ShieldAlert,
  Upload,
  CheckCircle2,
  FileText,
  Clock,
  Check,
  AlertCircle,
  Send,
  Building2
} from 'lucide-react';
import { getStoredAcademiesList } from '../academies/AcademyLinkView';

interface EditStudentModalProps {
  isOpen: boolean;
  student: Student | null;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  isOpen,
  student,
  onClose,
}) => {
  const { currentUser, updateUserProfile } = useAuth();
  const { updateStudent, beltRequests, requestBeltChange, approveBeltChange, rejectBeltChange } = useData();
  const availableAcademies = getStoredAcademiesList();

  const [formData, setFormData] = useState<Partial<Student>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [linkedAcademyName, setLinkedAcademyName] = useState<string>(availableAcademies[0]?.name || '');

  // Student request belt change state
  const [reqBelt, setReqBelt] = useState<BeltType>('AZUL');
  const [reqStripes, setReqStripes] = useState<number>(0);
  const [reqNotes, setReqNotes] = useState<string>('');
  const [reqSuccess, setReqSuccess] = useState<string | null>(null);
  const [reqError, setReqError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const isStudentUser = currentUser?.role === 'ALUNO';

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        email: student.email,
        phone: student.phone,
        cpf: student.cpf || '',
        birthDate: student.birthDate || '',
        photoUrl: student.photoUrl || '',
        belt: student.belt,
        stripes: student.stripes,
        startDate: student.startDate || new Date().toISOString().split('T')[0],
        initialMonthsTrained: student.initialMonthsTrained || 0,
        customGraduationTargetClasses: student.customGraduationTargetClasses,
        ageCategory: student.ageCategory,
        weightCategory: student.weightCategory,
        planName: student.planName,
        planPrice: student.planPrice,
        paymentDueDateDay: student.paymentDueDateDay,
        emergencyContact: student.emergencyContact || '',
        active: student.active,
        notes: student.notes || '',
      });
      setReqBelt(student.belt);
      setReqStripes(student.stripes < 4 ? student.stripes + 1 : 0);
      setReqSuccess(null);
      setReqError(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const pendingRequest = beltRequests.find(
    r => r.studentId === student.id && r.status === 'PENDING'
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file, 350, 350, 0.8);
        setFormData(prev => ({ ...prev, photoUrl: compressed }));
      } catch (err) {
        console.error('Erro ao processar foto:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const handleSendBeltRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id) return;

    const res = requestBeltChange(student.id, reqBelt, reqStripes, reqNotes);
    if (res.success) {
      setReqSuccess(res.message);
      setReqError(null);
      setReqNotes('');
    } else {
      setReqError(res.message);
      setReqSuccess(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student.id) return;

    let finalPhotoUrl = formData.photoUrl || '';
    if (finalPhotoUrl.startsWith('data:image/') && finalPhotoUrl.length > 50000) {
      setIsCompressing(true);
      try {
        finalPhotoUrl = await compressImage(finalPhotoUrl, 350, 350, 0.8);
      } catch (err) {
        console.warn('Falha na compressao final:', err);
      } finally {
        setIsCompressing(false);
      }
    }

    // Save full data including belt and stripes
    const dataToSave = { 
      ...formData, 
      photoUrl: finalPhotoUrl,
      belt: formData.belt || student.belt,
      stripes: typeof formData.stripes === 'number' ? formData.stripes : student.stripes,
      name: (formData.name && formData.name.trim()) ? formData.name.trim() : student.name
    };

    await updateStudent(student.id, dataToSave);
    if (isStudentUser && currentUser) {
      await updateUserProfile({
        name: dataToSave.name,
        phone: dataToSave.phone,
        avatarUrl: dataToSave.photoUrl
      });
    }

    setSuccessMsg('Cadastro atualizado com sucesso!');
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full text-white shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-100">Atualizar Cadastro de Aluno</h3>
              <p className="text-xs text-slate-400">Matrícula: {student.registrationNumber}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs">
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Cadastro atualizado com sucesso!
            </div>
          )}
          {/* Photo Preview & File Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            <img
              src={getStudentAvatar({ photoUrl: formData.photoUrl, belt: formData.belt, stripes: formData.stripes })}
              alt="Foto do Aluno"
              className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/50 shadow-md bg-slate-900"
            />
            <div className="flex-1 space-y-2 text-center sm:text-left w-full">
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-300 font-bold block">Foto do Perfil / Atleta</label>
                {formData.photoUrl && !formData.photoUrl.startsWith('data:image/svg+xml') && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, photoUrl: '' })}
                    className="text-[11px] text-amber-400 hover:underline font-semibold"
                  >
                    Usar Avatar com Faixa ({formData.belt || 'Faixa'})
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <label className="cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl font-bold flex items-center gap-1.5 transition-all text-xs">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  Enviar Foto Pessoal
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
                <input
                  type="url"
                  placeholder="Ou cole a URL da sua foto..."
                  value={formData.photoUrl && !formData.photoUrl.startsWith('data:image/svg+xml') ? formData.photoUrl : ''}
                  onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                  className="flex-1 min-w-[200px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Você pode enviar uma foto pessoal do seu computador/celular ou usar o boneco de kimono com a faixa oficial ({formData.belt || 'Branca'}).
              </p>
            </div>
          </div>

          {/* Personal Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-bold block mb-1">Nome Completo *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">CPF</label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={formData.cpf || ''}
                onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={formData.birthDate || ''}
                onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Contato de Emergência</label>
              <input
                type="text"
                placeholder="Nome e telefone de familiar"
                value={formData.emergencyContact || ''}
                onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Data de Início na Academia</label>
              <input
                type="date"
                value={formData.startDate || ''}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Tempo de Treino Prévio (Meses)</label>
              <input
                type="number"
                min={0}
                placeholder="Ex: 8 (se já treinava há 8 meses)"
                value={formData.initialMonthsTrained ?? ''}
                onChange={e => setFormData({ ...formData, initialMonthsTrained: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-xs font-semibold">Tempo de Treino Total Calculado:</span>
              </div>
              <span className="font-bold text-amber-400 text-xs bg-amber-500/20 px-3 py-1 rounded-lg border border-amber-500/40">
                {getTrainingTimeText(formData.startDate, formData.initialMonthsTrained)}
              </span>
            </div>

            {/* Meta Individual de Treinos para Graduação */}
            <div className="sm:col-span-2 bg-slate-950 border border-amber-500/40 rounded-xl p-3.5 space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between">
                <label className="text-amber-400 font-extrabold text-xs flex items-center gap-1.5">
                  <span>🎯 Meta Individual de Treinos para Graduação / Grau</span>
                </label>
                {formData.customGraduationTargetClasses && (
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                    Meta Ativa: {formData.customGraduationTargetClasses} aulas
                  </span>
                )}
              </div>
              <input
                type="number"
                min={1}
                placeholder="Ex: 30 (Deixe em branco para usar o padrão da faixa)"
                value={formData.customGraduationTargetClasses ?? ''}
                onChange={e => setFormData({
                  ...formData,
                  customGraduationTargetClasses: e.target.value ? Math.max(1, parseInt(e.target.value) || 0) : undefined
                })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs font-semibold"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Define quantos treinos este aluno específico precisa realizar após a última graduação para ficar apto ao próximo grau/faixa.
                {student && (
                  <span className="block mt-1 text-emerald-400 font-bold">
                    Treinos realizados atualmente: {student.classesSinceLastGraduation} aula(s).
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Vínculo à Academia / Equipe */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <label className="text-amber-400 font-extrabold block text-xs flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-400" />
              Vincular-se à Academia / Equipe *
            </label>
            <select
              value={linkedAcademyName || availableAcademies[0]?.name}
              onChange={e => {
                const newName = e.target.value;
                setLinkedAcademyName(newName);
                if (student) {
                  localStorage.setItem(`bjjcron_student_academy_name_${student.id}`, newName);
                }
              }}
              className="w-full bg-slate-950 border border-amber-500/50 rounded-xl p-2.5 text-slate-100 font-semibold focus:ring-2 focus:ring-amber-500 outline-none text-xs"
            >
              {availableAcademies.map(ac => (
                <option key={ac.id} value={ac.name}>
                  {ac.name} — Prof. {ac.headCoachName} ({ac.city})
                </option>
              ))}
            </select>

            {/* Selected Academy Preview Card with Logo & Professor */}
            {(() => {
              const selectedAc = availableAcademies.find(
                a => a.name === (linkedAcademyName || availableAcademies[0]?.name)
              ) || availableAcademies[0];
              if (!selectedAc) return null;
              return (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/90 border border-slate-800">
                  <img
                    src={selectedAc.logoUrl}
                    alt={selectedAc.name}
                    className="w-10 h-10 rounded-lg object-cover border border-amber-400/80 shrink-0 bg-slate-900"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-100 truncate">{selectedAc.name}</p>
                    <p className="text-[11px] text-amber-400 font-semibold truncate">
                      Mestre / Prof: {selectedAc.headCoachName}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Belt & Categories Section */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {pendingRequest && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-400 flex items-center gap-1.5 text-xs">
                    <Award className="w-4 h-4" />
                    Solicitação de Troca de Faixa Pendente
                  </span>
                  <span className="text-[10px] text-amber-300 font-bold">{pendingRequest.requestDate}</span>
                </div>
                <p className="text-xs text-slate-200">
                  Solicitação de alteração para: <strong className="text-amber-300 font-black">{pendingRequest.requestedBelt} ({pendingRequest.requestedStripes}º Grau)</strong>
                </p>
                {pendingRequest.notes && (
                  <p className="text-[11px] text-slate-300 italic bg-slate-950/90 p-2.5 rounded-xl border border-slate-800">
                    "{pendingRequest.notes}"
                  </p>
                )}
                {!isStudentUser && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => approveBeltChange(pendingRequest.id, currentUser?.name || 'Professor')}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                    >
                      <Check className="w-4 h-4" />
                      Aprovar Troca de Faixa
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectBeltChange(pendingRequest.id, currentUser?.name || 'Professor')}
                      className="py-2.5 px-4 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-extrabold text-xs transition-all"
                    >
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Direct Belt & Graduation Settings */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div>
                  <h4 className="font-extrabold text-xs text-amber-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    Graduação & Faixa do Atleta
                  </h4>
                  <p className="text-[10px] text-slate-400">Ajuste e selecione a faixa atual e quantidade de graus (0 a 4)</p>
                </div>
                <BeltBadge belt={formData.belt || 'BRANCA'} stripes={formData.stripes || 0} size="md" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Faixa</label>
                  <select
                    value={formData.belt || 'BRANCA'}
                    onChange={e => setFormData({ ...formData, belt: e.target.value as BeltType })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  >
                    <optgroup label="Adulto">
                      <option value="BRANCA">Faixa Branca</option>
                      <option value="AZUL">Faixa Azul</option>
                      <option value="ROXA">Faixa Roxa</option>
                      <option value="MARROM">Faixa Marrom</option>
                      <option value="PRETA">Faixa Preta</option>
                      <option value="VERMELHA E PRETA">Faixa Coral (Vermelha e Preta)</option>
                      <option value="VERMELHA E BRANCA">Faixa Coral (Vermelha e Branca)</option>
                      <option value="VERMELHA">Faixa Vermelha (Grande Mestre)</option>
                    </optgroup>
                    <optgroup label="Infantil / Kids">
                      <option value="CINZA">Faixa Cinza</option>
                      <option value="AMARELA">Faixa Amarela</option>
                      <option value="LARANJA">Faixa Laranja</option>
                      <option value="VERDE">Faixa Verde</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Graus na Faixa (0 a 4)</label>
                  <select
                    value={formData.stripes ?? 0}
                    onChange={e => setFormData({ ...formData, stripes: Number(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none font-bold"
                  >
                    <option value={0}>0 Graus (Faixa Lisa)</option>
                    <option value={1}>1º Grau</option>
                    <option value={2}>2º Grau</option>
                    <option value={3}>3º Grau</option>
                    <option value={4}>4º Grau</option>
                  </select>
                </div>

                <div>
                  <label className="text-amber-400 font-extrabold block mb-1">🗓️ Data da Graduação</label>
                  <input
                    type="date"
                    value={formData.lastGraduationDate || new Date().toISOString().split('T')[0]}
                    onChange={e => setFormData({ ...formData, lastGraduationDate: e.target.value })}
                    className="w-full bg-slate-900 border border-amber-500/50 rounded-xl p-2.5 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Categoria de Peso</label>
                <select
                  value={formData.weightCategory || 'MÉDIO'}
                  onChange={e => setFormData({ ...formData, weightCategory: e.target.value as WeightCategory })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="GALO">Galo</option>
                  <option value="PLUMA">Pluma</option>
                  <option value="PENA">Pena</option>
                  <option value="LEVE">Leve</option>
                  <option value="MÉDIO">Médio</option>
                  <option value="MEIO-PESADO">Meio-Pesado</option>
                  <option value="PESADO">Pesado</option>
                  <option value="SUPER-PESADO">Super-Pesado</option>
                  <option value="PESADÍSSIMO">Pesadíssimo</option>
                  <option value="ABSOLUTO">Absoluto</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Categoria de Idade</label>
                <select
                  value={formData.ageCategory || 'ADULTO'}
                  onChange={e => setFormData({ ...formData, ageCategory: e.target.value as AgeCategory })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="PRÉ-MIRIM">Pré-Mirim</option>
                  <option value="MIRIM">Mirim</option>
                  <option value="INFANTIL">Infantil</option>
                  <option value="INFANTO-JUVENIL">Infanto-Juvenil</option>
                  <option value="JUVENIL">Juvenil</option>
                  <option value="ADULTO">Adulto</option>
                  <option value="MASTER 1">Master 1</option>
                  <option value="MASTER 2">Master 2</option>
                  <option value="MASTER 3">Master 3</option>
                  <option value="MASTER 4+">Master 4+</option>
                </select>
              </div>
            </div>
          </div>

          {/* Plan & Payment Details (Admin/Professor only) */}
          {!isStudentUser && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-slate-300 font-bold block mb-1">Plano da Academia</label>
                <input
                  type="text"
                  value={formData.planName || ''}
                  onChange={e => setFormData({ ...formData, planName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Valor da Mensalidade (R$)</label>
                <input
                  type="number"
                  value={formData.planPrice ?? 150}
                  onChange={e => setFormData({ ...formData, planPrice: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 font-bold block mb-1">Dia do Vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={formData.paymentDueDateDay ?? 10}
                  onChange={e => setFormData({ ...formData, paymentDueDateDay: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-300 font-bold block mb-1">Observações / Histórico de Saúde</label>
            <textarea
              rows={2}
              placeholder="Anotações internas do atleta..."
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 bg-slate-900 pt-4 pb-1 border-t border-slate-800 flex items-center justify-end gap-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold shadow-lg flex items-center gap-2 transition-all active:scale-95"
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
