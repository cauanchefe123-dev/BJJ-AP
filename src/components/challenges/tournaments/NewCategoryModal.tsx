import React, { useState } from 'react';
import { TournamentCategory, BeltType, RollModality, RollRulesType } from '../../../types';
import { X, Plus, Shield, Layers, Clock, Scale } from 'lucide-react';

interface NewCategoryModalProps {
  onClose: () => void;
  onAddCategory: (category: Omit<TournamentCategory, 'id' | 'matches'>) => void;
}

const PRESET_CATEGORIES = [
  { name: 'Absoluto Branca & Azul (Open Class)', beltMin: 'BRANCA' as BeltType, beltMax: 'AZUL' as BeltType, duration: 5, weight: 'Livre' },
  { name: 'Absoluto Roxa, Marrom & Preta', beltMin: 'ROXA' as BeltType, beltMax: 'PRETA' as BeltType, duration: 6, weight: 'Livre' },
  { name: 'Leve / Pena (Até 76kg)', beltMin: 'BRANCA' as BeltType, beltMax: 'AZUL' as BeltType, duration: 5, weight: '76.0' },
  { name: 'Médio / Meio-Pesado (Até 88kg)', beltMin: 'BRANCA' as BeltType, beltMax: 'AZUL' as BeltType, duration: 5, weight: '88.3' },
  { name: 'Pesado / Super-Pesado (+88kg)', beltMin: 'BRANCA' as BeltType, beltMax: 'AZUL' as BeltType, duration: 5, weight: 'Acima de 88kg' },
  { name: 'No-Gi Avançado (Open Weight)', beltMin: 'AZUL' as BeltType, beltMax: 'PRETA' as BeltType, duration: 6, weight: 'Livre' },
  { name: 'Kids / Juvenil Graduados', beltMin: 'CINZA' as BeltType, beltMax: 'VERDE' as BeltType, duration: 4, weight: 'Livre' },
  { name: 'Master (+30 anos)', beltMin: 'BRANCA' as BeltType, beltMax: 'PRETA' as BeltType, duration: 5, weight: 'Livre' },
];

export const NewCategoryModal: React.FC<NewCategoryModalProps> = ({
  onClose,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [modality, setModality] = useState<RollModality>('GI');
  const [beltMin, setBeltMin] = useState<BeltType>('BRANCA');
  const [beltMax, setBeltMax] = useState<BeltType>('AZUL');
  const [gender, setGender] = useState<'MASCULINO' | 'FEMININO' | 'MISTO'>('MISTO');
  const [weightLimitKg, setWeightLimitKg] = useState('');
  const [matchDurationMinutes, setMatchDurationMinutes] = useState(5);
  const [rulesType, setRulesType] = useState<RollRulesType>('PONTOS_IBJJF');

  const handleSelectPreset = (preset: typeof PRESET_CATEGORIES[0]) => {
    setName(preset.name);
    setBeltMin(preset.beltMin);
    setBeltMax(preset.beltMax);
    setMatchDurationMinutes(preset.duration);
    if (preset.weight !== 'Livre') {
      setWeightLimitKg(preset.weight.replace(/[^0-9.]/g, ''));
    } else {
      setWeightLimitKg('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da categoria.');
      return;
    }

    onAddCategory({
      name: name.trim(),
      modality,
      beltGroup: `${beltMin} a ${beltMax}`,
      gender,
      weightLimitKg: weightLimitKg ? Number(weightLimitKg) : undefined,
      matchDurationMinutes: Number(matchDurationMinutes),
      rulesType,
      competitors: [],
      status: 'REGISTRATION',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg text-white shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Chaveamento & Divisão
              </span>
              <h3 className="font-extrabold text-lg text-slate-100">
                Criar Nova Categoria
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {/* Presets */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Sugestões Rápidas de Categorias:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CATEGORIES.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-[11px] text-slate-300 transition-colors cursor-pointer"
                >
                  + {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Category Name */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
              Nome da Categoria *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Absoluto Faixa Roxa/Marrom, Leve Gi..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Modality & Rules */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                Modalidade
              </label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value as RollModality)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="GI">Com Kimono (Gi)</option>
                <option value="NO_GI">Sem Kimono (No-Gi)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                Regras de Pontuação
              </label>
              <select
                value={rulesType}
                onChange={(e) => setRulesType(e.target.value as RollRulesType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
              >
                <option value="PONTOS_IBJJF">Padrão IBJJF (Pontos e Vantagens)</option>
                <option value="SUBMISSION_ONLY">Submission Only (Apenas Finalização)</option>
                <option value="ESTUDO_LEVE">Treino Técnico / Estudo</option>
                <option value="TEMPO_LIVRE">Tempo Livre</option>
              </select>
            </div>
          </div>

          {/* Duration & Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                Duração da Luta (minutos)
              </label>
              <input
                type="number"
                min="2"
                max="20"
                value={matchDurationMinutes}
                onChange={(e) => setMatchDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
                Limite de Peso (kg - opcional)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 77.0 (Vazio = Livre)"
                value={weightLimitKg}
                onChange={(e) => setWeightLimitKg(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar Categoria</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
