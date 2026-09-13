/**
 * BJJCRON - Serviço de Sincronização em Tempo Real do Cronômetro & Placar na TV
 * Suporta transmissão simultânea via:
 * 1. BroadcastChannel local (0ms para cabo HDMI, segunda aba ou telas no mesmo computador)
 * 2. Cloud Firestore (Sincronização em tempo real para Smart TVs na rede WiFi, Chromecast, TV Box e dispositivos remotos)
 * 3. LocalStorage cross-tab fallback
 */

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { playTatameSound, SoundEffectType } from './soundEffects';

export type TimerRunStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'REST' | 'FINISHED';
export type TimerModeType = 'SCOREBOARD' | 'ROUNDS';

export interface TimerSyncData {
  id: string; // e.g. 'tatame_1'
  tatameId: string;
  tatameName: string;
  timerMode: TimerModeType;
  status: TimerRunStatus;
  timeRemaining: number; // segundos restantes calculados
  targetEndTime: number | null; // Timestamp (ms) em que o round atual termina quando RUNNING
  totalDuration: number;
  currentRound: number;
  totalRounds: number;
  isResting: boolean;
  roundDuration: number;
  restDuration: number;
  athlete1Name: string;
  athlete2Name: string;
  athlete1Belt: string;
  athlete2Belt: string;
  score1: number;
  score2: number;
  advantages1: number;
  advantages2: number;
  penalties1: number;
  penalties2: number;
  soundType?: SoundEffectType | null;
  soundTimestamp?: number | null;
  updatedAt: number;
}

export const DEFAULT_TIMER_STATE: TimerSyncData = {
  id: 'tatame_1',
  tatameId: 'tatame_1',
  tatameName: 'Tatame 1 - Principal',
  timerMode: 'SCOREBOARD',
  status: 'IDLE',
  timeRemaining: 360,
  targetEndTime: null,
  totalDuration: 360,
  currentRound: 1,
  totalRounds: 5,
  isResting: false,
  roundDuration: 360,
  restDuration: 60,
  athlete1Name: 'Atleta Azul',
  athlete2Name: 'Atleta Branco',
  athlete1Belt: 'AZUL',
  athlete2Belt: 'BRANCA',
  score1: 0,
  score2: 0,
  advantages1: 0,
  advantages2: 0,
  penalties1: 0,
  penalties2: 0,
  soundType: null,
  soundTimestamp: null,
  updatedAt: Date.now(),
};

const LOCAL_STORAGE_KEY_PREFIX = 'bjjcron_timer_sync_';
const BROADCAST_CHANNEL_NAME = 'bjjcron_timer_broadcast_channel';

// Instância compartilhada do BroadcastChannel
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

let lastPublishedState: Record<string, TimerSyncData> = {};
let lastSoundPlayedTimestamp: number = 0;

/**
 * Publica o estado do cronômetro para o canal local e nuvem (Firestore)
 */
export async function publishTimerSync(data: Partial<TimerSyncData> & { id: string }): Promise<void> {
  const current = lastPublishedState[data.id] || DEFAULT_TIMER_STATE;
  const merged: TimerSyncData = {
    ...current,
    ...data,
    updatedAt: Date.now(),
  };
  lastPublishedState[data.id] = merged;

  // 1. Salvar no LocalStorage para multi-janelas locais instantâneas
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY_PREFIX + merged.id, JSON.stringify(merged));
    }
  } catch {
    // ignore localstorage errors
  }

  // 2. BroadcastChannel local (0ms para HDMI / segunda tela no mesmo navegador)
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type: 'TIMER_SYNC', data: merged });
    } catch {
      // ignore
    }
  }

  // 3. Firestore para Smart TVs na rede WiFi / TV Box / Remoto
  try {
    const docRef = doc(db, 'timer_sync', merged.id);
    await setDoc(docRef, {
      ...merged,
      targetEndTime: merged.targetEndTime || null,
      soundType: merged.soundType || null,
      soundTimestamp: merged.soundTimestamp || null,
    }, { merge: true });
  } catch (err) {
    // Fail gracefully sem quebrar o timer local
    console.warn('[TimerSync] Aviso ao sincronizar com Firestore:', err);
  }
}

