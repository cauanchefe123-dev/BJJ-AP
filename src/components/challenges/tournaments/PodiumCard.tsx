import React from 'react';
import { TournamentPodium } from '../../../types';
import { BeltBadge } from '../../belts/BeltBadge';
import { Award, Trophy, Medal, Sparkles } from 'lucide-react';

interface PodiumCardProps {
  podium: TournamentPodium;
  categoryName: string;
}

export const PodiumCard: React.FC<PodiumCardProps> = ({ podium, categoryName }) => {
  const { first, second, third, thirdSecond } = podium;

  if (!first && !second && !third) return null;

  return (
    <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-6 text-white shadow-xl space-y-5 relative overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-3.5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-lg shrink-0">
            <Trophy className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                Pódio & Hall dos Campeões
              </span>
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>
            <h3 className="font-extrabold text-base text-slate-100">
              Medalhistas • {categoryName}
            </h3>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm">
          Divisão Concluída 🥋
        </span>
      </div>

      {/* Podium Steps Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* 2nd Place (Silver) */}
        <div className="order-2 sm:order-1 p-4 rounded-2xl bg-slate-950/80 border border-slate-700/80 flex flex-col justify-between items-center text-center space-y-3 relative">
          <div className="w-9 h-9 rounded-full bg-slate-300 text-slate-950 font-black text-sm flex items-center justify-center shadow-md border-2 border-slate-100">
            🥈 2º
          </div>
          {second ? (
            <div className="space-y-1.5 w-full">
              <p className="font-black text-sm text-slate-100 truncate">{second.name}</p>
              <div className="flex justify-center">
                <BeltBadge belt={second.belt} stripes={second.stripes} size="sm" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 block">Medalha de Prata</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">A definir</span>
          )}
        </div>

        {/* 1st Place (Gold / Champion) */}
        <div className="order-1 sm:order-2 p-5 rounded-2xl bg-gradient-to-b from-amber-500/25 to-slate-950 border-2 border-amber-500/80 flex flex-col justify-between items-center text-center space-y-3 relative shadow-2xl scale-100 sm:-translate-y-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg border-2 border-amber-200">
            🥇 1º
          </div>
          {first ? (
            <div className="space-y-2 w-full">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase tracking-wider inline-block">
                Grande Campeão 👑
              </span>
              <p className="font-black text-base text-amber-200 truncate">{first.name}</p>
              <div className="flex justify-center">
                <BeltBadge belt={first.belt} stripes={first.stripes} size="md" />
              </div>
              <span className="text-xs font-bold text-amber-400 block">Medalha de Ouro</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">A definir</span>
          )}
        </div>

        {/* 3rd Place (Bronze) */}
        <div className="order-3 sm:order-3 p-4 rounded-2xl bg-slate-950/80 border border-amber-900/40 flex flex-col justify-between items-center text-center space-y-3 relative">
          <div className="w-9 h-9 rounded-full bg-amber-700 text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-amber-600">
            🥉 3º
          </div>
          {third ? (
            <div className="space-y-1.5 w-full">
              <p className="font-black text-sm text-slate-100 truncate">{third.name}</p>
              <div className="flex justify-center">
                <BeltBadge belt={third.belt} stripes={third.stripes} size="sm" />
              </div>
              {thirdSecond && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="font-black text-xs text-slate-200 truncate">{thirdSecond.name}</p>
                  <div className="flex justify-center mt-1">
                    <BeltBadge belt={thirdSecond.belt} stripes={thirdSecond.stripes} size="sm" />
                  </div>
                </div>
              )}
              <span className="text-[10px] font-bold text-amber-600 block">Medalha de Bronze</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500 font-medium">A definir</span>
          )}
        </div>
      </div>
    </div>
  );
};
