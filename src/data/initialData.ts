import { AcademyConfig, BJJClass, Graduation, PaymentRecord, Student, Teacher, TeacherObservation, TrainingLog, User, AttendanceRecord, BeltChangeRequest, RollChallenge } from '../types';
import { DEFAULT_BLACK_GI_AVATAR } from '../constants/avatar';

export const INITIAL_TEACHERS: Teacher[] = [];

export const INITIAL_CLASSES: BJJClass[] = [];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-cauan',
    name: 'Cauan (Responsável)',
    email: 'cauanchefe123@gmail.com',
    role: 'ADMIN',
    avatarUrl: DEFAULT_BLACK_GI_AVATAR,
    phone: '',
    password: '123',
    approvalStatus: 'APPROVED',
    isActivated: true
  }
];

export const INITIAL_ACADEMY_CONFIG: AcademyConfig = {
  name: 'BJJCRON ACADEMY',
  fantasyName: 'BJJCRON Jiu-Jitsu Headquarter',
  cnpj: '',
  headCoachName: 'Professor Responsável',
  headCoachBelt: 'PRETA',
  phone: '',
  email: 'contato@bjjcron.com.br',
  address: 'São Paulo - SP',
  logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=200',
  pixKey: '',
  environmentMode: 'PRODUCTION',
  graduationCriteria: {
    BRANCA: { classesPerStripe: 30, monthsForNextBelt: 12 },
    CINZA: { classesPerStripe: 15, monthsForNextBelt: 6 },
    AMARELA: { classesPerStripe: 15, monthsForNextBelt: 6 },
    LARANJA: { classesPerStripe: 20, monthsForNextBelt: 8 },
    VERDE: { classesPerStripe: 20, monthsForNextBelt: 8 },
    AZUL: { classesPerStripe: 40, monthsForNextBelt: 18 },
    ROXA: { classesPerStripe: 50, monthsForNextBelt: 18 },
    MARROM: { classesPerStripe: 60, monthsForNextBelt: 12 },
    PRETA: { classesPerStripe: 100, monthsForNextBelt: 36 },
    'VERMELHA E PRETA': { classesPerStripe: 150, monthsForNextBelt: 60 },
    'VERMELHA E BRANCA': { classesPerStripe: 200, monthsForNextBelt: 84 },
    'VERMELHA': { classesPerStripe: 300, monthsForNextBelt: 120 }
  },
  supabaseConfig: {
    url: '',
    anonKey: '',
    connected: false
  }
};

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_PAYMENTS: PaymentRecord[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_GRADUATIONS: Graduation[] = [];

export const INITIAL_TRAINING_LOGS: TrainingLog[] = [];

export const INITIAL_BELT_REQUESTS: BeltChangeRequest[] = [];

export const INITIAL_TEACHER_OBSERVATIONS: TeacherObservation[] = [];

export const INITIAL_ROLL_CHALLENGES: RollChallenge[] = [];
