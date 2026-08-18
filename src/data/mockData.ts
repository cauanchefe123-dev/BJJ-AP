import { AcademyConfig, BJJClass, Graduation, PaymentRecord, Student, Teacher, TeacherObservation, TrainingLog, User, AttendanceRecord, BeltChangeRequest } from '../types';
import { DEFAULT_BLACK_GI_AVATAR } from '../constants/avatar';

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'prof-1',
    name: 'Prof. Gabriel "Fera" Santos',
    email: 'professor@bjjcron.com',
    phone: '(11) 98765-4321',
    belt: 'PRETA',
    degrees: 3,
    specialty: 'Jiu-Jitsu Fundamental, Avançado & Competição',
    cref: '012345-G/SP',
    photoUrl: DEFAULT_BLACK_GI_AVATAR,
    bio: 'Faixa preta 3º Grau, 15 anos de experiência no tatame, Campeão Brasileiro IBJJF.',
    active: true,
    startDate: '2015-03-01'
  },
  {
    id: 'prof-2',
    name: 'Profª. Beatriz Santos',
    email: 'beatriz.marrom@email.com',
    phone: '(11) 97777-6655',
    belt: 'MARROM',
    degrees: 2,
    specialty: 'Jiu-Jitsu Kids & Defesa Pessoal Feminina',
    cref: '098765-G/SP',
    photoUrl: DEFAULT_BLACK_GI_AVATAR,
    bio: 'Especialista em pedagogia infantil aplicada às artes marciais e guarda aberta.',
    active: true,
    startDate: '2020-01-20'
  },
  {
    id: 'prof-3',
    name: 'Mestre Carlos Gracie Jr.',
    email: 'admin@bjjcron.com',
    phone: '(11) 99887-1122',
    belt: 'PRETA',
    degrees: 6,
    specialty: 'Open Mat, Treinos de Graduação & Gestão Técnica',
    cref: '001122-G/SP',
    photoUrl: DEFAULT_BLACK_GI_AVATAR,
    bio: 'Líder técnico fundador da equipe e orientador dos exames de faixa.',
    active: true,
    startDate: '2010-01-01'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-cauan',
    name: 'Cauan (Responsável)',
    email: 'cauanchefe123@gmail.com',
    role: 'ADMIN',
    avatarUrl: DEFAULT_BLACK_GI_AVATAR,
    phone: '(11) 99999-9999',
    password: '123',
    approvalStatus: 'APPROVED',
    isActivated: true
  }
];

export const INITIAL_ACADEMY_CONFIG: AcademyConfig = {
  name: 'BJJCRON ACADEMY',
  fantasyName: 'BJJCRON Jiu-Jitsu Headquarter',
  cnpj: '12.345.678/0001-90',
  headCoachName: 'Mestre Gabriel "Fera" Santos',
  headCoachBelt: 'PRETA',
  phone: '(11) 3210-9988',
  email: 'contato@bjjcron.com.br',
  address: 'Av. Paulista, 1500 - 3º Andar, São Paulo - SP',
  logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=200',
  pixKey: '12345678000190',
  environmentMode: 'HOMOLOGATION',
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

export const INITIAL_CLASSES: BJJClass[] = [
  {
    id: 'cls-1',
    title: 'Jiu-Jitsu Fundamental (Gi)',
    professorId: 'user-prof-1',
    professorName: 'Prof. Gabriel "Fera"',
    daysOfWeek: [1, 3, 5], // Seg, Qua, Sex
    time: '07:00',
    durationMinutes: 75,
    category: 'FUNDAMENTAL',
    maxCapacity: 30,
    active: true,
    description: 'Posturas, defesas pessoais, raspagens básicas, passagens e controle de posição.'
  },
  {
    id: 'cls-2',
    title: 'Jiu-Jitsu Avançado & Competição',
    professorId: 'user-prof-1',
    professorName: 'Prof. Gabriel "Fera"',
    daysOfWeek: [1, 2, 3, 4, 5], // Seg a Sex
    time: '12:00',
    durationMinutes: 90,
    category: 'AVANÇADO',
    maxCapacity: 25,
    active: true,
    description: 'Estratégias de luta, guarda moderna, leglocks, drill de alta intensidade e rola específico.'
  },
  {
    id: 'cls-3',
    title: 'No-Gi / Submission Grappling',
    professorId: 'user-prof-1',
    professorName: 'Prof. Gabriel "Fera"',
    daysOfWeek: [2, 4], // Ter, Qui
    time: '19:30',
    durationMinutes: 90,
    category: 'NO_GI',
    maxCapacity: 35,
    active: true,
    description: 'Luta sem kimono. Foco em guilhotinas, leglocks, derrubadas e controle sem esgrima.'
  },
  {
    id: 'cls-4',
    title: 'Open Mat / Treino Livre',
    professorId: 'user-prof-1',
    professorName: 'Mestre Carlos Gracie',
    daysOfWeek: [6], // Sábado
    time: '10:00',
    durationMinutes: 120,
    category: 'OPEN_MAT',
    maxCapacity: 50,
    active: true,
    description: 'Treino aberto para todas as faixas e academias parceiras. Rola livre e estudos.'
  },
  {
    id: 'cls-5',
    title: 'Jiu-Jitsu Kids (6 a 12 anos)',
    professorId: 'user-prof-1',
    professorName: 'Profª. Beatriz Santos',
    daysOfWeek: [2, 4], // Ter, Qui
    time: '17:00',
    durationMinutes: 60,
    category: 'KIDS',
    maxCapacity: 20,
    active: true,
    description: 'Desenvolvimento motor, disciplina, respeito e jogos educativos de Jiu-Jitsu.'
  }
];

export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_PAYMENTS: PaymentRecord[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_GRADUATIONS: Graduation[] = [];

export const INITIAL_TRAINING_LOGS: TrainingLog[] = [];

export const INITIAL_BELT_REQUESTS: BeltChangeRequest[] = [];

export const INITIAL_TEACHER_OBSERVATIONS: TeacherObservation[] = [];

