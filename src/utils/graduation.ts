import { Student, AcademyConfig, AttendanceRecord, Graduation } from '../types';
import { getStudentAttendances } from './ranking';
import { getAttendanceLocalDate, normalizeDateToYYYYMMDD } from './dateUtils';

/**
 * Retorna a meta de treinos necessária para o atleta ficar apto ao próximo grau ou faixa.
 * Verifica primeiro a meta personalizada individual do atleta (`customGraduationTargetClasses`),
 * caso contrário utiliza o critério da academia para a faixa, ou o padrão de 30 aulas.
 */
export function getStudentGraduationTarget(student: Student, academyConfig?: AcademyConfig): number {
  if (!student) return 30;
  if (typeof student.customGraduationTargetClasses === 'number' && student.customGraduationTargetClasses > 0) {
    return student.customGraduationTargetClasses;
  }
  return academyConfig?.graduationCriteria?.[student.belt]?.classesPerStripe || 30;
}

/**
 * Retorna a contagem automática e exata de treinos realizados pelo atleta desde a sua última graduação (pós-grau).
 * Realiza o cálculo dinâmico com base na data da graduação e nos treinos/check-ins bipados pelo atleta.
 * Exemplo: se o atleta graduou hoje e bipar amanhã ou nos próximos dias, cada treino pós-graduação é computado.
 */
export function getStudentClassesSinceLastGraduation(
  student: Student,
  attendances?: AttendanceRecord[],
  graduations?: Graduation[]
): number {
  if (!student) return 0;

  // 1. Determina a data mais recente de graduação do atleta
  // Prioridade: data explicitamente definida no cadastro do aluno (student.lastGraduationDate)
  let lastGradDateStr = student.lastGraduationDate;

  if (!lastGradDateStr && graduations && graduations.length > 0) {
    const cleanStudentId = student.id ? String(student.id).trim() : '';
    const cleanName = student.name ? student.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
    const studentSubId = (student as any).studentId ? String((student as any).studentId).trim() : '';
    const studentUserId = (student as any).userId ? String((student as any).userId).trim() : '';

    const studentGrads = graduations.filter(g => {
      if (!g) return false;
      if (g.studentId) {
        const gId = String(g.studentId).trim();
        if (
          gId === cleanStudentId ||
          (studentSubId && gId === studentSubId) ||
          (studentUserId && gId === studentUserId) ||
          gId === `std-${cleanStudentId}` ||
          cleanStudentId === `std-${gId}` ||
          gId === `user-${cleanStudentId}` ||
          cleanStudentId === `user-${gId}`
        ) {
          return true;
        }
      }
      if (cleanName && g.studentName) {
        const gName = g.studentName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (gName === cleanName) return true;
      }
      return false;
    });

    if (studentGrads.length > 0) {
      const sortedGrads = [...studentGrads].sort((a, b) => {
        const dateA = normalizeDateToYYYYMMDD(a.promotedAt || (a as any).createdAt || 0);
        const dateB = normalizeDateToYYYYMMDD(b.promotedAt || (b as any).createdAt || 0);
        return dateB.localeCompare(dateA);
      });
      if (sortedGrads[0]?.promotedAt) {
        lastGradDateStr = sortedGrads[0].promotedAt;
      }
    }
  }

  // 2. Normaliza a data da última graduação para formato padrão YYYY-MM-DD
  const normalizedGradDate = normalizeDateToYYYYMMDD(lastGradDateStr || student.startDate);

  // 3. Se temos a lista de frequências, calcula com base estrita nos check-ins/bipagens
  if (attendances && attendances.length > 0) {
    const studentRecords = getStudentAttendances(student, attendances, 'ALL');

    if (studentRecords.length > 0) {
      if (normalizedGradDate) {
        // Presenças realizadas na data da graduação em diante (>= data da graduação)
        const postGradAttendances = studentRecords.filter(a => {
          const attDate = normalizeDateToYYYYMMDD(getAttendanceLocalDate(a) || a.date || a.timestamp);
          return attDate >= normalizedGradDate;
        });

        // Retorna exatamente a quantidade real de treinos computados a partir da data da graduação
        return postGradAttendances.length;
      } else {
        // Se não houver data formal de graduação registrada, todas as presenças contam
        return studentRecords.length;
      }
    }
  }

  return student.classesSinceLastGraduation || 0;
}

/**
 * Retorna se o aluno atingiu ou ultrapassou a meta de treinos para o próximo grau/faixa.
 */
export function isStudentEligibleForGraduation(
  student: Student,
  academyConfig?: AcademyConfig,
  attendances?: AttendanceRecord[],
  graduations?: Graduation[]
): boolean {
  if (!student) return false;
  const target = getStudentGraduationTarget(student, academyConfig);
  const classesSince = getStudentClassesSinceLastGraduation(student, attendances, graduations);
  return classesSince >= target;
}
