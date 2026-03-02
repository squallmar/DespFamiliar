'use client';

import React, { useState } from 'react';
import { Keyboard, X } from 'lucide-react';
import { useTranslation } from '@/lib/translations';
import { DEFAULT_SHORTCUTS } from '@/hooks/useKeyboardShortcuts';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  language: string;
}

export default function ShortcutsModal({ open, onClose, language }: ShortcutsModalProps) {
  const { t } = useTranslation(language);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-indigo-600" />
            <h2 className="font-bold text-lg">Atalhos de Teclado</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {DEFAULT_SHORTCUTS.map((shortcut, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.ctrl && (
                  <kbd className="px-2 py-1 text-xs bg-gray-200 rounded font-semibold">
                    Ctrl
                  </kbd>
                )}
                {shortcut.shift && (
                  <kbd className="px-2 py-1 text-xs bg-gray-200 rounded font-semibold">
                    Shift
                  </kbd>
                )}
                {shortcut.alt && (
                  <kbd className="px-2 py-1 text-xs bg-gray-200 rounded font-semibold">
                    Alt
                  </kbd>
                )}
                <kbd className="px-2 py-1 text-xs bg-indigo-200 text-indigo-700 rounded font-semibold">
                  {shortcut.key.toUpperCase()}
                </kbd>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}
