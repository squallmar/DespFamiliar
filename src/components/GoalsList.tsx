'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Target, TrendingUp, AlertCircle } from 'lucide-react';
import GoalCard, { FinancialGoal } from './GoalCard';

interface GoalsListProps {
  goals: FinancialGoal[];
  currency: string;
  language: string;
  onAdd?: () => void;
  onEdit?: (goal: FinancialGoal) => void;
  onDelete?: (goalId: string) => void;
}

export default function GoalsList({
  goals,
  currency,
  language,
  onAdd,
  onEdit,
  onDelete,
}: GoalsListProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'overdue'>(
    'all'
  );
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'priority'>('deadline');

  const filteredAndSorted = useMemo(() => {
    let filtered = goals.filter((goal) => {
      const progress = (goal.currentAmount / goal.targetAmount) * 100;
      const remainingDays = Math.ceil(
        (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );

      switch (filterStatus) {
        case 'completed':
          return progress >= 100;
        case 'active':
          return progress < 100 && remainingDays > 0;
        case 'overdue':
          return progress < 100 && remainingDays < 0;
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'deadline') {
        return (
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      }

      if (sortBy === 'progress') {
        const progressA = (a.currentAmount / a.targetAmount) * 100;
        const progressB = (b.currentAmount / b.targetAmount) * 100;
        return progressB - progressA;
      }

      if (sortBy === 'priority') {
        const priority = { high: 3, medium: 2, low: 1 };
        return (
          (priority[b.priority || 'low'] as number) -
          (priority[a.priority || 'low'] as number)
        );
      }

      return 0;
    });
  }, [goals, filterStatus, sortBy]);

  const stats = {
    total: goals.length,
    completed: goals.filter((g) => (g.currentAmount / g.targetAmount) * 100 >= 100).length,
    active: goals.filter((g) => {
      const remainingDays = Math.ceil(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return (g.currentAmount / g.targetAmount) * 100 < 100 && remainingDays > 0;
    }).length,
    overdue: goals.filter((g) => {
      const remainingDays = Math.ceil(
        (new Date(g.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      return (g.currentAmount / g.targetAmount) * 100 < 100 && remainingDays < 0;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="text-indigo-600" size={28} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Metas Financeiras</h2>
            <p className="text-sm text-gray-600">
              {stats.completed} de {stats.total} metas atingidas
            </p>
          </div>
        </div>

        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Nova Meta
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
          <p className="text-xs text-indigo-600 font-semibold">Total</p>
          <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-green-50 border border-green-200 p-3">
          <p className="text-xs text-green-600 font-semibold">Atingidas</p>
          <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-600 font-semibold">Ativas</p>
          <p className="text-2xl font-bold text-blue-900">{stats.active}</p>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-xs text-red-600 font-semibold">Vencidas</p>
          <p className="text-2xl font-bold text-red-900">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'active', 'completed', 'overdue'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status as any)}
            className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition ${
              filterStatus === status
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status === 'all'
              ? 'Todas'
              : status === 'active'
                ? 'Ativas'
                : status === 'completed'
                  ? 'Atingidas'
                  : 'Vencidas'}
          </button>
        ))}

        {/* Sort Selector */}
        <div className="ml-auto bg-white border border-gray-300 rounded-lg px-3 py-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm font-semibold text-gray-700 bg-transparent outline-none"
          >
            <option value="deadline">Por Prazo</option>
            <option value="progress">Por Progresso</option>
            <option value="priority">Por Prioridade</option>
          </select>
        </div>
      </div>

      {/* Goals List */}
      {filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
          <Target size={48} className="text-gray-300 mb-3" />
          <p className="text-lg font-semibold text-gray-900">Nenhuma meta nesse filtro</p>
          <p className="text-sm text-gray-600">
            {filterStatus === 'completed'
              ? 'Crie suas primeiras metas!'
              : 'Altere o filtro ou crie uma nova meta'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSorted.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={currency}
              language={language}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Quick Stats */}
      {stats.overdue > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="text-red-600" size={24} />
          <div>
            <p className="font-bold text-red-900">Atenção! {stats.overdue} meta(s) vencida(s)</p>
            <p className="text-sm text-red-700">Revise seus objetivos financeiros</p>
          </div>
        </div>
      )}
    </div>
  );
}
