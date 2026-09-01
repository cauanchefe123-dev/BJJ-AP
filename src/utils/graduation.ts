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

  // 2. Se temos a lista de frequências, calcula com base estrita na data de graduação e nos treinos bipados
  if (attendances && attendances.length > 0) {
    const studentRecords = getStudentAttendances(student, attendances, 'ALL');

    if (lastGradDate) {
      const cleanLastGradDate = lastGradDate.includes('T') ? lastGradDate.split('T')[0] : lastGradDate.trim();
      
      // Presenças realizadas na data da graduação ou posteriormente (ex: se graduou hoje e bipou amanhã)
      const postGradAttendances = studentRecords.filter(a => {
        const attDate = getAttendanceLocalDate(a);
        return attDate >= cleanLastGradDate;
      });

      return postGradAttendances.length;
    } else {
      // Se não houver data formal de graduação registrada, todas as presenças do atleta contam
      return studentRecords.length;
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