/**
 * Dispara um som sincronizado que ecoa na TV e no controle
 */
export async function broadcastSound(tatameId: string, type: SoundEffectType): Promise<void> {
  // Toca imediatamente no dispositivo local
  playTatameSound(type);

  const timestamp = Date.now();
  await publishTimerSync({
    id: tatameId,
    soundType: type,
    soundTimestamp: timestamp,
  });
}

/**
 * Escuta atualizações do cronômetro para espelhamento na TV ou Placar
 */
export function subscribeToTimer(
  tatameId = 'tatame_1',
  callback: (data: TimerSyncData) => void
): () => void {
  let isSubscribed = true;

  // 1. Carrega estado inicial do LocalStorage se disponível
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY_PREFIX + tatameId);
      if (stored) {
        const parsed = JSON.parse(stored) as TimerSyncData;
        callback(parsed);
      }
    }
  } catch {
    // ignore
  }

  // 2. Escuta BroadcastChannel local (latência zero)
  const handleBroadcast = (event: MessageEvent) => {
    if (!isSubscribed) return;
    if (event.data && event.data.type === 'TIMER_SYNC' && event.data.data?.id === tatameId) {
      const data = event.data.data as TimerSyncData;
      handleIncomingData(data);
    }
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.addEventListener('message', handleBroadcast);
    } catch {
      // ignore
    }
  }

  // 3. Escuta eventos do Storage (cross-tab fallback)
  const handleStorage = (event: StorageEvent) => {
    if (!isSubscribed) return;
    if (event.key === LOCAL_STORAGE_KEY_PREFIX + tatameId && event.newValue) {
      try {
        const data = JSON.parse(event.newValue) as TimerSyncData;
        handleIncomingData(data);
      } catch {
        // ignore
      }
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // 4. Escuta Firestore em Tempo Real (Smart TV via Wi-Fi)
  let unsubscribeFirestore = () => {};
  try {
    const docRef = doc(db, 'timer_sync', tatameId);
    unsubscribeFirestore = onSnapshot(docRef, (snapshot) => {
      if (!isSubscribed) return;
      if (snapshot.exists()) {
        const raw = snapshot.data() as any;
        const data: TimerSyncData = {
          ...DEFAULT_TIMER_STATE,
          ...raw,
          id: raw.id || tatameId,
          tatameId: raw.tatameId || tatameId,
        };
        handleIncomingData(data);
      }
    }, (err) => {
      console.warn('[TimerSync] Aviso na escuta Firestore:', err);
    });
  } catch (err) {
    console.warn('[TimerSync] Falha ao registrar onSnapshot:', err);
  }

  function handleIncomingData(data: TimerSyncData) {
    // Verifica se há som novo para tocar na TV
    if (data.soundType && data.soundTimestamp && data.soundTimestamp > lastSoundPlayedTimestamp) {
      lastSoundPlayedTimestamp = data.soundTimestamp;
      playTatameSound(data.soundType);
    }
    callback(data);
  }

  // Limpeza de listeners
  return () => {
    isSubscribed = false;
    if (broadcastChannel) {
      try {
        broadcastChannel.removeEventListener('message', handleBroadcast);
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    unsubscribeFirestore();
  };
}

/**
 * Calcula o tempo restante exato baseado no timestamp de término
 * Evita atrasos de rede ou perda de sincronia
 */
export function computeCurrentRemaining(data: TimerSyncData): number {
  if (data.status === 'RUNNING' && data.targetEndTime) {
    const diff = Math.max(0, Math.ceil((data.targetEndTime - Date.now()) / 1000));
    return diff;
  }
  return data.timeRemaining;
}
