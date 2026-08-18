import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  AcademyConfig,
  AppNotification,
  AttendanceRecord,
  BeltChangeRequest,
  BeltType,
  BJJClass,
  Graduation,
  PaymentRecord,
  PaymentStatus,
  Student,
  Teacher,
  TeacherObservation,
  TrainingLog,
  WeeklyPosition,
} from '../types';
import { DEFAULT_BLACK_GI_AVATAR } from '../constants/avatar';
import { checkClassCheckinAvailability } from '../utils/checkin';
import { markAsDeleted, isDeletedRecord, isTestMockRecord } from '../lib/deletionTracker';
import { getStudentAttendances } from '../utils/ranking';

const getLocalDateStr = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
import {
  INITIAL_ACADEMY_CONFIG,
  INITIAL_ATTENDANCE,
  INITIAL_BELT_REQUESTS,
  INITIAL_CLASSES,
  INITIAL_GRADUATIONS,
  INITIAL_PAYMENTS,
  INITIAL_STUDENTS,
  INITIAL_TEACHERS,
  INITIAL_TEACHER_OBSERVATIONS,
  INITIAL_TRAINING_LOGS,
} from '../data/mockData';
import {
  saveToFirestore,
  removeFromFirestore,
  saveConfigToFirestore,
  subscribeFirestoreCollection,
  subscribeFirestoreConfig,
  clearAllFirestoreCollections,
  purgeTestMockDataFromFirestore,
} from '../lib/firebaseStore';

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
  recordAttendance: (studentId: string, classId: string, method?: 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER', verifiedBy?: string, bypassTimeCheck?: boolean) => { success: boolean; message: string };
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

  // Weekly Focus Positions Actions
  weeklyPositions: WeeklyPosition[];
  addWeeklyPosition: (position: Omit<WeeklyPosition, 'id' | 'createdAt'>) => WeeklyPosition;
  updateWeeklyPosition: (id: string, updates: Partial<WeeklyPosition>) => void;
  deleteWeeklyPosition: (id: string) => void;
  toggleStudentLearnedPosition: (positionId: string, studentId: string) => void;

  // Config Actions
  updateAcademyConfig: (updates: Partial<AcademyConfig>) => void;

  // Environment Mode (Homologação vs Operação Real)
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
  const [environmentMode, setEnvironmentModeState] = useState<'PROD' | 'HOMOLOG'>(() => {
    return 'PROD';
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('bjjcron_students');
    let rawList: Student[] = saved ? JSON.parse(saved) : INITIAL_STUDENTS;

    rawList = rawList.filter(s => 
      !isTestMockRecord(s.id) &&
      !isTestMockRecord(s.email) &&
      !isTestMockRecord(s.name) &&
      !isTestMockRecord(s.registrationNumber) &&
      !isDeletedRecord(s.id, s.email, s.registrationNumber)
    );

    const processed = rawList.map(s => ({
      ...s,
      approvalStatus: s.approvalStatus || 'APPROVED',
      active: s.approvalStatus === 'APPROVED' || s.active !== false,
      photoUrl: (!s.photoUrl || s.photoUrl.includes('unsplash.com')) ? DEFAULT_BLACK_GI_AVATAR : s.photoUrl
    }));

    localStorage.setItem('bjjcron_students', JSON.stringify(processed));
    return processed;
  });

  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const saved = localStorage.getItem('bjjcron_teachers');
    const rawList: Teacher[] = saved ? JSON.parse(saved) : INITIAL_TEACHERS;
    return rawList
      .filter(t => !isTestMockRecord(t.id) && !isTestMockRecord(t.email) && !isTestMockRecord(t.name))
      .map(t => ({
        ...t,
        photoUrl: (!t.photoUrl || t.photoUrl.includes('unsplash.com')) ? DEFAULT_BLACK_GI_AVATAR : t.photoUrl
      }));
  });

  const [classes, setClasses] = useState<BJJClass[]>(() => {
    const saved = localStorage.getItem('bjjcron_classes');
    const rawList: BJJClass[] = saved ? JSON.parse(saved) : INITIAL_CLASSES;
    return rawList.filter(c => !isTestMockRecord(c.id) && !isTestMockRecord(c.title));
  });

  const [attendances, setAttendances] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('bjjcron_attendances');
    const rawList: AttendanceRecord[] = saved ? JSON.parse(saved) : INITIAL_ATTENDANCE;
    return rawList.filter(a => !isTestMockRecord(a.id) && !isTestMockRecord(a.studentId) && !isTestMockRecord(a.studentName));
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('bjjcron_payments');
    const rawList: PaymentRecord[] = saved ? JSON.parse(saved) : [];
    return rawList.filter(p => !isTestMockRecord(p.id) && !isTestMockRecord(p.studentId) && !isTestMockRecord(p.studentName));
  });

  const [graduations, setGraduations] = useState<Graduation[]>(() => {
    const saved = localStorage.getItem('bjjcron_graduations');
    const rawList: Graduation[] = saved ? JSON.parse(saved) : [];
    return rawList.filter(g => !isTestMockRecord(g.id) && !isTestMockRecord(g.studentId));
  });

  const [beltRequests, setBeltRequests] = useState<BeltChangeRequest[]>(() => {
    const saved = localStorage.getItem('bjjcron_belt_requests');
    const rawList: BeltChangeRequest[] = saved ? JSON.parse(saved) : [];
    return rawList.filter(b => !isTestMockRecord(b.id) && !isTestMockRecord(b.studentId) && !isTestMockRecord(b.studentName));
  });

  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>(() => {
    const saved = localStorage.getItem('bjjcron_training_logs');
    const parsed: TrainingLog[] = saved ? JSON.parse(saved) : [];
    const cleanLogs = parsed.filter(l => 
      !isTestMockRecord(l.id) && 
      !isTestMockRecord(l.studentId) &&
      l.id !== '1' &&
      l.id !== '2' &&
      l.id !== 'log-1' &&
      l.id !== 'log-2' &&
      l.notes !== 'gostei' &&
      l.notes !== 'Oss!!!' &&
      !(typeof l.notes === 'string' && (l.notes.toLowerCase().includes('raspagem de aranha') || l.notes.toLowerCase().includes('posicionamento de calcanhar'))) &&
      !(Array.isArray(l.techniquesLearned) && l.techniquesLearned.some(t => {
        const lower = (t || '').toLowerCase();
        return lower.includes('passagem de guarda emborcando') || lower.includes('ogoshi') || lower.includes('triângulo ajustado') || lower.includes('leg lock no-gi');
      }))
    );
    if (saved && cleanLogs.length !== parsed.length) {
      localStorage.setItem('bjjcron_training_logs', JSON.stringify(cleanLogs));
    }
    return cleanLogs;
  });

  const [teacherObservations, setTeacherObservations] = useState<TeacherObservation[]>(() => {
    const saved = localStorage.getItem('bjjcron_teacher_observations');
    const rawList: TeacherObservation[] = saved ? JSON.parse(saved) : [];
    return rawList.filter(o => !isTestMockRecord(o.id) && !isTestMockRecord(o.studentId) && !isTestMockRecord(o.studentName));
  });

  const INITIAL_WEEKLY_POSITIONS: WeeklyPosition[] = [];

  const [weeklyPositions, setWeeklyPositions] = useState<WeeklyPosition[]>(() => {
    const saved = localStorage.getItem('bjjcron_weekly_positions');
    const rawList: WeeklyPosition[] = saved ? JSON.parse(saved) : INITIAL_WEEKLY_POSITIONS;
    return rawList.filter(p =>
      p.id !== 'pos-1' &&
      p.id !== 'pos-2' &&
      p.id !== 'pos-3' &&
      !p.title.includes('Raspagem de De La Riva com Tomada') &&
      !p.title.includes('Passagem de Guarda Emborcando') &&
      !p.title.includes('Guilhotina da Guarda Aberta') &&
      !isTestMockRecord(p.id) &&
      !isTestMockRecord(p.title)
    );
  });

  const INITIAL_DEFAULT_NOTIFICATIONS: AppNotification[] = [];

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('bjjcron_notifications');
    if (saved) {
      try {
        const parsed: AppNotification[] = JSON.parse(saved);
        // Clean out legacy mock notifications
        return parsed.filter(n => n.id !== 'notif-1' && n.id !== 'notif-2' && !n.authorName?.includes('Carlos Gracie'));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeToastNotif, setActiveToastNotif] = useState<AppNotification | null>(null);

  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [academyConfig, setAcademyConfig] = useState<AcademyConfig>(() => {
    const saved = localStorage.getItem('bjjcron_academy_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_ACADEMY_CONFIG,
          ...parsed,
          graduationCriteria: parsed.graduationCriteria || INITIAL_ACADEMY_CONFIG.graduationCriteria,
        };
      } catch {
        return INITIAL_ACADEMY_CONFIG;
      }
    }
    return INITIAL_ACADEMY_CONFIG;
  });

  // Safe Local Storage Persistence
  const safeSave = (baseKeyName: string, val: any) => {
    try {
      const prefix = environmentMode === 'HOMOLOG' ? 'bjjcron_homolog_' : 'bjjcron_';
      const cleanName = baseKeyName.startsWith('bjjcron_') ? baseKeyName.replace('bjjcron_', '') : baseKeyName;
      const targetKey = `${prefix}${cleanName}`;
      const serialized = JSON.stringify(val);
      if (serialized.length > 4000000) { // Limit to ~4MB to prevent browser tab crash
        console.warn(`[Storage] Dados para ${targetKey} excedem 4MB, ignorando persistência.`);
        return;
      }
      localStorage.setItem(targetKey, serialized);
    } catch (e) {
      console.warn(`[Offline-First] Aviso ao salvar chave no localStorage:`, e);
    }
  };

  const setEnvironmentMode = (mode: 'PROD' | 'HOMOLOG') => {
    localStorage.setItem('bjjcron_env_mode', mode);
    setEnvironmentModeState(mode);

    const prefix = mode === 'HOMOLOG' ? 'bjjcron_homolog_' : 'bjjcron_';

    if (mode === 'HOMOLOG') {
      const existing = localStorage.getItem('bjjcron_homolog_students');
      if (!existing) {
        localStorage.setItem('bjjcron_homolog_students', JSON.stringify(INITIAL_STUDENTS));
        localStorage.setItem('bjjcron_homolog_teachers', JSON.stringify(INITIAL_TEACHERS));
        localStorage.setItem('bjjcron_homolog_classes', JSON.stringify(INITIAL_CLASSES));
        localStorage.setItem('bjjcron_homolog_attendances', JSON.stringify(INITIAL_ATTENDANCE));
        localStorage.setItem('bjjcron_homolog_payments', JSON.stringify(INITIAL_PAYMENTS));
        localStorage.setItem('bjjcron_homolog_graduations', JSON.stringify(INITIAL_GRADUATIONS));
        localStorage.setItem('bjjcron_homolog_belt_requests', JSON.stringify(INITIAL_BELT_REQUESTS));
        localStorage.setItem('bjjcron_homolog_training_logs', JSON.stringify(INITIAL_TRAINING_LOGS));
        localStorage.setItem('bjjcron_homolog_teacher_observations', JSON.stringify(INITIAL_TEACHER_OBSERVATIONS));
      }
    }

    const savedStudents = localStorage.getItem(`${prefix}students`);
    const savedTeachers = localStorage.getItem(`${prefix}teachers`);
    const savedClasses = localStorage.getItem(`${prefix}classes`);
    const savedAttendances = localStorage.getItem(`${prefix}attendances`);
    const savedPayments = localStorage.getItem(`${prefix}payments`);
    const savedGraduations = localStorage.getItem(`${prefix}graduations`);
    const savedBeltRequests = localStorage.getItem(`${prefix}belt_requests`);
    const savedLogs = localStorage.getItem(`${prefix}training_logs`);
    const savedObs = localStorage.getItem(`${prefix}teacher_observations`);

    setStudents(savedStudents ? JSON.parse(savedStudents) : []);
    setTeachers(savedTeachers ? JSON.parse(savedTeachers) : []);
    setClasses(savedClasses ? JSON.parse(savedClasses) : []);
    setAttendances(savedAttendances ? JSON.parse(savedAttendances) : []);
    setPayments(savedPayments ? JSON.parse(savedPayments) : []);
    setGraduations(savedGraduations ? JSON.parse(savedGraduations) : []);
    setBeltRequests(savedBeltRequests ? JSON.parse(savedBeltRequests) : []);
    setTrainingLogs(savedLogs ? JSON.parse(savedLogs) : []);
    setTeacherObservations(savedObs ? JSON.parse(savedObs) : []);

    window.dispatchEvent(new Event('bjjcron_env_changed'));
  };

  const resetHomologationData = () => {
    localStorage.setItem('bjjcron_homolog_students', JSON.stringify(INITIAL_STUDENTS));
    localStorage.setItem('bjjcron_homolog_teachers', JSON.stringify(INITIAL_TEACHERS));
    localStorage.setItem('bjjcron_homolog_classes', JSON.stringify(INITIAL_CLASSES));
    localStorage.setItem('bjjcron_homolog_attendances', JSON.stringify(INITIAL_ATTENDANCE));
    localStorage.setItem('bjjcron_homolog_payments', JSON.stringify(INITIAL_PAYMENTS));
    localStorage.setItem('bjjcron_homolog_graduations', JSON.stringify(INITIAL_GRADUATIONS));
    localStorage.setItem('bjjcron_homolog_belt_requests', JSON.stringify(INITIAL_BELT_REQUESTS));
    localStorage.setItem('bjjcron_homolog_training_logs', JSON.stringify(INITIAL_TRAINING_LOGS));
    localStorage.setItem('bjjcron_homolog_teacher_observations', JSON.stringify(INITIAL_TEACHER_OBSERVATIONS));

    if (environmentMode === 'HOMOLOG') {
      setStudents(INITIAL_STUDENTS);
      setTeachers(INITIAL_TEACHERS);
      setClasses(INITIAL_CLASSES);
      setAttendances(INITIAL_ATTENDANCE);
      setPayments(INITIAL_PAYMENTS);
      setGraduations(INITIAL_GRADUATIONS);
      setBeltRequests(INITIAL_BELT_REQUESTS);
      setTrainingLogs(INITIAL_TRAINING_LOGS);
      setTeacherObservations(INITIAL_TEACHER_OBSERVATIONS);
    }
  };

  useEffect(() => { safeSave('bjjcron_students', students); }, [students]);
  useEffect(() => { safeSave('bjjcron_teachers', teachers); }, [teachers]);
  useEffect(() => { safeSave('bjjcron_classes', classes); }, [classes]);
  useEffect(() => { safeSave('bjjcron_attendances', attendances); }, [attendances]);
  useEffect(() => { safeSave('bjjcron_payments', payments); }, [payments]);
  useEffect(() => { safeSave('bjjcron_graduations', graduations); }, [graduations]);
  useEffect(() => { safeSave('bjjcron_belt_requests', beltRequests); }, [beltRequests]);
  useEffect(() => { safeSave('bjjcron_training_logs', trainingLogs); }, [trainingLogs]);
  useEffect(() => { safeSave('bjjcron_teacher_observations', teacherObservations); }, [teacherObservations]);
  useEffect(() => { safeSave('bjjcron_academy_config', academyConfig); }, [academyConfig]);
  useEffect(() => { safeSave('bjjcron_notifications', notifications); }, [notifications]);
  useEffect(() => { safeSave('bjjcron_weekly_positions', weeklyPositions); }, [weeklyPositions]);

  // Sync positions from classes that have weeklyFocus set (retroactive sync)
  useEffect(() => {
    if (classes && classes.length > 0) {
      classes.forEach(c => {
        if (c.weeklyFocus && c.weeklyFocus.trim() !== '') {
          setWeeklyPositions(prev => {
            const exists = prev.some(
              p => p.classId === c.id && p.title.toLowerCase() === c.weeklyFocus?.toLowerCase()
            );
            if (!exists) {
              const newPos: WeeklyPosition = {
                id: `pos-${c.id}`,
                title: c.weeklyFocus!,
                category: 'GERAL',
                classId: c.id,
                className: c.title,
                professorName: c.professorName || 'Professor',
                date: getLocalDateStr(),
                weekLabel: 'Foco da Semana',
                description: `Foco técnico da turma ${c.title}`,
                keyDetails: [],
                videoUrl: c.weeklyFocusVideoUrl || '',
                isCurrentFocus: true,
                createdAt: new Date().toISOString(),
                learnedByStudentIds: [],
              };
              const updated = [newPos, ...prev];
              saveToFirestore('weeklyPositions', newPos);
              return updated;
            }
            return prev;
          });
        }
      });
    }
  }, [classes]);

  // Push Notification Handlers
  const requestPushPermission = async (): Promise<NotificationPermission> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPushPermissionStatus(res);
        if (res === 'granted') {
          try {
            new Notification('🔔 Notificações BJJCRON Ativadas!', {
              body: 'Você receberá alertas em tempo real sobre o foco da semana e avisos da academia.',
              icon: '/logo.svg',
            });
          } catch (e) {
            console.warn('Erro ao abrir notificação de confirmação:', e);
          }
        }
        return res;
      } catch (err) {
        console.warn('Erro ao solicitar permissão de Notificação:', err);
      }
    }
    return 'denied';
  };

  const addNotification = (notifData: Omit<AppNotification, 'id' | 'createdAt' | 'readBy'>): AppNotification => {
    const newNotif: AppNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      readBy: [],
    };

    setNotifications(prev => [newNotif, ...prev]);
    saveToFirestore('notifications', newNotif);

    // Show in-app banner toast
    setActiveToastNotif(newNotif);

    // Trigger Web Push Notification if browser permission granted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.message,
          icon: '/logo.svg',
        });
      } catch (e) {
        console.warn('Web Notification trigger error:', e);
      }
    }

    return newNotif;
  };

  const markNotificationAsRead = (notificationId: string, userId: string) => {
    if (!userId) return;
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId && !n.readBy.includes(userId)) {
          const updated = { ...n, readBy: [...n.readBy, userId] };
          saveToFirestore('notifications', updated);
          return updated;
        }
        return n;
      })
    );
  };

  const markAllNotificationsAsRead = (userId: string) => {
    if (!userId) return;
    setNotifications(prev =>
      prev.map(n => {
        if (!n.readBy.includes(userId)) {
          const updated = { ...n, readBy: [...n.readBy, userId] };
          saveToFirestore('notifications', updated);
          return updated;
        }
        return n;
      })
    );
  };

  const deleteNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    removeFromFirestore('notifications', notificationId);
  };

  const dismissToastNotif = () => {
    setActiveToastNotif(null);
  };

  // Real-time Firestore Cloud Synchronization
  useEffect(() => {
    // Purge any lingering test or mock records from Firestore automatically
    purgeTestMockDataFromFirestore();

    const unsubStudents = subscribeFirestoreCollection<Student>('students', (data) => {
      setStudents(prev => {
        const prefix = environmentMode === 'HOMOLOG' ? 'bjjcron_homolog_' : 'bjjcron_';
        const saved = localStorage.getItem(`${prefix}students`) || localStorage.getItem('bjjcron_students');
        let localList: Student[] = prev;
        if (saved) { try { localList = JSON.parse(saved); } catch (e) {} }

        const cloudItems = data || [];
        const merged: Student[] = [];

        const findInMerged = (id?: string, email?: string, name?: string, regNum?: string) => {
          const cleanE = email ? email.trim().toLowerCase() : '';
          const cleanN = name ? name.trim().toLowerCase() : '';
          const cleanR = regNum ? regNum.trim().toLowerCase() : '';
          return merged.find(m => 
            (id && m.id === id) ||
            (cleanE && m.email && m.email.trim().toLowerCase() === cleanE) ||
            (cleanR && m.registrationNumber && m.registrationNumber.trim().toLowerCase() === cleanR) ||
            (cleanN && m.name && m.name.trim().toLowerCase() === cleanN)
          );
        };

        // 1. Process cloud students
        cloudItems.forEach(cloudSt => {
          if (
            isTestMockRecord(cloudSt.id) || 
            isTestMockRecord(cloudSt.email) ||
            isTestMockRecord(cloudSt.name) ||
            isTestMockRecord(cloudSt.registrationNumber) ||
            isDeletedRecord(cloudSt.id, cloudSt.email, cloudSt.registrationNumber)
          ) {
            removeFromFirestore('students', cloudSt.id);
            return;
          }

          const cleanCloudEmail = cloudSt.email ? cloudSt.email.trim().toLowerCase() : '';
          const cleanCloudName = cloudSt.name ? cloudSt.name.trim().toLowerCase() : '';

          const localSt = localList.find(s => 
            s.id === cloudSt.id || 
            (cleanCloudEmail && s.email && s.email.trim().toLowerCase() === cleanCloudEmail) ||
            (cleanCloudName && s.name && s.name.trim().toLowerCase() === cleanCloudName)
          );

          const existingMergedIdx = merged.findIndex(m => 
            m.id === cloudSt.id || 
            (cleanCloudEmail && m.email && m.email.trim().toLowerCase() === cleanCloudEmail) ||
            (cleanCloudName && m.name && m.name.trim().toLowerCase() === cleanCloudName)
          );

          const isApproved = cloudSt.approvalStatus === 'APPROVED' || (localSt && localSt.approvalStatus === 'APPROVED') || (!cloudSt.approvalStatus && (!localSt || !localSt.approvalStatus));
          const bestApproval = isApproved ? 'APPROVED' : (cloudSt.approvalStatus || (localSt && localSt.approvalStatus) || 'APPROVED');

          // Rank & name resolution: local state holds latest user modifications and must never be clobbered
          const bestBelt = localSt?.belt || cloudSt.belt || 'BRANCA';
          const bestStripes = localSt?.stripes !== undefined ? localSt.stripes : (cloudSt.stripes !== undefined ? cloudSt.stripes : 0);
          const bestName = (localSt?.name && localSt.name.trim()) ? localSt.name.trim() : (cloudSt.name || 'Aluno');
          const bestPhone = localSt?.phone || cloudSt.phone || '';
          const bestEmail = localSt?.email || cloudSt.email || '';
          const bestPhoto = (localSt?.photoUrl && !localSt.photoUrl.includes('unsplash.com')) ? localSt.photoUrl : (cloudSt.photoUrl || DEFAULT_BLACK_GI_AVATAR);
          const bestGradDate = localSt?.lastGraduationDate || cloudSt.lastGraduationDate;

          const mergedItem: Student = {
            ...cloudSt,
            ...(localSt || {}),
            id: localSt?.id || cloudSt.id,
            approvalStatus: bestApproval,
            active: bestApproval === 'APPROVED' ? true : (localSt?.active ?? cloudSt.active ?? true),
            name: bestName,
            email: bestEmail,
            phone: bestPhone,
            photoUrl: bestPhoto,
            belt: bestBelt,
            stripes: bestStripes,
            lastGraduationDate: bestGradDate,
            startDate: localSt?.startDate || cloudSt.startDate || new Date().toISOString().split('T')[0],
            totalClassesAttended: Math.max(localSt?.totalClassesAttended || 0, cloudSt.totalClassesAttended || 0),
            classesSinceLastGraduation: Math.max(localSt?.classesSinceLastGraduation || 0, cloudSt.classesSinceLastGraduation || 0),
          };

          if (existingMergedIdx !== -1) {
            merged[existingMergedIdx] = mergedItem;
          } else {
            merged.push(mergedItem);
          }
        });

        // 2. Preserve local students missing from cloud and push them to cloud
        localList.forEach(localSt => {
          if (
            isTestMockRecord(localSt.id) || 
            isTestMockRecord(localSt.email) ||
            isTestMockRecord(localSt.name) ||
            isTestMockRecord(localSt.registrationNumber) ||
            isDeletedRecord(localSt.id, localSt.email, localSt.registrationNumber)
          ) {
            return;
          }
          const exists = findInMerged(localSt.id, localSt.email, localSt.name, localSt.registrationNumber);
          if (!exists) {
            merged.push(localSt);
            saveToFirestore('students', localSt);
          }
        });

        // 3. Auto-sync ALUNO users from bjjcron_users
        try {
          const savedUsersStr = localStorage.getItem('bjjcron_users');
          if (savedUsersStr) {
            const allUsers: any[] = JSON.parse(savedUsersStr);
            allUsers.forEach(u => {
              if (
                u.role === 'ALUNO' && 
                u.approvalStatus === 'APPROVED' &&
                !isTestMockRecord(u.id) && 
                !isTestMockRecord(u.email) &&
                !isTestMockRecord(u.name) &&
                !isDeletedRecord(u.id, u.email, u.studentId)
              ) {
                const exists = findInMerged(u.studentId, u.email, u.name);
                if (!exists) {
                  const prevMatch = localList.find(s => s.id === u.studentId || (s.email && u.email && s.email.trim().toLowerCase() === u.email.trim().toLowerCase()));
                  const isApproved = u.approvalStatus === 'APPROVED' || prevMatch?.approvalStatus === 'APPROVED';
                  const statusVal = isApproved ? 'APPROVED' : (u.approvalStatus || prevMatch?.approvalStatus || 'PENDING');

                  const autoStudent: Student = {
                    id: u.studentId || `std-${u.id}`,
                    registrationNumber: `BJJ-2026-${String(merged.length + 1).padStart(3, '0')}`,
                    name: u.name,
                    email: u.email,
                    phone: u.phone || '',
                    birthDate: '2000-01-01',
                    photoUrl: u.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
                    belt: prevMatch?.belt || 'BRANCA',
                    stripes: prevMatch?.stripes || 0,
                    startDate: new Date().toISOString().split('T')[0],
                    totalClassesAttended: prevMatch?.totalClassesAttended || 0,
                    classesSinceLastGraduation: prevMatch?.classesSinceLastGraduation || 0,
                    weightCategory: 'MÉDIO',
                    ageCategory: 'ADULTO',
                    active: statusVal === 'APPROVED',
                    planName: 'Plano Mensal Padrão',
                    planPrice: 240,
                    paymentDueDateDay: 10,
                    paymentStatus: 'PENDENTE',
                    qrCodeToken: `BJJCRON-${u.studentId || u.id}`,
                    approvalStatus: statusVal,
                    notes: 'Atleta integrado via usuário',
                    hasActivatedAccount: true,
                  };
                  merged.push(autoStudent);
                  saveToFirestore('students', autoStudent);
                }
              }
            });
          }
        } catch (e) {}

        safeSave('bjjcron_students', merged);
        return merged;
      });
      window.dispatchEvent(new Event('bjjcron_students_updated'));
    });

    const unsubTeachers = subscribeFirestoreCollection<Teacher>('teachers', (data) => {
      setTeachers(data);
    });

    const unsubClasses = subscribeFirestoreCollection<BJJClass>('classes', (data) => {
      setClasses(data);
    });

    const unsubAttendances = subscribeFirestoreCollection<AttendanceRecord>('attendances', (data) => {
      setAttendances(data);
      if (data && data.length > 0) {
        setStudents(prev => {
          let updated = false;
          const newList = prev.map(s => {
            const count = getStudentAttendances(s, data, 'ALL').length;
            const actualTotal = Math.max(s.totalClassesAttended || 0, count);
            if (s.totalClassesAttended !== actualTotal) {
              updated = true;
              return { ...s, totalClassesAttended: actualTotal };
            }
            return s;
          });
          if (updated) {
            safeSave('bjjcron_students', newList);
            return newList;
          }
          return prev;
        });
      }
    });

    const unsubPayments = subscribeFirestoreCollection<PaymentRecord>('payments', (data) => {
      setPayments(data);
    });

    const unsubGraduations = subscribeFirestoreCollection<Graduation>('graduations', (data) => {
      setGraduations(data);
      if (data && data.length > 0) {
        setStudents(prev => {
          let updated = false;
          const newList = prev.map(s => {
            const cleanSEmail = s.email ? s.email.trim().toLowerCase() : '';
            const studentGrads = data.filter(g => 
              g.studentId === s.id || 
              (cleanSEmail && g.studentId && g.studentId.trim().toLowerCase() === cleanSEmail)
            );
            if (studentGrads.length > 0) {
              studentGrads.sort((a,b) => new Date(b.promotedAt).getTime() - new Date(a.promotedAt).getTime());
              const latestGrad = studentGrads[0];
              const gradWeight = getBeltWeight(latestGrad.belt, latestGrad.stripes);
              const currentWeight = getBeltWeight(s.belt, s.stripes);

              if (latestGrad.belt && gradWeight > currentWeight) {
                updated = true;
                return { ...s, belt: latestGrad.belt, stripes: latestGrad.stripes ?? s.stripes };
              }
            }
            return s;
          });
          if (updated) {
            safeSave('bjjcron_students', newList);
            return newList;
          }
          return prev;
        });
      }
    });

    const unsubBeltRequests = subscribeFirestoreCollection<BeltChangeRequest>('beltRequests', (data) => {
      setBeltRequests(data);
    });

    const unsubTrainingLogs = subscribeFirestoreCollection<TrainingLog>('trainingLogs', (data) => {
      const realLogs = (data || []).filter(l => 
        l.id !== 'log-1' && 
        l.id !== 'log-2' && 
        l.studentId !== 'std-1' &&
        !isTestMockRecord(l.id) && 
        !isTestMockRecord(l.studentId)
      );
      setTrainingLogs(realLogs);
      safeSave('bjjcron_training_logs', realLogs);
    });

    const unsubTeacherObs = subscribeFirestoreCollection<TeacherObservation>('teacherObservations', (data) => {
      setTeacherObservations(data);
    });

    const unsubWeeklyPositions = subscribeFirestoreCollection<WeeklyPosition>('weeklyPositions', (data) => {
      const realPositions = (data || []).filter(p => !isTestMockRecord(p.id) && !isTestMockRecord(p.title));
      if (realPositions.length > 0) {
        setWeeklyPositions(realPositions);
        safeSave('bjjcron_weekly_positions', realPositions);
      }
    });

    const unsubNotifications = subscribeFirestoreCollection<AppNotification>('notifications', (data) => {
      const realNotifs = data.filter(n => n.id !== 'notif-1' && n.id !== 'notif-2' && !n.authorName?.includes('Carlos Gracie'));
      setNotifications(realNotifs);
      safeSave('bjjcron_notifications', realNotifs);
    });

    const unsubConfig = subscribeFirestoreConfig((data) => {
      if (data) {
        setAcademyConfig(prev => ({
          ...INITIAL_ACADEMY_CONFIG,
          ...prev,
          ...data,
          graduationCriteria: data.graduationCriteria || prev.graduationCriteria || INITIAL_ACADEMY_CONFIG.graduationCriteria,
        }));
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
      unsubTeacherObs();
      unsubNotifications();
      unsubConfig();
    };
  }, []);

  // Sync state when students or users are updated in localStorage by AuthContext or another tab
  useEffect(() => {
    const syncStudentsFromStorage = () => {
      const saved = localStorage.getItem('bjjcron_students');
      if (saved) {
        try {
          const rawList: Student[] = JSON.parse(saved);
          setStudents(rawList.map(s => ({
            ...s,
            photoUrl: (!s.photoUrl || s.photoUrl.includes('unsplash.com')) ? DEFAULT_BLACK_GI_AVATAR : s.photoUrl
          })));
        } catch (e) {}
      }
    };
    window.addEventListener('storage', syncStudentsFromStorage);
    window.addEventListener('bjjcron_students_updated', syncStudentsFromStorage);
    return () => {
      window.removeEventListener('storage', syncStudentsFromStorage);
      window.removeEventListener('bjjcron_students_updated', syncStudentsFromStorage);
    };
  }, []);

  // Student CRUD
  const addStudent = (studentData: Omit<Student, 'id' | 'registrationNumber' | 'qrCodeToken' | 'totalClassesAttended' | 'classesSinceLastGraduation'>): Student => {
    const newId = `std-${Date.now()}`;
    const regNum = `BJJ-2026-${String(students.length + 1).padStart(3, '0')}`;
    const qrToken = `BJJCRON-${newId}-${studentData.name.toUpperCase().replace(/\s+/g, '-')}`;

    const newStudent: Student = {
      ...studentData,
      id: newId,
      registrationNumber: regNum,
      qrCodeToken: qrToken,
      totalClassesAttended: 0,
      classesSinceLastGraduation: 0,
      approvalStatus: studentData.approvalStatus || 'APPROVED',
      hasActivatedAccount: false,
    };

    setStudents(prev => {
      const updated = [newStudent, ...prev];
      localStorage.setItem('bjjcron_students', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('students', newStudent);

    // Automatically create User in bjjcron_users so student can log in / activate immediately with their email
    if (studentData.email) {
      const cleanEmail = studentData.email.trim().toLowerCase();
      try {
        const savedUsers = localStorage.getItem('bjjcron_users');
        const usersList = savedUsers ? JSON.parse(savedUsers) : [];
        if (!usersList.some((u: any) => (u.email && u.email.trim().toLowerCase() === cleanEmail) || u.studentId === newId)) {
          const newUserObj = {
            id: `user-${newId}`,
            name: studentData.name,
            email: cleanEmail,
            role: 'ALUNO',
            studentId: newId,
            phone: studentData.phone || '',
            password: '123',
            approvalStatus: studentData.approvalStatus || 'APPROVED',
            isActivated: false,
            avatarUrl: (studentData.photoUrl && !studentData.photoUrl.includes('unsplash.com')) ? studentData.photoUrl : DEFAULT_BLACK_GI_AVATAR
          };
          usersList.push(newUserObj);
          localStorage.setItem('bjjcron_users', JSON.stringify(usersList));
          window.dispatchEvent(new Event('bjjcron_users_updated'));
        }
      } catch (e) {
        console.error('Error syncing student to bjjcron_users:', e);
      }
    }

    // Automatically create first payment record
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

    fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStudent),
    }).catch(() => {});
    fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPayment),
    }).catch(() => {});

    window.dispatchEvent(new Event('bjjcron_students_updated'));
    return newStudent;
  };

  const updateStudent = (id: string, updates: Partial<Student>) => {
    let updatedStudent: Student | null = null;
    const cleanId = id.trim().toLowerCase();

    setStudents(prev => {
      const updated = prev.map(s => {
        if (
          s.id === id || 
          (s.email && s.email.trim().toLowerCase() === cleanId) ||
          (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanId)
        ) {
          updatedStudent = { ...s, ...updates };
          return updatedStudent;
        }
        return s;
      });
      safeSave('bjjcron_students', updated);
      return updated;
    });

    if (updatedStudent) {
      const st = updatedStudent as Student;
      saveToFirestore('students', st);

      // If belt, stripes or lastGraduationDate were modified, automatically generate/update Graduation record
      if (updates.belt !== undefined || updates.stripes !== undefined || updates.lastGraduationDate !== undefined) {
        const gradDate = updates.lastGraduationDate || st.lastGraduationDate || new Date().toISOString().split('T')[0];
        const gradRec: Graduation = {
          id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentId: st.id,
          belt: st.belt,
          stripes: st.stripes,
          promotedBy: academyConfig.headCoachName || 'Mestre / Professor',
          promotedAt: gradDate,
          notes: updates.notes || 'Atualização de faixa/graduação do cadastro.',
          classesCountAtPromotion: st.totalClassesAttended,
        };
        setGraduations(gPrev => {
          const nextGrads = [gradRec, ...gPrev.filter(g => g.id !== gradRec.id)];
          safeSave('bjjcron_graduations', nextGrads);
          return nextGrads;
        });
        saveToFirestore('graduations', gradRec);
      }

      // Sync corresponding user in bjjcron_users and bjjcron_current_user
      try {
        const savedUsers = localStorage.getItem('bjjcron_users');
        if (savedUsers) {
          const targetEmail = st.email ? st.email.trim().toLowerCase() : '';
          const usersList = JSON.parse(savedUsers);
          const userIdx = usersList.findIndex((u: any) => 
            (u.studentId === st.id) || 
            (u.role === 'ALUNO' && targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail)
          );
          if (userIdx !== -1) {
            if (updates.name) usersList[userIdx].name = updates.name;
            if (updates.email) usersList[userIdx].email = updates.email.trim().toLowerCase();
            if (updates.phone) usersList[userIdx].phone = updates.phone;
            if (updates.photoUrl !== undefined) usersList[userIdx].avatarUrl = updates.photoUrl;
            if (updates.approvalStatus) usersList[userIdx].approvalStatus = updates.approvalStatus;
            localStorage.setItem('bjjcron_users', JSON.stringify(usersList));
            saveToFirestore('users', usersList[userIdx]);
          }
        }

        // Update current user if matching
        const savedCurr = localStorage.getItem('bjjcron_current_user');
        if (savedCurr) {
          const curr = JSON.parse(savedCurr);
          const targetEmail = st.email ? st.email.trim().toLowerCase() : '';
          if (
            curr.studentId === st.id ||
            (curr.role === 'ALUNO' && targetEmail && curr.email && curr.email.trim().toLowerCase() === targetEmail)
          ) {
            if (updates.name) curr.name = updates.name;
            if (updates.email) curr.email = updates.email.trim().toLowerCase();
            if (updates.phone) curr.phone = updates.phone;
            if (updates.photoUrl !== undefined) curr.avatarUrl = updates.photoUrl;
            localStorage.setItem('bjjcron_current_user', JSON.stringify(curr));
          }
        }
        window.dispatchEvent(new Event('bjjcron_users_updated'));
      } catch (e) {
        console.error('Error updating user in bjjcron_users:', e);
      }
    }

    fetch(`/api/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});

    window.dispatchEvent(new Event('bjjcron_students_updated'));
  };

  const deleteStudent = (id: string) => {
    const targetStudent = students.find(s => s.id === id);
    markAsDeleted(id, targetStudent?.email, targetStudent?.registrationNumber);

    setStudents(prev => {
      const updated = prev.filter(s => s.id !== id && (s.email && targetStudent?.email ? s.email.trim().toLowerCase() !== targetStudent.email.trim().toLowerCase() : true));
      safeSave('bjjcron_students', updated);
      return updated;
    });

    removeFromFirestore('students', id);
    if (targetStudent && targetStudent.email) {
      removeFromFirestore('students', targetStudent.email.trim().toLowerCase());
    }

    try {
      const savedUsersStr = localStorage.getItem('bjjcron_users');
      if (savedUsersStr) {
        const usersList: any[] = JSON.parse(savedUsersStr);
        const targetEmail = targetStudent?.email?.trim().toLowerCase();
        const matchedUsers = usersList.filter(u => u.studentId === id || (targetEmail && u.email && u.email.trim().toLowerCase() === targetEmail));
        matchedUsers.forEach(u => {
          markAsDeleted(u.id, u.email, u.studentId);
          removeFromFirestore('users', u.id);
        });
        const updatedUsers = usersList.filter(u => u.studentId !== id && (!targetEmail || !u.email || u.email.trim().toLowerCase() !== targetEmail));
        localStorage.setItem('bjjcron_users', JSON.stringify(updatedUsers));
        window.dispatchEvent(new Event('bjjcron_users_updated'));
      }
    } catch (e) {}

    fetch(`/api/students/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
    window.dispatchEvent(new Event('bjjcron_students_updated'));
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
    const graduationDate = promotedAt || new Date().toISOString().split('T')[0];

    const newGraduation: Graduation = {
      id: `grad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: realId,
      belt: newBelt,
      stripes: newStripes,
      promotedBy: promotedBy || academyConfig.headCoachName || 'Mestre / Professor',
      promotedAt: graduationDate,
      notes: notes || 'Graduação outorgada por mérito.',
      classesCountAtPromotion: student.totalClassesAttended,
    };

    setGraduations(prev => {
      const nextGrads = [newGraduation, ...prev];
      safeSave('bjjcron_graduations', nextGrads);
      return nextGrads;
    });
    saveToFirestore('graduations', newGraduation);

    const updatedStudentObj: Student = {
      ...student,
      belt: newBelt,
      stripes: newStripes,
      classesSinceLastGraduation: 0,
      lastGraduationDate: graduationDate,
    };

    setStudents(prev => {
      const nextStudents = prev.map(s => {
        if (
          s.id === realId || 
          (s.email && student.email && s.email.trim().toLowerCase() === student.email.trim().toLowerCase())
        ) {
          return updatedStudentObj;
        }
        return s;
      });
      safeSave('bjjcron_students', nextStudents);
      return nextStudents;
    });

    saveToFirestore('students', updatedStudentObj);

    fetch(`/api/students/${encodeURIComponent(realId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        belt: newBelt,
        stripes: newStripes,
        classesSinceLastGraduation: 0,
      }),
    }).catch(() => {});

    window.dispatchEvent(new Event('bjjcron_students_updated'));
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
        message: 'Você já possui uma solicitação de alteração de faixa pendente de análise pelo professor.'
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

    setBeltRequests(prev => {
      const updated = [newRequest, ...prev];
      localStorage.setItem('bjjcron_belt_requests', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('beltRequests', newRequest);

    fetch('/api/belt-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRequest),
    }).catch(() => {});

    return {
      success: true,
      message: 'Solicitação de troca de faixa enviada com sucesso! Aguarde a aprovação do seu Professor.'
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
    const updatedReq = {
      ...req,
      status: 'APPROVED' as const,
      reviewedBy: reviewerName,
      reviewedAt,
    };
    setBeltRequests(prev => {
      const updated = prev.map(r => r.id === requestId ? updatedReq : r);
      localStorage.setItem('bjjcron_belt_requests', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('beltRequests', updatedReq);

    fetch(`/api/belt-requests/${encodeURIComponent(requestId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'APPROVED',
        reviewedBy: reviewerName,
        reviewedAt,
      }),
    }).catch(() => {});
  };

  const rejectBeltChange = (requestId: string, reviewerName: string) => {
    const req = beltRequests.find(r => r.id === requestId);
    if (!req) return;

    const reviewedAt = new Date().toISOString().split('T')[0];
    const updatedReq = {
      ...req,
      status: 'REJECTED' as const,
      reviewedBy: reviewerName,
      reviewedAt,
    };

    setBeltRequests(prev => {
      const updated = prev.map(r => r.id === requestId ? updatedReq : r);
      localStorage.setItem('bjjcron_belt_requests', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('beltRequests', updatedReq);

    fetch(`/api/belt-requests/${encodeURIComponent(requestId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'REJECTED',
        reviewedBy: reviewerName,
        reviewedAt,
      }),
    }).catch(() => {});
  };

  // Teacher CRUD
  const addTeacher = (teacherData: Omit<Teacher, 'id'>): Teacher => {
    const newTeacher: Teacher = {
      ...teacherData,
      id: `prof-${Date.now()}`,
    };
    setTeachers(prev => {
      const updated = [newTeacher, ...prev];
      safeSave('bjjcron_teachers', updated);
      return updated;
    });
    saveToFirestore('teachers', newTeacher);

    fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTeacher),
    }).catch(() => {});

    return newTeacher;
  };

  const updateTeacher = (id: string, updates: Partial<Teacher>) => {
    let updatedTeacher: Teacher | null = null;
    setTeachers(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          updatedTeacher = { ...t, ...updates };
          return updatedTeacher;
        }
        return t;
      });
      safeSave('bjjcron_teachers', updated);
      return updated;
    });
    if (updatedTeacher) saveToFirestore('teachers', updatedTeacher);

    fetch(`/api/teachers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  const deleteTeacher = (id: string) => {
    setTeachers(prev => {
      const updated = prev.filter(t => t.id !== id);
      safeSave('bjjcron_teachers', updated);
      return updated;
    });
    removeFromFirestore('teachers', id);

    fetch(`/api/teachers/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Class CRUD
  const addClass = (classData: Omit<BJJClass, 'id'>) => {
    const newClass: BJJClass = {
      ...classData,
      id: `cls-${Date.now()}`,
    };
    setClasses(prev => {
      const updated = [...prev, newClass];
      safeSave('bjjcron_classes', updated);
      return updated;
    });
    saveToFirestore('classes', newClass);

    fetch('/api/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newClass),
    }).catch(() => {});
  };

  const updateClass = (id: string, updates: Partial<BJJClass>) => {
    let updatedClass: BJJClass | null = null;
    let oldFocus: string | undefined = undefined;

    const targetClass = classes.find(c => c.id === id);
    if (targetClass) oldFocus = targetClass.weeklyFocus;

    setClasses(prev => {
      const updated = prev.map(c => {
        if (c.id === id) {
          updatedClass = { ...c, ...updates };
          return updatedClass;
        }
        return c;
      });
      safeSave('bjjcron_classes', updated);
      return updated;
    });

    if (updatedClass) {
      saveToFirestore('classes', updatedClass);

      // Auto trigger push notification if weeklyFocus was set or changed
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

        // Automatically record position into weeklyPositions
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
          safeSave('bjjcron_weekly_positions', updatedPositions);
          return updatedPositions;
        });
      }
    }

    fetch(`/api/classes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  };

  const deleteClass = (id: string) => {
    setClasses(prev => {
      const updated = prev.filter(c => c.id !== id);
      safeSave('bjjcron_classes', updated);
      return updated;
    });
    removeFromFirestore('classes', id);

    fetch(`/api/classes/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Attendance
  const recordAttendance = (
    studentId: string,
    classId: string,
    method: 'MANUAL' | 'QR_CODE_STUDENT' | 'QR_CODE_TEACHER' = 'MANUAL',
    verifiedBy: string = 'Sistema',
    bypassTimeCheck: boolean = false
  ): { success: boolean; message: string } => {
    const student = students.find(s => s.id === studentId || s.qrCodeToken === studentId);
    if (!student) {
      return { success: false, message: 'Aluno não encontrado ou QR Code inválido.' };
    }

    if (!student.active) {
      return { success: false, message: `O aluno ${student.name} está inativo no sistema.` };
    }

    const bjjClass = classes.find(c => c.id === classId) || classes[0];

    // Enforce day and 15-minute time window check unless explicitly bypassed
    if (!bypassTimeCheck) {
      const availability = checkClassCheckinAvailability(bjjClass);
      if (!availability.isAvailable) {
        return {
          success: false,
          message: availability.reason || 'Check-in indisponível no momento para esta aula.',
        };
      }
    }

    const todayStr = getLocalDateStr();

    // Check if student already checked in today (limit to 1 attendance per day)
    const alreadyPresent = attendances.some(a => 
      a.studentId === student.id && 
      a.date === todayStr
    );

    if (alreadyPresent && !bypassTimeCheck) {
      return { success: false, message: `Atenção: ${student.name} já registrou presença hoje! (Permitida apenas 1 presença por dia de aula)` };
    }

    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      classId: bjjClass.id,
      className: bjjClass.title,
      date: todayStr,
      timestamp: new Date().toISOString(),
      method,
      verifiedBy,
    };

    setAttendances(prev => {
      const updated = [newRecord, ...prev];
      localStorage.setItem('bjjcron_attendances', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('attendances', newRecord);

    fetch('/api/attendances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRecord),
    }).catch(() => {});

    // Update student's class counter
    setStudents(prev => {
      let updatedStudent: Student | null = null;
      const updated = prev.map(s => {
        if (s.id === student.id) {
          updatedStudent = {
            ...s,
            totalClassesAttended: s.totalClassesAttended + 1,
            classesSinceLastGraduation: s.classesSinceLastGraduation + 1,
          };
          fetch(`/api/students/${encodeURIComponent(s.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalClassesAttended: updatedStudent.totalClassesAttended,
              classesSinceLastGraduation: updatedStudent.classesSinceLastGraduation,
            }),
          }).catch(() => {});
          return updatedStudent;
        }
        return s;
      });
      localStorage.setItem('bjjcron_students', JSON.stringify(updated));
      if (updatedStudent) saveToFirestore('students', updatedStudent);
      return updated;
    });

    return {
      success: true,
      message: `Oss! Presença confirmada para ${student.name} na aula de ${bjjClass.title}.`,
    };
  };

  const removeAttendance = (id: string) => {
    const record = attendances.find(a => a.id === id);
    if (record) {
      setAttendances(prev => {
        const updated = prev.filter(a => a.id !== id);
        localStorage.setItem('bjjcron_attendances', JSON.stringify(updated));
        return updated;
      });
      removeFromFirestore('attendances', id);
      fetch(`/api/attendances/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});

      setStudents(prev => {
        let updatedStudent: Student | null = null;
        const updated = prev.map(s => {
          if (s.id === record.studentId) {
            updatedStudent = {
              ...s,
              totalClassesAttended: Math.max(0, s.totalClassesAttended - 1),
              classesSinceLastGraduation: Math.max(0, s.classesSinceLastGraduation - 1),
            };
            fetch(`/api/students/${encodeURIComponent(s.id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                totalClassesAttended: updatedStudent.totalClassesAttended,
                classesSinceLastGraduation: updatedStudent.classesSinceLastGraduation,
              }),
            }).catch(() => {});
            return updatedStudent;
          }
          return s;
        });
        localStorage.setItem('bjjcron_students', JSON.stringify(updated));
        if (updatedStudent) saveToFirestore('students', updatedStudent);
        return updated;
      });
    }
  };

  // Payments
  const addPayment = (paymentData: Omit<PaymentRecord, 'id'>) => {
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: `pay-${Date.now()}`,
    };
    setPayments(prev => {
      const updated = [newPayment, ...prev];
      localStorage.setItem('bjjcron_payments', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('payments', newPayment);

    fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPayment),
    }).catch(() => {});
  };

  const markPaymentAsPaid = (paymentId: string, method: 'PIX' | 'CARTAO' | 'DINHEIRO' | 'BOLETO') => {
    const todayStr = new Date().toISOString().split('T')[0];
    let updatedPayment: PaymentRecord | null = null;
    setPayments(prev => {
      const updated = prev.map(p => {
        if (p.id === paymentId) {
          fetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'PAGO',
              paymentDate: todayStr,
              paymentMethod: method,
            }),
          }).catch(() => {});

          updatedPayment = {
            ...p,
            status: 'PAGO' as PaymentStatus,
            paymentDate: todayStr,
            paymentMethod: method,
          };
          return updatedPayment;
        }
        return p;
      });
      localStorage.setItem('bjjcron_payments', JSON.stringify(updated));
      return updated;
    });
    if (updatedPayment) saveToFirestore('payments', updatedPayment);

    setStudents(sPrev => {
      const targetPayment = payments.find(p => p.id === paymentId);
      let updatedStudent: Student | null = null;
      const updated = sPrev.map(st => {
        if (targetPayment && st.id === targetPayment.studentId) {
          fetch(`/api/students/${encodeURIComponent(st.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentStatus: 'PAGO',
              lastPaymentDate: todayStr,
            }),
          }).catch(() => {});
          updatedStudent = { ...st, paymentStatus: 'PAGO' as PaymentStatus, lastPaymentDate: todayStr };
          return updatedStudent;
        }
        return st;
      });
      localStorage.setItem('bjjcron_students', JSON.stringify(updated));
      if (updatedStudent) saveToFirestore('students', updatedStudent);
      return updated;
    });
  };

  // Training Logs
  const addTrainingLog = (logData: Omit<TrainingLog, 'id'>) => {
    const newLog: TrainingLog = {
      ...logData,
      id: `log-${Date.now()}`,
    };
    setTrainingLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('bjjcron_training_logs', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('trainingLogs', newLog);

    fetch('/api/training-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  };

  const updateTrainingLog = (id: string, updates: Partial<TrainingLog>) => {
    setTrainingLogs(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...updates } : l);
      localStorage.setItem('bjjcron_training_logs', JSON.stringify(updated));
      return updated;
    });
    const log = trainingLogs.find(l => l.id === id);
    if (log) {
      const merged = { ...log, ...updates };
      saveToFirestore('trainingLogs', merged);
      fetch(`/api/training-logs/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
      }).catch(() => {});
    }
  };

  const deleteTrainingLog = (id: string) => {
    setTrainingLogs(prev => {
      const updated = prev.filter(l => l.id !== id);
      localStorage.setItem('bjjcron_training_logs', JSON.stringify(updated));
      return updated;
    });
    removeFromFirestore('trainingLogs', id);
    fetch(`/api/training-logs/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Teacher Observations
  const addTeacherObservation = (obsData: Omit<TeacherObservation, 'id' | 'date'>) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const targetStudent = students.find(s => s.id === obsData.studentId);
    const newObs: TeacherObservation = {
      ...obsData,
      studentName: targetStudent ? targetStudent.name : obsData.studentName || 'Aluno',
      id: `obs-${Date.now()}`,
      date: todayStr
    };
    setTeacherObservations(prev => {
      const updated = [newObs, ...prev];
      localStorage.setItem('bjjcron_teacher_observations', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('teacherObservations', newObs);

    fetch('/api/teacher-observations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newObs),
    }).catch(() => {});
  };

  const updateTeacherObservation = (id: string, updates: Partial<TeacherObservation>) => {
    setTeacherObservations(prev => {
      const updated = prev.map(o => {
        if (o.id === id) {
          const targetStudent = updates.studentId ? students.find(s => s.id === updates.studentId) : null;
          return {
            ...o,
            ...updates,
            ...(targetStudent ? { studentName: targetStudent.name } : {})
          };
        }
        return o;
      });
      localStorage.setItem('bjjcron_teacher_observations', JSON.stringify(updated));
      return updated;
    });

    const existing = teacherObservations.find(o => o.id === id);
    if (existing) {
      const targetStudent = updates.studentId ? students.find(s => s.id === updates.studentId) : null;
      const updatedObj = {
        ...existing,
        ...updates,
        ...(targetStudent ? { studentName: targetStudent.name } : {})
      };
      saveToFirestore('teacherObservations', updatedObj);
      fetch(`/api/teacher-observations/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedObj)
      }).catch(() => {});
    }
  };

  const deleteTeacherObservation = (id: string) => {
    setTeacherObservations(prev => {
      const updated = prev.filter(o => o.id !== id);
      localStorage.setItem('bjjcron_teacher_observations', JSON.stringify(updated));
      return updated;
    });
    removeFromFirestore('teacherObservations', id);

    fetch(`/api/teacher-observations/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  // Weekly Focus Positions
  const addWeeklyPosition = (positionData: Omit<WeeklyPosition, 'id' | 'createdAt'>): WeeklyPosition => {
    const newPos: WeeklyPosition = {
      ...positionData,
      id: `pos-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setWeeklyPositions(prev => {
      const updated = [newPos, ...prev];
      localStorage.setItem('bjjcron_weekly_positions', JSON.stringify(updated));
      return updated;
    });
    saveToFirestore('weeklyPositions', newPos);

    // Also trigger notification if it's set as current focus
    if (newPos.isCurrentFocus) {
      addNotification({
        title: `🎯 Nova Posição/Foco: ${newPos.title}`,
        message: `O professor cadastrou o foco técnico: "${newPos.title}" (${newPos.className || 'Todas as Turmas'})`,
        type: 'WEEKLY_FOCUS',
        targetClassName: newPos.className || 'Academia',
        authorName: newPos.professorName || 'Professor'
      });
    }

    return newPos;
  };

  const updateWeeklyPosition = (id: string, updates: Partial<WeeklyPosition>) => {
    let updatedItem: WeeklyPosition | null = null;
    setWeeklyPositions(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          updatedItem = { ...p, ...updates };
          return updatedItem;
        }
        return p;
      });
      localStorage.setItem('bjjcron_weekly_positions', JSON.stringify(updated));
      return updated;
    });
    if (updatedItem) {
      saveToFirestore('weeklyPositions', updatedItem);
    }
  };

  const deleteWeeklyPosition = (id: string) => {
    setWeeklyPositions(prev => {
      const updated = prev.filter(p => p.id !== id);
      localStorage.setItem('bjjcron_weekly_positions', JSON.stringify(updated));
      return updated;
    });
    removeFromFirestore('weeklyPositions', id);
  };

  const toggleStudentLearnedPosition = (positionId: string, studentId: string) => {
    let updatedPos: WeeklyPosition | null = null;
    setWeeklyPositions(prev => {
      const updated = prev.map(p => {
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
      });
      localStorage.setItem('bjjcron_weekly_positions', JSON.stringify(updated));
      return updated;
    });
    if (updatedPos) {
      saveToFirestore('weeklyPositions', updatedPos);
    }
  };

  // Config
  const updateAcademyConfig = (updates: Partial<AcademyConfig>) => {
    setAcademyConfig(prev => {
      const updated = { ...prev, ...updates };
      saveConfigToFirestore(updated);
      fetch('/api/academy-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      }).catch(() => {});
      return updated;
    });
  };

  const resetToDefaultData = () => {
    localStorage.removeItem('bjjcron_students');
    localStorage.removeItem('bjjcron_teachers');
    localStorage.removeItem('bjjcron_classes');
    localStorage.removeItem('bjjcron_attendances');
    localStorage.removeItem('bjjcron_payments');
    localStorage.removeItem('bjjcron_graduations');
    localStorage.removeItem('bjjcron_belt_requests');
    localStorage.removeItem('bjjcron_training_logs');
    localStorage.removeItem('bjjcron_teacher_observations');
    localStorage.removeItem('bjjcron_academy_config');

    setStudents(INITIAL_STUDENTS);
    setTeachers(INITIAL_TEACHERS);
    setClasses(INITIAL_CLASSES);
    setAttendances(INITIAL_ATTENDANCE);
    setPayments(INITIAL_PAYMENTS);
    setGraduations(INITIAL_GRADUATIONS);
    setBeltRequests(INITIAL_BELT_REQUESTS);
    setTrainingLogs(INITIAL_TRAINING_LOGS);
    setTeacherObservations(INITIAL_TEACHER_OBSERVATIONS);
    setAcademyConfig(INITIAL_ACADEMY_CONFIG);
    fetch('/api/reset-data', { method: 'POST' }).catch(() => {});
  };

  const clearAllDataToEmpty = () => {
    localStorage.setItem('bjjcron_students', JSON.stringify([]));
    localStorage.setItem('bjjcron_teachers', JSON.stringify([]));
    localStorage.setItem('bjjcron_classes', JSON.stringify([]));
    localStorage.setItem('bjjcron_attendances', JSON.stringify([]));
    localStorage.setItem('bjjcron_payments', JSON.stringify([]));
    localStorage.setItem('bjjcron_graduations', JSON.stringify([]));
    localStorage.setItem('bjjcron_belt_requests', JSON.stringify([]));
    localStorage.setItem('bjjcron_training_logs', JSON.stringify([]));
    localStorage.setItem('bjjcron_teacher_observations', JSON.stringify([]));
    localStorage.setItem('bjjcron_notifications', JSON.stringify([]));

    setStudents([]);
    setTeachers([]);
    setClasses([]);
    setAttendances([]);
    setPayments([]);
    setGraduations([]);
    setBeltRequests([]);
    setTrainingLogs([]);
    setTeacherObservations([]);
    setNotifications([]);

    clearAllFirestoreCollections();
    fetch('/api/clear-all-data', { method: 'POST' }).catch(() => {});
  };

  const exportDatabaseJSON = () => {
    const dbPayload = {
      version: '1.0',
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
    };
    return JSON.stringify(dbPayload, null, 2);
  };

  const importDatabaseJSON = (jsonStr: string): { success: boolean; message: string } => {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Arquivo de backup inválido ou corrompido.' };
      }

      if (data.students && Array.isArray(data.students)) setStudents(data.students);
      if (data.teachers && Array.isArray(data.teachers)) setTeachers(data.teachers);
      if (data.classes && Array.isArray(data.classes)) setClasses(data.classes);
      if (data.attendances && Array.isArray(data.attendances)) setAttendances(data.attendances);
      if (data.payments && Array.isArray(data.payments)) setPayments(data.payments);
      if (data.graduations && Array.isArray(data.graduations)) setGraduations(data.graduations);
      if (data.beltRequests && Array.isArray(data.beltRequests)) setBeltRequests(data.beltRequests);
      if (data.trainingLogs && Array.isArray(data.trainingLogs)) setTrainingLogs(data.trainingLogs);
      if (data.teacherObservations && Array.isArray(data.teacherObservations)) setTeacherObservations(data.teacherObservations);
      if (data.academyConfig && typeof data.academyConfig === 'object') setAcademyConfig(data.academyConfig);

      return { success: true, message: 'Banco de dados restaurado com sucesso do backup!' };
    } catch (err: any) {
      return { success: false, message: `Erro ao importar arquivo: ${err.message || 'Formato JSON inválido'}` };
    }
  };

  return (
    <DataContext.Provider value={{
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
      removeAttendance,
      addPayment,
      markPaymentAsPaid,
      addTrainingLog,
      updateTrainingLog,
      deleteTrainingLog,
      addTeacherObservation,
      updateTeacherObservation,
      deleteTeacherObservation,
      weeklyPositions,
      addWeeklyPosition,
      updateWeeklyPosition,
      deleteWeeklyPosition,
      toggleStudentLearnedPosition,
      updateAcademyConfig,
      environmentMode,
      isHomologationMode: environmentMode === 'HOMOLOG',
      setEnvironmentMode,
      resetHomologationData,
      resetToDefaultData,
      clearAllDataToEmpty,
      exportDatabaseJSON,
      importDatabaseJSON,
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};
