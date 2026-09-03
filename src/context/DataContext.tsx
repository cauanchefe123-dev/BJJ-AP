import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Student,
  Teacher,
  BJJClass,
  AttendanceRecord,
  PaymentRecord,
  Graduation,
  BeltChangeRequest,
  TrainingLog,
  TeacherObservation,
  AcademyConfig,
  AppNotification,
  WeeklyPosition,
  BeltType,
  RollChallenge,
  RollChallengeResult,
  InternalTournament,
  TournamentCategory,
  TournamentCompetitor,
  TournamentMatch,
  TournamentPodium,
  TournamentCategoryStatus,
  RollOutcomeType,
  TrainingPhoto,
} from '../types';
import {
  INITIAL_ACADEMY_CONFIG,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_CLASSES,
  INITIAL_ATTENDANCE,
  INITIAL_PAYMENTS,
  INITIAL_GRADUATIONS,
  INITIAL_BELT_REQUESTS,
  INITIAL_TRAINING_LOGS,
  INITIAL_TEACHER_OBSERVATIONS,
  INITIAL_ROLL_CHALLENGES,
  INITIAL_TOURNAMENTS,
  INITIAL_TRAINING_PHOTOS,
} from '../data/initialData';
import { generateSingleEliminationBracket, advanceTournamentBracket } from '../utils/bracketUtils';
import { DEFAULT_BLACK_GI_AVATAR } from '../constants/avatar';
import {
  subscribeFirestoreCollection,
  subscribeFirestoreConfig,
  saveToFirestore,
  removeFromFirestore,
  deleteMatchingEntitiesFromFirestore,
  saveConfigToFirestore,
  clearAllFirestoreCollections,
  purgeAllLegacyLocalStorage,
} from '../lib/firebaseStore';
import { isDeletedRecord, markAsDeleted, unmarkAsDeleted } from '../lib/deletionTracker';
import { getLocalDateStr, getAttendanceLocalDate } from '../utils/dateUtils';
import { getStudentTotalClasses } from '../utils/ranking';

const checkClassCheckinAvailability = (bjjClass?: BJJClass): { isAvailable: boolean; reason?: string } => {
  if (!bjjClass) return { isAvailable: true };

  const now = new Date();
  const currentDay = now.getDay();

  if (Array.isArray(bjjClass.daysOfWeek) && bjjClass.daysOfWeek.length > 0) {
    if (!bjjClass.daysOfWeek.includes(currentDay)) {
      const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const classDays = bjjClass.daysOfWeek.map(d => dayNames[d]).join(', ');
      return {
        isAvailable: false,
        reason: `A aula "${bjjClass.title}" ocorre em: ${classDays}. Hoje é ${dayNames[currentDay]}.`,
      };
    }
  }

  if (bjjClass.time) {
    const [startH, startM] = bjjClass.time.split(':').map(Number);
    if (!isNaN(startH) && !isNaN(startM)) {
      const classStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM, 0);
      const duration = bjjClass.durationMinutes || 60;
      const classEnd = new Date(classStart.getTime() + duration * 60 * 1000);

      const windowStart = new Date(classStart.getTime() - 45 * 60 * 1000);
      const windowEnd = new Date(classEnd.getTime() + 60 * 60 * 1000);

      if (now < windowStart) {
        return {
          isAvailable: false,
          reason: `O check-in para esta aula estará liberado a partir das ${windowStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (45 min antes do início).`,
        };
      }

      if (now > windowEnd) {
        return {
          isAvailable: false,
          reason: `O período de check-in para a aula das ${bjjClass.time} já foi encerrado.`,
        };
      }
    }
  }

  return { isAvailable: true };
};

interface DataContextType {
  students: Student[];
  teachers: Teacher[];
  classes: BJJClass[];
  attendances: AttendanceRecord[];
  payments: PaymentRecord[];
  graduations: Graduation[];
  beltRequests: BeltChangeRequest[];
  trainingLogs: TrainingLog[];
  teacherObservations: TeacherObservation[];
  academyConfig: AcademyConfig;

  // Notifications & Push Alerts
  notifications: AppNotification[];
  activeToastNotif: AppNotification | null;
  pushPermissionStatus: NotificationPermission;
  addNotification: (notif: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>) => AppNotification;
  markNotificationAsRead: (notificationId: string, userId: string) => void;
  markAllNotificationsAsRead: (userId: string) => void;
  deleteNotification: (notificationId: string) => void;
  requestPushPermission: () => Promise<NotificationPermission>;
  dismissToastNotif: () => void;

  // Student Actions
  addStudent: (student: Omit<Student, 'id' | 'registrationNumber' | 'qrCodeToken' | 'totalClassesAttended' | 'classesSinceLastGraduation'>) => Student;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  promoteStudent: (studentId: string, newBelt: BeltType, newStripes: number, promotedBy: string, notes?: string, promotedAt?: string) => void;
  addGraduationRecord: (graduation: Omit<Graduation, 'id'>) => Graduation;
  updateGraduation: (id: string, updates: Partial<Graduation>) => void;
  deleteGraduation: (id: string) => void;
  cleanDuplicateGraduations: () => number;
  requestBeltChange: (studentId: string, requestedBelt: BeltType, requestedStripes: number, notes?: string) => { success: boolean; message: string };
  approveBeltChange: (requestId: string, reviewerName: string) => void;
  rejectBeltChange: (requestId: string, reviewerName: string) => void;

  // Teacher Actions
  addTeacher: (teacher: Omit<Teacher, 'id'>) => Teacher;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // Class Actions
  addClass: (bjjClass: Omit<BJJClass, 'id'>) => void;
  updateClass: (id: string, updates: Partial<BJJClass>) => void;
  deleteClass: (id: string) => void;

  // Attendance Actions
  recordAttendance: (
    studentId: string,
    classId: string,
    method?: 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER',
    verifiedBy?: string,
    bypassTimeCheck?: boolean,
    customDate?: string,
    customTime?: string
  ) => { success: boolean; message: string };
  updateAttendance: (id: string, updates: Partial<AttendanceRecord>) => void;
  removeAttendance: (id: string) => void;

  // Payment Actions
  addPayment: (payment: Omit<PaymentRecord, 'id'>) => void;
  markPaymentAsPaid: (paymentId: string, method: 'PIX' | 'CARTAO' | 'DINHEIRO' | 'BOLETO') => void;
  
  // Training Log Actions
  addTrainingLog: (log: Omit<TrainingLog, 'id'>) => void;
  updateTrainingLog: (id: string, updates: Partial<TrainingLog>) => void;
  deleteTrainingLog: (id: string) => void;

  // Teacher Observation Actions
  addTeacherObservation: (obs: Omit<TeacherObservation, 'id' | 'date'>) => void;
  updateTeacherObservation: (id: string, updates: Partial<TeacherObservation>) => void;
  deleteTeacherObservation: (id: string) => void;
  markTeacherObservationAsRead: (id: string, userId?: string) => void;
  markAllTeacherObservationsAsRead: (studentId: string, userId?: string) => void;

  // Weekly Focus Positions Actions
  weeklyPositions: WeeklyPosition[];
  addWeeklyPosition: (position: Omit<WeeklyPosition, 'id' | 'createdAt'>) => WeeklyPosition;
  updateWeeklyPosition: (id: string, updates: Partial<WeeklyPosition>) => void;
  deleteWeeklyPosition: (id: string) => void;
  toggleStudentLearnedPosition: (positionId: string, studentId: string) => void;

  // Roll Challenges Actions (Dinâmica de Desafio para um Rola)
  rollChallenges: RollChallenge[];
  createRollChallenge: (challengeData: Omit<RollChallenge, 'id' | 'createdAt' | 'status'>) => RollChallenge;
  acceptRollChallenge: (
    challengeId: string,
    acceptingStudent?: { id: string; name: string; belt: BeltType; stripes: number; photoUrl?: string }
  ) => void;
  declineRollChallenge: (challengeId: string, reason?: string) => void;
  cancelRollChallenge: (challengeId: string) => void;
  completeRollChallenge: (challengeId: string, result: RollChallengeResult) => void;
  deleteRollChallenge: (challengeId: string) => void;

  // Campeonatos Internos & Chaveamento (In-House Tournaments & Brackets)
  tournaments: InternalTournament[];
  createTournament: (tournamentData: Omit<InternalTournament, 'id' | 'createdAt'>) => InternalTournament;
  updateTournament: (id: string, updates: Partial<InternalTournament>) => void;
  deleteTournament: (id: string) => void;
  addCategoryToTournament: (tournamentId: string, category: Omit<TournamentCategory, 'id' | 'matches'>) => void;
  updateTournamentCategory: (tournamentId: string, categoryId: string, updates: Partial<TournamentCategory>) => void;
  deleteTournamentCategory: (tournamentId: string, categoryId: string) => void;
  registerCompetitorToCategory: (tournamentId: string, categoryId: string, competitor: TournamentCompetitor) => void;
  removeCompetitorFromCategory: (tournamentId: string, categoryId: string, competitorId: string) => void;
  generateCategoryBracket: (tournamentId: string, categoryId: string, includeThirdPlace?: boolean) => void;
  updateTournamentMatch: (
    tournamentId: string,
    categoryId: string,
    matchId: string,
    result: {
      winnerId: string;
      winnerName: string;
      outcomeType?: RollOutcomeType;
      submissionTechnique?: string;
      submissionMinute?: number;
      score1?: number;
      score2?: number;
      advantages1?: number;
      advantages2?: number;
      penalties1?: number;
      penalties2?: number;
      notes?: string;
    }
  ) => void;
  resetCategoryBracket: (tournamentId: string, categoryId: string) => void;

