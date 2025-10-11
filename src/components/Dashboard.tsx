'use client';

import { useState } from 'react';
import { PlusCircle, TrendingUp, TrendingDown, Target, Calendar, Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { useCategories, useExpenses, useStats, useAlerts } from '@/hooks/useData';
import { useAchievements } from '@/hooks/useAchievements';
import { AlertItem } from '@/types';

interface QuickAddExpenseProps {
  onAddExpense: (expense: { amount: number; description: string; categoryId: string }) => Promise<void>;
  categories: Array<{ id: string; name: string; color: string; icon: string }>;
  loading?: boolean;
}

function QuickAddExpense({ onAddExpense, categories, loading }: QuickAddExpenseProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && categoryId && !submitting) {
      setSubmitting(true);
      try {
        await onAddExpense({
          amount: parseFloat(amount),
          description,
          categoryId
        });
        setAmount('');
        setDescription('');
        setCategoryId('');
      } catch (error) {
        console.error('Error adding expense:', error);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <PlusCircle className="mr-2 text-blue-600" size={20} />
        Adicionar Despesa Rápida
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
        <input
          type="number"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step="0.01"
          disabled={submitting}
        />
        <input
          type="text"
          placeholder="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-2 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting || loading}
        >
          <option value="">Categoria</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {cat.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={submitting || loading || !amount || !description || !categoryId}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adicionando...
            </>
          ) : (
            'Adicionar'
          )}
        </button>
      </form>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-2 ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1 text-sm">
                {Math.abs(trend).toFixed(1)}% vs mês anterior
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createExpense } = useExpenses();
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats();
  const { alerts, loading: alertsLoading } = useAlerts();
  const { achievements, isLoading: loadingAchievements } = useAchievements();

  const handleAddExpense = async (expense: { amount: number; description: string; categoryId: string }) => {
    try {
      await createExpense({
        amount: expense.amount,
        description: expense.description,
        categoryId: expense.categoryId,
        date: new Date()
      });
      // Atualizar estatísticas após adicionar despesa
      refetchStats();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
    }
  };

  if (statsLoading || categoriesLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando dados...</span>
        </div>
      </div>
    );
  }
      {/* Painel de Conquistas */}
      <div className="bg-white rounded-lg shadow p-4 mb-8 mt-6 max-w-2xl">
        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" /> Conquistas
        </h2>
        <p className="text-gray-600 text-sm mb-2">Ganhe conquistas ao usar o app!</p>
        {loadingAchievements ? (
          <div className="text-gray-500">Carregando conquistas...</div>
        ) : achievements.length === 0 ? (
          <div className="text-gray-500">Nenhuma conquista ainda.</div>
        ) : (
          <ul className="space-y-2">
            {achievements.map((ach: any) => (
              <li key={ach.id} className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">{ach.description}</span>
                <span className="text-xs text-gray-400 ml-auto">{new Date(ach.awarded_at).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

  if (!stats) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard - Controle Familiar</h1>

        {/* Painel de Alertas */}
        <div className="mb-6">
          {!alertsLoading && alerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="text-yellow-600 mr-2" size={18} />
                <span className="font-semibold text-yellow-800">Alertas</span>
              </div>
              <div className="space-y-2">
                {alerts.map((a: AlertItem, idx) => (
                  <div key={idx} className="text-sm text-yellow-800 flex items-center justify-between bg-white/60 rounded px-3 py-2">
                    {a.type === 'budget' ? (
                      <>
                        <span>
                          Categoria: <strong>{a.categoryName}</strong> — gasto {Math.round(a.usage * 100)}% do orçamento
                        </span>
                        <span className={a.level === 'danger' ? 'text-red-600' : a.level === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
                          {a.level === 'danger' ? 'Estourado' : a.level === 'warning' ? 'Quase no limite' : 'OK'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{a.message}</span>
                        <span>Média: R$ {a.dailyAvg.toFixed(2)} | Último dia: R$ {a.lastDayTotal.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
  <QuickAddExpense onAddExpense={handleAddExpense} categories={categories} loading={categoriesLoading} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Gastos Este Mês"
            value={`R$ ${stats.totalThisMonth.toFixed(2)}`}
            icon={TrendingUp}
            trend={stats.percentageChange}
            color="bg-blue-500"
          />
          <StatsCard
            title="Gastos Mês Anterior"
            value={`R$ ${stats.totalLastMonth.toFixed(2)}`}
            icon={Calendar}
            color="bg-gray-500"
          />
          <StatsCard
            title="Média Diária"
            value={`R$ ${stats.dailyAverage.toFixed(2)}`}
            icon={Target}
            color="bg-green-500"
          />
          <StatsCard
            title="Projeção Mensal"
            value={`R$ ${stats.projectedMonthlyTotal.toFixed(2)}`}
            icon={TrendingUp}
            color="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Despesas por Categoria (Este Mês)</h3>
            <div className="space-y-4">
              {stats.topCategories.map(category => (
                <div key={category.categoryId} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">R$ {category.amount.toFixed(2)}</div>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          backgroundColor: category.color, 
                          width: `${category.percentage}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {stats.topCategories.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma despesa registrada ainda</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Últimas Despesas</h3>
            <div className="space-y-4">
              {stats.recentExpenses.slice(0, 6).map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{expense.category_icon}</span>
                    <div>
                      <span className="font-medium">{expense.description}</span>
                      <div className="text-sm text-gray-500">{expense.category_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-red-600">
                      R$ {expense.amount.toFixed(2)}
                    </span>
                    <div className="text-xs text-gray-500">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </div>
              ))}
              {stats.recentExpenses.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma despesa encontrada</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}