import { Student, BeltType } from '../types';
import { isDeletedRecord } from '../lib/deletionTracker';

export interface BeltCategoryItem {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  isNoBelt?: boolean;
}

export interface BeltDistributionResult {
  totalActiveStudents: number;
  categories: BeltCategoryItem[];
  beltCounts: Record<string, number>;
  totalCount: number;
  totalPercentage: number;
}

/**
 * Critério único e canônico para determinar se um aluno está ativo no sistema:
 * 1. Objeto válido e não nulo
 * 2. Não marcado como excluído (deletionTracker)
 * 3. `active !== false`
 * 4. `approvalStatus !== 'PENDING'` e `approvalStatus !== 'REJECTED'`
 */
export function isActiveStudent(s: Student | null | undefined): boolean {
  if (!s || !s.id) return false;
  if (isDeletedRecord(s.id, s.email, s.registrationNumber)) return false;
  if (s.active === false) return false;
  if (s.approvalStatus === 'PENDING' || s.approvalStatus === 'REJECTED') return false;
  return true;
}

/**
 * Normaliza o valor de faixa cadastrado no registro do atleta.
 * Retorna uma chave reconhecida de BeltType ou 'SEM_FAIXA' caso esteja em branco, inválido ou nulo.
 */
export function normalizeBeltKey(belt?: string | null): BeltType | 'SEM_FAIXA' {
  if (!belt || typeof belt !== 'string') return 'SEM_FAIXA';
  const clean = belt.trim().toUpperCase();
  if (
    !clean ||
    clean === 'SEM FAIXA' ||
    clean === 'SEM_FAIXA' ||
    clean === 'NENHUMA' ||
    clean === 'NONE' ||
    clean === 'NULL' ||
    clean === 'UNDEFINED'
  ) {
    return 'SEM_FAIXA';
  }

  const validBelts: BeltType[] = [
    'BRANCA',
    'CINZA',
    'AMARELA',
    'LARANJA',
    'VERDE',
    'AZUL',
    'ROXA',
    'MARROM',
    'PRETA',
    'VERMELHA E PRETA',
    'VERMELHA E BRANCA',
    'VERMELHA',
  ];

  const found = validBelts.find(b => b === clean);
  return found || 'SEM_FAIXA';
}

/**
 * Metadados visuais de cada categoria de faixa do BJJCRON
 */
export const BELT_CATEGORY_META: Record<
  BeltType | 'SEM_FAIXA',
  { label: string; color: string; isTraditionalAdult: boolean; order: number }
> = {
  BRANCA: { label: 'Faixa Branca', color: 'bg-slate-200', isTraditionalAdult: true, order: 1 },
  CINZA: { label: 'Faixa Cinza', color: 'bg-slate-400', isTraditionalAdult: false, order: 2 },
  AMARELA: { label: 'Faixa Amarela', color: 'bg-amber-400', isTraditionalAdult: false, order: 3 },
  LARANJA: { label: 'Faixa Laranja', color: 'bg-orange-500', isTraditionalAdult: false, order: 4 },
  VERDE: { label: 'Faixa Verde', color: 'bg-emerald-600', isTraditionalAdult: false, order: 5 },
  AZUL: { label: 'Faixa Azul', color: 'bg-blue-600', isTraditionalAdult: true, order: 6 },
  ROXA: { label: 'Faixa Roxa', color: 'bg-purple-600', isTraditionalAdult: true, order: 7 },
  MARROM: { label: 'Faixa Marrom', color: 'bg-amber-900', isTraditionalAdult: true, order: 8 },
  PRETA: {
    label: 'Faixa Preta',
    color: 'bg-neutral-900 border border-amber-500/40',
    isTraditionalAdult: true,
    order: 9,
  },
  'VERMELHA E PRETA': {
    label: 'Faixa Coral (7º Grau)',
    color: 'bg-red-700 border border-black',
    isTraditionalAdult: false,
    order: 10,
  },
  'VERMELHA E BRANCA': {
    label: 'Faixa Coral (8º Grau)',
    color: 'bg-red-700 border border-white',
    isTraditionalAdult: false,
    order: 11,
  },
  VERMELHA: {
    label: 'Faixa Vermelha',
    color: 'bg-red-600 border border-amber-400',
    isTraditionalAdult: false,
    order: 12,
  },
  SEM_FAIXA: {
    label: 'Sem faixa cadastrada',
    color: 'bg-slate-700 border border-dashed border-slate-500',
    isTraditionalAdult: false,
    order: 99,
  },
};

/**
 * Algoritmo do Maior Resto (Largest Remainder Method / Hare-Niemeyer)
 * Garante que a soma das porcentagens inteiras totalize exatamente 100% (quando total > 0)
 * sem arredondamentos erráticos (como 99% ou 101%) e atribuindo 0% estrito a quantidades 0.
 */
