import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { isTestMockRecord, isDeletedRecord } from './deletionTracker';

let quotaExhaustedUntil: number = 0;

function checkQuotaExhausted(): boolean {
  if (Date.now() < quotaExhaustedUntil) {
    return true;
  }
  return false;
}

function handleFirestoreError(err: any, context: string) {
  const errMsg = String(err?.message || err || '');
  if (errMsg.includes('resource-exhausted') || errMsg.includes('Quota limit exceeded') || errMsg.includes('quota')) {
    // Suppress repeated console noise and pause outgoing Firestore network writes for 5 minutes
    quotaExhaustedUntil = Date.now() + 5 * 60 * 1000;
    console.warn(`[Firestore Quota] Limite diário do plano gratuito atingido. Operando em modo seguro Offline-First (LocalStorage ativo).`);
    return;
  }
  console.warn(`[Firestore] Erro em ${context}:`, err);
}

export async function saveToFirestore<T extends { id: string }>(collectionName: string, item: T) {
  if (checkQuotaExhausted()) return;
  try {
    const ref = doc(db, collectionName, item.id);
    await setDoc(ref, item, { merge: true });
  } catch (err) {
    handleFirestoreError(err, `salvar em ${collectionName}`);
  }
}

export async function removeFromFirestore(collectionName: string, id: string) {
  if (checkQuotaExhausted()) return;
  try {
    const ref = doc(db, collectionName, id);
    await deleteDoc(ref);
  } catch (err) {
    handleFirestoreError(err, `remover de ${collectionName}`);
  }
}

export async function saveConfigToFirestore(configData: any) {
  if (checkQuotaExhausted()) return;
  try {
    const ref = doc(db, 'config', 'academyConfig');
    await setDoc(ref, configData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, 'salvar configurações da academia');
  }
}

export function subscribeFirestoreCollection<T>(
  collectionName: string, 
  callback: (data: T[]) => void
) {
  try {
    const colRef = collection(db, collectionName);
    return onSnapshot(colRef, (snapshot) => {
      const items: T[] = snapshot.docs.map(doc => doc.data() as T);
      callback(items);
    }, (error) => {
      handleFirestoreError(error, `escuta na coleção ${collectionName}`);
    });
  } catch (err) {
    handleFirestoreError(err, `iniciar escuta de ${collectionName}`);
    return () => {};
  }
}

export function subscribeFirestoreConfig(callback: (config: any) => void) {
  try {
    const docRef = doc(db, 'config', 'academyConfig');
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data());
      }
    }, (error) => {
      handleFirestoreError(error, 'escuta nas configurações');
    });
  } catch (err) {
    handleFirestoreError(err, 'iniciar escuta nas configurações');
    return () => {};
  }
}

export async function purgeTestMockDataFromFirestore() {
  const collectionsToCheck = [
    'students',
    'users',
    'teachers',
    'classes',
    'attendances',
    'payments',
    'graduations',
    'beltRequests',
    'trainingLogs',
    'teacherObservations',
    'notifications',
  ];

  for (const colName of collectionsToCheck) {
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) continue;

      const batch = writeBatch(db);
      let count = 0;

      snap.docs.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const id = d.id || docSnap.id;
        const name = d.name || d.studentName || d.authorName || '';
        const email = d.email || '';
        const studentId = d.studentId || '';
        const regNum = d.registrationNumber || '';

        if (
          isTestMockRecord(id) ||
          isTestMockRecord(name) ||
          isTestMockRecord(email) ||
          isTestMockRecord(studentId) ||
          isTestMockRecord(regNum) ||
          isDeletedRecord(id, email, studentId, regNum)
        ) {
          batch.delete(docSnap.ref);
          count++;
        }
      });

      if (count > 0) {
        await batch.commit();
        console.log(`[Firestore] Removidos ${count} registros de teste/excluídos de '${colName}'.`);
      }
    } catch (err) {
      console.warn(`[Firestore] Erro ao purgar registros de teste em '${colName}':`, err);
    }
  }
}

export async function clearFirestoreCollection(collectionName: string) {
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`[Firestore] Coleção ${collectionName} zerada com sucesso!`);
  } catch (err) {
    console.warn(`[Firestore] Erro ao zerar coleção ${collectionName}:`, err);
  }
}

export async function clearAllFirestoreCollections() {
  const collectionsToClear = [
    'students',
    'teachers',
    'classes',
    'attendances',
    'payments',
    'graduations',
    'beltRequests',
    'trainingLogs',
    'teacherObservations',
  ];
  for (const col of collectionsToClear) {
    await clearFirestoreCollection(col);
  }
}

export async function seedInitialFirestoreData(data: {
  students: any[];
  teachers: any[];
  classes: any[];
  attendances: any[];
  payments: any[];
  graduations: any[];
  beltRequests: any[];
  trainingLogs: any[];
  teacherObservations: any[];
  academyConfig: any;
}) {
  try {
    // Check if Firestore already has students
    const snap = await getDocs(collection(db, 'students'));
    if (!snap.empty) {
      console.log('[Firestore] Banco em nuvem já contém dados salvos.');
      return;
    }

    console.log('[Firestore] Inicializando primeira carga no banco em nuvem...');
    const batch = writeBatch(db);

    data.students.forEach(item => batch.set(doc(db, 'students', item.id), item));
    data.teachers.forEach(item => batch.set(doc(db, 'teachers', item.id), item));
    data.classes.forEach(item => batch.set(doc(db, 'classes', item.id), item));
    data.attendances.forEach(item => batch.set(doc(db, 'attendances', item.id), item));
    data.payments.forEach(item => batch.set(doc(db, 'payments', item.id), item));
    data.graduations.forEach(item => batch.set(doc(db, 'graduations', item.id), item));
    data.beltRequests.forEach(item => batch.set(doc(db, 'beltRequests', item.id), item));
    data.trainingLogs.forEach(item => batch.set(doc(db, 'trainingLogs', item.id), item));
    data.teacherObservations.forEach(item => batch.set(doc(db, 'teacherObservations', item.id), item));
    batch.set(doc(db, 'config', 'academyConfig'), data.academyConfig);

    await batch.commit();
    console.log('[Firestore] Dados iniciais salvos com sucesso na nuvem!');
  } catch (err) {
    console.warn('[Firestore] Erro ao popular carga inicial na nuvem:', err);
  }
}

