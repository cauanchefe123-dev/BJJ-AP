import { getBeltDistribution, calculateConsistentPercentages, normalizeBeltKey, isActiveStudent } from './beltDistribution';
import { Student } from '../types';

function createMockStudent(overrides: Partial<Student>): Student {
  return {
    id: overrides.id || `std-${Math.random().toString(36).substring(2, 9)}`,
    registrationNumber: overrides.registrationNumber || 'BJJ-2026-001',
    name: overrides.name || 'Atleta Teste',
    email: overrides.email || 'teste@bjjcron.com',
    phone: '11999999999',
    birthDate: '1995-01-01',
    photoUrl: '',
    belt: (overrides.belt !== undefined ? overrides.belt : 'BRANCA') as any,
    stripes: overrides.stripes ?? 0,
    startDate: '2025-01-01',
    totalClassesAttended: 20,
    classesSinceLastGraduation: 5,
    weightCategory: 'MÉDIO',
    ageCategory: 'ADULTO',
    active: overrides.active !== undefined ? overrides.active : true,
    planName: 'Mensal',
    planPrice: 150,
    paymentDueDateDay: 10,
    paymentStatus: 'PAGO',
    qrCodeToken: 'BJJCRON-TEST',
    approvalStatus: overrides.approvalStatus || 'APPROVED',
    ...overrides,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}: ${detail || ''}`);
    process.exitCode = 1;
  }
}

console.log('=== INICIANDO SUÍTE DE TESTES DE DISTRIBUIÇÃO DE FAIXAS (BJJCRON) ===\n');

// -------------------------------------------------------------
// TESTE 1: Cenário Real Reportado pelo Usuário
// 12 branca, 3 azul, 1 roxa, 0 marrom, 1 preta, 3 sem faixa = 20 atletas ativos
// -------------------------------------------------------------
const studentsScenario1: Student[] = [
  ...Array.from({ length: 12 }, (_, i) => createMockStudent({ id: `b-${i}`, belt: 'BRANCA', active: true })),
  ...Array.from({ length: 3 }, (_, i) => createMockStudent({ id: `a-${i}`, belt: 'AZUL', active: true })),
  createMockStudent({ id: 'r-0', belt: 'ROXA', active: true }),
  createMockStudent({ id: 'p-0', belt: 'PRETA', active: true }),
  // 3 atletas sem faixa cadastrada (null, vazio, ou 'SEM FAIXA')
  createMockStudent({ id: 'nf-1', belt: '' as any, active: true }),
  createMockStudent({ id: 'nf-2', belt: undefined as any, active: true }),
  createMockStudent({ id: 'nf-3', belt: 'SEM FAIXA' as any, active: true }),
];

const res1 = getBeltDistribution(studentsScenario1);

assert(res1.totalActiveStudents === 20, 'Cenário 1: Total de atletas ativos deve ser 20', `Obteve: ${res1.totalActiveStudents}`);
assert(res1.totalCount === 20, 'Cenário 1: Soma das categorias deve ser exatamente igual a 20', `Obteve: ${res1.totalCount}`);
assert(res1.totalPercentage === 100, 'Cenário 1: Soma das porcentagens deve ser exatamente 100%', `Obteve: ${res1.totalPercentage}`);

const noBeltCategory = res1.categories.find(c => c.key === 'SEM_FAIXA');
assert(noBeltCategory !== undefined && noBeltCategory.count === 3, 'Cenário 1: Deve exibir categoria "Sem faixa cadastrada" com 3 atletas', `Obteve: ${noBeltCategory?.count}`);
assert(noBeltCategory?.percentage === 15, 'Cenário 1: Categoria "Sem faixa cadastrada" deve ter 15% (3/20)', `Obteve: ${noBeltCategory?.percentage}`);

const brownBeltCategory = res1.categories.find(c => c.key === 'MARROM');
assert(brownBeltCategory !== undefined && brownBeltCategory.count === 0, 'Cenário 1: Categoria Marrom deve aparecer com 0 atletas', `Obteve: ${brownBeltCategory?.count}`);
assert(brownBeltCategory?.percentage === 0, 'Cenário 1: Categoria Marrom zerada deve ter 0%', `Obteve: ${brownBeltCategory?.percentage}`);

const whiteBeltCategory = res1.categories.find(c => c.key === 'BRANCA');
assert(whiteBeltCategory?.count === 12 && whiteBeltCategory?.percentage === 60, 'Cenário 1: Faixa Branca com 12 atletas e 60%', `Obteve: ${whiteBeltCategory?.count}, ${whiteBeltCategory?.percentage}%`);

// -------------------------------------------------------------
// TESTE 2: Exclusão de Atletas Inativos, Pendentes e Rejeitados
// -------------------------------------------------------------
const studentsScenario2: Student[] = [
  createMockStudent({ id: 'act-1', belt: 'AZUL', active: true, approvalStatus: 'APPROVED' }),
  createMockStudent({ id: 'act-2', belt: 'AZUL', active: true, approvalStatus: 'APPROVED' }),
  // Inativo com active: false
  createMockStudent({ id: 'inact-1', belt: 'BRANCA', active: false, approvalStatus: 'APPROVED' }),
  // Inativo com aprovação pendente
  createMockStudent({ id: 'pend-1', belt: 'PRETA', active: true, approvalStatus: 'PENDING' }),
  // Rejeitado
  createMockStudent({ id: 'rej-1', belt: 'ROXA', active: false, approvalStatus: 'REJECTED' }),
];

const res2 = getBeltDistribution(studentsScenario2);
assert(res2.totalActiveStudents === 2, 'Cenário 2: Deve ignorar inativos, pendentes e rejeitados, totalizando 2', `Obteve: ${res2.totalActiveStudents}`);
assert(res2.totalCount === 2, 'Cenário 2: Soma das contagens deve ser 2', `Obteve: ${res2.totalCount}`);
assert(res2.totalPercentage === 100, 'Cenário 2: Porcentagem total deve ser 100%', `Obteve: ${res2.totalPercentage}`);
const azul2 = res2.categories.find(c => c.key === 'AZUL');
assert(azul2?.count === 2 && azul2?.percentage === 100, 'Cenário 2: Faixa Azul com 100%', `Obteve: ${azul2?.count}, ${azul2?.percentage}%`);
const preta2 = res2.categories.find(c => c.key === 'PRETA');
assert(preta2?.count === 0 && preta2?.percentage === 0, 'Cenário 2: Faixa Preta (pendente) não deve ser computada', `Obteve: ${preta2?.count}`);

// -------------------------------------------------------------
// TESTE 3: Ausência de Atletas Ativos (Base Vazia ou Apenas Inativos)
// -------------------------------------------------------------
const studentsScenario3: Student[] = [
  createMockStudent({ id: 'in-1', belt: 'BRANCA', active: false }),
  createMockStudent({ id: 'in-2', belt: 'PRETA', active: false }),
];

const res3 = getBeltDistribution(studentsScenario3);
assert(res3.totalActiveStudents === 0, 'Cenário 3: 0 atletas ativos', `Obteve: ${res3.totalActiveStudents}`);
assert(res3.totalCount === 0, 'Cenário 3: Soma das contagens igual a 0', `Obteve: ${res3.totalCount}`);
assert(res3.totalPercentage === 0, 'Cenário 3: Porcentagem total igual a 0%', `Obteve: ${res3.totalPercentage}`);
assert(res3.categories.every(c => c.percentage === 0 && c.count === 0), 'Cenário 3: Todas as categorias têm 0 atletas e 0%', 'Alguma categoria não zerada');

// -------------------------------------------------------------
// TESTE 4: Arredondamento com Dízima Periódica (Largest Remainder Method)
// 3 atletas (1 Branca, 1 Azul, 1 Roxa) -> Cada um tem 33.333...%, soma deve ser 100%
// -------------------------------------------------------------
const studentsScenario4: Student[] = [
  createMockStudent({ id: 's4-1', belt: 'BRANCA', active: true }),
  createMockStudent({ id: 's4-2', belt: 'AZUL', active: true }),
  createMockStudent({ id: 's4-3', belt: 'ROXA', active: true }),
];

const res4 = getBeltDistribution(studentsScenario4);
assert(res4.totalActiveStudents === 3, 'Cenário 4: 3 atletas ativos', `Obteve: ${res4.totalActiveStudents}`);
assert(res4.totalPercentage === 100, 'Cenário 4: Soma das porcentagens é exatamente 100% com dízima periódica', `Obteve: ${res4.totalPercentage}`);
const pCounts4 = res4.categories.filter(c => c.count > 0).map(c => c.percentage);
assert(pCounts4.reduce((a, b) => a + b, 0) === 100, 'Cenário 4: Soma individual dos percentuais ativos é 100%', `Valores: ${pCounts4.join(', ')}`);

// Outro teste de dízima: 7 atletas (1, 1, 1, 1, 1, 1, 1)
const p7 = calculateConsistentPercentages([1, 1, 1, 1, 1, 1, 1], 7);
const sum7 = p7.reduce((a, b) => a + b, 0);
assert(sum7 === 100, 'Cenário 4B: 7 atletas com 1 cada somam 100%', `Soma: ${sum7}`);

// -------------------------------------------------------------
// TESTE 5: Categorias Zeradas Não Devem Receber Restos de Arredondamento
// -------------------------------------------------------------
const pZero = calculateConsistentPercentages([0, 1, 2], 3);
assert(pZero[0] === 0, 'Cenário 5: Categoria com 0 atletas deve ter rigorosamente 0%', `Obteve: ${pZero[0]}`);
assert(pZero[1] + pZero[2] === 100, 'Cenário 5: As demais categorias somam 100%', `Obteve: ${pZero[1]} + ${pZero[2]}`);

// -------------------------------------------------------------
// TESTE 6: Suporte a Faixas Infantis (Cinza, Amarela, etc.) e Normalização de Caracteres
// -------------------------------------------------------------
const studentsScenario6: Student[] = [
  createMockStudent({ id: 'kid-1', belt: 'cinza' as any, active: true }),
  createMockStudent({ id: 'kid-2', belt: ' CINZA ' as any, active: true }),
  createMockStudent({ id: 'kid-3', belt: 'amarela' as any, active: true }),
  createMockStudent({ id: 'adult-1', belt: 'PRETA', active: true }),
];

const res6 = getBeltDistribution(studentsScenario6);
assert(res6.totalActiveStudents === 4, 'Cenário 6: 4 atletas com faixas infantis e normalização', `Obteve: ${res6.totalActiveStudents}`);
assert(res6.totalPercentage === 100, 'Cenário 6: Porcentagem total 100%', `Obteve: ${res6.totalPercentage}`);
const cinzaCat = res6.categories.find(c => c.key === 'CINZA');
assert(cinzaCat !== undefined && cinzaCat.count === 2, 'Cenário 6: Categoria Cinza com 2 atletas', `Obteve: ${cinzaCat?.count}`);

// -------------------------------------------------------------
// TESTE 7: Deduplicação por ID
// -------------------------------------------------------------
const studentsScenario7: Student[] = [
  createMockStudent({ id: 'dup-1', belt: 'AZUL', active: true }),
  createMockStudent({ id: 'dup-1', belt: 'AZUL', active: true }), // duplicado
  createMockStudent({ id: 'dup-2', belt: 'PRETA', active: true }),
];

const res7 = getBeltDistribution(studentsScenario7);
assert(res7.totalActiveStudents === 2, 'Cenário 7: Deduplicação evita contagem duplicada', `Obteve: ${res7.totalActiveStudents}`);
assert(res7.totalCount === 2, 'Cenário 7: TotalCount deduplicado', `Obteve: ${res7.totalCount}`);

console.log(`\n=============================================================`);
console.log(`RESULTADO: ${passedTests} de ${totalTests} testes passaram com sucesso!`);
console.log(`=============================================================\n`);
