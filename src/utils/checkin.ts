import { BJJClass } from '../types';

export interface CheckinAvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  status: 'OPEN' | 'NOT_TODAY' | 'TOO_EARLY' | 'CLOSED';
  opensAtStr: string;
  closesAtStr: string;
}

export function checkClassCheckinAvailability(
  bjjClass: Partial<BJJClass>,
  now: Date = new Date()
): CheckinAvailabilityResult {
  const currentDayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, ...
  const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const classTime = bjjClass.time || '19:00';
  const timeParts = classTime.split(':').map(Number);
  const classHours = isNaN(timeParts[0]) ? 19 : timeParts[0];
  const classMins = isNaN(timeParts[1]) ? 0 : timeParts[1];

  const classStartMinutes = classHours * 60 + classMins;
  const unlockMinutes = classStartMinutes - 15; // 15 minutes before class
  const duration = bjjClass.durationMinutes || 60;
  const classEndMinutes = classStartMinutes + duration;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const formatMinutes = (totalMins: number) => {
    const clamped = Math.max(0, totalMins);
    const h = Math.floor(clamped / 60) % 24;
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const opensAtStr = formatMinutes(unlockMinutes);
  const closesAtStr = formatMinutes(classEndMinutes);

  // 1. Check day of week
  if (bjjClass.daysOfWeek && bjjClass.daysOfWeek.length > 0) {
    if (!bjjClass.daysOfWeek.includes(currentDayOfWeek)) {
      return {
        isAvailable: false,
        status: 'NOT_TODAY',
        reason: `A aula "${bjjClass.title || 'Turma'}" não ocorre hoje (${dayNames[currentDayOfWeek]}).`,
        opensAtStr,
        closesAtStr,
      };
    }
  }

  // 2. Check time window
  if (currentMinutes < unlockMinutes) {
    return {
      isAvailable: false,
      status: 'TOO_EARLY',
      reason: `Check-in bloqueado! Liberado a partir das ${opensAtStr} (15 min antes da aula das ${classTime}).`,
      opensAtStr,
      closesAtStr,
    };
  }

  if (currentMinutes > classEndMinutes) {
    return {
      isAvailable: false,
      status: 'CLOSED',
      reason: `Check-in encerrado! A aula das ${classTime} já finalizou (término às ${closesAtStr}).`,
      opensAtStr,
      closesAtStr,
    };
  }

  return {
    isAvailable: true,
    status: 'OPEN',
    opensAtStr,
    closesAtStr,
  };
}