  // Training Photos Actions (Mural do Tatame / Fotos dos Treinos em Alta Resolução)
  trainingPhotos: TrainingPhoto[];
  addTrainingPhoto: (photo: Omit<TrainingPhoto, 'id' | 'createdAt'>) => TrainingPhoto;
  addTrainingPhotosBatch: (photos: Omit<TrainingPhoto, 'id' | 'createdAt'>[]) => TrainingPhoto[];
  updateTrainingPhoto: (id: string, updates: Partial<TrainingPhoto>) => void;
  deleteTrainingPhoto: (id: string) => void;
  toggleLikeTrainingPhoto: (photoId: string, studentId: string) => void;

  // Config Actions
  updateAcademyConfig: (updates: Partial<AcademyConfig>) => void;

  // Environment Mode
  environmentMode: 'PROD' | 'HOMOLOG';
  isHomologationMode: boolean;
  setEnvironmentMode: (mode: 'PROD' | 'HOMOLOG') => void;
  resetHomologationData: () => void;

  // System Helpers
  resetToDefaultData: () => void;
  clearAllDataToEmpty: () => void;
  exportDatabaseJSON: () => string;
  importDatabaseJSON: (jsonStr: string) => { success: boolean; message: string };
}

const BELT_RANK_ORDER: Record<string, number> = {
  'BRANCA': 1,
  'CINZA': 2,
  'AMARELA': 3,
  'VERDE': 4,
  'AZUL': 5,
  'ROXA': 6,
  'MARROM': 7,
  'PRETA': 8,
  'VERMELHA E PRETA': 9,
  'VERMELHA E BRANCA': 10,
  'VERMELHA': 11,
};

