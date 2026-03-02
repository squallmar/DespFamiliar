'use client';

import React from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme, PRESET_COLORS, type Theme } from '@/hooks/useTheme';

interface ThemeSettingsProps {
  open: boolean;
  onClose: () => void;
}

export default function ThemeSettings({ open, onClose }: ThemeSettingsProps) {
  const { theme, primaryColor, setTheme, setPrimaryColor } = useTheme();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center gap-2 p-4 border-b">
          <Palette size={20} className="text-indigo-600" />
          <h2 className="font-bold text-lg">Preferências de Tema</h2>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Theme Selection */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Modo</p>
            <div className="space-y-2">
              {(['light', 'dark', 'auto'] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="theme"
                    value={mode}
                    checked={theme === mode}
                    onChange={() => setTheme(mode)}
                    className="w-4 h-4"
                  />
                  <div className="flex items-center gap-2">
                    {mode === 'light' && <Sun size={16} className="text-yellow-500" />}
                    {mode === 'dark' && <Moon size={16} className="text-slate-600" />}
                    {mode === 'auto' && <Palette size={16} className="text-gray-500" />}
                    <span className="text-sm text-gray-700 capitalize">
                      {mode === 'auto' ? 'Automático' : mode === 'light' ? 'Claro' : 'Escuro'}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Cor Primária</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className={`w-full aspect-square rounded-lg border-2 transition ${
                    primaryColor === color.value
                      ? 'border-gray-800'
                      : 'border-gray-300 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {primaryColor === color.value && (
                    <span className="text-white font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cor Personalizada
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor || '#4f46e5'}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1 h-10 rounded-lg border cursor-pointer"
              />
              <span className="text-sm text-gray-600 py-2">{primaryColor}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}
