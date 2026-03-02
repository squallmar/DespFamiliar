'use client';

import React, { useState } from 'react';
import { Mail, Loader, CheckCircle, AlertCircle, Clock } from 'lucide-react';

export interface EmailReportConfig {
  isSubscribed: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek?: number; // 0=Sunday, 1=Monday, etc (for weekly)
  dayOfMonth?: number; // 1-28 (for monthly)
  includeCharts: boolean;
  includeInsights: boolean;
  includeBudgetAlert: boolean;
}

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onSubscribe?: (config: EmailReportConfig) => Promise<void>;
  initialConfig?: EmailReportConfig;
}

const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

export default function EmailReportModal({
  isOpen,
  onClose,
  language,
  onSubscribe,
  initialConfig,
}: EmailReportModalProps) {
  const [config, setConfig] = useState<EmailReportConfig>(
    initialConfig || {
      isSubscribed: false,
      frequency: 'monthly',
      dayOfMonth: 1,
      dayOfWeek: 1,
      includeCharts: true,
      includeInsights: true,
      includeBudgetAlert: true,
    }
  );
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubscribe?.(config);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center gap-3 border-b border-gray-200 p-4 bg-white">
          <Mail className="text-indigo-600" size={24} />
          <h2 className="text-lg font-bold text-gray-900">Relatórios por Email</h2>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle className="mx-auto text-green-600" size={48} />
            <h3 className="text-lg font-bold text-green-900">Inscrição Confirmada!</h3>
            <p className="text-sm text-green-700">
              Você receberá seus relatórios {config.frequency === 'weekly' ? 'semanalmente' : config.frequency === 'biweekly' ? 'quinzenalmente' : 'mensalmente'}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <div>
                <p className="font-semibold text-gray-900">Ativar Relatórios</p>
                <p className="text-xs text-gray-600">
                  Receba resumos periódicos por email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isSubscribed}
                  onChange={(e) => setConfig({ ...config, isSubscribed: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
              </label>
            </div>

            {config.isSubscribed && (
              <>
                {/* Frequency */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Frequência
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['weekly', 'biweekly', 'monthly'] as const).map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setConfig({ ...config, frequency: freq })}
                        className={`py-2 rounded-lg font-semibold transition text-sm ${
                          config.frequency === freq
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {freq === 'weekly'
                          ? 'Semanal'
                          : freq === 'biweekly'
                            ? 'Quinzenal'
                            : 'Mensal'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Day Selection */}
                {config.frequency === 'weekly' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dia da Semana
                    </label>
                    <select
                      value={config.dayOfWeek || 1}
                      onChange={(e) =>
                        setConfig({ ...config, dayOfWeek: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
                    >
                      {DAYS_OF_WEEK.map((day, i) => (
                        <option key={i} value={i}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(config.frequency === 'monthly' || config.frequency === 'biweekly') && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Dia do Mês
                    </label>
                    <select
                      value={config.dayOfMonth || 1}
                      onChange={(e) =>
                        setConfig({ ...config, dayOfMonth: parseInt(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
                    >
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <option key={day} value={day}>
                          Dia {day}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Content Options */}
                <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Incluir no Relatório</p>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeCharts}
                      onChange={(e) => setConfig({ ...config, includeCharts: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Gráficos e Visualizações</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeInsights}
                      onChange={(e) =>
                        setConfig({ ...config, includeInsights: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Insights Inteligentes</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.includeBudgetAlert}
                      onChange={(e) =>
                        setConfig({ ...config, includeBudgetAlert: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span className="text-sm text-gray-700">Alertas de Orçamento</span>
                  </label>
                </div>

                {/* Preview */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
                  <Clock className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                  <p className="text-xs text-blue-700">
                    Seu próximo relatório será enviado para seu email cadastrado em{' '}
                    <span className="font-semibold">
                      {config.frequency === 'weekly'
                        ? `${DAYS_OF_WEEK[config.dayOfWeek || 0]}`
                        : `${config.dayOfMonth} do próximo mês`}
                    </span>
                    .
                  </p>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="flex gap-2 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader size={18} className="animate-spin" />}
                {isLoading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
