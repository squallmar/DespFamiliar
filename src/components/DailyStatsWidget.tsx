import React from 'react';
import { useTranslation } from '@/lib/translations';
import { TrendingDown, AlertCircle } from 'lucide-react';

interface DailyStatsProps {
  todayTotal: number;
  monthTotal: number;
  monthlyBudget?: number;
  language: string;
  currency: string;
  expenseCount: number;
}

export default function DailyStatsWidget({
  todayTotal,
  monthTotal,
  monthlyBudget,
  language,
  currency,
  expenseCount,
}: DailyStatsProps) {
  const { t } = useTranslation(language);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  const percentOfMonth = monthlyBudget ? (monthTotal / monthlyBudget) * 100 : 0;
  const percentOfDay = monthlyBudget ? (todayTotal / (monthlyBudget / 30)) * 100 : 0;
  const isOverBudget = percentOfMonth > 100;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-indigo-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={20} className="text-indigo-600" />
        <h3 className="font-bold text-lg text-gray-800">Estatísticas do Dia</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Hoje */}
        <div className="bg-white rounded-lg p-3 border border-indigo-100">
          <p className="text-xs text-gray-600 mb-1">Gasto Hoje</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(todayTotal)}</p>
          <p className="text-[10px] text-gray-500 mt-1">
            {percentOfDay.toFixed(1)}% da média diária
          </p>
        </div>

        {/* Este Mês */}
        <div
          className={`rounded-lg p-3 border ${
            isOverBudget ? 'bg-red-50 border-red-200' : 'bg-white border-indigo-100'
          }`}
        >
          <p className="text-xs text-gray-600 mb-1">Este Mês</p>
          <p className={`text-xl font-bold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(monthTotal)}
          </p>
          {monthlyBudget && (
            <p className={`text-[10px] mt-1 ${isOverBudget ? 'text-red-600' : 'text-gray-500'}`}>
              {percentOfMonth.toFixed(1)}% do orçamento
            </p>
          )}
        </div>
      </div>

      {/* Barra de progresso do mês */}
      {monthlyBudget && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs font-semibold text-gray-700">Progresso do Mês</span>
            <span className="text-xs text-gray-500">
              {monthlyBudget - monthTotal > 0
                ? `${formatCurrency(monthlyBudget - monthTotal)} disponível`
                : `${formatCurrency(Math.abs(monthlyBudget - monthTotal))} acima`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(percentOfMonth, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Alerta se passou */}
      {isOverBudget && (
        <div className="mt-3 flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg p-2">
          <AlertCircle size={14} className="text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700">
            Você ultrapassou o orçamento mensal em {formatCurrency(monthTotal - (monthlyBudget || 0))}
          </p>
        </div>
      )}

      {/* Resumo rápido */}
      <div className="mt-3 pt-3 border-t border-indigo-200">
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-800">{expenseCount}</span> transações registradas
        </p>
      </div>
    </div>
  );
}
