import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, BeltType, AgeCategory, WeightCategory, Student } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { DEFAULT_BLACK_GI_AVATAR } from '../constants/avatar';
import { subscribeFirestoreCollection, saveToFirestore, removeFromFirestore, deleteMatchingEntitiesFromFirestore } from '../lib/firebaseStore';
import { markAsDeleted, isDeletedRecord } from '../lib/deletionTracker';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface LoginResult {
  success: boolean;
  message?: string;
  reason?: 'PENDING' | 'REJECTED' | 'NEEDS_FIRST_ACCESS' | 'INVALID_CREDENTIALS' | 'NOT_FOUND' | 'WRONG_PASSWORD';
  user?: User;
}

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  loginWithPassword: (email: string, password?: string, rememberMe?: boolean) => Promise<LoginResult> | LoginResult;
  loginWithGoogle: (rememberMe?: boolean) => Promise<LoginResult>;
  firstAccessActivate: (email: string, newPassword?: string) => { success: boolean; message: string };
  registerStudentSelfService: (studentData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
    ageCategory?: AgeCategory;
    weightCategory?: WeightCategory;
  }) => { success: boolean; message: string };
  registerTeacherSelfService: (teacherData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
    degrees?: number;
    specialty?: string;
  }) => { success: boolean; message: string };
  registerAdminSelfService: (adminData: {
    name: string;
    academyName: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
  }) => { success: boolean; message: string };
  approveUser: (emailOrStudentId: string) => void;
  rejectUser: (emailOrStudentId: string) => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;
  logout: () => void;
  deleteMyAccount: () => { success: boolean; message: string };
  refreshUsersFromStorage: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<boolean>;
  updateUser: (userId: string, updates: Partial<User>) => Promise<boolean>;
  requestPasswordRecovery: (email: string) => { success: boolean; code?: string; message: string };
  resetPasswordWithCode: (email: string, code: string, expectedCode: string, newPassword: string) => { success: boolean; message: string };
}

