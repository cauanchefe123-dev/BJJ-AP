import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { BeltType, AgeCategory, WeightCategory } from '../../types';
import { DEFAULT_BLACK_GI_AVATAR, getStudentAvatar, getGiAvatarForBelt } from '../../constants/avatar';
import { compressImage } from '../../utils/imageCompressor';
import { X, UserPlus, Check, Upload, Clock } from 'lucide-react';
import { getTrainingTimeText } from '../../utils/trainingTime';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
  const { addStudent } = useData();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    birthDate: '1998-01-01',
    photoUrl: DEFAULT_BLACK_GI_AVATAR,
    belt: 'BRANCA' as BeltType,
    stripes: 0,
    lastGraduationDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    initialMonthsTrained: 0,
    customGraduationTargetClasses: undefined as number | undefined,
    weightCategory: 'MÉDIO' as WeightCategory,
    ageCategory: 'ADULTO' as AgeCategory,
    active: true,
    planName: 'Plano Mensal Padrão',
    planPrice: 240,
    paymentDueDateDay: 10,
    paymentStatus: 'PENDENTE' as const,
    notes: '',
  });

  if (!isOpen) return null;

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      birthDate: '1998-01-01',
      photoUrl: DEFAULT_BLACK_GI_AVATAR,
      belt: 'BRANCA' as BeltType,
      stripes: 0,
      lastGraduationDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      initialMonthsTrained: 0,
      customGraduationTargetClasses: undefined as number | undefined,
      weightCategory: 'MÉDIO' as WeightCategory,
      ageCategory: 'ADULTO' as AgeCategory,
      active: true,
      planName: 'Plano Mensal Padrão',
      planPrice: 240,
      paymentDueDateDay: 10,
      paymentStatus: 'PENDENTE' as const,
      notes: '',
    });
    setErrorMsg(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setErrorMsg('Por favor, preencha o Nome, E-mail e Telefone do aluno.');
      return;
    }

    addStudent({
      ...formData,
      approvalStatus: 'APPROVED',
    });
    resetForm();
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, 350, 350, 0.8);
        setFormData(prev => ({ ...prev, photoUrl: compressed }));
      } catch (err) {
        console.error('Erro ao comprimir foto:', err);
      }
    }
  };

  const previewAvatar = getStudentAvatar({
    photoUrl: formData.photoUrl,
    belt: formData.belt,
    stripes: formData.stripes
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 text-white space-y-6 shadow-2xl relative my-8">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-100">Cadastrar Novo Atleta</h3>
            <p className="text-xs text-slate-400">Registro oficial do aluno no BJJCRON</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-bold block mb-1">Nome Completo do Aluno *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Ex: Gabriel Santos Silva"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="aluno@email.com"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="(11) 99999-8888"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Faixa Atual</label>
              <select
                value={formData.belt}
                onChange={e => setFormData({ ...formData, belt: e.target.value as BeltType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="BRANCA">Faixa Branca</option>
                <option value="AZUL">Faixa Azul</option>
                <option value="ROXA">Faixa Roxa</option>
                <option value="MARROM">Faixa Marrom</option>
                <option value="PRETA">Faixa Preta</option>
                <option value="CINZA">Faixa Cinza (Kids)</option>
                <option value="AMARELA">Faixa Amarela (Kids)</option>
                <option value="LARANJA">Faixa Laranja (Kids)</option>
                <option value="VERDE">Faixa Verde (Kids)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Graus Atuais (0 a 4)</label>
              <input
                type="number"
                min={0}
                max={4}
                value={formData.stripes}
                onChange={e => setFormData({ ...formData, stripes: parseInt(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-amber-400 font-extrabold block mb-1">🗓️ Data da Graduação / Outorga</label>
              <input
                type="date"
                value={formData.lastGraduationDate || new Date().toISOString().split('T')[0]}
                onChange={e => setFormData({ ...formData, lastGraduationDate: e.target.value })}
                className="w-full bg-slate-950 border border-amber-500/50 rounded-lg p-2.5 text-slate-100 font-bold focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Data de Início na Academia</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Tempo de Treino Prévio (Meses)</label>
              <input
                type="number"
                min={0}
                placeholder="Ex: 8 (se já treinava há 8 meses)"
                value={formData.initialMonthsTrained || ''}
                onChange={e => setFormData({ ...formData, initialMonthsTrained: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300 text-xs font-semibold">Contagem Total de Treino:</span>
              </div>
              <span className="font-bold text-amber-400 text-xs bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40">
                {getTrainingTimeText(formData.startDate, formData.initialMonthsTrained)}
              </span>
            </div>

            <div className="sm:col-span-2 bg-slate-950 border border-amber-500/30 rounded-xl p-3 space-y-1">
              <label className="text-amber-300 font-bold block text-xs">
                🎯 Meta Individual de Treinos para Graduação / Grau (Opcional)
              </label>
              <input
                type="number"
                min={1}
                placeholder="Ex: 30 (Deixe em branco para usar a meta padrão da faixa)"
                value={formData.customGraduationTargetClasses ?? ''}
                onChange={e => setFormData({
                  ...formData,
                  customGraduationTargetClasses: e.target.value ? Math.max(1, parseInt(e.target.value) || 0) : undefined
                })}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Ao atingir ou ultrapassar essa meta de treinos, o aluno aparecerá automaticamente em "Aptos a Graduar".
              </p>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Categoria de Peso</label>
              <select
                value={formData.weightCategory}
                onChange={e => setFormData({ ...formData, weightCategory: e.target.value as WeightCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
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
                value={formData.ageCategory}
                onChange={e => setFormData({ ...formData, ageCategory: e.target.value as AgeCategory })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="KIDS">Kids (Até 12 anos)</option>
                <option value="JUVENIL">Juvenil (13-17 anos)</option>
                <option value="ADULTO">Adulto (18-29 anos)</option>
                <option value="MASTER_1">Master 1 (30-35 anos)</option>
                <option value="MASTER_2">Master 2 (36-40 anos)</option>
                <option value="MASTER_3+">Master 3+ (40+ anos)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Nome do Plano</label>
              <input
                type="text"
                value={formData.planName}
                onChange={e => setFormData({ ...formData, planName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">Valor do Plano (R$)</label>
              <input
                type="number"
                value={formData.planPrice}
                onChange={e => setFormData({ ...formData, planPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div className="sm:col-span-2 bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
              <img
                src={previewAvatar}
                alt="Foto do Atleta"
                className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 bg-slate-900"
              />
              <div className="flex-1 space-y-2 w-full text-center sm:text-left">
                <label className="text-slate-300 font-bold block text-xs">Foto do Atleta / Perfil</label>
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-bold flex items-center gap-1.5 transition-all text-xs">
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    Enviar Foto Pessoal
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  <input
                    type="url"
                    placeholder="Ou cole a URL..."
                    value={formData.photoUrl && !formData.photoUrl.startsWith('data:image/svg+xml') ? formData.photoUrl : ''}
                    onChange={e => setFormData({ ...formData, photoUrl: e.target.value })}
                    className="flex-1 min-w-[180px] bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-100 focus:ring-2 focus:ring-amber-500 outline-none text-xs"
                  />
                </div>
                <p className="text-[10px] text-slate-400">
                  Foto padrão: boneco em Kimono com a faixa do atleta ({formData.belt}). Se preferir, envie a foto real do aluno.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
            >
              Concluir Cadastro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
