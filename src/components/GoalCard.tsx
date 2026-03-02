'use client';

import React from 'react';
import { Target, TrendingUp, Calendar, Zap } from 'lucide-react';

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  icon?: string;
}

interface GoalCardProps {
  goal: FinancialGoal;
  currency: string;
  language: string;
  onEdit?: (goal: FinancialGoal) => void;
  onDelete?: (goalId: string) => void;
}

export default function GoalCard({
  goal,
  currency,
  language,
  onEdit,
  onDelete,
}: GoalCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language);
  };

  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const remaining = goal.targetAmount - goal.currentAmount;
  const remainingDays = Math.ceil(
    (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const monthlyNeeded =
    remainingDays > 0 ? remaining / (remainingDays / 30) : 0;

  const isCompleted = progress >= 100;
  const isOverdue = remainingDays < 0;
  const isUrgent = remainingDays > 0 && remainingDays <= 30;

  const priorityColor = {
    low: 'bg-blue-50 border-blue-200',
    medium: 'bg-yellow-50 border-yellow-200',
    high: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${priorityColor[goal.priority || 'low']}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="text-2xl">{goal.icon || '🎯'}</div>
          <div>
            <h3 className="font-bold text-gray-900">{goal.name}</h3>
            <p className="text-xs text-gray-500">{goal.category || 'Meta'}</p>
          </div>
        </div>

        {isCompleted && (
          <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
            ✓ Atingido!
          </div>
        )}
        {isOverdue && (
          <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
            Vencido
          </div>
        )}
        {isUrgent && !isCompleted && (
          <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold flex items-center gap-1">
            <Zap size={12} /> Urgente
          </div>
        )}
      </div>

      {/* Amount Info */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
        <div>
          <p className="text-gray-600">Atual</p>
          <p className="font-bold text-gray-900">{formatCurrency(goal.currentAmount)}</p>
        </div>
        <div>
          <p className="text-gray-600">Meta</p>
          <p className="font-bold text-gray-900">{formatCurrency(goal.targetAmount)}</p>
        </div>
      </div>

      {/* Progress Bar with Animation */}
      <div className="mb-3">
        <div className="flex justify-between mb-1">
          <span className="text-xs font-semibold text-gray-700">Progresso</span>
          <span className="text-xs font-bold text-gray-900">{progress.toFixed(1)}%</span>
        </div>
        <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{
              width: `${Math.min(progress, 100)}%`,
            }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-gray-600">Restante</p>
          <p className="font-bold text-gray-900">{formatCurrency(remaining)}</p>
        </div>
        <div className="bg-white rounded-lg p-2 text-center">
          <p className="text-gray-600">Mensal</p>
          <p className="font-bold text-indigo-600">{formatCurrency(monthlyNeeded)}</p>
        </div>
        <div className={`rounded-lg p-2 text-center ${isOverdue ? 'bg-red-100' : 'bg-green-100'}`}>
          <p className="text-gray-600">Dias</p>
          <p className={`font-bold ${isOverdue ? 'text-red-700' : 'text-green-700'}`}>
            {isOverdue ? `${Math.abs(remainingDays)}d atrás` : `${remainingDays} dias`}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center gap-2 py-2 border-t border-gray-300/50 mb-3 text-xs text-gray-600">
        <Calendar size={14} />
        <span>Prazo: {formatDate(goal.deadline)}</span>
        {remainingDays > 0 && remainingDays <= 7 && (
          <span className="ml-auto bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
            Esta semana!
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onEdit && (
          <button
            onClick={() => onEdit(goal)}
            className="flex-1 py-2 border border-indigo-300 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition"
          >
            Editar
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(goal.id)}
            className="flex-1 py-2 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition"
          >
            Deletar
          </button>
        )}
      </div>

      {/* Celebration Confetti for Completed Goals */}
      {isCompleted && (
        <div className="mt-2 text-center">
          <p className="text-sm font-bold text-green-700">🎉 Parabéns por atingir sua meta!</p>
        </div>
      )}
    </div>
  );
}
