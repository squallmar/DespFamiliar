import { useEffect } from 'react';

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const isCtrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const isShiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const isAltMatch = shortcut.alt ? e.altKey : !e.altKey;
        const isKeyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

        if (isCtrlMatch && isShiftMatch && isAltMatch && isKeyMatch) {
          e.preventDefault();
          shortcut.action();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Atalhos globais padrão
export const DEFAULT_SHORTCUTS: ShortcutAction[] = [
  {
    key: 'n',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('openQuickAdd');
      window.dispatchEvent(event);
    },
    description: 'Nova despesa (Ctrl+N)',
  },
  {
    key: 'k',
    ctrl: true,
    action: () => {
      const event = new CustomEvent('openSearch');
      window.dispatchEvent(event);
    },
    description: 'Buscar (Ctrl+K)',
  },
  {
    key: 'escape',
    action: () => {
      const event = new CustomEvent('closeModals');
      window.dispatchEvent(event);
    },
    description: 'Fechar modal (Esc)',
  },
];
