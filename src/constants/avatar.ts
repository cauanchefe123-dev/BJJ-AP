import { BeltType, Student, User } from '../types';

export const BELT_AVATAR_COLORS: Record<BeltType, { strap: string; bar: string; border?: string }> = {
  BRANCA: { strap: '%23f8fafc', bar: '%2309090b', border: '%23e2e8f0' },
  CINZA: { strap: '%2394a3b8', bar: '%2309090b' },
  AMARELA: { strap: '%23eab308', bar: '%2309090b' },
  LARANJA: { strap: '%23f97316', bar: '%2309090b' },
  VERDE: { strap: '%2310b981', bar: '%2309090b' },
  AZUL: { strap: '%232563eb', bar: '%2309090b' },
  ROXA: { strap: '%239333ea', bar: '%2309090b' },
  MARROM: { strap: '%2378350f', bar: '%2309090b' },
  PRETA: { strap: '%2309090b', bar: '%23dc2626' },
  'VERMELHA E PRETA': { strap: '%23dc2626', bar: '%2309090b' },
  'VERMELHA E BRANCA': { strap: '%23dc2626', bar: '%23f8fafc' },
  'VERMELHA': { strap: '%23dc2626', bar: '%23dc2626' },
};

/**
 * Generates an SVG Data URI for a Jiu-Jitsu practitioner wearing a Kimono 
 * with the exact Belt color and degrees/stripes.
 */
export function getGiAvatarForBelt(belt: BeltType = 'BRANCA', stripes: number = 0): string {
  const config = BELT_AVATAR_COLORS[belt] || BELT_AVATAR_COLORS.BRANCA;
  const numStripes = Math.min(Math.max(stripes || 0, 0), 4);

  let stripeSvg = '';
  for (let i = 0; i < numStripes; i++) {
    const y = 165 + i * 3.2;
    stripeSvg += `%3Cline x1='105' y1='${y}' x2='112' y2='${y + 1}' stroke='%23ffffff' stroke-width='1.5' /%3E`;
  }

  const borderPath = config.border 
    ? `%3Cpath d='M68 152 L132 152' stroke='${config.border}' stroke-width='13' stroke-linecap='round' /%3E`
    : '';

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200' width='200' height='200'>` +
    `<rect width='200' height='200' rx='100' fill='%230f172a'/>` +
    `<circle cx='100' cy='62' r='30' fill='%23e2e8f0'/>` +
    `<path d='M42 165 C42 120 62 105 100 105 C138 105 158 120 158 165 L158 200 L42 200 Z' fill='%2318181b'/>` +
    `<path d='M62 108 L100 158 L138 108' stroke='%2327272a' stroke-width='14' fill='none' stroke-linecap='round'/>` +
    `<path d='M80 105 L100 135 L120 105' stroke='%23e2e8f0' stroke-width='2' fill='%2309090b'/>` +
    `<path d='M50 170 L72 110' stroke='%2327272a' stroke-width='3' stroke-linecap='round'/>` +
    `<path d='M150 170 L128 110' stroke='%2327272a' stroke-width='3' stroke-linecap='round'/>` +
    borderPath +
    /* Waist belt strap */
    `<path d='M68 152 L132 152' stroke='${config.strap}' stroke-width='11' stroke-linecap='round'/>` +
    /* Belt hanging tail 1 */
    `<path d='M96 152 L94 184' stroke='${config.strap}' stroke-width='9' stroke-linecap='round'/>` +
    /* Belt hanging tail 2 */
    `<path d='M106 152 L112 184' stroke='${config.strap}' stroke-width='9' stroke-linecap='round'/>` +
    /* Rank Bar (Ponteira) */
    `<path d='M108 162 L111 180' stroke='${config.bar}' stroke-width='7' stroke-linecap='round'/>` +
    /* Stripes */
    stripeSvg +
    `</svg>`;

  return `data:image/svg+xml;utf8,${svg}`;
}

export const DEFAULT_BLACK_GI_AVATAR = getGiAvatarForBelt('PRETA', 3);

/**
 * Returns student's custom photo if set (data URI or HTTP image),
 * or dynamically generates the Gi avatar matching the student's belt & stripes.
 */
export function getStudentAvatar(student?: Partial<Student> | null): string {
  if (!student) return getGiAvatarForBelt('BRANCA', 0);
  if (
    student.photoUrl && 
    student.photoUrl.trim() !== '' && 
    !student.photoUrl.includes('unsplash.com') && 
    !student.photoUrl.startsWith('data:image/svg+xml')
  ) {
    return student.photoUrl;
  }
  return getGiAvatarForBelt(student.belt || 'BRANCA', student.stripes || 0);
}

/**
 * Returns user's custom avatar if set, or resolves to student avatar, or default belt avatar.
 */
export function getUserAvatar(user?: Partial<User> | null, studentObj?: Partial<Student> | null): string {
  if (
    user?.avatarUrl && 
    user.avatarUrl.trim() !== '' && 
    !user.avatarUrl.includes('unsplash.com') && 
    !user.avatarUrl.startsWith('data:image/svg+xml')
  ) {
    return user.avatarUrl;
  }
  if (user?.role === 'ALUNO' && studentObj) {
    return getStudentAvatar(studentObj);
  }
  if (user?.role === 'PROFESSOR' || user?.role === 'ADMIN') {
    return getGiAvatarForBelt('PRETA', 3);
  }
  if (studentObj) {
    return getStudentAvatar(studentObj);
  }
  return getGiAvatarForBelt('BRANCA', 0);
}

/**
 * Safely resolves the Student record for a User without falling back to unrelated students.
 */
export function resolveStudentForUser(user: User | null, students: Student[]): Student | null {
  if (!user) return null;

  const cleanEmail = user.email?.trim().toLowerCase();
  
  const found = students.find(s => 
    (user.studentId && s.id === user.studentId) || 
    (cleanEmail && s.email && s.email.trim().toLowerCase() === cleanEmail)
  );

  if (found) return found;

  if (user.role === 'ALUNO') {
    return {
      id: user.studentId || `std-${user.id}`,
      registrationNumber: `BJJ-2026-001`,
      name: user.name || 'Atleta',
      email: user.email || '',
      phone: user.phone || '',
      birthDate: '2000-01-01',
      photoUrl: user.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
      belt: 'BRANCA',
      stripes: 0,
      startDate: new Date().toISOString().split('T')[0],
      totalClassesAttended: 0,
      classesSinceLastGraduation: 0,
      weightCategory: 'MÉDIO',
      ageCategory: 'ADULTO',
      active: true,
      planName: 'Plano Mensal Padrão',
      planPrice: 240,
      paymentDueDateDay: 10,
      paymentStatus: 'PENDENTE',
      qrCodeToken: `BJJCRON-${user.studentId || user.id}`,
      approvalStatus: user.approvalStatus || 'APPROVED',
      hasActivatedAccount: true,
    };
  }

  return null;
}
