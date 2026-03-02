'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCategoryComparison } from '@/hooks/useCategoryComparison';
import { useTranslation } from '@/lib/translations';

interface CategoryComparisonWidgetProps {
  month: string;
  language: string;
  currency: string;
}

export default function CategoryComparisonWidget({
  month,
  language,
  currency,
}: CategoryComparisonWidgetProps) {
  const { t } = useTranslation(language);
  const { comparisons, isLoading, error } = useCategoryComparison(month);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Carregando comparativos...</div>;
  }

  if (error || comparisons.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-bold text-lg text-gray-800 mb-4">Comparação com Histórico</h3>

      <div className="space-y-3">
        {comparisons.map((comp) => {
          const isAbove = comp.variance > 0;
          const isBelow = comp.variance < 0;

          return (
            <div key={comp.category} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-800">{comp.category}</p>
                <div className="flex items-center gap-2">
                  {isAbove && <TrendingUp size={16} className="text-red-500" />}
                  {isBelow && <TrendingDown size={16} className="text-green-500" />}
                  {!isAbove && !isBelow && <Minus size={16} className="text-gray-400" />}
                  <span
                    className={`font-bold text-sm ${
                      isAbove ? 'text-red-600' : isBelow ? 'text-green-600' : 'text-gray-600'
                    }`}
                  >
                    {isAbove ? '+' : ''}{comp.variance.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600">Agora: {formatCurrency(comp.current)}</span>
                <span className="text-gray-500">
                  Média: {formatCurrency(comp.userAverage)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    isAbove ? 'bg-red-500' : isBelow ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min(
                      (comp.current / Math.max(comp.current, comp.userAverage)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              {/* Insight text */}
              <p className="text-xs text-gray-500 mt-2">
                {isAbove
                  ? `Você gastou R$ ${formatCurrency(
                      comp.current - comp.userAverage
                    )} a mais que sua média.`
                  : isBelow
                  ? `Você economizou R$ ${formatCurrency(
                      comp.userAverage - comp.current
                    )} comparado com a média.`
                  : 'Seu gasto está dentro da média.'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
