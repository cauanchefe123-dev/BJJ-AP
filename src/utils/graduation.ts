import { Student, AcademyConfig, AttendanceRecord, Graduation } from '../types';
import { getStudentAttendances } from './ranking';
import { getAttendanceLocalDate } from './dateUtils';

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
 * Realiza a correlação dinâmica com o histórico real de frequências/presenças e graduações registradas.
 */
export function getStudentClassesSinceLastGraduation(
  student: Student,
  attendances?: AttendanceRecord[],
  graduations?: Graduation[]
): number {
  if (!student) return 0;

  // Se a lista de presenças estiver disponível, calcula dinamicamente as presenças do atleta
  if (attendances && attendances.length > 0) {
    const studentRecords = getStudentAttendances(student, attendances, 'ALL');

    // Determina a data mais recente de graduação
    let lastGradDate = student.lastGraduationDate;

    if (graduations && graduations.length > 0) {
      const studentGrads = graduations.filter(g => 
        g.studentId === student.id || 
        (g.studentName && student.name && g.studentName.trim().toLowerCase() === student.name.trim().toLowerCase())
      );
      if (studentGrads.length > 0) {
        const sortedGrads = [...studentGrads].sort((a, b) => 
          new Date(b.promotedAt || 0).getTime() - new Date(a.promotedAt || 0).getTime()
        );
        if (sortedGrads[0]?.promotedAt) {
          lastGradDate = sortedGrads[0].promotedAt;
        }
      }
    }

    if (lastGradDate) {
      const cleanLastGradDate = lastGradDate.split('T')[0];
      // Presenças realizadas na data da graduação ou posteriormente contam para o próximo grau
      const postGradAttendances = studentRecords.filter(a => {
        const attDate = getAttendanceLocalDate(a);
        return attDate >= cleanLastGradDate;
      });

      return Math.max(postGradAttendances.length, student.classesSinceLastGraduation || 0);
    } else {
      // Se não houver data formal de graduação registrada, todas as presenças do atleta no sistema contam
      return Math.max(studentRecords.length, student.classesSinceLastGraduation || 0);
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