export const getBeltWeight = (belt?: string, stripes?: number): number => {
  if (!belt) return 10;
  const b = belt.trim().toUpperCase();
  const baseRank = BELT_RANK_ORDER[b] || 1;
  const s = typeof stripes === 'number' && !isNaN(stripes) ? stripes : 0;
  return baseRank * 10 + s;
};

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [environmentMode, setEnvironmentMode] = useState<'PROD' | 'HOMOLOG'>('PROD');

  // Pure cloud states (No localStorage)
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<BJJClass[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [graduations, setGraduations] = useState<Graduation[]>([]);
  const [beltRequests, setBeltRequests] = useState<BeltChangeRequest[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [teacherObservations, setTeacherObservations] = useState<TeacherObservation[]>([]);
  const [weeklyPositions, setWeeklyPositions] = useState<WeeklyPosition[]>([]);
  const [rollChallenges, setRollChallenges] = useState<RollChallenge[]>([]);
  const [tournaments, setTournaments] = useState<InternalTournament[]>([]);
  const [trainingPhotos, setTrainingPhotos] = useState<TrainingPhoto[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [academyConfig, setAcademyConfig] = useState<AcademyConfig>(INITIAL_ACADEMY_CONFIG);

  const [activeToastNotif, setActiveToastNotif] = useState<AppNotification | null>(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const isFirstMount = useRef(true);

  // 1. Purge legacy localStorage data completely on startup
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      purgeAllLegacyLocalStorage();
    }
  }, []);

  // 2. Real-time Firestore Subscriptions for all collections (100% Cloud-native synchronized)
  useEffect(() => {
    console.log('[Firestore Sync] Conectando ouvintes em tempo real para todas as coleções...');

    const unsubStudents = subscribeFirestoreCollection<Student>('students', (docs) => {
      const valid = docs
        .filter(s => !isDeletedRecord(s.id, s.email, s.registrationNumber))
        .map(s => ({
          ...s,
          approvalStatus: s.approvalStatus || 'APPROVED',
          active: s.approvalStatus === 'APPROVED' || s.active !== false,
          photoUrl: s.photoUrl || '',
        }));
      setStudents(valid);
    });

    const unsubTeachers = subscribeFirestoreCollection<Teacher>('teachers', (docs) => {
      const valid = docs
        .filter(t => !isDeletedRecord(t.id, t.email))
        .map(t => ({
          ...t,
          photoUrl: t.photoUrl || '',
        }));
      setTeachers(valid);
    });

    const unsubClasses = subscribeFirestoreCollection<BJJClass>('classes', (docs) => {
      const valid = docs.filter(c => !isDeletedRecord(c.id));
      setClasses(valid);
    });

    const unsubAttendances = subscribeFirestoreCollection<AttendanceRecord>('attendances', (docs) => {
      const valid = docs.filter(a => !isDeletedRecord(a.id));
      setAttendances(valid);
    });

    const unsubPayments = subscribeFirestoreCollection<PaymentRecord>('payments', (docs) => {
      const valid = docs.filter(p => !isDeletedRecord(p.id));
      setPayments(valid);
    });

    const unsubGraduations = subscribeFirestoreCollection<Graduation>('graduations', (docs) => {
      const valid = docs.filter(g => !isDeletedRecord(g.id));
      setGraduations(valid);
    });

    const unsubBeltRequests = subscribeFirestoreCollection<BeltChangeRequest>('beltRequests', (docs) => {
      const valid = docs.filter(b => !isDeletedRecord(b.id));
      setBeltRequests(valid);
    });

    const unsubTrainingLogs = subscribeFirestoreCollection<TrainingLog>('trainingLogs', (docs) => {
      const valid = docs.filter(l => !isDeletedRecord(l.id));
      setTrainingLogs(valid);
    });

    const unsubTeacherObservations = subscribeFirestoreCollection<TeacherObservation>('teacherObservations', (docs) => {
      const valid = docs.filter(o => !isDeletedRecord(o.id));
      setTeacherObservations(valid);
    });

    const unsubWeeklyPositions = subscribeFirestoreCollection<WeeklyPosition>('weeklyPositions', (docs) => {
      const valid = docs.filter(p => !isDeletedRecord(p.id));
      setWeeklyPositions(valid);
    });

    const unsubRollChallenges = subscribeFirestoreCollection<RollChallenge>('rollChallenges', (docs) => {
      const valid = docs.filter(c => !isDeletedRecord(c.id));
      setRollChallenges(valid);
    });

    const unsubTournaments = subscribeFirestoreCollection<InternalTournament>('tournaments', (docs) => {
      const valid = docs.filter(t => !isDeletedRecord(t.id));
      setTournaments(valid);
    });

    const unsubTrainingPhotos = subscribeFirestoreCollection<TrainingPhoto>('trainingPhotos', (docs) => {
      const valid = docs.filter(p => !isDeletedRecord(p.id));
      setTrainingPhotos(valid);
    });

    const unsubNotifications = subscribeFirestoreCollection<AppNotification>('notifications', (docs) => {
      const valid = docs.filter(n => !isDeletedRecord(n.id));
      setNotifications(valid);
    });

    const unsubConfig = subscribeFirestoreConfig((cfg) => {
      if (cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0) {
        setAcademyConfig({
          ...INITIAL_ACADEMY_CONFIG,
          ...cfg,
        });
      }
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubClasses();
      unsubAttendances();
      unsubPayments();
      unsubGraduations();
      unsubBeltRequests();
      unsubTrainingLogs();
      unsubTeacherObservations();
      unsubWeeklyPositions();
      unsubRollChallenges();
      unsubTournaments();
      unsubTrainingPhotos();
      unsubNotifications();
      unsubConfig();
    };
  }, []);

  // Notifications API handlers
  const requestPushPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
      return permission;
    } catch {
      return 'denied';
    }
  };

  const addNotification = (notifData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>): AppNotification => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setNotifications(prev => [newNotif, ...prev]);
    saveToFirestore('notifications', newNotif);

    // Verificar se a notificação deve ser entregue localmente (toast e push do navegador) para a sessão atual
    let shouldDeliverLocally = true;
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('bjjcron_auth_user') : null;
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (newNotif.targetStudentId) {
          const isTargetStudent =
            parsed.id === newNotif.targetStudentId ||
            parsed.studentId === newNotif.targetStudentId ||
            (parsed.email && parsed.email.trim().toLowerCase() === newNotif.targetStudentId.trim().toLowerCase());

          // Se o usuário logado for um aluno diferente do destinatário, não dispara push nem toast para ele
          if (parsed.role === 'ALUNO' && !isTargetStudent) {
            shouldDeliverLocally = false;
          }
        }
      }
    } catch {
      // Ignorar erros de parsing do localStorage
    }

    if (shouldDeliverLocally) {
      setActiveToastNotif(newNotif);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(newNotif.title, {
            body: newNotif.message,
            icon: '/favicon.ico',
          });
        } catch (e) {
          console.warn('Could not display system push notification:', e);
        }
      }
    }

    return newNotif;
  };

  const markNotificationAsRead = (notificationId: string, userId: string) => {
    let updatedNotif: AppNotification | null = null;
    setNotifications(prev => {
      const updated = prev.map(n => {
        if (n.id === notificationId) {
          const readBy = Array.isArray(n.readBy) ? n.readBy : [];
          if (!readBy.includes(userId)) {
            updatedNotif = { ...n, readBy: [...readBy, userId] };
            return updatedNotif;
          }
        }
        return n;
      });
      return updated;
    });

    if (updatedNotif) {
      saveToFirestore('notifications', updatedNotif);
    }
  };

  const markAllNotificationsAsRead = (userId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => {
        const readBy = Array.isArray(n.readBy) ? n.readBy : [];
        if (!readBy.includes(userId)) {
          const item = { ...n, readBy: [...readBy, userId] };
          saveToFirestore('notifications', item);
          return item;
        }
        return n;
      });
      return updated;
    });
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    removeFromFirestore('notifications', notificationId);
  };

  const dismissToastNotif = () => {
    setActiveToastNotif(null);
  };

  // Student CRUD (Pure Firestore Direct Sync)
  const addStudent = (studentData: Omit<Student, 'id' | 'registrationNumber' | 'qrCodeToken' | 'totalClassesAttended' | 'classesSinceLastGraduation'>): Student => {
    const newId = `std-${Date.now()}`;
    const regYear = new Date().getFullYear();
    const regNum = `BJJ-${regYear}-${String(students.length + 1).padStart(3, '0')}`;

    const newStudent: Student = {
      ...studentData,
      id: newId,
      registrationNumber: regNum,
      qrCodeToken: `BJJCRON-${newId}`,
      totalClassesAttended: 0,
      classesSinceLastGraduation: 0,
      photoUrl: (!studentData.photoUrl || studentData.photoUrl.includes('unsplash.com')) ? DEFAULT_BLACK_GI_AVATAR : studentData.photoUrl,
      active: true,
      approvalStatus: studentData.approvalStatus || 'APPROVED',
      hasActivatedAccount: true,
      updatedAt: new Date().toISOString(),
    };

    unmarkAsDeleted(newStudent.id, newStudent.email, newStudent.registrationNumber);
    setStudents(prev => [newStudent, ...prev]);
    saveToFirestore('students', newStudent);

    // Initial graduation record
    if (newStudent.belt) {
      const initialGrad: Graduation = {
        id: `grad-${Date.now()}`,
        studentId: newId,
        studentName: newStudent.name,
        belt: newStudent.belt,
        stripes: newStudent.stripes || 0,
        promotedBy: academyConfig.headCoachName || 'Mestre / Professor',
        promotedAt: studentData.lastGraduationDate || studentData.startDate || getLocalDateStr(),
        notes: 'Graduação inicial no ato da matrícula.',
        classesCountAtPromotion: 0,
      };
      setGraduations(prev => [initialGrad, ...prev]);
      saveToFirestore('graduations', initialGrad);
    }

    // Initial payment record
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), studentData.paymentDueDateDay || 10);
    const refMonth = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      studentId: newId,
      studentName: studentData.name,
      amount: studentData.planPrice || 240,
      dueDate: dueDate.toISOString().split('T')[0],
      status: 'PENDENTE',
      referenceMonth: refMonth,
    };

    setPayments(prev => [newPayment, ...prev]);
    saveToFirestore('payments', newPayment);

    return newStudent;
  };

  const updateStudent = async (id: string, updates: Partial<Student>) => {
    const cleanId = id.trim().toLowerCase();
    const nowIso = new Date().toISOString();
    const enrichedUpdates = { ...updates, updatedAt: nowIso };

    const existing = students.find(s => 
      s.id === id || 
      (s.email && s.email.trim().toLowerCase() === cleanId) ||
      (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanId)
    );

    const mergedStudent: Student = existing 
      ? { ...existing, ...enrichedUpdates }
      : ({
          id,
          name: 'Atleta',
          email: '',
          phone: '',
          registrationNumber: `BJJ-${new Date().getFullYear()}-${id.slice(-4)}`,
          qrCodeToken: `BJJCRON-${id}`,
          birthDate: '2000-01-01',
          photoUrl: DEFAULT_BLACK_GI_AVATAR,
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
          paymentStatus: 'PAGO',
          approvalStatus: 'APPROVED',
          hasActivatedAccount: true,
          ...enrichedUpdates,
        } as Student);

    // Save directly to Firestore students
    await saveToFirestore('students', mergedStudent);

    // Update local state optimistically
    setStudents(prev => {
      const exists = prev.some(s => s.id === mergedStudent.id);
      return exists 
        ? prev.map(s => (s.id === mergedStudent.id ? mergedStudent : s))
        : [mergedStudent, ...prev];
    });

    // Auto generate or update graduation record when belt, stripes or lastGraduationDate changes
    const beltChanged = existing && updates.belt !== undefined && updates.belt !== existing.belt;
    const stripesChanged = existing && updates.stripes !== undefined && updates.stripes !== existing.stripes;
    const gradDateChanged = existing && updates.lastGraduationDate !== undefined && updates.lastGraduationDate !== existing.lastGraduationDate;

    if (beltChanged || stripesChanged || gradDateChanged) {
      const gradDate = updates.lastGraduationDate || mergedStudent.lastGraduationDate || getLocalDateStr();
      const existingGrad = graduations.find(g => 
        (g.studentId === mergedStudent.id || (mergedStudent.name && g.studentName === mergedStudent.name)) &&
        g.belt === mergedStudent.belt &&
        Number(g.stripes || 0) === Number(mergedStudent.stripes || 0)
      );

      const gradRec: Graduation = {
        id: existingGrad ? existingGrad.id : `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: mergedStudent.id,
        studentName: mergedStudent.name,
        belt: mergedStudent.belt,
        stripes: mergedStudent.stripes,
        promotedBy: academyConfig.headCoachName || 'Mestre / Professor',
        promotedAt: gradDate,
        notes: updates.notes || 'Atualização de graduação no cadastro.',
        classesCountAtPromotion: mergedStudent.totalClassesAttended || 0,
        certificateNumber: existingGrad?.certificateNumber || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      };

      if (existingGrad) {
        setGraduations(gPrev => gPrev.map(g => (g.id === existingGrad.id ? gradRec : g)));
      } else {
        setGraduations(gPrev => [gradRec, ...gPrev]);
      }
      saveToFirestore('graduations', gradRec);
    }
  };

  const deleteStudent = (id: string) => {
    const cleanId = String(id).trim().toLowerCase();
    const targetStudent = students.find(s => 
      s.id === id || 
      (s.email && s.email.trim().toLowerCase() === cleanId) ||
      (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanId)
    );

    const identifiers = [
      id,
      cleanId,
      targetStudent?.id,
      targetStudent?.email,
      targetStudent?.registrationNumber,
    ].filter(Boolean) as string[];

    markAsDeleted(...identifiers);

    setStudents(prev => prev.filter(s => 
      s.id !== id && 
      !isDeletedRecord(s.id, s.email, s.registrationNumber)
    ));

    deleteMatchingEntitiesFromFirestore('students', ...identifiers);
    deleteMatchingEntitiesFromFirestore('users', ...identifiers);
  };

  const promoteStudent = (
    studentId: string,
    newBelt: BeltType,
    newStripes: number,
    promotedBy: string,
    notes?: string,
    promotedAt?: string
  ) => {
    const cleanId = studentId.trim().toLowerCase();
    const student = students.find(s => 
      s.id === studentId || 
      (s.email && s.email.trim().toLowerCase() === cleanId) ||
      (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanId)
    );
    if (!student) return;

    const realId = student.id;
    const graduationDate = promotedAt || getLocalDateStr();
    const certNum = `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const totalClassesCount = getStudentTotalClasses(student, attendances);

    // Check if an existing graduation record exists for this athlete, belt and stripes
    const existingGrad = graduations.find(g => 
      (g.studentId === realId || (student.name && g.studentName === student.name)) &&
      g.belt === newBelt &&
      Number(g.stripes || 0) === Number(newStripes || 0)
    );

    const gradId = existingGrad ? existingGrad.id : `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const finalCert = existingGrad?.certificateNumber || certNum;

    const newGraduation: Graduation = {
      id: gradId,
      studentId: realId,
      studentName: student.name,
      belt: newBelt,
      stripes: newStripes,
      promotedBy: promotedBy || academyConfig.headCoachName || 'Mestre / Professor',
      promotedAt: graduationDate,
      notes: notes || 'Graduação outorgada por mérito e dedicação no tatame.',
      classesCountAtPromotion: totalClassesCount,
      certificateNumber: finalCert,
    };

    if (existingGrad) {
      setGraduations(prev => prev.map(g => (g.id === existingGrad.id ? newGraduation : g)));
    } else {
      setGraduations(prev => [newGraduation, ...prev]);
    }
    saveToFirestore('graduations', newGraduation);

    const nowIso = new Date().toISOString();
    const updatedStudentObj: Student = {
      ...student,
      belt: newBelt,
      stripes: newStripes,
      classesSinceLastGraduation: 0,
      totalClassesAttended: totalClassesCount,
      lastGraduationDate: graduationDate,
      updatedAt: nowIso,
    };

    setStudents(prev => prev.map(s => (s.id === realId ? updatedStudentObj : s)));
    saveToFirestore('students', updatedStudentObj);

    addNotification({
      title: `🥋 Graduação: ${student.name} promovido(a)!`,
      message: `Parabéns ao atleta ${student.name} pela conquista da ${newBelt} (${newStripes}º Grau)! Outorgado por ${newGraduation.promotedBy}.`,
      type: 'GENERAL',
      targetStudentId: student.id,
      targetStudentName: student.name,
    });
  };

  const addGraduationRecord = (graduationData: Omit<Graduation, 'id'>): Graduation => {
    const certNum = graduationData.certificateNumber || `CERT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const student = students.find(s => s.id === graduationData.studentId);
    const studentName = graduationData.studentName || student?.name || 'Atleta';

    const existingGrad = graduations.find(g => 
      (g.studentId === graduationData.studentId || (student && g.studentName === student.name)) &&
      g.belt === graduationData.belt &&
      Number(g.stripes || 0) === Number(graduationData.stripes || 0)
    );

    if (existingGrad) {
      const updated: Graduation = {
        ...existingGrad,
        ...graduationData,
        id: existingGrad.id,
        studentName,
        certificateNumber: existingGrad.certificateNumber || certNum,
      };
      setGraduations(prev => prev.map(g => (g.id === existingGrad.id ? updated : g)));
      saveToFirestore('graduations', updated);
      return updated;
    }

    const newGraduation: Graduation = {
      ...graduationData,
      id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentName,
      certificateNumber: certNum,
    };

    setGraduations(prev => [newGraduation, ...prev]);
    saveToFirestore('graduations', newGraduation);
    return newGraduation;
  };

  const updateGraduation = (id: string, updates: Partial<Graduation>) => {
    setGraduations(prev => prev.map(g => {
      if (g.id === id) {
        const updated = { ...g, ...updates };
        saveToFirestore('graduations', updated);
        return updated;
      }
      return g;
    }));
  };

  const deleteGraduation = (id: string) => {
    markAsDeleted(id);
    setGraduations(prev => prev.filter(g => g.id !== id));
    removeFromFirestore('graduations', id);
  };

  const cleanDuplicateGraduations = (): number => {
    const seen = new Set<string>();
    const toDeleteIds: string[] = [];

    // Sort by date descending so we preserve the newest / most detailed
    const sorted = [...graduations].sort((a, b) => {
      return new Date(b.promotedAt || 0).getTime() - new Date(a.promotedAt || 0).getTime();
    });

    for (const g of sorted) {
      const studentKey = (g.studentId || g.studentName || '').trim().toLowerCase();
      const key = `${studentKey}_${g.belt}_${Number(g.stripes || 0)}`;
      if (seen.has(key)) {
        toDeleteIds.push(g.id);
      } else {
        seen.add(key);
      }
    }

    if (toDeleteIds.length > 0) {
      toDeleteIds.forEach(id => {
        markAsDeleted(id);
        removeFromFirestore('graduations', id);
      });
      setGraduations(prev => prev.filter(g => !toDeleteIds.includes(g.id)));
    }

    return toDeleteIds.length;
  };

  const requestBeltChange = (
    studentId: string,
    requestedBelt: BeltType,
    requestedStripes: number,
    notes?: string
  ): { success: boolean; message: string } => {
    const student = students.find(s => s.id === studentId);
    if (!student) return { success: false, message: 'Aluno não encontrado.' };

    const existingPending = beltRequests.find(
      r => r.studentId === studentId && r.status === 'PENDING'
    );

    if (existingPending) {
      return {
        success: false,
        message: 'Você já possui uma solicitação de alteração de faixa pendente de análise pelo professor.',
      };
    }

    const newRequest: BeltChangeRequest = {
      id: `req-${Date.now()}`,
      studentId,
      studentName: student.name,
      currentBelt: student.belt,
      currentStripes: student.stripes,
      requestedBelt,
      requestedStripes,
      requestDate: new Date().toISOString().split('T')[0],
      notes: notes || 'Solicitação de alteração enviada pelo aluno.',
      status: 'PENDING',
    };

    setBeltRequests(prev => [newRequest, ...prev]);
    saveToFirestore('beltRequests', newRequest);

    return {
      success: true,
      message: 'Solicitação de troca de faixa enviada com sucesso! Aguarde a aprovação do seu Professor.',
    };
  };

  const approveBeltChange = (requestId: string, reviewerName: string) => {
    const req = beltRequests.find(r => r.id === requestId);
    if (!req) return;

    promoteStudent(
      req.studentId,
      req.requestedBelt,
      req.requestedStripes,
      reviewerName,
      req.notes ? `[Solicitação Aprovada] ${req.notes}` : 'Solicitação de alteração de faixa aprovada pelo professor.'
    );

    const reviewedAt = new Date().toISOString().split('T')[0];
    const updatedReq: BeltChangeRequest = {
      ...req,
      status: 'APPROVED',
      reviewedBy: reviewerName,
      reviewedAt,
    };
    setBeltRequests(prev => prev.map(r => (r.id === requestId ? updatedReq : r)));
    saveToFirestore('beltRequests', updatedReq);
  };

  const rejectBeltChange = (requestId: string, reviewerName: string) => {
    const req = beltRequests.find(r => r.id === requestId);
    if (!req) return;

    const reviewedAt = new Date().toISOString().split('T')[0];
    const updatedReq: BeltChangeRequest = {
      ...req,
      status: 'REJECTED',
      reviewedBy: reviewerName,
      reviewedAt,
    };

    setBeltRequests(prev => prev.map(r => (r.id === requestId ? updatedReq : r)));
    saveToFirestore('beltRequests', updatedReq);
  };

  // Teacher CRUD
  const addTeacher = (teacherData: Omit<Teacher, 'id'>): Teacher => {
    const newTeacher: Teacher = {
      ...teacherData,
      id: `prof-${Date.now()}`,
    };
    setTeachers(prev => [newTeacher, ...prev]);
    saveToFirestore('teachers', newTeacher);
    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    let updatedTeacher: Teacher | null = null;
    setTeachers(prev =>
      prev.map(t => {
        if (t.id === id) {
          updatedTeacher = { ...t, ...updates };
          return updatedTeacher;
        }
        return t;
      })
    );
    if (updatedTeacher) saveToFirestore('teachers', updatedTeacher);
  };

  const deleteTeacher = (id: string) => {
    setTeachers(prev => prev.filter(t => t.id !== id));
    removeFromFirestore('teachers', id);
  };

  // Class CRUD
  const addClass = (classData: Omit<BJJClass, 'id'>) => {
    const newClass: BJJClass = {
      ...classData,
      id: `cls-${Date.now()}`,
    };
    setClasses(prev => [...prev, newClass]);
    saveToFirestore('classes', newClass);
  };

  const updateClass = (id: string, updates: Partial<BJJClass>) => {
    let updatedClass: BJJClass | null = null;
    let oldFocus: string | undefined = undefined;

    const targetClass = classes.find(c => c.id === id);
    if (targetClass) oldFocus = targetClass.weeklyFocus;

    setClasses(prev =>
      prev.map(c => {
        if (c.id === id) {
          updatedClass = { ...c, ...updates };
          return updatedClass;
        }
        return c;
      })
    );

    if (updatedClass) {
      saveToFirestore('classes', updatedClass);

      if (updates.weeklyFocus !== undefined && updates.weeklyFocus !== oldFocus && updates.weeklyFocus.trim() !== '') {
        const className = updates.title || targetClass?.title || 'Turma';
        addNotification({
          title: `🎯 Novo Foco Técnico: ${className}`,
          message: `O professor definiu o foco da semana para: "${updates.weeklyFocus}"`,
          type: 'WEEKLY_FOCUS',
          targetClassId: id,
          targetClassName: className,
          authorName: updates.professorName || targetClass?.professorName || 'Professor / Mestre',
        });

        setWeeklyPositions(prev => {
          const existsIndex = prev.findIndex(p => p.classId === id && p.title.toLowerCase() === updates.weeklyFocus?.toLowerCase());
          let updatedPositions = [...prev];
          if (existsIndex >= 0) {
            updatedPositions[existsIndex] = {
              ...updatedPositions[existsIndex],
              isCurrentFocus: true,
              videoUrl: updates.weeklyFocusVideoUrl !== undefined ? updates.weeklyFocusVideoUrl : updatedPositions[existsIndex].videoUrl,
            };
          } else {
            const newPos: WeeklyPosition = {
              id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              title: updates.weeklyFocus!,
              category: 'GERAL',
              classId: id,
              className: className,
              professorName: updates.professorName || targetClass?.professorName || 'Professor',
              date: getLocalDateStr(),
              weekLabel: 'Foco da Semana',
              description: `Foco técnico definido para a turma ${className}`,
              keyDetails: [],
              videoUrl: updates.weeklyFocusVideoUrl !== undefined ? updates.weeklyFocusVideoUrl : (targetClass?.weeklyFocusVideoUrl || ''),
              isCurrentFocus: true,
              createdAt: new Date().toISOString(),
              learnedByStudentIds: [],
            };
            updatedPositions = [newPos, ...updatedPositions];
            saveToFirestore('weeklyPositions', newPos);
          }
          return updatedPositions;
        });
      }
    }
  };

  const deleteClass = (id: string) => {
    setClasses(prev => prev.filter(c => c.id !== id));
    removeFromFirestore('classes', id);
  };

  // Attendance
  const recordAttendance = (
    studentId: string,
    classId: string,
    method: 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER' = 'MANUAL',
    verifiedBy: string = 'Sistema',
    bypassTimeCheck: boolean = false,
    customDate?: string,
    customTime?: string
  ): { success: boolean; message: string } => {
    const student = students.find(s => s.id === studentId || s.qrCodeToken === studentId);
    if (!student) {
      return { success: false, message: 'Aluno não encontrado ou QR Code inválido.' };
    }

    if (!student.active) {
      return { success: false, message: `O aluno ${student.name} está inativo no sistema.` };
    }

    const bjjClass = classes.find(c => c.id === classId) || classes[0];

    const todayStr = getLocalDateStr();
    const effectiveDate = (customDate && customDate.trim()) ? customDate.trim() : todayStr;
    const isCustomDate = effectiveDate !== todayStr;

    if (!bypassTimeCheck && !isCustomDate) {
      const availability = checkClassCheckinAvailability(bjjClass);
      if (!availability.isAvailable) {
        return {
          success: false,
          message: availability.reason || 'Check-in indisponível no momento para esta aula.',
        };
      }
    }

    const alreadyPresent = attendances.some(a => 
      a.studentId === student.id && 
      getAttendanceLocalDate(a) === effectiveDate
    );

    if (alreadyPresent && !bypassTimeCheck) {
      const formattedDate = effectiveDate.split('-').reverse().join('/');
      return { 
        success: false, 
        message: `Atenção: ${student.name} já possui presença registrada em ${formattedDate}! (Permitida apenas 1 presença por dia)` 
      };
    }

    const now = new Date();
    let finalTimestamp: string;
    if (customTime) {
      finalTimestamp = new Date(`${effectiveDate}T${customTime}:00`).toISOString();
    } else if (isCustomDate) {
      finalTimestamp = new Date(`${effectiveDate}T19:00:00`).toISOString();
    } else {
      finalTimestamp = now.toISOString();
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: bjjClass ? bjjClass.id : classId,
      className: bjjClass ? bjjClass.title : 'Aula Geral',
      date: effectiveDate,
      timestamp: finalTimestamp,
      method,
      verifiedBy,
    };

    setAttendances(prev => [newRecord, ...prev]);
    saveToFirestore('attendances', newRecord);

    // Update student's class counter directly in Firestore
    const updatedStudent: Student = {
      ...student,
      totalClassesAttended: (student.totalClassesAttended || 0) + 1,
      classesSinceLastGraduation: (student.classesSinceLastGraduation || 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    setStudents(prev => prev.map(s => (s.id === student.id ? updatedStudent : s)));
    saveToFirestore('students', updatedStudent);

    const formattedDate = effectiveDate.split('-').reverse().join('/');
    return {
      success: true,
      message: `Oss! Presença confirmada para ${student.name} em ${formattedDate} na aula de ${bjjClass ? bjjClass.title : 'Jiu-Jitsu'}.`,
    };
  };

  const updateAttendance = (id: string, updates: Partial<AttendanceRecord>) => {
    const existing = attendances.find(a => a.id === id);
    if (!existing) return;

    // Check if student was changed
    const prevStudentId = existing.studentId;
    const newStudentId = updates.studentId && updates.studentId !== prevStudentId ? updates.studentId : null;

    let updatedDate = updates.date || existing.date;
    let updatedTimestamp = updates.timestamp || existing.timestamp;

    if (updates.date && !updates.timestamp) {
      updatedTimestamp = new Date(`${updates.date}T19:00:00`).toISOString();
    }

    const updatedRecord: AttendanceRecord = {
      ...existing,
      ...updates,
      date: updatedDate,
      timestamp: updatedTimestamp,
    };

    setAttendances(prev => prev.map(a => (a.id === id ? updatedRecord : a)));
    saveToFirestore('attendances', updatedRecord);

    // If student reassigned, adjust counters
    if (newStudentId) {
      const prevStudent = students.find(s => s.id === prevStudentId);
      if (prevStudent) {
        const decStudent: Student = {
          ...prevStudent,
          totalClassesAttended: Math.max(0, (prevStudent.totalClassesAttended || 0) - 1),
          classesSinceLastGraduation: Math.max(0, (prevStudent.classesSinceLastGraduation || 0) - 1),
          updatedAt: new Date().toISOString(),
        };
        setStudents(prev => prev.map(s => (s.id === prevStudent.id ? decStudent : s)));
        saveToFirestore('students', decStudent);
      }

      const nextStudent = students.find(s => s.id === newStudentId);
      if (nextStudent) {
        const incStudent: Student = {
          ...nextStudent,
          totalClassesAttended: (nextStudent.totalClassesAttended || 0) + 1,
          classesSinceLastGraduation: (nextStudent.classesSinceLastGraduation || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        setStudents(prev => prev.map(s => (s.id === nextStudent.id ? incStudent : s)));
        saveToFirestore('students', incStudent);
      }
    }
  };

  const removeAttendance = (id: string) => {
    const record = attendances.find(a => a.id === id);
    if (record) {
      setAttendances(prev => prev.filter(a => a.id !== id));
      removeFromFirestore('attendances', id);

      const targetStudent = students.find(s => s.id === record.studentId);
      if (targetStudent) {
        const updatedStudent: Student = {
          ...targetStudent,
          totalClassesAttended: Math.max(0, targetStudent.totalClassesAttended - 1),
          classesSinceLastGraduation: Math.max(0, targetStudent.classesSinceLastGraduation - 1),
          updatedAt: new Date().toISOString(),
        };
        setStudents(prev => prev.map(s => (s.id === targetStudent.id ? updatedStudent : s)));
        saveToFirestore('students', updatedStudent);
      }
    }
  };

  // Payments
  const addPayment = (paymentData: Omit<PaymentRecord, 'id'>) => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}`,
    };
    setPayments(prev => [newPayment, ...prev]);
    saveToFirestore('payments', newPayment);
  };

  const markPaymentAsPaid = (paymentId: string, method: 'PIX' | 'CARTAO' | 'DINHEIRO' | 'BOLETO') => {
    let updatedPayment: PaymentRecord | null = null;
    const paidAt = new Date().toISOString();

    setPayments(prev =>
      prev.map(p => {
        if (p.id === paymentId) {
          updatedPayment = {
            ...p,
            status: 'PAGO',
            paymentDate: paidAt,
            paymentMethod: method,
          };
          return updatedPayment;
        }
        return p;
      })
    );

    if (updatedPayment) {
      saveToFirestore('payments', updatedPayment);

      const targetStudent = students.find(s => s.id === (updatedPayment as PaymentRecord).studentId);
      if (targetStudent) {
        const updatedStudent: Student = {
          ...targetStudent,
          paymentStatus: 'PAGO',
          updatedAt: new Date().toISOString(),
        };
        setStudents(prev => prev.map(s => (s.id === targetStudent.id ? updatedStudent : s)));
        saveToFirestore('students', updatedStudent);
      }
    }
  };

  // Training Logs
  const addTrainingLog = (logData: Omit<TrainingLog, 'id'>) => {
    const newLog: TrainingLog = {
      ...logData,
      id: `log-${Date.now()}`,
    };
    setTrainingLogs(prev => [newLog, ...prev]);
    saveToFirestore('trainingLogs', newLog);
  };

  const updateTrainingLog = (id: string, updates: Partial<TrainingLog>) => {
    let updatedLog: TrainingLog | null = null;
    setTrainingLogs(prev =>
      prev.map(l => {
        if (l.id === id) {
          updatedLog = { ...l, ...updates };
          return updatedLog;
        }
        return l;
      })
    );
    if (updatedLog) saveToFirestore('trainingLogs', updatedLog);
  };

  const deleteTrainingLog = (id: string) => {
    setTrainingLogs(prev => prev.filter(l => l.id !== id));
    removeFromFirestore('trainingLogs', id);
  };

  // Teacher Observations
  const addTeacherObservation = (obsData: Omit<TeacherObservation, 'id' | 'date'>) => {
    const newObs: TeacherObservation = {
      ...obsData,
      id: `obs-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: getLocalDateStr(),
      read: false,
      readBy: [],
      createdAt: new Date().toISOString(),
    };
    setTeacherObservations(prev => [newObs, ...prev]);
    saveToFirestore('teacherObservations', newObs);

    // Enviar notificação individual direcionada estritamente para o aluno que recebeu a observação
    const targetStudent = students.find(s => s.id === obsData.studentId || (obsData.studentName && s.name === obsData.studentName));
    const targetName = targetStudent?.name || obsData.studentName || 'Atleta';

    addNotification({
      title: '🥋 Nova Observação do Mestre!',
      message: `${obsData.teacherName || 'Seu Professor'} registrou um feedback técnico individual: "${obsData.title}".`,
      type: 'INDIVIDUAL_OBSERVATION',
      targetStudentId: obsData.studentId,
      targetStudentName: targetName,
      authorName: obsData.teacherName || 'Professor',
      observationId: newObs.id,
    });
  };

  const updateTeacherObservation = (id: string, updates: Partial<TeacherObservation>) => {
    let updatedObs: TeacherObservation | null = null;
    setTeacherObservations(prev =>
      prev.map(o => {
        if (o.id === id) {
          updatedObs = { ...o, ...updates };
          return updatedObs;
        }
        return o;
      })
    );
    if (updatedObs) saveToFirestore('teacherObservations', updatedObs);
  };

  const deleteTeacherObservation = (id: string) => {
    setTeacherObservations(prev => prev.filter(o => o.id !== id));
    removeFromFirestore('teacherObservations', id);
  };

  const markTeacherObservationAsRead = (id: string, userId?: string) => {
    let updatedObs: TeacherObservation | null = null;
    const nowIso = new Date().toISOString();
    setTeacherObservations(prev =>
      prev.map(o => {
        if (o.id === id) {
          const currentReadBy = Array.isArray(o.readBy) ? o.readBy : [];
          const nextReadBy = userId && !currentReadBy.includes(userId) ? [...currentReadBy, userId] : currentReadBy;
          updatedObs = { ...o, read: true, readAt: o.readAt || nowIso, readBy: nextReadBy };
          return updatedObs;
        }
        return o;
      })
    );
    if (updatedObs) saveToFirestore('teacherObservations', updatedObs);
  };

  const markAllTeacherObservationsAsRead = (studentId: string, userId?: string) => {
    const nowIso = new Date().toISOString();
    setTeacherObservations(prev =>
      prev.map(o => {
        const matchesStudent = o.studentId === studentId;
        if (matchesStudent && (!o.read || (userId && (!o.readBy || !o.readBy.includes(userId))))) {
          const currentReadBy = Array.isArray(o.readBy) ? o.readBy : [];
          const nextReadBy = userId && !currentReadBy.includes(userId) ? [...currentReadBy, userId] : currentReadBy;
          const updated = { ...o, read: true, readAt: o.readAt || nowIso, readBy: nextReadBy };
          saveToFirestore('teacherObservations', updated);
          return updated;
        }
        return o;
      })
    );
  };

  // Weekly Focus Positions
  const addWeeklyPosition = (positionData: Omit<WeeklyPosition, 'id' | 'createdAt'>): WeeklyPosition => {
    const newPos: WeeklyPosition = {
      ...positionData,
      id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
      learnedByStudentIds: positionData.learnedByStudentIds || [],
    };
    setWeeklyPositions(prev => [newPos, ...prev]);
    saveToFirestore('weeklyPositions', newPos);

    if (newPos.isCurrentFocus) {
      addNotification({
        title: `🎯 Nova Posição/Foco: ${newPos.title}`,
        message: `O professor cadastrou o foco técnico: "${newPos.title}" (${newPos.className || 'Todas as Turmas'})`,
        type: 'WEEKLY_FOCUS',
        targetClassName: newPos.className || 'Academia',
        authorName: newPos.professorName || 'Professor',
      });
    }

    return newPos;
  };

  const updateWeeklyPosition = (id: string, updates: Partial<WeeklyPosition>) => {
    let updatedItem: WeeklyPosition | null = null;
    setWeeklyPositions(prev =>
      prev.map(p => {
        if (p.id === id) {
          updatedItem = { ...p, ...updates };
          return updatedItem;
        }
        return p;
      })
    );
    if (updatedItem) {
      saveToFirestore('weeklyPositions', updatedItem);
    }
  };

  const deleteWeeklyPosition = (id: string) => {
    setWeeklyPositions(prev => prev.filter(p => p.id !== id));
    removeFromFirestore('weeklyPositions', id);
  };

  const toggleStudentLearnedPosition = (positionId: string, studentId: string) => {
    let updatedPos: WeeklyPosition | null = null;
    setWeeklyPositions(prev =>
      prev.map(p => {
        if (p.id === positionId) {
          const currentList = p.learnedByStudentIds || [];
          const isLearned = currentList.includes(studentId);
          const nextList = isLearned
            ? currentList.filter(id => id !== studentId)
            : [...currentList, studentId];
          
          updatedPos = { ...p, learnedByStudentIds: nextList };
          return updatedPos;
        }
        return p;
      })
    );
    if (updatedPos) {
      saveToFirestore('weeklyPositions', updatedPos);
    }
  };

  // Roll Challenges Actions (Dinâmica de Desafio para um Rola)
  const createRollChallenge = (challengeData: Omit<RollChallenge, 'id' | 'createdAt' | 'status'>): RollChallenge => {
    const newChallenge: RollChallenge = {
      ...challengeData,
      id: `challenge-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    setRollChallenges(prev => [newChallenge, ...prev]);
    saveToFirestore('rollChallenges', newChallenge);

    // Enviar notificação para o desafiado ou para o mural do tatame
    if (newChallenge.isPublicOpenChallenge) {
      addNotification({
        title: `🔥 Desafio Aberto: ${newChallenge.challengerName} no Tatame!`,
        message: `${newChallenge.challengerName} lançou um desafio aberto de rola (${newChallenge.modality === 'NO_GI' ? 'No-Gi / Sem Kimono' : 'Gi / Com Kimono'} - ${newChallenge.targetDurationMinutes} min). Quem topa?`,
        type: 'ANNOUNCEMENT',
        targetClassName: newChallenge.className || 'Tatame Aberto',
        authorName: newChallenge.challengerName,
      });
    } else if (newChallenge.challengedName) {
      addNotification({
        title: `🥋 Desafio de Rola: ${newChallenge.challengerName} vs ${newChallenge.challengedName}`,
        message: `${newChallenge.challengerName} desafiou ${newChallenge.challengedName} para um rola (${newChallenge.modality === 'NO_GI' ? 'No-Gi' : 'Com Kimono'}, ${newChallenge.targetDurationMinutes} min)!`,
        type: 'TEACHER_NOTICE',
        targetClassName: newChallenge.className || 'Tatame',
        authorName: newChallenge.challengerName,
      });
    }

    return newChallenge;
  };

  const acceptRollChallenge = (
    challengeId: string,
    acceptingStudent?: { id: string; name: string; belt: BeltType; stripes: number; photoUrl?: string }
  ) => {
    let updated: RollChallenge | null = null;
    const nowIso = new Date().toISOString();

    setRollChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId) {
          updated = {
            ...c,
            status: 'ACCEPTED',
            acceptedAt: nowIso,
            ...(acceptingStudent && c.isPublicOpenChallenge ? {
              challengedId: acceptingStudent.id,
              challengedName: acceptingStudent.name,
              challengedBelt: acceptingStudent.belt,
              challengedStripes: acceptingStudent.stripes,
              challengedPhotoUrl: acceptingStudent.photoUrl,
            } : {}),
          };
          return updated;
        }
        return c;
      })
    );

    if (updated) {
      saveToFirestore('rollChallenges', updated);
      const challengerName = (updated as RollChallenge).challengerName;
      const challengedName = (updated as RollChallenge).challengedName || acceptingStudent?.name || 'Seu colega';

      addNotification({
        title: `⚔️ Rola Casado: ${challengerName} vs ${challengedName}!`,
        message: `O desafio foi aceito! O rola acontecerá no treino (${(updated as RollChallenge).modality === 'NO_GI' ? 'No-Gi' : 'Com Kimono'}, ${(updated as RollChallenge).targetDurationMinutes} min). Bom treino e respeito no tatame! Oss!`,
        type: 'GENERAL',
        authorName: challengedName,
      });
    }
  };

  const declineRollChallenge = (challengeId: string, reason?: string) => {
    let updated: RollChallenge | null = null;
    setRollChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId) {
          updated = {
            ...c,
            status: 'DECLINED',
            declineReason: reason || 'Não poderei rolar no momento.',
          };
          return updated;
        }
        return c;
      })
    );

    if (updated) {
      saveToFirestore('rollChallenges', updated);
    }
  };

  const cancelRollChallenge = (challengeId: string) => {
    let updated: RollChallenge | null = null;
    setRollChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId) {
          updated = {
            ...c,
            status: 'CANCELLED',
          };
          return updated;
        }
        return c;
      })
    );

    if (updated) {
      saveToFirestore('rollChallenges', updated);
    }
  };

  const completeRollChallenge = (challengeId: string, result: RollChallengeResult) => {
    let updated: RollChallenge | null = null;
    const nowIso = new Date().toISOString();

    setRollChallenges(prev =>
      prev.map(c => {
        if (c.id === challengeId) {
          updated = {
            ...c,
            status: 'COMPLETED',
            completedAt: nowIso,
            result,
          };
          return updated;
        }
        return c;
      })
    );

    if (updated) {
      saveToFirestore('rollChallenges', updated);

      const challenger = (updated as RollChallenge).challengerName;
      const opponent = (updated as RollChallenge).challengedName || 'Adversário';
      const outcomeText = result.outcomeType === 'SUBMISSION'
        ? `Finalização (${result.submissionTechnique || 'Finalização'}) aos ${result.submissionMinute || 0} min`
        : result.outcomeType === 'POINTS'
        ? `Vitória por Pontos`
        : result.outcomeType === 'STUDY_ROUND'
        ? `Rola de Estudo / Treino Técnico`
        : 'Empate Técnico';

      addNotification({
        title: `🏆 Rola Finalizado: ${challenger} & ${opponent}`,
        message: `Resultado registrado: ${result.winnerName ? `${result.winnerName} venceu por ${outcomeText}` : outcomeText}. Parabéns aos guerreiros pelo espírito esportivo! Oss!`,
        type: 'GENERAL',
        authorName: result.registeredBy,
      });
    }
  };

  const deleteRollChallenge = (id: string) => {
    setRollChallenges(prev => prev.filter(c => c.id !== id));
    removeFromFirestore('rollChallenges', id);
  };

  // Campeonatos Internos & Chaveamentos (In-House Tournaments)
  const createTournament = (tournamentData: Omit<InternalTournament, 'id' | 'createdAt'>): InternalTournament => {
    const newTournament: InternalTournament = {
      ...tournamentData,
      id: `tourn-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      categories: tournamentData.categories || [],
      createdAt: new Date().toISOString(),
    };
    setTournaments(prev => [newTournament, ...prev]);
    saveToFirestore('tournaments', newTournament);

    addNotification({
      title: `🥋 Novo Campeonato Interno: ${newTournament.title}`,
      message: `As inscrições e categorias já estão disponíveis no mural de Campeonatos Internos! Data prevista: ${newTournament.date}.`,
      type: 'GENERAL',
    });

    return newTournament;
  };

  const updateTournament = (id: string, updates: Partial<InternalTournament>) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...updates };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const deleteTournament = (id: string) => {
    markAsDeleted(id);
    setTournaments(prev => prev.filter(t => t.id !== id));
    removeFromFirestore('tournaments', id);
  };

  const addCategoryToTournament = (tournamentId: string, category: Omit<TournamentCategory, 'id' | 'matches'>) => {
    const newCategory: TournamentCategory = {
      ...category,
      id: `cat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      competitors: category.competitors || [],
      matches: [],
      status: category.status || 'REGISTRATION',
    };

    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = [...(t.categories || []), newCategory];
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const updateTournamentCategory = (tournamentId: string, categoryId: string, updates: Partial<TournamentCategory>) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            return { ...cat, ...updates };
          }
          return cat;
        });
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const deleteTournamentCategory = (tournamentId: string, categoryId: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).filter(cat => cat.id !== categoryId);
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const registerCompetitorToCategory = (tournamentId: string, categoryId: string, competitor: TournamentCompetitor) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            if (cat.competitors.some(c => c.id === competitor.id)) {
              return cat; // already registered
            }
            return {
              ...cat,
              competitors: [...cat.competitors, competitor],
            };
          }
          return cat;
        });
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const removeCompetitorFromCategory = (tournamentId: string, categoryId: string, competitorId: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              competitors: cat.competitors.filter(c => c.id !== competitorId),
            };
          }
          return cat;
        });
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const generateCategoryBracket = (tournamentId: string, categoryId: string, includeThirdPlace: boolean = true) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            const matches = generateSingleEliminationBracket(cat.id, cat.competitors, includeThirdPlace);
            return {
              ...cat,
              matches,
              podium: undefined,
              status: 'BRACKET_READY' as const,
            };
          }
          return cat;
        });
        const updated = {
          ...t,
          status: t.status === 'REGISTRATION' ? ('IN_PROGRESS' as const) : t.status,
          categories: updatedCategories,
        };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  const updateTournamentMatch = (
    tournamentId: string,
    categoryId: string,
    matchId: string,
    result: {
      winnerId: string;
      winnerName: string;
      outcomeType?: RollOutcomeType;
      submissionTechnique?: string;
      submissionMinute?: number;
      score1?: number;
      score2?: number;
      advantages1?: number;
      advantages2?: number;
      penalties1?: number;
      penalties2?: number;
      notes?: string;
    }
  ) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        let categoryFinished = false;
        let finishedCategoryName = '';
        let champName = '';

        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            const { updatedCategory, finishedTournamentCategory } = advanceTournamentBracket(cat, matchId, result);
            if (finishedTournamentCategory) {
              categoryFinished = true;
              finishedCategoryName = cat.name;
              champName = updatedCategory.podium?.first?.name || result.winnerName;
            }
            return updatedCategory;
          }
          return cat;
        });

        const allCatsCompleted = updatedCategories.length > 0 && updatedCategories.every(c => c.status === 'COMPLETED');
        const updated: InternalTournament = {
          ...t,
          status: allCatsCompleted ? 'COMPLETED' : 'IN_PROGRESS',
          categories: updatedCategories,
        };

        saveToFirestore('tournaments', updated);

        if (categoryFinished) {
          addNotification({
            title: `🥇 Campeão da Categoria: ${champName}!`,
            message: `A categoria "${finishedCategoryName}" do torneio "${t.title}" foi concluída! Parabéns a todos os atletas! Oss!`,
            type: 'GENERAL',
          });
        }

        return updated;
      }
      return t;
    }));
  };

  const resetCategoryBracket = (tournamentId: string, categoryId: string) => {
    setTournaments(prev => prev.map(t => {
      if (t.id === tournamentId) {
        const updatedCategories = (t.categories || []).map(cat => {
          if (cat.id === categoryId) {
            return {
              ...cat,
              matches: [],
              podium: undefined,
              status: 'REGISTRATION' as const,
            };
          }
          return cat;
        });
        const updated = { ...t, categories: updatedCategories };
        saveToFirestore('tournaments', updated);
        return updated;
      }
      return t;
    }));
  };

  // Fotos do Treino / Mural do Tatame em Alta Resolução
  const addTrainingPhoto = (photoData: Omit<TrainingPhoto, 'id' | 'createdAt'>): TrainingPhoto => {
    const newPhoto: TrainingPhoto = {
      ...photoData,
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date().toISOString(),
    };

    setTrainingPhotos(prev => [newPhoto, ...prev]);
    saveToFirestore('trainingPhotos', newPhoto);

    addNotification({
      title: `📸 Nova Foto do Treino Publicada!`,
      message: `A foto do treino "${newPhoto.title}" já está disponível para download em alta resolução no Mural!`,
      type: 'ANNOUNCEMENT',
      targetClassName: newPhoto.className,
      authorName: newPhoto.professorName,
    });

    return newPhoto;
  };

  const addTrainingPhotosBatch = (photosData: Omit<TrainingPhoto, 'id' | 'createdAt'>[]): TrainingPhoto[] => {
    if (!photosData || photosData.length === 0) return [];

    const now = Date.now();
    const createdPhotos: TrainingPhoto[] = photosData.map((p, idx) => ({
      ...p,
      id: `photo-${now + idx}-${Math.random().toString(36).substr(2, 5)}`,
      likesCount: 0,
      likedBy: [],
      createdAt: new Date(now + idx).toISOString(),
    }));

    setTrainingPhotos(prev => [...createdPhotos, ...prev]);
    createdPhotos.forEach(p => saveToFirestore('trainingPhotos', p));

    const count = createdPhotos.length;
    const firstTitle = createdPhotos[0]?.title || 'Treino';
    addNotification({
      title: count === 1 ? `📸 Nova Foto do Treino Publicada!` : `📸 ${count} Novas Fotos do Treino Publicadas!`,
      message: count === 1
        ? `A foto "${firstTitle}" já está disponível para download em alta resolução no Mural!`
        : `${count} fotos do treino foram publicadas no Mural e já estão disponíveis em alta resolução original!`,
      type: 'ANNOUNCEMENT',
      targetClassName: createdPhotos[0]?.className,
      authorName: createdPhotos[0]?.professorName,
    });

    return createdPhotos;
  };

  const updateTrainingPhoto = (id: string, updates: Partial<TrainingPhoto>) => {
    setTrainingPhotos(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, ...updates };
        saveToFirestore('trainingPhotos', updated);
        return updated;
      }
      return p;
    }));
  };

  const deleteTrainingPhoto = (id: string) => {
    markAsDeleted(id);
    setTrainingPhotos(prev => prev.filter(p => p.id !== id));
    removeFromFirestore('trainingPhotos', id);
  };

  const toggleLikeTrainingPhoto = (photoId: string, studentId: string) => {
    setTrainingPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        const currentLikes = p.likedBy || [];
        const isLiked = currentLikes.includes(studentId);
        const nextLikes = isLiked
          ? currentLikes.filter(id => id !== studentId)
          : [...currentLikes, studentId];
        const updated = {
          ...p,
          likedBy: nextLikes,
          likesCount: nextLikes.length,
        };
        saveToFirestore('trainingPhotos', updated);
        return updated;
      }
      return p;
    }));
  };

  // Config
  const updateAcademyConfig = (updates: Partial<AcademyConfig>) => {
    setAcademyConfig(prev => {
      const updated = { ...prev, ...updates };
      saveConfigToFirestore(updated);
      return updated;
    });
  };

  const resetHomologationData = () => {
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setClasses(INITIAL_CLASSES);
    setAttendances(INITIAL_ATTENDANCE);
    setPayments(INITIAL_PAYMENTS);
    setGraduations(INITIAL_GRADUATIONS);
    setBeltRequests(INITIAL_BELT_REQUESTS);
    setTrainingLogs(INITIAL_TRAINING_LOGS);
    setTeacherObservations(INITIAL_TEACHER_OBSERVATIONS);
    setRollChallenges(INITIAL_ROLL_CHALLENGES);
    setTournaments(INITIAL_TOURNAMENTS);
    setTrainingPhotos(INITIAL_TRAINING_PHOTOS);
  };

  const resetToDefaultData = () => {
    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setClasses(INITIAL_CLASSES);
    setAttendances(INITIAL_ATTENDANCE);
    setPayments(INITIAL_PAYMENTS);
    setGraduations(INITIAL_GRADUATIONS);
    setBeltRequests(INITIAL_BELT_REQUESTS);
    setTrainingLogs(INITIAL_TRAINING_LOGS);
    setTeacherObservations(INITIAL_TEACHER_OBSERVATIONS);
    setRollChallenges(INITIAL_ROLL_CHALLENGES);
    setTournaments(INITIAL_TOURNAMENTS);
    setTrainingPhotos(INITIAL_TRAINING_PHOTOS);
    setAcademyConfig(INITIAL_ACADEMY_CONFIG);
  };

  const clearAllDataToEmpty = () => {
    setStudents([]);
    setTeachers([]);
    setClasses([]);
    setAttendances([]);
    setPayments([]);
    setGraduations([]);
    setBeltRequests([]);
    setTrainingLogs([]);
    setTeacherObservations([]);
    setWeeklyPositions([]);
    setRollChallenges([]);
    setTournaments([]);
    setTrainingPhotos([]);
    setNotifications([]);

    clearAllFirestoreCollections();
  };

  const exportDatabaseJSON = () => {
    const dbPayload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      academyConfig,
      students,
      teachers,
      classes,
      attendances,
      payments,
      graduations,
      beltRequests,
      trainingLogs,
      teacherObservations,
      weeklyPositions,
      rollChallenges,
      tournaments,
      trainingPhotos,
    };
    return JSON.stringify(dbPayload, null, 2);
  };

  const importDatabaseJSON = (jsonStr: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Arquivo de backup inválido ou corrompido.' };
      }

      if (data.students && Array.isArray(data.students)) {
        setStudents(data.students);
        data.students.forEach((s: any) => saveToFirestore('students', s));
      }
      if (data.teachers && Array.isArray(data.teachers)) {
        setTeachers(data.teachers);
        data.teachers.forEach((t: any) => saveToFirestore('teachers', t));
      }
      if (data.classes && Array.isArray(data.classes)) {
        setClasses(data.classes);
        data.classes.forEach((c: any) => saveToFirestore('classes', c));
      }
      if (data.attendances && Array.isArray(data.attendances)) {
        setAttendances(data.attendances);
        data.attendances.forEach((a: any) => saveToFirestore('attendances', a));
      }
      if (data.payments && Array.isArray(data.payments)) {
        setPayments(data.payments);
        data.payments.forEach((p: any) => saveToFirestore('payments', p));
      }
      if (data.graduations && Array.isArray(data.graduations)) {
        setGraduations(data.graduations);
        data.graduations.forEach((g: any) => saveToFirestore('graduations', g));
      }
      if (data.beltRequests && Array.isArray(data.beltRequests)) {
        setBeltRequests(data.beltRequests);
        data.beltRequests.forEach((b: any) => saveToFirestore('beltRequests', b));
      }
      if (data.trainingLogs && Array.isArray(data.trainingLogs)) {
        setTrainingLogs(data.trainingLogs);
        data.trainingLogs.forEach((l: any) => saveToFirestore('trainingLogs', l));
      }
      if (data.teacherObservations && Array.isArray(data.teacherObservations)) {
        setTeacherObservations(data.teacherObservations);
        data.teacherObservations.forEach((o: any) => saveToFirestore('teacherObservations', o));
      }
      if (data.weeklyPositions && Array.isArray(data.weeklyPositions)) {
        setWeeklyPositions(data.weeklyPositions);
        data.weeklyPositions.forEach((wp: any) => saveToFirestore('weeklyPositions', wp));
      }
      if (data.rollChallenges && Array.isArray(data.rollChallenges)) {
        setRollChallenges(data.rollChallenges);
        data.rollChallenges.forEach((rc: any) => saveToFirestore('rollChallenges', rc));
      }
      if (data.tournaments && Array.isArray(data.tournaments)) {
        setTournaments(data.tournaments);
        data.tournaments.forEach((tn: any) => saveToFirestore('tournaments', tn));
      }
      if (data.trainingPhotos && Array.isArray(data.trainingPhotos)) {
        setTrainingPhotos(data.trainingPhotos);
        data.trainingPhotos.forEach((tp: any) => saveToFirestore('trainingPhotos', tp));
      }
      if (data.academyConfig && typeof data.academyConfig === 'object') {
        setAcademyConfig(data.academyConfig);
        saveConfigToFirestore(data.academyConfig);
      }

      return { success: true, message: 'Banco de dados restaurado com sucesso no Firestore!' };
    } catch (err: any) {
      return { success: false, message: `Erro ao importar arquivo: ${err.message || 'Formato JSON inválido'}` };
    }
  };

  return (
    <DataContext.Provider
      value={{
        students,
        teachers,
        classes,
        attendances,
        payments,
        graduations,
        beltRequests,
        trainingLogs,
        teacherObservations,
        academyConfig,
        notifications,
        activeToastNotif,
        pushPermissionStatus,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        requestPushPermission,
        dismissToastNotif,
        addStudent,
        updateStudent,
        deleteStudent,
        promoteStudent,
        addGraduationRecord,
        updateGraduation,
        deleteGraduation,
        cleanDuplicateGraduations,
        requestBeltChange,
        approveBeltChange,
        rejectBeltChange,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        addClass,
        updateClass,
        deleteClass,
        recordAttendance,
        updateAttendance,
        removeAttendance,
        addPayment,
        markPaymentAsPaid,
        addTrainingLog,
        updateTrainingLog,
        deleteTrainingLog,
        addTeacherObservation,
        updateTeacherObservation,
        deleteTeacherObservation,
        markTeacherObservationAsRead,
        markAllTeacherObservationsAsRead,
        weeklyPositions,
        addWeeklyPosition,
        updateWeeklyPosition,
        deleteWeeklyPosition,
        toggleStudentLearnedPosition,
        rollChallenges,
        createRollChallenge,
        acceptRollChallenge,
        declineRollChallenge,
        cancelRollChallenge,
        completeRollChallenge,
        deleteRollChallenge,
        tournaments,
        createTournament,
        updateTournament,
        deleteTournament,
        addCategoryToTournament,
        updateTournamentCategory,
        deleteTournamentCategory,
        registerCompetitorToCategory,
        removeCompetitorFromCategory,
        generateCategoryBracket,
        updateTournamentMatch,
        resetCategoryBracket,
        trainingPhotos,
        addTrainingPhoto,
        addTrainingPhotosBatch,
        updateTrainingPhoto,
        deleteTrainingPhoto,
        toggleLikeTrainingPhoto,
        updateAcademyConfig,
        environmentMode,
        isHomologationMode: environmentMode === 'HOMOLOG',
        setEnvironmentMode,
        resetHomologationData,
        resetToDefaultData,
        clearAllDataToEmpty,
        exportDatabaseJSON,
        importDatabaseJSON,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
