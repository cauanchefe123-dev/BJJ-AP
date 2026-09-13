import { checkStudentDependentRecords } from './studentSafety';
import { Student, AttendanceRecord, Graduation, PaymentRecord, TrainingLog } from '../types';

let passed = 0;
let total = 0;

function assert(condition: boolean, name: string, detail?: string) {
  total++;
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name}: ${detail || ''}`);
    process.exitCode = 1;
  }
}

const mockStudent: Student = {
  id: 'std-100',
  registrationNumber: 'BJJ-2026-100',
  name: 'Carlos Gracie Silva',
  email: 'carlos@bjjcron.com',
  phone: '11988887777',
  birthDate: '1990-01-01',
  photoUrl: '',
  belt: 'AZUL',
  stripes: 2,
  startDate: '2024-01-01',
  totalClassesAttended: 45,
  classesSinceLastGraduation: 10,
  weightCategory: 'MÉDIO',
  ageCategory: 'ADULTO',
  active: true,
  planName: 'Mensal',
  planPrice: 150,
  paymentDueDateDay: 10,
  paymentStatus: 'PAGO',
  qrCodeToken: 'BJJCRON-100',
  approvalStatus: 'APPROVED',
};

console.log('=== TESTES DE SEGURANÇA OPERACIONAL DE ALUNOS ===\n');

// Test 1: Aluno com histórico de presenças e graduações
const attendances: AttendanceRecord[] = [
  {
    id: 'att-1',
    studentId: 'std-100',
    studentName: 'Carlos Gracie Silva',
    classId: 'cls-1',
    className: 'Noite Gi',
    date: '2026-03-01',
    timestamp: '2026-03-01T19:00:00Z',
    method: 'MANUAL',
  },
];
const graduations: Graduation[] = [
  {
    id: 'grad-1',
    studentId: 'std-100',
    belt: 'AZUL',
    stripes: 1,
    promotedBy: 'Mestre',
    promotedAt: '2025-06-01',
    classesCountAtPromotion: 30,
  },
];

const res1 = checkStudentDependentRecords(mockStudent, attendances, graduations, []);
assert(res1.hasDependents === true, 'Deve detectar registros dependentes', `Obteve: ${res1.hasDependents}`);
assert(res1.attendancesCount >= 1, 'Deve contabilizar presenças');
assert(res1.graduationsCount === 1, 'Deve contabilizar graduações');
assert(res1.items.length >= 2, 'Deve listar itens de dependência');

// Test 2: Aluno novo sem qualquer registro dependente
const newStudent: Student = {
  ...mockStudent,
  id: 'std-new-999',
  name: 'Aluno Sem Registros',
  totalClassesAttended: 0,
  classesSinceLastGraduation: 0,
};

const res2 = checkStudentDependentRecords(newStudent, [], [], []);
assert(res2.hasDependents === false, 'Aluno sem registros não deve ter dependências');
assert(res2.totalCount === 0, 'Total de registros dependentes deve ser 0');
assert(res2.items.length === 0, 'Lista de itens dependentes deve estar vazia');

// Test 3: Aluno com apenas mensalidades
const payments: PaymentRecord[] = [
  {
    id: 'pay-1',
    studentId: 'std-new-999',
    studentName: 'Aluno Sem Registros',
    amount: 150,
    dueDate: '2026-04-10',
    status: 'PAGO',
    referenceMonth: '04/2026',
  },
];
const res3 = checkStudentDependentRecords(newStudent, [], [], payments);
assert(res3.hasDependents === true, 'Deve bloquear aluno com mensalidade registrada');
assert(res3.paymentsCount === 1, 'Deve contabilizar pagamento');

console.log(`\nResultado: ${passed}/${total} testes passaram com sucesso.`);
