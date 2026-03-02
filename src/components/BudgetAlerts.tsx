'use client';

import React, { useState } from 'react';
import { AlertCircle, CheckCircle, TrendingDown, Gauge, Loader } from 'lucide-react';

export interface BudgetAlert {
  id: string;
  categoryId: string;
  categoryName: string;
  budgetLimit: number;
  currentSpent: number;
  status: 'healthy' | 'warning' | 'critical';
  percentageUsed: number;
  daysLeft: number;
  message: string;
  recommendations?: string[];
  createdAt: string;
}

interface BudgetAlertsProps {
  alerts: BudgetAlert[];
  currency: string;
  language: string;
  isLoading?: boolean;
  onDismiss?: (alertId: string) => void;
}

export default function BudgetAlerts({
  alerts,
  currency,
  language,
  isLoading = false,
  onDismiss,
}: BudgetAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const activeAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));
  const criticalAlerts = activeAlerts.filter((a) => a.status === 'critical');
  const warningAlerts = activeAlerts.filter((a) => a.status === 'warning');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <CheckCircle size={40} className="mx-auto text-green-400 mb-2" />
        <p className="font-semibold">Orçamentos sob controle!</p>
        <p className="text-sm">Nenhum alerta de orçamento no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-red-700 flex items-center gap-2">
            <AlertCircle size={18} />
            CRÍTICO ({criticalAlerts.length})
          </h3>

          {criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border-l-4 border-red-500 bg-red-50 border border-red-200 p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-red-900">{alert.categoryName}</p>
                  <p className="text-sm text-red-700">{alert.message}</p>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-red-600 hover:text-red-700 font-semibold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-red-700 mb-1">
                  <span>
                    {alert.currentSpent.toFixed(2)} / {alert.budgetLimit.toFixed(2)} {currency}
                  </span>
                  <span className="font-bold">{alert.percentageUsed.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600"
                    style={{ width: `${Math.min(alert.percentageUsed, 100)}%` }}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="text-xs text-red-700 space-y-1">
                {alert.daysLeft > 0 ? (
                  <p>
                    ⏱️ <span className="font-semibold">{alert.daysLeft} dias</span> restantes no mês
                  </p>
                ) : (
                  <p className="text-red-900 font-bold">📍 Mês já encerrado</p>
                )}
                {alert.recommendations && alert.recommendations.length > 0 && (
                  <div>
                    <p className="font-semibold">Recomendações:</p>
                    <ul className="ml-2 list-disc">
                      {alert.recommendations.slice(0, 2).map((rec, idx) => (
                        <li key={idx} className="text-red-600">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warning Alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-orange-700 flex items-center gap-2">
            <AlertCircle size={18} />
            AVISO ({warningAlerts.length})
          </h3>

          {warningAlerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border-l-4 border-orange-500 bg-orange-50 border border-orange-200 p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-orange-900">{alert.categoryName}</p>
                  <p className="text-sm text-orange-700">{alert.message}</p>
                </div>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-orange-600 hover:text-orange-700 font-semibold text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs text-orange-700 mb-1">
                  <span>
                    {alert.currentSpent.toFixed(2)} / {alert.budgetLimit.toFixed(2)} {currency}
                  </span>
                  <span className="font-bold">{alert.percentageUsed.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.min(alert.percentageUsed, 100)}%` }}
                  />
                </div>
              </div>

              {alert.recommendations && alert.recommendations.length > 0 && (
                <p className="text-xs text-orange-700">💡 {alert.recommendations[0]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
