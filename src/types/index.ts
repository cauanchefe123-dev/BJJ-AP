export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'WEEKLY_FOCUS' | 'TEACHER_NOTICE' | 'ANNOUNCEMENT' | 'GENERAL';
  targetClassId?: string;
  targetClassName?: string;
  createdAt: string; // ISO string
  readBy: string[]; // array of student/user IDs who marked it as read
  authorName?: string;
}

export type UserRole = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

export type BeltType = 
  | 'BRANCA' 
  | 'CINZA' 
  | 'AMARELA' 
  | 'LARANJA' 
  | 'VERDE' 
  | 'AZUL' 
  | 'ROXA' 
  | 'MARROM' 
  | 'PRETA'
  | 'VERMELHA E PRETA'
  | 'VERMELHA E BRANCA'
  | 'VERMELHA';

export type PaymentStatus = 'PAGO' | 'PENDENTE' | 'ATRASADO';

export type PaymentMethod = 'PIX' | 'CARTAO' | 'DINHEIRO' | 'BOLETO';

export type AgeCategory = 'KIDS' | 'JUVENIL' | 'ADULTO' | 'MASTER_1' | 'MASTER_2' | 'MASTER_3+';

export type WeightCategory = 
  | 'GALO' 
  | 'PLUMA' 
  | 'PENA' 
  | 'LEVE' 
  | 'MÉDIO' 
  | 'MEIO-PESADO' 
  | 'PESADO' 
  | 'SUPER-PESADO' 
  | 'PESADÍSSIMO' 
  | 'ABSOLUTO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  studentId?: string; // Link to student record if role is ALUNO or PROFESSOR
  phone?: string;
  password?: string;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  isActivated?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  phone: string;
  belt: BeltType;
  degrees: number; // 0 to 6 degrees / stripes
  specialty: string; // e.g. "Fundamental, No-Gi, Competição"
  cref?: string; // Conselho Regional de Educação Física
  photoUrl: string;
  bio?: string;
  active: boolean;
  startDate: string;
}

export interface Graduation {
  id: string;
  studentId: string;
  belt: BeltType;
  stripes: number; // 0 to 4
  promotedBy: string; // Professor name
  promotedAt: string; // ISO date
  notes?: string;
  classesCountAtPromotion: number;
}

export interface BeltChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  currentBelt: BeltType;
  currentStripes: number;
  requestedBelt: BeltType;
  requestedStripes: number;
  requestDate: string; // ISO or YYYY-MM-DD
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Student {
  id: string;
  registrationNumber: string; // e.g. BJJ-2026-001
  name: string;
  email: string;
  phone: string;
  cpf?: string;
  birthDate: string;
  photoUrl: string;
  belt: BeltType;
  stripes: number; // 0-4
  startDate: string; // Date joined
  initialMonthsTrained?: number; // Previous training experience in months prior to joining (e.g. 8 months)
  totalClassesAttended: number;
  classesSinceLastGraduation: number;
  customGraduationTargetClasses?: number; // Meta individual de treinos para graduar
  weightCategory: WeightCategory;
  ageCategory: AgeCategory;
  active: boolean;
  notes?: string;
  emergencyContact?: string;
  planName: string; // e.g. "Mensal Anual", "Padrão"
  planPrice: number;
  paymentDueDateDay: number; // 1-28
  paymentStatus: PaymentStatus;
  lastPaymentDate?: string;
  lastGraduationDate?: string; // YYYY-MM-DD
  qrCodeToken: string;
  approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED';
  hasActivatedAccount?: boolean;
  password?: string;
}

export interface BJJClass {
  id: string;
  title: string;
  professorId: string;
  professorName: string;
  daysOfWeek: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  time: string; // e.g. "19:30"
  durationMinutes: number; // e.g. 90
  category: 'FUNDAMENTAL' | 'INTERMEDIÁRIO' | 'AVANÇADO' | 'NO_GI' | 'KIDS' | 'OPEN_MAT';
  maxCapacity: number;
  active: boolean;
  description?: string;
  weeklyFocus?: string; // Foco técnico da semana (ex: Raspagem de De La Riva)
  weeklyFocusVideoUrl?: string; // Link de vídeo da técnica (YouTube, Instagram, MP4)
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO String
  method: 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER';
  verifiedBy?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paymentDate?: string; // YYYY-MM-DD
  status: PaymentStatus;
  paymentMethod?: PaymentMethod;
  referenceMonth: string; // e.g. "07/2026"
  receiptUrl?: string;
  pixCode?: string;
}

export interface TrainingLog {
  id: string;
  studentId: string;
  date: string;
  durationMinutes: number;
  techniquesLearned: string[];
  roundsCount: number;
  notes: string;
  moodRating: number; // 1-5
  modality?: 'GI' | 'NO_GI';
  sessionType?: 'AULA_REGULAR' | 'OPEN_MAT' | 'COMPETICAO' | 'PARTICULAR' | 'TREINO_LIVRE';
  submissionsApplied?: string[];
  submissionsReceived?: string[];
  categoryTags?: string[];
}

export interface TeacherObservation {
  id: string;
  studentId: string;
  studentName?: string;
  teacherId: string;
  teacherName: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
  category: 'TÉCNICA' | 'EVOLUÇÃO' | 'COMPORTAMENTO' | 'GERAL';
}

export interface GraduationCriteria {
  belt: BeltType;
  classesRequiredPerStripe: number;
  monthsRequiredForNextBelt: number;
}

export interface AcademyConfig {
  name: string;
  fantasyName: string;
  cnpj: string;
  headCoachName: string;
  headCoachBelt: BeltType;
  phone: string;
  email: string;
  address: string;
  logoUrl: string;
  pixKey: string;
  environmentMode?: 'HOMOLOGATION' | 'PRODUCTION';
  graduationCriteria: Record<BeltType, { classesPerStripe: number; monthsForNextBelt: number }>;
  supabaseConfig?: {
    url: string;
    anonKey: string;
    connected: boolean;
  };
}

export interface RankingItem {
  studentId: string;
  studentName: string;
  photoUrl: string;
  belt: BeltType;
  stripes: number;
  attendancesCount: number;
  rank: number;
  badge?: string;
}

export interface WeeklyPosition {
  id: string;
  title: string;
  category: 'GUARDA' | 'PASSAGEM' | 'FINALIZAÇÃO' | 'RASPAGEM' | 'QUEDA' | 'DEFESA_ESCAPE' | 'CONTROLE_POSIÇÃO' | 'NO_GI' | 'GERAL';
  classId?: string;
  className?: string;
  professorName: string;
  date: string; // YYYY-MM-DD
  weekLabel?: string; // Ex: "Semana de 10 a 16 de Agosto"
  description: string;
  keyDetails?: string[]; // Ex: ["Pegada na gola funda", "Fuga de quadril", "Pressão com joelho"]
  videoUrl?: string;
  isCurrentFocus?: boolean;
  learnedByStudentIds?: string[]; // IDs dos alunos que aprenderam esta técnica
  createdAt: string;
}
