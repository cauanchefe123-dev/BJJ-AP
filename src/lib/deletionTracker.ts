const DELETED_STORAGE_KEY = 'bjj_deleted_identifiers';

const deletedIdsSet = new Set<string>();

// Initialize from localStorage if available
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    if (raw) {
      const parsed: string[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (id && typeof id === 'string') {
            deletedIdsSet.add(id.toLowerCase().trim());
          }
        });
      }
    }
  }
} catch (e) {
  console.warn('[DeletionTracker] Erro ao carregar identificadores excluídos do storage:', e);
}

function persistDeletedSet() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify([...deletedIdsSet]));
    }
  } catch (e) {
    console.warn('[DeletionTracker] Erro ao salvar identificadores excluídos no storage:', e);
  }
}

export function getDeletedIds(): Set<string> {
  return deletedIdsSet;
}

export function markAsDeleted(...identifiers: (string | undefined | null)[]) {
  let changed = false;
  identifiers.forEach(id => {
    if (!id) return;
    const clean = String(id).toLowerCase().trim();
    if (clean && !deletedIdsSet.has(clean)) {
      deletedIdsSet.add(clean);
      changed = true;
    }
  });
  if (changed) {
    persistDeletedSet();
  }
}

export function unmarkAsDeleted(...identifiers: (string | undefined | null)[]) {
  let changed = false;
  identifiers.forEach(id => {
    if (!id) return;
    const clean = String(id).toLowerCase().trim();
    if (clean && deletedIdsSet.has(clean)) {
      deletedIdsSet.delete(clean);
      changed = true;
    }
  });
  if (changed) {
    persistDeletedSet();
  }
}

export function isDeletedRecord(...identifiers: (string | undefined | null)[]): boolean {
  return identifiers.some(id => {
    if (!id) return false;
    const clean = String(id).toLowerCase().trim();
    return deletedIdsSet.has(clean);
  });
}

