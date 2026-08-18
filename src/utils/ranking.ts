import { Student, AttendanceRecord } from '../types';

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

  const cleanEmail = student.email ? student.email.trim().toLowerCase() : '';
  const cleanReg = student.registrationNumber ? student.registrationNumber.trim().toLowerCase() : '';
  const cleanName = student.name ? student.name.trim().toLowerCase() : '';

  const studentRecords = attendances.filter(a => {
    if (!a) return false;
    if (a.studentId) {
      if (
        a.studentId === student.id ||
        a.studentId === `std-${student.id}` ||
        student.id === `std-${a.studentId}` ||
        (student.id.startsWith('user-') && a.studentId.includes(student.id.replace('user-', '')))
      ) {
        return true;
      }
    }
    if (cleanEmail && (a as any).studentEmail && (a as any).studentEmail.trim().toLowerCase() === cleanEmail) {
      return true;
    }
    if (cleanReg && (a as any).registrationNumber && (a as any).registrationNumber.trim().toLowerCase() === cleanReg) {
      return true;
    }
    if (cleanName && a.studentName && a.studentName.trim().toLowerCase() === cleanName) {
      return true;
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
      if (!a.date) return false;
      const attDate = new Date(a.date + 'T00:00:00');
      return attDate >= startOfWeek;
    });
  }

  if (period === 'MONTH') {
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    return studentRecords.filter(a => {
      if (!a.date) return false;
      const attDate = new Date(a.date + 'T00:00:00');
      return attDate.getFullYear() === currentYear && attDate.getMonth() === currentMonth;
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
