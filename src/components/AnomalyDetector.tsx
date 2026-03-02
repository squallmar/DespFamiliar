'use client';

import React from 'react';
import { BarChart3, TrendingUp, Calendar, ArrowUp, DollarSign } from 'lucide-react';
import useSWR from 'swr';

export interface AnomalyDetection {
  id: string;
  type: 'unusual_category' | 'spike_detection' | 'pattern_change' | 'outlier';
  description: string;
  category?: string;
  amount: number;
  normalRange: { min: number; max: number };
  date: string;
  severity: 'low' | 'medium' | 'high';
  explanation: string;
}

interface AnomalyDetectorProps {
  language: string;
  currency: string;
}

const SEVERITY_COLORS = {
  low: 'bg-blue-50 border-blue-200 text-blue-700',
  medium: 'bg-yellow-50 border-yellow-200 text-yellow-700',
  high: 'bg-red-50 border-red-200 text-red-700',
};

const SEVERITY_LABELS = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

const ICON_MAP = {
  unusual_category: <TrendingUp size={20} />,
  spike_detection: <ArrowUp size={20} />,
  pattern_change: <BarChart3 size={20} />,
  outlier: <DollarSign size={20} />,
};

const TYPE_MAP = {
  unusual_category: 'Categoria Inusitada',
  spike_detection: 'Pico de Gastos',
  pattern_change: 'Mudança de Padrão',
  outlier: 'Valor Discrepante',
};

export default function AnomalyDetector({ language, currency }: AnomalyDetectorProps) {
  const { data: anomalies = [], isLoading, error } = useSWR<AnomalyDetection[]>(
    '/api/anomalies',
    (url) => fetch(url, { credentials: 'include' }).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const [selectedType, setSelectedType] = React.useState<string | null>(null);

  const filteredAnomalies = selectedType
    ? anomalies.filter((a) => a.type === selectedType)
    : anomalies;

  const byType = {
    unusual_category: anomalies.filter((a) => a.type === 'unusual_category'),
    spike_detection: anomalies.filter((a) => a.type === 'spike_detection'),
    pattern_change: anomalies.filter((a) => a.type === 'pattern_change'),
    outlier: anomalies.filter((a) => a.type === 'outlier'),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="text-indigo-600" size={24} />
        <h2 className="text-xl font-bold text-gray-900">Detecção de Anomalias</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-600">Analisando padrões...</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          Erro ao carregar análise de anomalias.
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <BarChart3 size={40} className="mx-auto text-gray-300 mb-2" />
          <p>Nenhuma anomalia detectada. Seus gastos estão normais!</p>
        </div>
      ) : (
        <>
          {/* Filter Buttons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedType(null)}
              className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                selectedType === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todas ({anomalies.length})
            </button>

            {Object.entries(byType).map(
              ([type, items]) =>
                items.length > 0 && (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                      selectedType === type
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {TYPE_MAP[type as keyof typeof TYPE_MAP]} ({items.length})
                  </button>
                )
            )}
          </div>

          {/* Anomalies List */}
          <div className="space-y-3">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`rounded-lg border p-3 ${
                  SEVERITY_COLORS[anomaly.severity as keyof typeof SEVERITY_COLORS]
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="mt-0.5">
                      {ICON_MAP[anomaly.type as keyof typeof ICON_MAP]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {TYPE_MAP[anomaly.type as keyof typeof TYPE_MAP]}
                      </p>
                      <p className="text-sm">{anomaly.description}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {anomaly.amount.toFixed(2)} {currency}
                    </p>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/50">
                      {SEVERITY_LABELS[anomaly.severity]}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="text-xs space-y-1 mb-2">
                  {anomaly.category && (
                    <p>
                      📂 <span className="font-semibold">{anomaly.category}</span>
                    </p>
                  )}

                  {anomaly.type !== 'unusual_category' && (
                    <p>
                      📊 Intervalo normal:{' '}
                      <span className="font-semibold">
                        {anomaly.normalRange.min.toFixed(2)} - {anomaly.normalRange.max.toFixed(2)}{' '}
                        {currency}
                      </span>
                    </p>
                  )}

                  <p className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(anomaly.date).toLocaleDateString(language)}
                  </p>
                </div>

                {/* Explanation */}
                <div className="p-2 bg-white/50 rounded text-xs">
                  <p className="font-semibold mb-1">💡 O que significa?</p>
                  <p>{anomaly.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
