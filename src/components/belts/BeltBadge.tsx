import React from 'react';
import { BeltType } from '../../types';

interface BeltBadgeProps {
  belt: BeltType;
  stripes?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
}

export const BELT_NAMES: Record<BeltType, string> = {
  BRANCA: 'Faixa Branca',
  CINZA: 'Faixa Cinza',
  AMARELA: 'Faixa Amarela',
  LARANJA: 'Faixa Laranja',
  VERDE: 'Faixa Verde',
  AZUL: 'Faixa Azul',
  ROXA: 'Faixa Roxa',
  MARROM: 'Faixa Marrom',
  PRETA: 'Faixa Preta',
  'VERMELHA E PRETA': 'Faixa Coral (7º Grau)',
  'VERMELHA E BRANCA': 'Faixa Coral (8º Grau)',
  'VERMELHA': 'Faixa Vermelha (9º/10º Grau)',
};

export const BELT_COLORS: Record<BeltType, { bg: string; text: string; border: string; barBg: string; barBorder: string }> = {
  BRANCA: { bg: 'bg-stone-100', text: 'text-stone-900', border: 'border-stone-300', barBg: 'bg-black', barBorder: 'border-stone-800' },
  CINZA: { bg: 'bg-slate-400', text: 'text-slate-950', border: 'border-slate-500', barBg: 'bg-black', barBorder: 'border-slate-800' },
  AMARELA: { bg: 'bg-amber-400', text: 'text-amber-950', border: 'border-amber-500', barBg: 'bg-black', barBorder: 'border-amber-700' },
  LARANJA: { bg: 'bg-orange-500', text: 'text-orange-950', border: 'border-orange-600', barBg: 'bg-black', barBorder: 'border-orange-800' },
  VERDE: { bg: 'bg-emerald-600', text: 'text-emerald-50', border: 'border-emerald-700', barBg: 'bg-black', barBorder: 'border-emerald-900' },
  AZUL: { bg: 'bg-blue-600', text: 'text-blue-50', border: 'border-blue-700', barBg: 'bg-black', barBorder: 'border-blue-900' },
  ROXA: { bg: 'bg-purple-700', text: 'text-purple-50', border: 'border-purple-800', barBg: 'bg-black', barBorder: 'border-purple-950' },
  MARROM: { bg: 'bg-amber-900', text: 'text-amber-50', border: 'border-amber-950', barBg: 'bg-black', barBorder: 'border-black' },
  PRETA: { bg: 'bg-neutral-900', text: 'text-amber-400', border: 'border-neutral-950', barBg: 'bg-red-600', barBorder: 'border-red-800' },
  'VERMELHA E PRETA': { bg: 'bg-red-700', text: 'text-white', border: 'border-red-900', barBg: 'bg-black', barBorder: 'border-black' },
  'VERMELHA E BRANCA': { bg: 'bg-red-700', text: 'text-white', border: 'border-red-900', barBg: 'bg-white', barBorder: 'border-slate-300' },
  'VERMELHA': { bg: 'bg-red-600', text: 'text-amber-300', border: 'border-red-800', barBg: 'bg-amber-400', barBorder: 'border-amber-600' },
};

export const BeltBadge: React.FC<BeltBadgeProps> = ({
  belt,
  stripes = 0,
  size = 'md',
  showLabel = true,
}) => {
  const config = BELT_COLORS[belt] || BELT_COLORS.BRANCA;
  const beltName = BELT_NAMES[belt] || BELT_NAMES.BRANCA;

  const sizeClasses = {
    sm: { height: 'h-6', width: 'w-24', barWidth: 'w-7', label: 'text-xs', stripe: 'w-1 h-3' },
    md: { height: 'h-8', width: 'w-36', barWidth: 'w-10', label: 'text-xs font-bold', stripe: 'w-1.5 h-4' },
    lg: { height: 'h-10', width: 'w-48', barWidth: 'w-12', label: 'text-sm font-extrabold', stripe: 'w-2 h-5' },
    xl: { height: 'h-12', width: 'w-64', barWidth: 'w-16', label: 'text-base font-extrabold', stripe: 'w-2.5 h-6' },
  }[size];

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <div
        className={`relative flex items-center justify-between rounded-md overflow-hidden shadow-sm border ${config.bg} ${config.border} ${sizeClasses.height} ${sizeClasses.width}`}
        title={`${beltName} - ${stripes} grau(s)`}
      >
        {/* Main Belt Strap Texture / Seam details */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-black/10"></div>

        {/* Belt Name / Rank Text */}
        <span className={`px-2 z-10 truncate tracking-wide ${config.text} ${sizeClasses.label}`}>
          {beltName.replace('Faixa ', '')}
        </span>

        {/* Belt Bar (Ponteira) */}
        <div
          className={`h-full flex items-center justify-center gap-1 px-1 border-l shadow-inner ${config.barBg} ${config.barBorder} ${sizeClasses.barWidth}`}
        >
          {Array.from({ length: Math.min(stripes, 4) }).map((_, i) => (
            <div
              key={i}
              className={`bg-stone-100 rounded-xs shadow-xs ${sizeClasses.stripe}`}
              title={`Grau ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {showLabel && (
        <span className="text-[11px] font-medium text-slate-500 tracking-tight">
          {stripes === 0 ? 'Sem grau' : `${stripes}º Grau${stripes > 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  );
};
