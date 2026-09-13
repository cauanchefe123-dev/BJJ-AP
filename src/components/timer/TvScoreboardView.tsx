import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  subscribeToTimer,
  computeCurrentRemaining,
  TimerSyncData,
  DEFAULT_TIMER_STATE,
  publishTimerSync,
  broadcastSound
} from '../../lib/timerSyncService';
import { unlockAudio, playTatameSound } from '../../lib/soundEffects';
import QRCode from 'qrcode';
import {
  Tv,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  QrCode,
  X,
  Swords,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowLeft,
  Smartphone,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Minus
} from 'lucide-react';

interface TvScoreboardViewProps {
  tatameId?: string;
  onExitTvMode?: () => void;
}

export const TvScoreboardView: React.FC<TvScoreboardViewProps> = ({
  tatameId = 'tatame_1',
  onExitTvMode
}) => {
  const [currentTatameId, setCurrentTatameId] = useState<string>(tatameId);
  const [timerData, setTimerData] = useState<TimerSyncData>(DEFAULT_TIMER_STATE);
  const [displaySeconds, setDisplaySeconds] = useState<number>(DEFAULT_TIMER_STATE.timeRemaining);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioActive, setIsAudioActive] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [showRemoteControls, setShowRemoteControls] = useState(false);
  const [lastPing, setLastPing] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Armazena URL de controle do celular
  const controllerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?tatame=${currentTatameId}`
    : '';

  // Gera QR Code para o professor escanear na TV
  useEffect(() => {
    if (controllerUrl) {
      QRCode.toDataURL(controllerUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#f8fafc',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(() => {});
    }
  }, [controllerUrl]);

  // Escuta atualizações em tempo real do timer
  useEffect(() => {
    const unsubscribe = subscribeToTimer(currentTatameId, (data) => {
      setTimerData(data);
      setDisplaySeconds(computeCurrentRemaining(data));
      setLastPing(new Date());
      setIsConnected(true);
    });

    return () => {
      unsubscribe();
    };
  }, [currentTatameId]);

  // Contagem regressiva local suave (60fps / 1s) para eliminar atraso de rede
  useEffect(() => {
    if (timerData.status !== 'RUNNING' || !timerData.targetEndTime) {
      setDisplaySeconds(timerData.timeRemaining);
      return;
    }

    const interval = setInterval(() => {
      const remaining = computeCurrentRemaining(timerData);
      setDisplaySeconds(remaining);

      // Alerta sonoro de 10 segundos
      if (remaining === 10 && isAudioActive) {
        playTatameSound('WARNING');
      }

      // Finalização
      if (remaining <= 0) {
        if (isAudioActive) {
          playTatameSound('FINISHED');
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [timerData, isAudioActive]);

  // Checagem de conectividade (se não receber ping por 30s)
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const diff = Date.now() - lastPing.getTime();
      setIsConnected(diff < 45000);
    }, 10000);

    return () => clearInterval(checkInterval);
  }, [lastPing]);

  // Controle de Tela Cheia
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(() => {});
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  // Atalhos de teclado (F para fullscreen, M para áudio, Espaço para play/pause)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsAudioActive(prev => {
          if (!prev) unlockAudio();
          return !prev;
        });
      } else if (e.key === 'q' || e.key === 'Q') {
        setShowQrModal(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFullscreen]);

  // Ativação do áudio (requisito de navegadores de Smart TV)
  const handleEnableAudio = () => {
    unlockAudio();
    setIsAudioActive(true);
    playTatameSound('START');
  };

  // Controles rápidos do placar na própria TV (caso use mouse ou controle remoto)
  const handleScoreChange = (corner: 1 | 2, type: 'points' | 'advantages' | 'penalties', delta: number) => {
    const key = corner === 1 ? (type === 'points' ? 'score1' : type === 'advantages' ? 'advantages1' : 'penalties1')
                             : (type === 'points' ? 'score2' : type === 'advantages' ? 'advantages2' : 'penalties2');
    const currentVal = timerData[key] as number;
    const maxVal = type === 'penalties' ? 4 : 99;
    const nextVal = Math.min(maxVal, Math.max(0, currentVal + delta));

    publishTimerSync({
      id: tatameId,
      [key]: nextVal,
    });
    if (delta > 0 && isAudioActive) {
      playTatameSound('SCORE');
    }
  };

  const handleToggleTimer = () => {
    if (timerData.status === 'RUNNING') {
      publishTimerSync({
        id: tatameId,
        status: 'PAUSED',
        timeRemaining: displaySeconds,
        targetEndTime: null,
      });
      if (isAudioActive) playTatameSound('STOP');
    } else {
      const targetEnd = Date.now() + displaySeconds * 1000;
      publishTimerSync({
        id: tatameId,
        status: 'RUNNING',
        targetEndTime: targetEnd,
        timeRemaining: displaySeconds,
      });
      if (isAudioActive) playTatameSound('START');
    }
  };

  const handleResetTimer = () => {
    publishTimerSync({
      id: tatameId,
      status: 'IDLE',
      timeRemaining: timerData.totalDuration || 360,
      targetEndTime: null,
      score1: 0,
      score2: 0,
      advantages1: 0,
      advantages2: 0,
      penalties1: 0,
      penalties2: 0,
    });
  };

  // Formatação de minutos e segundos
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isWarningTime = displaySeconds <= 15 && displaySeconds > 0 && timerData.status === 'RUNNING';
  const isTimeEnded = displaySeconds === 0 && timerData.status === 'RUNNING';

  // Obter cores de faixa
  const getBeltBg = (belt: string) => {
    switch (belt?.toUpperCase()) {
      case 'PRETA': return 'bg-slate-950 border-rose-600 text-rose-500';
      case 'MARROM': return 'bg-amber-900 border-amber-700 text-amber-200';
      case 'ROXA': return 'bg-purple-900 border-purple-600 text-purple-200';
      case 'AZUL': return 'bg-blue-900 border-blue-600 text-blue-200';
      default: return 'bg-slate-100 border-slate-300 text-slate-900';
    }
  };

  return (
    <div
      id="tv-scoreboard-root"
      className="fixed inset-0 z-50 bg-[#030712] text-white flex flex-col justify-between select-none overflow-hidden font-sans"
    >
      {/* 1. TOPO DA TV: Cabeçalho & Status do Tatame */}
      <header className="px-6 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          {onExitTvMode && (
            <button
              onClick={onExitTvMode}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Voltar ao Sistema"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Voltar ao App</span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-amber-400">
                <Tv className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  BJJCRON <span className="text-amber-400">TV</span>
                </h1>
                <div className="flex items-center gap-1 bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setCurrentTatameId('tatame_1')}
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      currentTatameId === 'tatame_1'
                        ? 'bg-amber-400 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mudar para Tatame 1"
                  >
                    Tatame 1
                  </button>
                  <button
                    onClick={() => setCurrentTatameId('tv_7')}
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                      currentTatameId === 'tv_7'
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                        : 'text-amber-400 hover:bg-amber-400/10'
                    }`}
                    title="Mudar para TV 7 (Tatame 7)"
                  >
                    📺 TV 7
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Placar Oficial & Cronômetro de Tatame
              </p>
            </div>
          </div>
        </div>

        {/* Status de Sincronização & Botões de TV */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge de Conexão */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
            isConnected
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
            <span className="hidden sm:inline">{isConnected ? 'Sincronizado na Nuvem' : 'Aguardando Sinal'}</span>
          </div>

          {/* Ativação de Áudio */}
          <button
            onClick={handleEnableAudio}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isAudioActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-sm'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 animate-pulse'
            }`}
            title="Ativar/Desativar Som do Gongo na TV [M]"
          >
            {isAudioActive ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-amber-400" />}
            <span className="hidden md:inline">{isAudioActive ? 'Gongo Ativado' : 'Ativar Gongo'}</span>
          </button>

          {/* QR Code para Controle pelo Celular */}
          <button
            onClick={() => setShowQrModal(true)}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Conectar Celular / Controle Remoto [Q]"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">Controle Celular</span>
          </button>

          {/* Tela Cheia */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all cursor-pointer"
            title={isFullscreen ? 'Sair da Tela Cheia [F]' : 'Tela Cheia na TV [F]'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Banner de Áudio Desbloqueado na TV */}
      {!isAudioActive && (
        <div
          onClick={handleEnableAudio}
          className="bg-amber-500/15 border-b border-amber-500/30 py-2 px-4 text-center cursor-pointer hover:bg-amber-500/20 transition-all flex items-center justify-center gap-2 text-xs font-bold text-amber-300"
        >
          <VolumeX className="w-4 h-4 text-amber-400 animate-bounce" />
          <span>Toque ou clique em qualquer lugar para ativar o som do gongo e apito do tatame nesta TV</span>
        </div>
      )}

      {/* 2. CORPO PRINCIPAL DO PLACAR & CRONÔMETRO */}
      <main className="flex-1 flex flex-col justify-center p-3 sm:p-6 md:p-8 max-w-[1920px] w-full mx-auto relative">
        {/* Banner de Modo / Round */}
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            {timerData.timerMode === 'ROUNDS' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base md:text-xl font-black uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  Round {timerData.currentRound} de {timerData.totalRounds}
                </span>
                {timerData.isResting ? (
                  <span className="text-sm sm:text-base font-black uppercase tracking-wider text-rose-300 bg-rose-500/20 border border-rose-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                    Intervalo / Descanso
                  </span>
                ) : (
                  <span className="text-sm sm:text-base font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
                    Combate Ativo
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base md:text-xl font-black uppercase tracking-wider text-cyan-300 bg-cyan-500/15 border border-cyan-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
                  <Swords className="w-5 h-5 text-cyan-400" />
                  Placar Oficial de Combate
                </span>
                <span className={`text-xs sm:text-sm font-black uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                  timerData.status === 'RUNNING'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : timerData.status === 'PAUSED'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {timerData.status === 'RUNNING' ? 'Em Andamento' : timerData.status === 'PAUSED' ? 'Pausado' : 'Pronto'}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-slate-500 font-mono hidden sm:block">
            BJJCRON SYNC ENGINE • TATAME ID: {tatameId}
          </div>
        </div>

        {/* ESTRUTURA DO PLACAR COM 3 COLUNAS GIGANTES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 items-stretch">
          {/* LADO ESQUERDO: ATLETA 1 (CORNER AZUL/VERDE E AMARELO) */}
          <div className="lg:col-span-4 bg-gradient-to-br from-blue-950/50 via-slate-900 to-slate-950 border-2 border-blue-500/40 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />

            {/* Cabeçalho do Atleta 1 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-blue-400 bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-lg">
                  Corner Azul
                </span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border ${getBeltBg(timerData.athlete1Belt)}`}>
                  Faixa {timerData.athlete1Belt || 'Azul'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white truncate tracking-tight">
                {timerData.athlete1Name || 'Atleta 1'}
              </h2>
            </div>

            {/* PONTUAÇÃO PRINCIPAL GIGANTE */}
            <div className="my-auto text-center py-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pontos
              </span>
              <div className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono leading-none tracking-tighter text-white drop-shadow-2xl">
                {timerData.score1}
              </div>
            </div>

            {/* VANTAGENS & PUNIÇÕES */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              {/* Vantagens */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-black uppercase text-amber-400 block tracking-wider">
                  Vantagens
                </span>
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300">
                  {timerData.advantages1}
                </span>
              </div>

              {/* Punições (Cartões IBJJF) */}
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-black uppercase text-rose-400 block tracking-wider">
                  Punições
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={`w-4 h-6 sm:w-5 sm:h-7 rounded-sm border transition-all ${
                        timerData.penalties1 >= step
                          ? step === 4
                            ? 'bg-rose-600 border-rose-400 shadow-md shadow-rose-600/50'
                            : 'bg-amber-500 border-amber-300 shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 opacity-40'
                      }`}
                      title={step === 4 ? 'Desclassificação' : `Punição ${step}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CENTRO: CRONÔMETRO GIGANTE (VISÍVEL DO OUTRO LADO DO TATAME) */}
          <div className={`lg:col-span-4 bg-slate-950 border-2 ${
            isTimeEnded
              ? 'border-rose-500 shadow-2xl shadow-rose-500/30 animate-pulse'
              : isWarningTime
              ? 'border-amber-500 shadow-2xl shadow-amber-500/20'
              : 'border-slate-800'
          } rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-center relative overflow-hidden`}>
            {/* Relógio Digital Gigante */}
            <div className="my-auto flex flex-col items-center justify-center py-6">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-400 mb-2">
                {timerData.status === 'RUNNING' ? 'Tempo Restante' : timerData.status === 'PAUSED' ? 'Tempo Pausado' : 'Tempo de Luta'}
              </span>

              <div className={`font-black font-mono tracking-tight leading-none text-7xl sm:text-8xl md:text-9xl xl:text-[10rem] transition-colors ${
                isTimeEnded
                  ? 'text-rose-500'
                  : isWarningTime
                  ? 'text-amber-400 animate-pulse'
                  : timerData.isResting
                  ? 'text-amber-300'
                  : 'text-white'
              }`}>
                {formattedTime}
              </div>

              {/* Status do Cronômetro */}
              <div className="mt-4">
                {isTimeEnded ? (
                  <div className="px-4 py-2 rounded-xl bg-rose-500 text-slate-950 font-black text-sm uppercase tracking-wider shadow-lg">
                    Tempo Esgotado!
                  </div>
                ) : timerData.status === 'PAUSED' ? (
                  <div className="px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs uppercase tracking-wider">
                    Cronômetro Pausado
                  </div>
                ) : timerData.status === 'RUNNING' ? (
                  <div className="px-4 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Cronômetro Rodando
                  </div>
                ) : (
                  <div className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs uppercase tracking-wider">
                    Pronto para Iniciar
                  </div>
                )}
              </div>
            </div>

            {/* Mini barra de controle na TV (opcional se professor usar controle remoto ou mouse) */}
            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-3">
              <button
                onClick={handleToggleTimer}
                className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg ${
                  timerData.status === 'RUNNING'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                }`}
              >
                {timerData.status === 'RUNNING' ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Iniciar</span>
                  </>
                )}
              </button>

              <button
                onClick={handleResetTimer}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                title="Reiniciar Tempo e Placar"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* LADO DIREITO: ATLETA 2 (CORNER BRANCO/VERMELHO) */}
          <div className="lg:col-span-4 bg-gradient-to-bl from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-700/60 rounded-3xl p-5 sm:p-6 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200" />

            {/* Cabeçalho do Atleta 2 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-300 bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                  Corner Branco
                </span>
                <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-md border ${getBeltBg(timerData.athlete2Belt)}`}>
                  Faixa {timerData.athlete2Belt || 'Branca'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white truncate tracking-tight">
                {timerData.athlete2Name || 'Atleta 2'}
              </h2>
            </div>

            {/* PONTUAÇÃO PRINCIPAL GIGANTE */}
            <div className="my-auto text-center py-4">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1">
                Pontos
              </span>
              <div className="text-8xl sm:text-9xl md:text-[11rem] font-black font-mono leading-none tracking-tighter text-white drop-shadow-2xl">
                {timerData.score2}
              </div>
            </div>

            {/* VANTAGENS & PUNIÇÕES */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              {/* Vantagens */}
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-black uppercase text-amber-400 block tracking-wider">
                  Vantagens
                </span>
                <span className="text-3xl sm:text-4xl font-black font-mono text-amber-300">
                  {timerData.advantages2}
                </span>
              </div>

              {/* Punições (Cartões IBJJF) */}
              <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-3 text-center">
                <span className="text-[11px] font-black uppercase text-rose-400 block tracking-wider">
                  Punições
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={`w-4 h-6 sm:w-5 sm:h-7 rounded-sm border transition-all ${
                        timerData.penalties2 >= step
                          ? step === 4
                            ? 'bg-rose-600 border-rose-400 shadow-md shadow-rose-600/50'
                            : 'bg-amber-500 border-amber-300 shadow-sm'
                          : 'bg-slate-800/80 border-slate-700 opacity-40'
                      }`}
                      title={step === 4 ? 'Desclassificação' : `Punição ${step}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. RODAPÉ DA TV */}
      <footer className="px-6 py-2.5 bg-slate-950 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
          <span>Controle este placar pelo celular abrindo o BJJCRON na mesma academia</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowQrModal(true)}
            className="text-cyan-400 hover:text-cyan-300 font-bold transition-all flex items-center gap-1 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Exibir QR Code do Tatame</span>
          </button>
          <span>Pressione <strong>F</strong> para Tela Cheia</span>
        </div>
      </footer>

      {/* MODAL QR CODE PARA O PROFESSOR CONECTAR PELO CELULAR */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <Smartphone className="w-5 h-5" />
                <span>Controle Remoto do Tatame</span>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">Aponte a Câmera do Celular</h3>
              <p className="text-xs text-slate-400">
                Escaneie o QR Code abaixo para abrir o controle do cronômetro no celular do professor e controlar esta TV em tempo real.
              </p>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-4 bg-white rounded-2xl inline-block shadow-xl mx-auto">
                <img src={qrCodeDataUrl} alt="QR Code Controle Remoto" className="w-56 h-56 mx-auto rounded-lg" />
              </div>
            ) : (
              <div className="w-56 h-56 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                Gerando QR Code...
              </div>
            )}

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 break-all">
              {controllerUrl}
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all cursor-pointer"
            >
              Fechar QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