const persistUserSession = (user: User, rememberMe: boolean = true) => {
  try {
    if (rememberMe) {
      localStorage.setItem('bjjcron_auth_uid', user.id);
      localStorage.setItem('bjjcron_auth_email', user.email);
      localStorage.setItem('bjjcron_remember_me', 'true');
      localStorage.setItem('bjjcron_cached_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('bjjcron_auth_uid');
      localStorage.removeItem('bjjcron_auth_email');
      localStorage.setItem('bjjcron_remember_me', 'false');
      localStorage.removeItem('bjjcron_cached_user');
    }
    sessionStorage.setItem('bjjcron_auth_uid', user.id);
    sessionStorage.setItem('bjjcron_auth_email', user.email);
    sessionStorage.setItem('bjjcron_cached_user', JSON.stringify(user));
  } catch (e) {}
};

const clearUserSession = () => {
  try {
    localStorage.removeItem('bjjcron_auth_uid');
    localStorage.removeItem('bjjcron_auth_email');
    localStorage.removeItem('bjjcron_remember_me');
    localStorage.removeItem('bjjcron_cached_user');
    sessionStorage.removeItem('bjjcron_auth_uid');
    sessionStorage.removeItem('bjjcron_auth_email');
    sessionStorage.removeItem('bjjcron_cached_user');
  } catch (e) {}
};

const getPersistedAuthId = (): { uid: string | null; email: string | null } => {
  try {
    const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
    const localUid = isRemembered ? localStorage.getItem('bjjcron_auth_uid') : null;
    const localEmail = isRemembered ? localStorage.getItem('bjjcron_auth_email') : null;
    const sessionUid = sessionStorage.getItem('bjjcron_auth_uid');
    const sessionEmail = sessionStorage.getItem('bjjcron_auth_email');

    return {
      uid: localUid || sessionUid || null,
      email: localEmail || sessionEmail || null
    };
  } catch (e) {
    return { uid: null, email: null };
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
      if (isRemembered) {
        const cached = localStorage.getItem('bjjcron_cached_user');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.id) return parsed;
        }
      }
      const sessionCached = sessionStorage.getItem('bjjcron_cached_user');
      if (sessionCached) {
        const parsed = JSON.parse(sessionCached);
        if (parsed && parsed.id) return parsed;
      }
    } catch (e) {}
    return null;
  });

  // 1. Subscribe to Firestore `users` in real-time
  useEffect(() => {
    const unsubUsers = subscribeFirestoreCollection<User>('users', (docs) => {
      let list = docs
        .filter(u => !isDeletedRecord(u.id, u.email, u.studentId))
        .map(u => ({
          ...u,
          approvalStatus: u.approvalStatus || 'APPROVED',
          avatarUrl: u.avatarUrl || '',
        }));

      // Ensure Master Admin exists in Firestore if list is empty
      const cauanAdmin = INITIAL_USERS.find(u => u.email.includes('cauanchefe123'));
      if (cauanAdmin && !list.some(u => u.email.trim().toLowerCase() === cauanAdmin.email.trim().toLowerCase())) {
        const cauanAdminNormalized = {
          ...cauanAdmin,
          approvalStatus: (cauanAdmin.approvalStatus || 'APPROVED') as 'APPROVED' | 'PENDING' | 'REJECTED',
          avatarUrl: cauanAdmin.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
        };
        list = [cauanAdminNormalized, ...list];
        saveToFirestore('users', cauanAdmin);
      }

      setUsers(list);

      // Reconcile active session user from localStorage or sessionStorage
      const { uid: sessionUid, email: sessionEmail } = getPersistedAuthId();

      if (sessionUid || sessionEmail) {
        const found = list.find(u => 
          (sessionUid && u.id === sessionUid) || 
          (sessionEmail && u.email && u.email.trim().toLowerCase() === sessionEmail.trim().toLowerCase())
        );
        if (found) {
          setCurrentUser(found);
          const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
          persistUserSession(found, isRemembered);
        }
      }
    });

    const unsubStudents = subscribeFirestoreCollection<Student>('students', (docs) => {
      setStudents(docs.filter(s => !isDeletedRecord(s.id, s.email, s.registrationNumber)));
    });

    return () => {
      unsubUsers();
      unsubStudents();
    };
  }, []);

  const refreshUsersFromStorage = () => {
    // Pure cloud mode: real-time listeners are active automatically
  };

  const loginWithPassword = async (email: string, password?: string, rememberMe: boolean = true): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: 'Por favor, informe seu e-mail de acesso.'
      };
    }

    let found = users.find(u => u.email.trim().toLowerCase() === cleanEmail);

    // If not found in users state, check Firestore students collection
    if (!found) {
      const studentObj = students.find(s => s.email && s.email.trim().toLowerCase() === cleanEmail);
      if (studentObj) {
        const newUser: User = {
          id: `user-${studentObj.id}`,
          name: studentObj.name,
          email: cleanEmail,
          role: 'ALUNO',
          studentId: studentObj.id,
          phone: studentObj.phone || '',
          password: password || studentObj.password || '123',
          approvalStatus: studentObj.approvalStatus || 'APPROVED',
          isActivated: true,
          avatarUrl: (studentObj.photoUrl && !studentObj.photoUrl.includes('unsplash.com')) ? studentObj.photoUrl : DEFAULT_BLACK_GI_AVATAR
        };
        found = newUser;
        setUsers(prev => [newUser, ...prev]);
        saveToFirestore('users', newUser);
      }
    }

    if (!found) {
      return {
        success: false,
        reason: 'NOT_FOUND',
        message: 'E-mail não cadastrado! Por favor, solicite seu cadastro ao Mestre ou crie uma conta.'
      };
    }

    if (password && found.password && found.password !== password && found.password !== '123') {
      return {
        success: false,
        reason: 'WRONG_PASSWORD',
        message: 'Senha incorreta. Verifique sua senha e tente novamente.'
      };
    }

    found.isActivated = true;
    if (password) {
      found.password = password;
      saveToFirestore('users', found);
    }

    persistUserSession(found, rememberMe);

    setCurrentUser(found);
    return {
      success: true,
      user: found,
      message: `Bem-vindo(a) de volta, ${found.name}!`
    };
  };

  const loginWithGoogle = async (rememberMe: boolean = true): Promise<LoginResult> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      if (!googleUser || !googleUser.email) {
        return {
          success: false,
          reason: 'INVALID_CREDENTIALS',
          message: 'Não foi possível obter o e-mail da Conta Google selecionada.'
        };
      }

      const cleanEmail = googleUser.email.trim().toLowerCase();
      const googleDisplayName = googleUser.displayName || cleanEmail.split('@')[0];
      const googlePhoto = googleUser.photoURL || undefined;
      const googleUid = googleUser.uid;

      // 1. Check if user already exists in `users` state
      let found = users.find(u => u.email && u.email.trim().toLowerCase() === cleanEmail);

      // 2. If not found in users state, check Firestore students collection
      if (!found) {
        const studentObj = students.find(s => s.email && s.email.trim().toLowerCase() === cleanEmail);
        if (studentObj) {
          const newUser: User = {
            id: `user-${studentObj.id}`,
            name: studentObj.name || googleDisplayName,
            email: cleanEmail,
            role: 'ALUNO',
            studentId: studentObj.id,
            phone: studentObj.phone || '',
            password: studentObj.password || '123',
            approvalStatus: studentObj.approvalStatus || 'APPROVED',
            isActivated: true,
            authProvider: 'google',
            googleUid: googleUid,
            avatarUrl: (studentObj.photoUrl && !studentObj.photoUrl.includes('unsplash.com'))
              ? studentObj.photoUrl
              : (googlePhoto || DEFAULT_BLACK_GI_AVATAR)
          };
          found = newUser;
          setUsers(prev => [newUser, ...prev]);
          saveToFirestore('users', newUser);
        }
      }

      // 3. If still not found anywhere, auto-create a self-service Student account with Google
      if (!found) {
        const newStudentId = `std-google-${Date.now()}`;
        const newUserId = `user-google-${Date.now()}`;

        const newUser: User = {
          id: newUserId,
          name: googleDisplayName,
          email: cleanEmail,
          role: 'ALUNO',
          studentId: newStudentId,
          phone: '',
          approvalStatus: 'PENDING',
          isActivated: true,
          authProvider: 'google',
          googleUid: googleUid,
          avatarUrl: googlePhoto || DEFAULT_BLACK_GI_AVATAR
        };

        const newStudentObj: Student = {
          id: newStudentId,
          registrationNumber: `BJJ-${new Date().getFullYear()}-${String(students.length + 1).padStart(3, '0')}`,
          name: googleDisplayName,
          email: cleanEmail,
          phone: '',
          birthDate: '2000-01-01',
          photoUrl: googlePhoto || DEFAULT_BLACK_GI_AVATAR,
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
          qrCodeToken: `BJJCRON-${newStudentId}`,
          approvalStatus: 'PENDING',
          notes: 'Cadastro criado via Autenticação Google',
          hasActivatedAccount: true,
          updatedAt: new Date().toISOString()
        };

        const notifObj = {
          id: `notif-google-${Date.now()}`,
          title: 'Novo Aluno cadastrado via Google',
          message: `${googleDisplayName} (${cleanEmail}) conectou-se com a Conta Google e aguarda aprovação.`,
          date: new Date().toISOString(),
          read: false,
          type: 'INFO'
        };

        saveToFirestore('users', newUser);
        saveToFirestore('students', newStudentObj);
        saveToFirestore('notifications', notifObj);

        setUsers(prev => [newUser, ...prev]);
        found = newUser;
      } else {
        // Correlate existing account: update provider, UID and photo without overwriting customized photos
        const updatedUser: User = {
          ...found,
          authProvider: 'google',
          googleUid: googleUid,
          isActivated: true,
          avatarUrl: (found.avatarUrl && !found.avatarUrl.includes('unsplash.com') && found.avatarUrl !== DEFAULT_BLACK_GI_AVATAR)
            ? found.avatarUrl
            : (googlePhoto || found.avatarUrl || DEFAULT_BLACK_GI_AVATAR)
        };
        found = updatedUser;
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        saveToFirestore('users', updatedUser);
      }

      persistUserSession(found, rememberMe);
      setCurrentUser(found);

      return {
        success: true,
        user: found,
        message: `Autenticado com sucesso via Google como ${found.name}!`
      };
    } catch (err: any) {
      console.error('[Google Auth Error]', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return {
          success: false,
          reason: 'INVALID_CREDENTIALS',
          message: 'O login com Google foi cancelado.'
        };
      }
      if (err.code === 'auth/popup-blocked') {
        return {
          success: false,
          reason: 'INVALID_CREDENTIALS',
          message: 'A janela pop-up do Google foi bloqueada pelo navegador. Permita pop-ups para fazer login.'
        };
      }
      return {
        success: false,
        reason: 'INVALID_CREDENTIALS',
        message: err.message || 'Falha ao autenticar com a Conta Google.'
      };
    }
  };

  const firstAccessActivate = (email: string, newPassword?: string): { success: boolean; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return {
        success: false,
        message: 'Por favor, informe seu e-mail para ativar o 1º acesso.'
      };
    }

    let targetUser = users.find(u => u.email.trim().toLowerCase() === cleanEmail);

    if (!targetUser) {
      const studentObj = students.find(s => s.email && s.email.trim().toLowerCase() === cleanEmail);
      if (studentObj) {
        targetUser = {
          id: `user-${studentObj.id}`,
          name: studentObj.name,
          email: cleanEmail,
          role: 'ALUNO',
          studentId: studentObj.id,
          phone: studentObj.phone || '',
          password: newPassword || studentObj.password || '123',
          approvalStatus: 'APPROVED',
          isActivated: true,
          avatarUrl: (studentObj.photoUrl && !studentObj.photoUrl.includes('unsplash.com')) ? studentObj.photoUrl : DEFAULT_BLACK_GI_AVATAR
        };
      }
    }

    if (!targetUser) {
      return {
        success: false,
        message: 'E-mail não cadastrado no sistema! Por favor, realize o seu cadastro antes de acessar sua conta.'
      };
    }

    const updatedUser: User = {
      ...targetUser,
      password: newPassword || targetUser.password || '123',
      isActivated: true,
      approvalStatus: 'APPROVED',
    };

    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    saveToFirestore('users', updatedUser);

    if (updatedUser.studentId) {
      const matchStd = students.find(s => s.id === updatedUser.studentId);
      if (matchStd) {
        saveToFirestore('students', {
          ...matchStd,
          hasActivatedAccount: true,
          approvalStatus: 'APPROVED',
          password: newPassword || '123',
          active: true,
          updatedAt: new Date().toISOString()
        });
      }
    }

    persistUserSession(updatedUser, true);

    setCurrentUser(updatedUser);

    return {
      success: true,
      message: `Conta ativada com sucesso! Senha configurada. Bem-vindo(a) à equipe, ${updatedUser.name}.`
    };
  };

  const registerStudentSelfService = (studentData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
    ageCategory?: AgeCategory;
    weightCategory?: WeightCategory;
  }): { success: boolean; message: string } => {
    const cleanEmail = studentData.email.trim().toLowerCase();

    if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      return {
        success: false,
        message: 'Este e-mail já possui cadastro no sistema! Se esqueceu a senha, utilize a opção "Esqueci minha senha".'
      };
    }

    const newStudentId = `std-self-${Date.now()}`;
    const newUserId = `user-self-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      name: studentData.name,
      email: cleanEmail,
      role: 'ALUNO',
      studentId: newStudentId,
      phone: studentData.phone,
      password: studentData.password,
      approvalStatus: 'PENDING',
      isActivated: true,
      avatarUrl: DEFAULT_BLACK_GI_AVATAR
    };

    const newStudentObj: Student = {
      id: newStudentId,
      registrationNumber: `BJJ-2026-${String(students.length + 1).padStart(3, '0')}`,
      name: studentData.name,
      email: cleanEmail,
      phone: studentData.phone,
      birthDate: '2000-01-01',
      photoUrl: DEFAULT_BLACK_GI_AVATAR,
      belt: studentData.belt || 'BRANCA',
      stripes: 0,
      startDate: new Date().toISOString().split('T')[0],
      totalClassesAttended: 0,
      classesSinceLastGraduation: 0,
      weightCategory: studentData.weightCategory || 'MÉDIO',
      ageCategory: studentData.ageCategory || 'ADULTO',
      active: true,
      planName: 'Plano Mensal Padrão',
      planPrice: 240,
      paymentDueDateDay: 10,
      paymentStatus: 'PENDENTE',
      qrCodeToken: `BJJCRON-${newStudentId}`,
      approvalStatus: 'PENDING',
      notes: 'Nova solicitação de matrícula aguardando aprovação na equipe.',
      hasActivatedAccount: true,
      password: studentData.password,
      updatedAt: new Date().toISOString()
    };

    setUsers(prev => [newUser, ...prev]);
    setStudents(prev => [newStudentObj, ...prev]);

    saveToFirestore('users', newUser);
    saveToFirestore('students', newStudentObj);

    // Create real-time notification in Firestore
    const notifObj = {
      id: `notif-reg-${Date.now()}`,
      title: '🥋 Nova Solicitação de Matrícula',
      message: `O atleta ${studentData.name} solicitou vínculo com a equipe e aguarda aprovação para acessar o tatame.`,
      type: 'GENERAL',
      createdAt: new Date().toISOString(),
      readBy: []
    };
    saveToFirestore('notifications', notifObj);

    persistUserSession(newUser, true);
    setCurrentUser(newUser);

    return {
      success: true,
      message: `Cadastro realizado com sucesso! Bem-vindo(a) à equipe, ${studentData.name}.`
    };
  };

  const registerTeacherSelfService = (teacherData: {
    name: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
    degrees?: number;
    specialty?: string;
  }): { success: boolean; message: string } => {
    const cleanEmail = teacherData.email.trim().toLowerCase();

    if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      return {
        success: false,
        message: 'Este e-mail já possui cadastro no sistema!'
      };
    }

    const newTeacherId = `prof-self-${Date.now()}`;
    const newUserId = `user-prof-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      name: teacherData.name,
      email: cleanEmail,
      role: 'PROFESSOR',
      studentId: newTeacherId,
      phone: teacherData.phone,
      password: teacherData.password,
      approvalStatus: 'APPROVED',
      isActivated: true,
      avatarUrl: DEFAULT_BLACK_GI_AVATAR
    };

    const newTeacherObj = {
      id: newTeacherId,
      name: teacherData.name,
      email: cleanEmail,
      phone: teacherData.phone,
      belt: teacherData.belt || 'PRETA',
      degrees: teacherData.degrees || 1,
      specialty: teacherData.specialty || 'Jiu-Jitsu / No-Gi',
      activeClassesCount: 2,
      avatarUrl: newUser.avatarUrl,
      active: true
    };

    setUsers(prev => [newUser, ...prev]);
    saveToFirestore('users', newUser);
    saveToFirestore('teachers', newTeacherObj);

    persistUserSession(newUser, true);
    setCurrentUser(newUser);

    return {
      success: true,
      message: `Cadastro de Professor realizado com sucesso! Bem-vindo(a), Prof. ${teacherData.name}.`
    };
  };

  const registerAdminSelfService = (adminData: {
    name: string;
    academyName: string;
    email: string;
    phone: string;
    password: string;
    belt?: BeltType;
  }): { success: boolean; message: string } => {
    const cleanEmail = adminData.email.trim().toLowerCase();

    if (users.some(u => u.email.trim().toLowerCase() === cleanEmail)) {
      return {
        success: false,
        message: 'Este e-mail já possui cadastro no sistema!'
      };
    }

    const newUserId = `user-admin-${Date.now()}`;

    const newUser: User = {
      id: newUserId,
      name: adminData.name,
      email: cleanEmail,
      role: 'ADMIN',
      phone: adminData.phone,
      password: adminData.password,
      approvalStatus: 'APPROVED',
      isActivated: true,
      avatarUrl: DEFAULT_BLACK_GI_AVATAR
    };

    setUsers(prev => [newUser, ...prev]);
    saveToFirestore('users', newUser);

    if (adminData.academyName) {
      saveToFirestore('config', {
        id: 'academyConfig',
        name: adminData.academyName,
        fantasyName: adminData.academyName,
        ownerName: adminData.name,
        contactEmail: cleanEmail,
        contactPhone: adminData.phone
      });
    }

    persistUserSession(newUser, true);
    setCurrentUser(newUser);

    return {
      success: true,
      message: `Academia "${adminData.academyName}" e conta de Mestre/Admin cadastradas com sucesso! Bem-vindo, Mestre ${adminData.name}.`
    };
  };

  const approveUser = (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();
    let approvedUserObj: User | null = null;

    // 1. Update Users in Firestore and local state
    setUsers(prev =>
      prev.map(u => {
        if (
          u.id === identifier || 
          u.studentId === identifier || 
          (u.email && u.email.trim().toLowerCase() === cleanId) ||
          (u.studentId && u.studentId.trim().toLowerCase() === cleanId)
        ) {
          const updatedUser: User = { ...u, approvalStatus: 'APPROVED', isActivated: true };
          approvedUserObj = updatedUser;
          saveToFirestore('users', updatedUser);
          return updatedUser;
        }
        return u;
      })
    );

    // 2. Update Student in Firestore and local state
    let studentUpdated = false;
    setStudents(prev =>
      prev.map(s => {
        if (
          s.id === identifier || 
          (s.email && s.email.trim().toLowerCase() === cleanId) ||
          (s.registrationNumber && s.registrationNumber.trim().toLowerCase() === cleanId)
        ) {
          studentUpdated = true;
          const updatedSt: Student = { ...s, approvalStatus: 'APPROVED', active: true, updatedAt: new Date().toISOString() };
          saveToFirestore('students', updatedSt);
          return updatedSt;
        }
        return s;
      })
    );

    // If student was not found in students list, synthesize student document in Firestore
    if (!studentUpdated) {
      const u = approvedUserObj || users.find(usr => usr.id === identifier || usr.studentId === identifier || (usr.email && usr.email.trim().toLowerCase() === cleanId));
      if (u) {
        const newStObj: Student = {
          id: u.studentId || u.id,
          registrationNumber: (u.studentId && u.studentId.startsWith('BJJ-')) ? u.studentId : `BJJ-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          name: u.name,
          email: u.email,
          phone: u.phone || '',
          birthDate: '2000-01-01',
          photoUrl: u.avatarUrl || DEFAULT_BLACK_GI_AVATAR,
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
          qrCodeToken: `BJJCRON-${u.id}`,
          approvalStatus: 'APPROVED',
          notes: 'Atleta aprovado na equipe.',
          hasActivatedAccount: true,
          updatedAt: new Date().toISOString()
        };
        setStudents(prev => [newStObj, ...prev]);
        saveToFirestore('students', newStObj);
      }
    }
  };

  const rejectUser = (identifier: string) => {
    const cleanId = identifier.trim().toLowerCase();

    // Find all matching users or students to gather every identifier
    const matchedUsers = users.filter(u => 
      u.id === identifier || 
      u.studentId === identifier || 
      (u.email && u.email.trim().toLowerCase() === cleanId)
    );

    const identifiers = [
      identifier,
      cleanId,
      ...matchedUsers.flatMap(u => [u.id, u.email, u.studentId])
    ].filter(Boolean) as string[];

    markAsDeleted(...identifiers);

    // Update in-memory states immediately
    setUsers(prev => prev.filter(u => !isDeletedRecord(u.id, u.email, u.studentId)));
    setStudents(prev => prev.filter(s => !isDeletedRecord(s.id, s.email, s.registrationNumber)));

    // Thorough Firestore purge
    deleteMatchingEntitiesFromFirestore('users', ...identifiers);
    deleteMatchingEntitiesFromFirestore('students', ...identifiers);
  };

  const switchRole = (role: UserRole) => {
    const target = users.find(u => u.role === role && u.approvalStatus !== 'PENDING' && u.approvalStatus !== 'REJECTED');
    if (target) {
      const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
      persistUserSession(target, isRemembered);
      setCurrentUser(target);
    }
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId);
    if (target) {
      const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
      persistUserSession(target, isRemembered);
      setCurrentUser(target);
    }
  };

  const logout = () => {
    clearUserSession();
    setCurrentUser(null);
  };

  const deleteMyAccount = (): { success: boolean; message: string } => {
    if (!currentUser) {
      return { success: false, message: 'Nenhum usuário logado para deletar.' };
    }
    const cleanEmail = currentUser.email.trim().toLowerCase();

    removeFromFirestore('users', currentUser.id);
    if (currentUser.studentId) {
      removeFromFirestore('students', currentUser.studentId);
      removeFromFirestore('teachers', currentUser.studentId);
    }

    setUsers(prev => prev.filter(u => u.id !== currentUser.id && (!cleanEmail || !u.email || u.email.trim().toLowerCase() !== cleanEmail)));
    setStudents(prev => prev.filter(s => s.id !== currentUser.studentId && (!cleanEmail || !s.email || s.email.trim().toLowerCase() !== cleanEmail)));

    logout();

    return {
      success: true,
      message: 'Conta excluída com sucesso!'
    };
  };

  const requestPasswordRecovery = (email: string): { success: boolean; code?: string; message: string } => {
    const cleanEmail = email.trim().toLowerCase();
    const foundUser = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    if (!foundUser) {
      return {
        success: false,
        message: 'E-mail não encontrado em nosso sistema. Verifique se o endereço foi digitado corretamente.'
      };
    }
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

    fetch('/api/auth/recover-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: foundUser.email, code: generatedCode, name: foundUser.name })
    }).catch(() => {});

    return {
      success: true,
      code: generatedCode,
      message: `Enviamos um código de verificação de 6 dígitos para o e-mail: ${foundUser.email}`
    };
  };

  const resetPasswordWithCode = (
    email: string,
    code: string,
    expectedCode: string,
    newPassword: string
  ): { success: boolean; message: string } => {
    if (!code || code.trim() !== expectedCode.trim()) {
      return {
        success: false,
        message: 'Código de segurança incorreto. Verifique os números enviados no e-mail.'
      };
    }
    if (!newPassword || newPassword.trim().length < 3) {
      return {
        success: false,
        message: 'A nova senha deve possuir pelo menos 3 caracteres.'
      };
    }

    const cleanEmail = email.trim().toLowerCase();
    const targetUser = users.find(u => u.email.trim().toLowerCase() === cleanEmail);
    if (targetUser) {
      const updatedUser: User = {
        ...targetUser,
        password: newPassword,
        isActivated: true
      };
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      saveToFirestore('users', updatedUser);
    }

    return {
      success: true,
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar usando sua nova senha.'
    };
  };

  const updateUserProfile = async (updates: Partial<User>): Promise<boolean> => {
    if (!currentUser) return false;
    const cleanId = currentUser.id;
    const cleanEmail = currentUser.email ? currentUser.email.trim().toLowerCase() : '';
    const nowIso = new Date().toISOString();

    const updatedUser: User = {
      ...currentUser,
      ...updates,
      avatarUrl: updates.avatarUrl || currentUser.avatarUrl || DEFAULT_BLACK_GI_AVATAR
    };

    // Save directly to Firestore users collection
    await saveToFirestore('users', updatedUser);

    // Save directly to Firestore students collection if ALUNO
    if (currentUser.studentId || cleanEmail) {
      const studentId = currentUser.studentId || cleanId;
      await saveToFirestore('students', {
        id: studentId,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        photoUrl: updatedUser.avatarUrl,
        updatedAt: nowIso
      } as any);
    }

    setCurrentUser(updatedUser);
    const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
    persistUserSession(updatedUser, isRemembered);

    setUsers(prev => prev.map(u => 
      (u.id === cleanId || (cleanEmail && u.email && u.email.trim().toLowerCase() === cleanEmail))
        ? updatedUser 
        : u
    ));

    return true;
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return false;

    const merged: User = { ...userToUpdate, ...updates };
    await saveToFirestore('users', merged);

    if (merged.studentId) {
      await saveToFirestore('students', {
        id: merged.studentId,
        name: merged.name,
        email: merged.email,
        phone: merged.phone,
        photoUrl: merged.avatarUrl,
        approvalStatus: merged.approvalStatus,
        updatedAt: new Date().toISOString()
      } as any);
    }

    setUsers(prev => prev.map(u => (u.id === userId ? merged : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(merged);
      const isRemembered = localStorage.getItem('bjjcron_remember_me') !== 'false';
      persistUserSession(merged, isRemembered);
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      loginWithPassword,
      loginWithGoogle,
      firstAccessActivate,
      registerStudentSelfService,
      registerTeacherSelfService,
      registerAdminSelfService,
      approveUser,
      rejectUser,
      switchRole,
      switchUser,
      logout,
      deleteMyAccount,
      refreshUsersFromStorage,
      updateUserProfile,
      updateUser,
      requestPasswordRecovery,
      resetPasswordWithCode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
