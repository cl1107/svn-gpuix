export function composeSyncLabel(input: {
  localCount: number;
  behind?: number;
}): string {
  const { localCount, behind } = input;
  const hasLocal = localCount > 0;
  const hasBehind = behind !== undefined && behind > 0;

  const localText = hasLocal ? `${localCount} local ${localCount === 1 ? 'change' : 'changes'}` : '';
  const behindText = hasBehind ? `${behind} behind` : '';

  if (hasLocal && hasBehind) {
    return `${localText} · ${behindText}`;
  }
  if (hasLocal) {
    return localText;
  }
  if (hasBehind) {
    return behindText;
  }
  return 'Up to date';
}

export function getSyncTone(behind?: number): 'warning' | 'success' {
  if (behind !== undefined && behind > 0) {
    return 'warning';
  }
  return 'success';
}
