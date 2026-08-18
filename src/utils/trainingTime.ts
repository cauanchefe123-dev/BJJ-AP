/**
 * Calculates and formats total training duration for a BJJ student
 * based on their start date and any previous training experience (initial months).
 */

export function calculateTotalTrainingMonths(
  startDate?: string,
  initialMonthsTrained: number = 0
): number {
  const baseInitial = Number(initialMonthsTrained) || 0;
  if (!startDate) return Math.max(0, baseInitial);

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return Math.max(0, baseInitial);

  const now = new Date();

  // Full months elapsed between startDate and current date
  let monthsElapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  // Adjust if current day of month is earlier than start day of month
  if (now.getDate() < start.getDate()) {
    monthsElapsed--;
  }

  return Math.max(0, baseInitial + Math.max(0, monthsElapsed));
}

export function formatTrainingTime(totalMonths: number): string {
  if (totalMonths <= 0) return '0 meses de treino';

  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? 'mês' : 'meses'} de treino`;
  }

  if (months === 0) {
    return `${years} ${years === 1 ? 'ano' : 'anos'} de treino`;
  }

  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'} de treino`;
}

export function getTrainingTimeText(
  startDate?: string,
  initialMonthsTrained: number = 0
): string {
  const totalMonths = calculateTotalTrainingMonths(startDate, initialMonthsTrained);
  return formatTrainingTime(totalMonths);
}
