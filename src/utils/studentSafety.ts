import { Student, AttendanceRecord, Graduation, PaymentRecord, TrainingLog, TeacherObservation, RollChallenge } from '../types';

export interface DependentRecordItem {
  type: string;
  label: string;
  count: number;
}

export interface StudentDependentRecords {
  hasDependents: boolean;
  totalCount: number;
  items: DependentRecordItem[];
  attendancesCount: number;
  graduationsCount: number;
  paymentsCount: number;
  trainingLogsCount: number;
  observationsCount: number;
  challengesCount: number;
  summaryText: string;
}

/**
 * Verifica se um aluno possui qualquer registro dependente no sistema
 * (presenças, graduações, mensalidades/pagamentos, logs de treino ou observações).
 * Se possuir registros, a exclusão definitiva DEVE ser bloqueada.
 */
export function checkStudentDependentRecords(
  student: Student,
  attendances: AttendanceRecord[] = [],
  graduations: Graduation[] = [],
  payments: PaymentRecord[] = [],
  trainingLogs: TrainingLog[] = [],
  observations: TeacherObservation[] = [],
  challenges: RollChallenge[] = []
): StudentDependentRecords {
  const studentId = student.id;
  const cleanId = String(studentId).trim().toLowerCase();
  const cleanName = student.name?.trim().toLowerCase() || '';

  // 1. Presenças
  const studentAttendances = attendances.filter(a => {
    if (a.studentId === studentId || String(a.studentId).trim().toLowerCase() === cleanId) return true;
    if (cleanName && a.studentName && a.studentName.trim().toLowerCase() === cleanName) return true;
    return false;
  });
  const attendancesCount = Math.max(studentAttendances.length, student.totalClassesAttended || 0);

  // 2. Graduações e emissões de graus
  const studentGraduations = graduations.filter(g => {
    if (g.studentId === studentId || String(g.studentId).trim().toLowerCase() === cleanId) return true;
    if (cleanName && g.studentName && g.studentName.trim().toLowerCase() === cleanName) return true;
    return false;
  });
  const graduationsCount = studentGraduations.length;

  // 3. Pagamentos / Mensalidades
  const studentPayments = payments.filter(p => {
    if (p.studentId === studentId || String(p.studentId).trim().toLowerCase() === cleanId) return true;
    if (cleanName && p.studentName && p.studentName.trim().toLowerCase() === cleanName) return true;
    return false;
  });
  const paymentsCount = studentPayments.length;

  // 4. Diário de Treinos
  const studentTrainingLogs = trainingLogs.filter(t => {
    return t.studentId === studentId || String(t.studentId).trim().toLowerCase() === cleanId;
  });
  const trainingLogsCount = studentTrainingLogs.length;

  // 5. Observações Pedagógicas
  const studentObservations = observations.filter(o => {
    return o.studentId === studentId || String(o.studentId).trim().toLowerCase() === cleanId;
  });
  const observationsCount = studentObservations.length;

  // 6. Desafios / Rola Interno
  const studentChallenges = challenges.filter(c => {
    return (
      c.challengerId === studentId ||
      c.challengedId === studentId ||
      String(c.challengerId).trim().toLowerCase() === cleanId ||
      String(c.challengedId).trim().toLowerCase() === cleanId
    );
  });
  const challengesCount = studentChallenges.length;

  const items: DependentRecordItem[] = [];

  if (attendancesCount > 0) {
    items.push({ type: 'attendances', label: 'Presenças / Aulas', count: attendancesCount });
  }
  if (graduationsCount > 0) {
    items.push({ type: 'graduations', label: 'Histórico de Graduações', count: graduationsCount });
  }
  if (paymentsCount > 0) {
    items.push({ type: 'payments', label: 'Registros Financeiros / Mensalidades', count: paymentsCount });
  }
  if (trainingLogsCount > 0) {
    items.push({ type: 'trainingLogs', label: 'Anotações no Diário de Treino', count: trainingLogsCount });
  }
  if (observationsCount > 0) {
    items.push({ type: 'observations', label: 'Observações de Professores', count: observationsCount });
  }
  if (challengesCount > 0) {
    items.push({ type: 'challenges', label: 'Desafios / Lutas Registradas', count: challengesCount });
  }

  const totalCount =
    attendancesCount +
    graduationsCount +
    paymentsCount +
    trainingLogsCount +
    observationsCount +
    challengesCount;

  const hasDependents = totalCount > 0;

  const summaryParts: string[] = [];
  if (attendancesCount > 0) summaryParts.push(`${attendancesCount} presença(s)`);
  if (graduationsCount > 0) summaryParts.push(`${graduationsCount} graduação(ões)`);
  if (paymentsCount > 0) summaryParts.push(`${paymentsCount} pagamento(s)`);
  if (trainingLogsCount > 0) summaryParts.push(`${trainingLogsCount} diário(s)`);
  if (observationsCount > 0) summaryParts.push(`${observationsCount} observação(ões)`);
  if (challengesCount > 0) summaryParts.push(`${challengesCount} desafio(s)`);

  const summaryText = summaryParts.join(', ');

  return {
    hasDependents,
    totalCount,
    items,
    attendancesCount,
    graduationsCount,
    paymentsCount,
    trainingLogsCount,
    observationsCount,
    challengesCount,
    summaryText,
  };
}
