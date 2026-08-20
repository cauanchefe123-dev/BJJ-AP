const deletedIdsSet = new Set<string>();

export function getDeletedIds(): Set<string> {
  return deletedIdsSet;
}

export function markAsDeleted(...identifiers: (string | undefined | null)[]) {
  identifiers.forEach(id => {
    if (!id) return;
    const clean = String(id).toLowerCase().trim();
    if (clean) {
      deletedIdsSet.add(clean);
    }
  });
}

export function isDeletedRecord(...identifiers: (string | undefined | null)[]): boolean {
  return identifiers.some(id => {
    if (!id) return false;
    const clean = String(id).toLowerCase().trim();
    return deletedIdsSet.has(clean);
  });
}
