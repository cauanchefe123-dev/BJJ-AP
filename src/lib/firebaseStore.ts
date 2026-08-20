import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { isDeletedRecord } from './deletionTracker';

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
    quotaExhaustedUntil = Date.now() + 5 * 60 * 1000;
    console.warn(`[Firestore Quota] Limite diário atingido. Operando em modo offline.`);
    return;
  }
  console.warn(`[Firestore] Erro em ${context}:`, err);
}

/**
 * Deeply sanitizes an object for Firestore by removing all `undefined` values,
 * converting them to `null` or omitting keys, preventing Firestore SDK crashes.
 */
export function sanitizeForFirestore<T>(input: T): any {
  if (input === undefined) return null;
  if (input === null || typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map(item => sanitizeForFirestore(item)).filter(v => v !== undefined);
  }

  const cleaned: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    const val = (input as any)[key];
    if (val !== undefined) {
      cleaned[key] = sanitizeForFirestore(val);
    }
  }
  return cleaned;
}

export async function saveToFirestore<T extends { id: string }>(collectionName: string, item: T): Promise<boolean> {
  if (checkQuotaExhausted()) return false;
  try {
    const sanitized = sanitizeForFirestore(item);
    const ref = doc(db, collectionName, item.id);
    await setDoc(ref, sanitized, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, `salvar em ${collectionName} (id: ${item.id})`);
    return false;
  }
}

export async function updateDocInFirestore(collectionName: string, id: string, updates: Record<string, any>): Promise<boolean> {
  if (checkQuotaExhausted()) return false;
  try {
    const sanitized = sanitizeForFirestore(updates);
    const ref = doc(db, collectionName, id);
    await setDoc(ref, sanitized, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, `atualizar em ${collectionName} (id: ${id})`);
    return false;
  }
}

export async function removeFromFirestore(collectionName: string, id: string): Promise<boolean> {
  if (checkQuotaExhausted()) return false;
  try {
    const ref = doc(db, collectionName, id);
    await deleteDoc(ref);
    return true;
  } catch (err) {
    handleFirestoreError(err, `remover de ${collectionName} (id: ${id})`);
    return false;
  }
}

export async function saveConfigToFirestore(configData: any): Promise<boolean> {
  if (checkQuotaExhausted()) return false;
  try {
    const sanitized = sanitizeForFirestore(configData);
    const ref = doc(db, 'config', 'academyConfig');
    await setDoc(ref, sanitized, { merge: true });
    return true;
  } catch (err) {
    handleFirestoreError(err, 'salvar configurações da academia');
    return false;
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

export async function purgeDeletedRecordsFromFirestore() {
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

        if (isDeletedRecord(id, email, studentId, regNum)) {
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

export function purgeAllLegacyLocalStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bjjcron_') || key.startsWith('bjj_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log('[Firestore Sync] LocalStorage de dados removido definitivamente. Operando 100% no Firestore em tempo real.');
  } catch (e) {
    console.warn('Erro ao limpar localStorage:', e);
  }
}


