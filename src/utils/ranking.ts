import { Student, AttendanceRecord } from '../types';
import { getAttendanceLocalDate } from './dateUtils';

export type RankingPeriod = 'WEEK' | 'MONTH' | 'ALL';

export interface StudentRankingItem {
  student: Student;
  weekCount: number;
  monthCount: number;
  allTimeCount: number;
  displayCount: number;
  rank: number;
}

export function getStudentAttendances(
  student: Student,
  attendances: AttendanceRecord[],
  period: RankingPeriod = 'ALL'
): AttendanceRecord[] {
  if (!student || !attendances) return [];

  const cleanId = student.id ? String(student.id).trim() : '';
  const cleanEmail = student.email ? student.email.trim().toLowerCase() : '';
  const cleanReg = student.registrationNumber ? student.registrationNumber.trim().toLowerCase() : '';
  const cleanName = student.name ? student.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
  const studentSubId = (student as any).studentId ? String((student as any).studentId).trim() : '';
  const studentUserId = (student as any).userId ? String((student as any).userId).trim() : '';

  const studentRecords = attendances.filter(a => {
    if (!a) return false;

    // 1. Verificação por ID com suporte a prefixos std-, user-, u-, etc.
    if (a.studentId) {
      const aId = String(a.studentId).trim();
      if (
        aId === cleanId ||
        (studentSubId && aId === studentSubId) ||
        (studentUserId && aId === studentUserId) ||
        aId === `std-${cleanId}` ||
        cleanId === `std-${aId}` ||
        aId === `user-${cleanId}` ||
        cleanId === `user-${aId}` ||
        (cleanId.startsWith('user-') && aId === cleanId.replace('user-', '')) ||
        (cleanId.startsWith('std-') && aId === cleanId.replace('std-', '')) ||
        (studentSubId && (aId === `user-${studentSubId}` || studentSubId === `std-${aId}`))
      ) {
        return true;
      }
    }

    // 2. Verificação por e-mail
    if (cleanEmail && (a as any).studentEmail && String((a as any).studentEmail).trim().toLowerCase() === cleanEmail) {
      return true;
    }

    // 3. Verificação por número de matrícula
    if (cleanReg && (a as any).registrationNumber && String((a as any).registrationNumber).trim().toLowerCase() === cleanReg) {
      return true;
    }

    // 4. Verificação por nome insensível a acentuação e maiúsculas
    if (cleanName && a.studentName) {
      const aName = a.studentName.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (aName === cleanName) {
        return true;
      }
    }

    return false;
  });

  if (period === 'ALL') return studentRecords;

  const now = new Date();

  if (period === 'WEEK') {
    // Current week: Monday 00:00:00 to now
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday (monday is day 1)
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return studentRecords.filter(a => {
      const localDate = getAttendanceLocalDate(a);
      if (!localDate) return false;
      const attDate = new Date(localDate + 'T00:00:00');
      return attDate >= startOfWeek;
    });
  }

  if (period === 'MONTH') {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return studentRecords.filter(a => {
      const localDate = getAttendanceLocalDate(a);
      if (!localDate) return false;
      const [y, m] = localDate.split('-').map(Number);
      return y === currentYear && m === (currentMonth + 1);
    });
  }

  return studentRecords;
}

export function getStudentTotalClasses(
  student: Student,
  attendances: AttendanceRecord[]
): number {
  if (!student) return 0;
  const allRecords = getStudentAttendances(student, attendances || [], 'ALL');
  return Math.max(allRecords.length, student.totalClassesAttended || 0);
}

export function calculateRanking(
  students: Student[],
  attendances: AttendanceRecord[],
  period: RankingPeriod = 'WEEK'
): StudentRankingItem[] {
  const items = students.map(s => {
    const weekRecords = getStudentAttendances(s, attendances, 'WEEK');
    const monthRecords = getStudentAttendances(s, attendances, 'MONTH');
    const allRecords = getStudentAttendances(s, attendances, 'ALL');

    const weekCount = weekRecords.length;
    const monthCount = monthRecords.length;
    const allTimeCount = Math.max(allRecords.length, s.totalClassesAttended || 0);

    let displayCount = weekCount;
    if (period === 'MONTH') displayCount = monthCount;
    if (period === 'ALL') displayCount = allTimeCount;

    return {
      student: s,
      weekCount,
      monthCount,
      allTimeCount,
      displayCount,
    };
  });

  // Sort descending by displayCount, then monthCount, then allTimeCount
  items.sort((a, b) => {
    if (b.displayCount !== a.displayCount) return b.displayCount - a.displayCount;
    if (b.monthCount !== a.monthCount) return b.monthCount - a.monthCount;
    return b.allTimeCount - a.allTimeCount;
  });

  return items.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
