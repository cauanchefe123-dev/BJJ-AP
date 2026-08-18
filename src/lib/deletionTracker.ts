export function getDeletedIds(): Set<string> {
  try {
    const saved = localStorage.getItem('bjjcron_deleted_ids');
    if (saved) {
      const arr = JSON.parse(saved);
      return new Set(arr.map((id: string) => String(id).toLowerCase().trim()));
    }
  } catch (e) {}
  return new Set();
}

export function markAsDeleted(...identifiers: (string | undefined | null)[]) {
  const set = getDeletedIds();
  let changed = false;
  identifiers.forEach(id => {
    if (!id) return;
    const clean = String(id).toLowerCase().trim();
    if (clean && !set.has(clean)) {
      set.add(clean);
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem('bjjcron_deleted_ids', JSON.stringify(Array.from(set)));
  }
}

export function isDeletedRecord(...identifiers: (string | undefined | null)[]): boolean {
  const set = getDeletedIds();
  return identifiers.some(id => {
    if (!id) return false;
    const clean = String(id).toLowerCase().trim();
    return set.has(clean);
  });
}

export function isTestMockRecord(val: string | undefined | null): boolean {
  if (!val) return false;
  const str = String(val).toLowerCase().trim();

  // Explicit test/mock student and teacher names
  if (
    str.includes('rodrigo mendes') ||
    (str.includes('beatriz') && (str.includes('santos') || str.includes('marrom'))) ||
    str.includes('enzo gabriel') ||
    str.includes('felipe camargo') ||
    str.includes('gabriel "fera"') ||
    str.includes('gabriel santos') ||
    str.includes('matheus pre-cadastrado') ||
    str.includes('ana paula oliveira') ||
    str.includes('rafael mendes') ||
    str.includes('rafael "trovão"') ||
    str.includes('rafael "trovao"') ||
    str.includes('camila oliveira') ||
    str.includes('camila "sereia"') ||
    str.includes('carlos gracie') ||
    str.includes('trovao') ||
    str.includes('trovão') ||
    str.includes('sereia') ||
    str.includes('pre-cadastrado')
  ) {
    return true;
  }

  // Explicit test/mock emails
  if (
    str.includes('rafael.trovao') ||
    str.includes('camila.oliveira') ||
    str.includes('beatriz.marrom@email.com') ||
    str.includes('professor@bjjcron.com') ||
    str.includes('admin@bjjcron.com') ||
    str.includes('@email.com') ||
    str.includes('testmock') ||
    str.includes('mockdata') ||
    str.includes('dummyuser') ||
    str.includes('aluno_teste')
  ) {
    return true;
  }

  // Explicit test/mock registration numbers or IDs
  if (
    str === 'bjj-2026-017' ||
    str === 'bjj-2026-018' ||
    str === 'bjj-2026-019' ||
    str === 'bjj-2026-020' ||
    str === 'bjj-2026-022' ||
    str === 'bjj-2026-023' ||
    str === 'bjj-2022-001' ||
    str === 'bjj-2026-pre-02' ||
    str === 'std-1' ||
    str === 'std-2' ||
    str === 'std-3' ||
    str === 'std-4' ||
    str === 'std-5' ||
    str === 'user-std-1' ||
    str === 'user-std-2' ||
    str === 'user-std-3' ||
    str === 'user-prof-1' ||
    str === 'user-prof-2' ||
    str === 'prof-1' ||
    str === 'prof-2' ||
    str === 'prof-3' ||
    str === 'teste' ||
    str === 'test'
  ) {
    return true;
  }

  return false;
}
