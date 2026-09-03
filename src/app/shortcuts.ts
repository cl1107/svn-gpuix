import type { EventPayload, NativeRenderer } from '@gpuix/react';

export type ShortcutAction = 'open-working-copy' | 'checkout' | 'refresh' | 'commit' | 'close-dialog';

type ShortcutListener = (action: ShortcutAction) => void;

const listeners = new Set<ShortcutListener>();

export function setShortcutListener(next?: ShortcutListener): void {
  listeners.clear();
  if (next) listeners.add(next);
}

export function addShortcutListener(listener: ShortcutListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function shortcutFromKeyEvent(event: Pick<EventPayload, 'key' | 'modifiers'>): ShortcutAction | null {
  const key = event.key?.toLowerCase();
  const modifiers = event.modifiers;
  if (!key) return null;
  if (key === 'escape') return 'close-dialog';
  if (!modifiers?.cmd) return null;
  if (modifiers.ctrl || modifiers.alt) return null;
  if (key === 'o' && modifiers.shift) return 'checkout';
  if (key === 'o') return 'open-working-copy';
  if (key === 'r' && !modifiers.shift) return 'refresh';
  if (key === 'enter' && !modifiers.shift) return 'commit';
  return null;
}

export function handleWindowKeyDown(event: EventPayload, _renderer: NativeRenderer): void {
  const action = shortcutFromKeyEvent(event);
  if (!action) return;
  for (const listener of listeners) listener(action);
}