export function calculateConsistentPercentages(counts: number[], total: number): number[] {
  if (total <= 0 || counts.length === 0) {
    return counts.map(() => 0);
  }

  // Se a soma das contagens for zero, todas as porcentagens são 0
  const sumCounts = counts.reduce((acc, c) => acc + c, 0);
  if (sumCounts <= 0) {
    return counts.map(() => 0);
  }

  // 1. Calcula os valores exatos, piso (floor) e os restos
  const rawData = counts.map((count, index) => {
    if (count <= 0) {
      return { index, count, floor: 0, remainder: 0 };
    }
    const exact = (count / total) * 100;
    const floor = Math.floor(exact);
    const remainder = exact - floor;
    return { index, count, floor, remainder };
  });

  const sumFloors = rawData.reduce((acc, item) => acc + item.floor, 0);
  let remainderDiff = 100 - sumFloors;

  // 2. Ordena prioritariamente os que possuem contagem > 0 pelo maior resto
  const sortedByRemainder = [...rawData]
    .filter(item => item.count > 0)
    .sort((a, b) => b.remainder - a.remainder || b.count - a.count);

  const finalPercentages = [...rawData.map(item => item.floor)];

  let i = 0;
  while (remainderDiff > 0 && i < sortedByRemainder.length) {
    finalPercentages[sortedByRemainder[i].index] += 1;
    remainderDiff -= 1;
    i += 1;
  }

  return finalPercentages;
}

/**
 * Calcula a distribuição de faixas rigorosa, consistente e padronizada para o BJJCRON.
 * 
 * Regras implementadas:
 * 1. Filtra estritamente atletas ativos (ignora inativos, excluídos, pendentes e rejeitados).
 * 2. Agrupa por faixa normalizada. Atletas sem faixa são agregados em 'SEM_FAIXA' ("Sem faixa cadastrada").
 * 3. Exibe sempre as 5 faixas tradicionais adultas (Branca, Azul, Roxa, Marrom, Preta), mesmo com quantidade zero.
 * 4. Exibe faixas infantis ou corais se houver ao menos 1 atleta com a faixa cadastrada.
 * 5. Exibe a categoria "Sem faixa cadastrada" caso haja ao menos 1 atleta ativo sem faixa.
 * 6. A soma de categorias.count é IDÊNTICA ao total de atletas ativos.
 * 7. As porcentagens somam RIGOROSAMENTE 100% (ou 0% se 0 ativos) via Largest Remainder Method.
 */
export function getBeltDistribution(students: Student[]): BeltDistributionResult {
  // 1. Filtrar estritamente ativos e remover duplicidades por ID
  const seenIds = new Set<string>();
  const activeStudents: Student[] = [];

  for (const s of students) {
    if (isActiveStudent(s) && !seenIds.has(s.id)) {
      seenIds.add(s.id);
      activeStudents.push(s);
    }
  }

  const totalActiveStudents = activeStudents.length;

  // 2. Contabilizar por categoria normalizada
  const beltCounts: Record<string, number> = {};

  for (const s of activeStudents) {
    const key = normalizeBeltKey(s.belt);
    beltCounts[key] = (beltCounts[key] || 0) + 1;
  }

  // 3. Montar a lista ordenada de categorias a exibir:
  // - As 5 faixas adultas são sempre listadas (Branca, Azul, Roxa, Marrom, Preta)
  // - Outras faixas (Cinza, Amarela, etc.) e "SEM_FAIXA" são incluídas se contagem > 0
  const categoriesToInclude: Array<BeltType | 'SEM_FAIXA'> = [
    'BRANCA',
    'AZUL',
    'ROXA',
    'MARROM',
    'PRETA',
  ];

  // Adiciona faixas infantis / corais que possuam ao menos 1 atleta
  const otherKeys: Array<BeltType | 'SEM_FAIXA'> = [
    'CINZA',
    'AMARELA',
    'LARANJA',
    'VERDE',
    'VERMELHA E PRETA',
    'VERMELHA E BRANCA',
    'VERMELHA',
  ];

  for (const k of otherKeys) {
    if ((beltCounts[k] || 0) > 0 && !categoriesToInclude.includes(k)) {
      categoriesToInclude.push(k);
    }
  }

  // Adiciona "Sem faixa cadastrada" se houver atletas sem faixa
  if ((beltCounts['SEM_FAIXA'] || 0) > 0) {
    categoriesToInclude.push('SEM_FAIXA');
  }

  // Ordena respeitando a hierarquia das faixas
  categoriesToInclude.sort((a, b) => {
    const orderA = BELT_CATEGORY_META[a]?.order ?? 999;
    const orderB = BELT_CATEGORY_META[b]?.order ?? 999;
    return orderA - orderB;
  });

  // 4. Contagens e Porcentagens com arredondamento consistente
  const rawCounts = categoriesToInclude.map(key => beltCounts[key] || 0);
  const percentages = calculateConsistentPercentages(rawCounts, totalActiveStudents);

  const categories: BeltCategoryItem[] = categoriesToInclude.map((key, idx) => {
    const meta = BELT_CATEGORY_META[key];
    const count = rawCounts[idx];
    const percentage = percentages[idx];

    return {
      key,
      label: meta ? meta.label : key,
      count,
      percentage,
      color: meta ? meta.color : 'bg-slate-500',
      isNoBelt: key === 'SEM_FAIXA',
    };
  });

  const totalCount = categories.reduce((sum, c) => sum + c.count, 0);
  const totalPercentage = categories.reduce((sum, c) => sum + c.percentage, 0);

  return {
    totalActiveStudents,
    categories,
    beltCounts,
    totalCount,
    totalPercentage,
  };
}
