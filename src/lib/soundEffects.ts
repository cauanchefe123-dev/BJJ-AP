/**
 * BJJCRON - Sistema de Áudio e Gongo do Tatame
 * Síntese sonora pura via Web Audio API (sem dependência de arquivos externos)
 */

export type SoundEffectType = 'START' | 'STOP' | 'WARNING' | 'FINISHED' | 'SCORE';

let sharedAudioCtx: AudioContext | null = null;
let isAudioUnlocked = false;

export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioCtx = new AudioCtx();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().then(() => {
        isAudioUnlocked = true;
      }).catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Permite desbloquear o áudio no primeiro clique do usuário na TV ou navegador
 */
export function unlockAudio(): boolean {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      isAudioUnlocked = true;
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function playTatameSound(type: SoundEffectType, volume = 0.5): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'START') {
      // Apito duplo enérgico de início de combate
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.15);
      gain.gain.setValueAtTime(0.35 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'STOP') {
      // Tom firme de parada / pausa (Parou!)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.35 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    } else if (type === 'WARNING') {
      // Pulso de alerta dos 10 segundos finais
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      gain.gain.setValueAtTime(0.3 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'FINISHED') {
      // Gongo oficial clássico do tatame de Jiu-Jitsu (ressoante e encorpado)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 1.8);
      gain.gain.setValueAtTime(0.6 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      osc.start(now);
      osc.stop(now + 2.5);

      // Harmônico secundário para corpo de sino metálico
      try {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(880, now);
        osc2.frequency.exponentialRampToValueAtTime(440, now + 1.2);
        gain2.gain.setValueAtTime(0.3 * volume, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc2.start(now);
        osc2.stop(now + 1.5);
      } catch {
        // ignore secondary tone
      }
    } else if (type === 'SCORE') {
      // Clique sutil ao computar pontuação
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now);
      gain.gain.setValueAtTime(0.18 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    }
  } catch {
    // ignore
  }
}
