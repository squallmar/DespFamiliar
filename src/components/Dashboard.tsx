'use client';

import { useEffect, useRef, useState } from 'react';
// import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import { PlusCircle, TrendingUp, TrendingDown, Target, Calendar, Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { useCategories, useExpenses, useStats, useAlerts } from '@/hooks/useData';
import { useAchievements } from '@/hooks/useAchievements';
import { AlertItem } from '@/types';
import { useToast } from '@/contexts/ToastContext';
type Achievement = { id: string; type: string; description: string; awarded_at: string };

interface QuickAddExpenseProps {
  onAddExpense: (expense: { amount: number; description: string; categoryId: string; recurrence: string; date: string }) => Promise<void>;
  categories: Array<{ id: string; name: string; color: string; icon: string }>;
  loading?: boolean;
}


function QuickAddExpense({ onAddExpense, categories, loading }: QuickAddExpenseProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [recurrence, setRecurrence] = useState('single');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const categoriesMap = (t?.categories ?? {}) as Record<string, string>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && description && categoryId && date && !submitting) {
      setSubmitting(true);
      try {
        await onAddExpense({
          amount: parseFloat(amount),
          description,
          categoryId,
          recurrence,
          date
        });
        setAmount('');
        setDescription('');
        setCategoryId('');
        setRecurrence('single');
        setDate(new Date().toISOString().slice(0, 10));
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
        {t.quickAdd}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
        <input
          type="number"
          placeholder={t.value}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step="0.01"
          disabled={submitting}
        />
        <input
          type="text"
          placeholder={t.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-2 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting || loading}
        >
          <option value="">{t.category}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.icon} {categoriesMap[cat.name] || cat.name}
            </option>
          ))}
        </select>
        <select
          value={recurrence}
          onChange={e => setRecurrence(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
        >
          <option value="single">{t.singleExpense || 'Despesa única'}</option>
          <option value="monthly">{t.monthlyExpense || 'Mensal'}</option>
          <option value="daily">{t.dailyExpense || 'Diária'}</option>
        </select>
        <button
          type="submit"
          disabled={submitting || loading || !amount || !description || !categoryId || !date}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.adding || 'Adicionando...'}
            </>
          ) : (
            t.add || 'Adicionar'
          )}
        </button>
      </form>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color, t }: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  color: string;
  t: Record<string, string | Record<string, string>>;
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
          {Math.abs(trend).toFixed(1)}% {String(t.vsLastMonth)}
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
  const { currency, language, loading: locationLoading } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const { categories, loading: categoriesLoading } = useCategories();
  const { createExpense } = useExpenses();
  
  // Filtro de ano/mês
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  
  // Usar hook de stats com os filtros de ano/mês
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats(selectedYear, selectedMonth);
  const { alerts, loading: alertsLoading } = useAlerts();
  const { achievements, isLoading: loadingAchievements } = useAchievements();
  const { show: showToast } = useToast();
  const prevAchievementsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!loadingAchievements && achievements?.length) {
      const currentIds = achievements.map((a: Achievement) => a.id);
      const prev = prevAchievementsRef.current;
      const newOnes = achievements.filter((a: Achievement) => !prev.includes(a.id));
      if (newOnes.length > 0) {
        for (const ach of newOnes) {
          const list = t?.achievementsList as Record<string, string> | undefined;
          const label = list?.[ach.type] || ach.description;
          showToast(label, 'success');
        }
      }
      prevAchievementsRef.current = currentIds;
    }
  }, [achievements, loadingAchievements, language, showToast]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const handleAddExpense = async (expense: { amount: number; description: string; categoryId: string; recurrence: string; date: string }) => {
    try {
      // Mapear para os campos esperados pela API: recurring e recurringType
      const payload: {
        amount: number;
        description: string;
        categoryId: string;
        date: Date;
        recurring?: boolean;
        recurringType?: 'monthly' | 'weekly' | 'yearly';
      } = {
        amount: expense.amount,
        description: expense.description,
        categoryId: expense.categoryId,
        date: new Date(expense.date)
      };
      if (expense.recurrence && expense.recurrence !== 'single') {
        payload.recurring = true;
        // Suporte: monthly | weekly | yearly (mapear 'daily' para 'weekly' por ora)
        payload.recurringType = (['monthly', 'weekly', 'yearly'].includes(expense.recurrence)
          ? expense.recurrence
          : 'weekly') as 'monthly' | 'weekly' | 'yearly';
      }
      await createExpense(payload);
      // Atualizar estatísticas após adicionar despesa
      refetchStats();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
    }
  };

  if (statsLoading || categoriesLoading || locationLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t.loading || 'Carregando...'}</span>
        </div>
      </div>
    );
  }

  // Painel de Conquistas
  const conquistasPanel = (
    <div className="bg-white rounded-lg shadow p-4 mb-8 mt-6 max-w-2xl">
      <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" /> {t.achievements || 'Conquistas'}
      </h2>
      <p className="text-gray-600 text-sm mb-2">{t.achievementsDesc || 'Ganhe conquistas ao usar o app!'}</p>
      {loadingAchievements ? (
        <div className="text-gray-500">{t.loading || 'Carregando...'}</div>
      ) : achievements.length === 0 ? (
        <div className="text-gray-500">{t.noAchievements || 'Nenhuma conquista ainda.'}</div>
      ) : (
        <ul className="space-y-2">
          {achievements.map((ach: Achievement) => {
            const list = t?.achievementsList as Record<string, string> | undefined;
            const label = list?.[ach.type] || ach.description;
            return (
              <li key={ach.id} className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <span className="font-medium">{label}</span>
                <span className="text-xs text-gray-400 ml-auto">{new Date(ach.awarded_at).toLocaleDateString(language)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  if (!stats) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Erro ao carregar dados</p>
        </div>
      </div>
    );
  }

  // Helper para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };
  // Helper para formatar data
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString(language);
  };
  const categoriesMap = (t?.categories ?? {}) as Record<string, string>;

  // Detectar quando não há dados relevantes para o período selecionado
  const noStatsData =
    stats.totalThisMonth === 0 &&
    stats.totalLastMonth === 0 &&
    stats.dailyAverage === 0 &&
    stats.projectedMonthlyTotal === 0 &&
    stats.topCategories.length === 0 &&
    stats.recentExpenses.length === 0;

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t.dashboard} - {t.appName}</h1>
        
        {/* Filtro de ano/mês */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Calendar className="text-blue-600" size={20} />
            <span className="text-sm font-medium text-gray-700">
              {language === 'en-US' ? 'Period:' : language === 'es-ES' ? 'Período:' : 'Período:'}
            </span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {statsLoading && (
              <div className="flex items-center text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {language === 'en-US' ? 'Loading...' : language === 'es-ES' ? 'Cargando...' : 'Carregando...'}
              </div>
            )}
          </div>
        </div>


        {conquistasPanel}
        {/* Painel de Alertas */}
        <div className="mb-6">
          {!alertsLoading && alerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="text-yellow-600 mr-2" size={18} />
                <span className="font-semibold text-yellow-800">{language === 'en-US' ? 'Alerts' : language === 'es-ES' ? 'Alertas' : 'Alertas'}</span>
              </div>
              <div className="space-y-2">
                {alerts.map((a: AlertItem, idx) => (
                  <div key={idx} className="text-sm text-yellow-800 flex items-center justify-between bg-white/60 rounded px-3 py-2">
                    {a.type === 'budget' ? (
                      <>
                        <span>
                          {language === 'en-US' ? 'Category' : 'Categoria'}: <strong>{a.categoryName}</strong> — {language === 'en-US' ? 'spent' : 'gasto'} {Math.round(a.usage * 100)}% {language === 'en-US' ? 'of budget' : 'do orçamento'}
                        </span>
                        <span className={a.level === 'danger' ? 'text-red-600' : a.level === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
                          {a.level === 'danger' ? (language === 'en-US' ? 'Exceeded' : language === 'es-ES' ? 'Excedido' : 'Estourado') : a.level === 'warning' ? (language === 'en-US' ? 'Near limit' : language === 'es-ES' ? 'Casi al límite' : 'Quase no limite') : 'OK'}
                        </span>
                      </>
                    ) : a.type === 'bill' ? (
                      <>
                        <span>
                          💳 <strong>{a.description}</strong> — {formatCurrency(a.amount)} — {a.isOverdue ? '⚠️ Vencida' : `Vence em ${a.daysUntilDue} dia(s)`}
                        </span>
                        <span className={a.level === 'danger' ? 'text-red-600 font-bold' : a.level === 'warning' ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                          {a.isOverdue ? 'VENCIDA' : 'PRÓXIMA'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{a.message}</span>
                        <span>{language === 'en-US' ? 'Average' : language === 'es-ES' ? 'Promedio' : 'Média'}: {formatCurrency(a.dailyAvg)} | {language === 'en-US' ? 'Last day' : language === 'es-ES' ? 'Último día' : 'Último dia'}: {formatCurrency(a.lastDayTotal)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {noStatsData ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
            <h3 className="text-lg font-semibold mb-2">{t.noExpensesTitle || 'Sem despesas neste período'}</h3>
            <p className="text-gray-600 mb-4">{t.noExpenses || 'Nenhuma despesa registrada para o período selecionado.'}</p>
            <QuickAddExpense onAddExpense={handleAddExpense} categories={categories} loading={categoriesLoading} />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title={t.thisMonthSpending || 'Gastos Este Mês'}
                value={formatCurrency(stats.totalThisMonth)}
                icon={TrendingUp}
                trend={stats.percentageChange}
                color="bg-blue-500"
                t={t}
              />
              <StatsCard
                title={t.lastMonthSpending || 'Gastos Mês Anterior'}
                value={formatCurrency(stats.totalLastMonth)}
                icon={Calendar}
                color="bg-gray-500"
                t={t}
              />
              <StatsCard
                title={t.dailyAverage || 'Média Diária'}
                value={formatCurrency(stats.dailyAverage)}
                icon={Target}
                color="bg-green-500"
                t={t}
              />
              <StatsCard
                title={t.monthlyProjection || 'Projeção Mensal'}
                value={formatCurrency(stats.projectedMonthlyTotal)}
                icon={TrendingUp}
                color="bg-purple-500"
                t={t}
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">{t.byCategoryThisMonth || 'Despesas por Categoria (Este Mês)'}</h3>
                <div className="space-y-4">
                  {stats.topCategories.map(category => (
                    <div key={category.categoryId} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{category.icon}</span>
                        <span className="font-medium">{(t?.categories as Record<string,string>)?.[category.name] || category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{formatCurrency(category.amount)}</div>
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
                    <p className="text-gray-500 text-center py-4">{t.noExpenses || 'Nenhuma despesa registrada ainda'}</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">{t.latestExpenses || 'Últimas Despesas'}</h3>
                <div className="space-y-4">
                  {stats.recentExpenses.slice(0, 6).map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{expense.category_icon}</span>
                        <div>
                          <span className="font-medium">{expense.description}</span>
                          <div className="text-sm text-gray-500">{categoriesMap[expense.category_name || ''] || expense.category_name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-red-600">
                          {formatCurrency(expense.amount)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {formatDate(expense.date)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stats.recentExpenses.length === 0 && (
                    <p className="text-gray-500 text-center py-4">{t.noExpenses || 'Nenhuma despesa encontrada'}</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}