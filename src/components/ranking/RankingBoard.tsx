import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { BeltBadge } from '../belts/BeltBadge';
import { getStudentAvatar, resolveStudentForUser } from '../../constants/avatar';
import { Trophy, Award, Flame, Medal, Sparkles, Star, Calendar, Filter } from 'lucide-react';
import { calculateRanking, RankingPeriod } from '../../utils/ranking';

export const RankingBoard: React.FC = () => {
  const { students, attendances } = useData();
  const { currentUser } = useAuth();
  const [period, setPeriod] = useState<RankingPeriod>('WEEK');

  const ranking = calculateRanking(students, attendances, period);
  const currentStudent = resolveStudentForUser(currentUser, students);
  const myRankItem = currentStudent
    ? ranking.find(r => r.student.id === currentStudent.id || (r.student.email && currentStudent.email && r.student.email.trim().toLowerCase() === currentStudent.email.trim().toLowerCase()))
    : null;

  const topThree = ranking.slice(0, 3);
  const remaining = ranking.slice(3);

  const getPeriodLabel = () => {
    if (period === 'WEEK') return 'Esta Semana';
    if (period === 'MONTH') return 'Este Mês';
    return 'Geral (Todos os Tempos)';
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-white text-center space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mx-auto">
          <Trophy className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-100">
            Hall da Fama & Ranking de Frequência
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Reconhecimento aos atletas com maior assiduidade nos treinos.
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPeriod('WEEK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              period === 'WEEK'
                ? 'bg-slate-100 text-slate-950 shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Esta Semana
          </button>
          <button
            onClick={() => setPeriod('MONTH')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              period === 'MONTH'
                ? 'bg-slate-100 text-slate-950 shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Este Mês
          </button>
          <button
            onClick={() => setPeriod('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              period === 'ALL'
                ? 'bg-slate-100 text-slate-950 shadow-xs'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/80'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Geral
          </button>
        </div>
      </div>

      {/* My Current Rank Banner for Logged in Student */}
      {myRankItem && currentUser?.role === 'ALUNO' && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-950/40 border-2 border-amber-500/60 rounded-2xl p-4 text-white flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black text-lg flex items-center justify-center shadow-lg shrink-0">
              #{myRankItem.rank}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-amber-400">
                Sua Posição no Ranking ({getPeriodLabel()}):
              </span>
              <h4 className="text-sm sm:text-base font-extrabold text-slate-100">
                {myRankItem.rank === 1 ? '👑 1º Lugar — Campeão do Tatame!' : `${myRankItem.rank}º Lugar na Academia`}
              </h4>
              <p className="text-xs text-slate-300">
                Você registrou <strong>{myRankItem.displayCount} treino(s)</strong> {period === 'WEEK' ? 'esta semana' : period === 'MONTH' ? 'este mês' : 'no total'}.
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl">
              Oss! Continue treinando!
            </span>
          </div>
        </div>
      )}

      {/* Podium Top 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        {/* 2nd Place */}
        {topThree[1] && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col items-center text-center space-y-3 relative order-2 sm:order-1">
            <span className="w-8 h-8 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center border-2 border-slate-400 shadow-md">
              2º
            </span>
            <img src={getStudentAvatar(topThree[1].student)} alt={topThree[1].student.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-400 bg-slate-900" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">{topThree[1].student.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{topThree[1].student.registrationNumber}</p>
            </div>
            <BeltBadge belt={topThree[1].student.belt} stripes={topThree[1].student.stripes} size="sm" showLabel={false} />
            <div className="pt-2 border-t border-slate-800 w-full">
              <span className="text-lg font-black text-amber-400">{topThree[1].displayCount} treinos</span>
              <span className="text-[10px] text-slate-500 block">{getPeriodLabel()}</span>
            </div>
          </div>
        )}

        {/* 1st Place (Champion) */}
        {topThree[0] && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 text-white flex flex-col items-center text-center space-y-3 relative order-1 sm:order-2 shadow-md transform sm:-translate-y-1">
            <span className="w-9 h-9 rounded-full bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center border border-slate-300 shadow-xs">
              1º
            </span>
            <img src={getStudentAvatar(topThree[0].student)} alt={topThree[0].student.name} className="w-18 h-18 rounded-full object-cover border-2 border-slate-600 shadow-sm bg-slate-900" />
            <div>
              <h4 className="font-bold text-base text-slate-100">{topThree[0].student.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{topThree[0].student.registrationNumber}</p>
            </div>
            <BeltBadge belt={topThree[0].student.belt} stripes={topThree[0].student.stripes} size="md" showLabel={false} />
            <div className="pt-2 border-t border-slate-800 w-full">
              <span className="text-xl font-bold text-white">{topThree[0].displayCount} treinos</span>
              <span className="text-[10px] text-slate-400 block font-medium">{getPeriodLabel()}</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white flex flex-col items-center text-center space-y-3 relative order-3">
            <span className="w-8 h-8 rounded-full bg-amber-700 text-amber-100 font-black text-xs flex items-center justify-center border-2 border-amber-800 shadow-md">
              3º
            </span>
            <img src={getStudentAvatar(topThree[2].student)} alt={topThree[2].student.name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-700 bg-slate-900" />
            <div>
              <h4 className="font-bold text-sm text-slate-100">{topThree[2].student.name}</h4>
              <p className="text-[10px] text-slate-400 font-mono">{topThree[2].student.registrationNumber}</p>
            </div>
            <BeltBadge belt={topThree[2].student.belt} stripes={topThree[2].student.stripes} size="sm" showLabel={false} />
            <div className="pt-2 border-t border-slate-800 w-full">
              <span className="text-lg font-black text-amber-400">{topThree[2].displayCount} treinos</span>
              <span className="text-[10px] text-slate-500 block">{getPeriodLabel()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Remaining Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-sm text-slate-300 uppercase tracking-wider">
            Classificação Geral — {getPeriodLabel()}
          </h4>
          <span className="text-xs text-slate-400">Total de {ranking.length} Atletas</span>
        </div>

        <div className="space-y-2">
          {ranking.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Nenhum atleta registrado.</p>
          ) : (
            ranking.map((item) => (
              <div
                key={item.student.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  myRankItem?.student.id === item.student.id
                    ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-7 text-center rounded-lg py-1 ${
                    item.rank === 1 ? 'bg-amber-500 text-slate-950 font-black' :
                    item.rank === 2 ? 'bg-slate-300 text-slate-950 font-black' :
                    item.rank === 3 ? 'bg-amber-800 text-amber-100 font-black' : 'text-slate-500'
                  }`}>
                    #{item.rank}
                  </span>
                  <img src={getStudentAvatar(item.student)} alt={item.student.name} className="w-8 h-8 rounded-full object-cover bg-slate-900 border border-slate-800" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-200">{item.student.name}</p>
                      {myRankItem?.student.id === item.student.id && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                          Você
                        </span>
                      )}
                    </div>
                    <BeltBadge belt={item.student.belt} stripes={item.student.stripes} size="sm" showLabel={false} />
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-amber-400 block text-sm">{item.displayCount} treinos</span>
                  <span className="text-[10px] text-slate-500">{item.allTimeCount} total histórico</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
