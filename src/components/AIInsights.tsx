'use client';

import React, { useState } from 'react';
import { Lightbulb, TrendingDown, AlertTriangle, Target, Loader, Zap } from 'lucide-react';
import useSWR from 'swr';

export interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  impact?: number; // Potential savings in currency
  category?: string;
  action?: string;
  actionUrl?: string;
  confidence?: number; // 0-1
  createdAt: string;
  isRead: boolean;
}

interface AIInsightsProps {
  language: string;
  currency: string;
  onActionClick?: (insight: AIInsight) => void;
}

const ICON_MAP = {
  opportunity: <TrendingDown className="text-green-600" />,
  warning: <AlertTriangle className="text-orange-600" />,
  anomaly: <Zap className="text-red-600" />,
  recommendation: <Target className="text-blue-600" />,
};

const LABEL_MAP = {
  opportunity: 'Oportunidade de Economia',
  warning: 'Aviso',
  anomaly: 'Anomalia',
  recommendation: 'Recomendação',
};

const BG_MAP = {
  opportunity: 'bg-green-50 border-green-200',
  warning: 'bg-orange-50 border-orange-200',
  anomaly: 'bg-red-50 border-red-200',
  recommendation: 'bg-blue-50 border-blue-200',
};

export default function AIInsights({ language, currency, onActionClick }: AIInsightsProps) {
  const { data: insights = [], isLoading, error } = useSWR<AIInsight[]>(
    '/api/insights',
    (url) => fetch(url, { credentials: 'include' }).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const unreadInsights = insights.filter((i) => !i.isRead);
  const categories = {
    opportunity: insights.filter((i) => i.type === 'opportunity'),
    warning: insights.filter((i) => i.type === 'warning'),
    anomaly: insights.filter((i) => i.type === 'anomaly'),
    recommendation: insights.filter((i) => i.type === 'recommendation'),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="text-indigo-600" size={24} />
          <h2 className="text-xl font-bold text-gray-900">
            Sugestões Inteligentes
            {unreadInsights.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                {unreadInsights.length}
              </span>
            )}
          </h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Erro ao carregar insights. Tente novamente.
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <Lightbulb size={40} className="mx-auto text-gray-300 mb-2" />
          <p>Nenhuma sugestão disponível no momento.</p>
        </div>
      ) : (
        <>
          {/* Insights by Category */}
          <div className="space-y-4">
            {Object.entries(categories).map(
              ([type, typeInsights]) =>
                typeInsights.length > 0 && (
                  <div key={type}>
                    <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      {ICON_MAP[type as keyof typeof ICON_MAP]}
                      {LABEL_MAP[type as keyof typeof LABEL_MAP]}
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                        {typeInsights.length}
                      </span>
                    </h3>

                    <div className="space-y-2">
                      {typeInsights.map((insight) => (
                        <div
                          key={insight.id}
                          className={`rounded-lg border p-3 cursor-pointer hover:shadow-md transition ${
                            BG_MAP[insight.type]
                          }`}
                          onClick={() =>
                            setExpandedId(expandedId === insight.id ? null : insight.id)
                          }
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{insight.title}</p>
                              <p className="text-sm text-gray-700 mt-1">{insight.description}</p>
                            </div>

                            {!insight.isRead && (
                              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-600 ml-2 mt-1" />
                            )}
                          </div>

                          {/* Metrics */}
                          <div className="mt-2 flex items-center gap-3 text-xs">
                            {insight.impact && (
                              <span className="px-2 py-1 bg-white/50 rounded text-gray-700 font-semibold">
                                💰 {insight.impact.toLocaleString(language)} {currency}
                              </span>
                            )}

                            {insight.confidence && (
                              <span className="px-2 py-1 bg-white/50 rounded text-gray-700">
                                Confiança:{' '}
                                <span className="font-semibold">
                                  {Math.round(insight.confidence * 100)}%
                                </span>
                              </span>
                            )}

                            {insight.category && (
                              <span className="px-2 py-1 bg-white/50 rounded text-gray-700">
                                {insight.category}
                              </span>
                            )}
                          </div>

                          {/* Expanded Content */}
                          {expandedId === insight.id && insight.action && (
                            <div className="mt-3 pt-3 border-t border-current/20">
                              <p className="text-xs text-gray-700 mb-2">Ação Recomendada:</p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onActionClick?.(insight);
                                }}
                                className="w-full py-2 px-3 bg-white/70 hover:bg-white rounded font-semibold text-sm transition"
                              >
                                {insight.action}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>

          {/* Summary Stats */}
          {insights.length > 0 && (
            <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
              <div className="text-center p-2 bg-gray-50 rounded">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-lg font-bold text-gray-900">{insights.length}</p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <p className="text-xs text-green-600">Oportunidades</p>
                <p className="text-lg font-bold text-green-900">{categories.opportunity.length}</p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <p className="text-xs text-orange-600">Avisos</p>
                <p className="text-lg font-bold text-orange-900">{categories.warning.length}</p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-600">Anomalias</p>
                <p className="text-lg font-bold text-blue-900">{categories.anomaly.length}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
