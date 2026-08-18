import { Student, AcademyConfig } from '../types';

/**
 * Returns the training target (number of classes) required for a student to be eligible for graduation/stripe.
 * First checks student's individual custom target (`customGraduationTargetClasses`),
 * then falls back to academy/belt criteria, or default 30.
 */
export function getStudentGraduationTarget(student: Student, academyConfig?: AcademyConfig): number {
  if (typeof student.customGraduationTargetClasses === 'number' && student.customGraduationTargetClasses > 0) {
    return student.customGraduationTargetClasses;
  }
  return academyConfig?.graduationCriteria?.[student.belt]?.classesPerStripe || 30;
}

/**
 * Returns whether a student has reached or exceeded their individual or belt training goal.
 */
export function isStudentEligibleForGraduation(student: Student, academyConfig?: AcademyConfig): boolean {
  if (!student) return false;
  const target = getStudentGraduationTarget(student, academyConfig);
  return student.classesSinceLastGraduation >= target;
}
