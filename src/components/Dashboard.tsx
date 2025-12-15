'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import { PlusCircle, TrendingUp, TrendingDown, Target, Calendar, Loader2, AlertTriangle, Trophy } from 'lucide-react';
import { useCategories, useExpenses, useStats, useAlerts } from '@/hooks/useData';
import { useAchievements } from '@/hooks/useAchievements';
import { AlertItem, Expense } from '@/types';
import { useToast } from '@/contexts/ToastContext';

interface Achievement {
  id: string;
  type: string;
  description: string;
  awardedAt: string;
}

interface QuickAddExpenseProps {
  onAddExpense: (expense: { amount: number; description: string; categoryId: string; recurrence: string; date: string }) => Promise<void>;
  categories: Array<{ id: string; name: string; color: string; icon: string }>;
  loading?: boolean;
  language: string;
}

interface CategoryTranslation {
  [key: string]: string;
}

interface TranslationsType {
  [key: string]: {
    [key: string]: string | CategoryTranslation | Record<string, string>;
  };
}

function QuickAddExpense({ onAddExpense, categories, loading, language }: QuickAddExpenseProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [recurrence, setRecurrence] = useState('single');
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  
  const langKey = resolveLanguage(language);
  const t = translations[langKey as keyof TranslationsType] || translations['pt-BR'];
  const categoriesMap = (t?.categories ?? {}) as CategoryTranslation;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !categoryId || !date || submitting) {
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onAddExpense({
        amount: amountValue,
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
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <PlusCircle className="mr-2 text-blue-600" size={20} />
        {t.quickAdd as string}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4">
        <input
          type="number"
          placeholder={t.value as string}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          step="0.01"
          min="0.01"
          disabled={submitting}
          required
        />
        <input
          type="text"
          placeholder={t.description as string}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-2 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
          required
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting}
          required
          max={new Date().toISOString().split('T')[0]}
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={submitting || loading}
          required
        >
          <option value="">{t.category as string}</option>
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
          <option value="single">{t.singleExpense as string || 'Despesa única'}</option>
          <option value="monthly">{t.monthlyExpense as string || 'Mensal'}</option>
          <option value="weekly">{t.weeklyExpense as string || 'Semanal'}</option>
          <option value="daily">{t.dailyExpense as string || 'Diária'}</option>
        </select>
        <button
          type="submit"
          disabled={submitting || loading || !amount || !description || !categoryId || !date}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.adding as string || 'Adicionando...'}
            </>
          ) : (
            t.add as string || 'Adicionar'
          )}
        </button>
      </form>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color, 
  t 
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  color: string;
  t: TranslationsType[keyof TranslationsType];
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
                {Math.abs(trend).toFixed(1)}% {t.vsLastMonth as string}
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
  const t = translations[langKey as keyof TranslationsType] || translations['pt-BR'];
  const { categories, loading: categoriesLoading } = useCategories();
  const { createExpense } = useExpenses();
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats(selectedYear, selectedMonth);
  const { alerts, loading: alertsLoading } = useAlerts();
  const { achievements, isLoading: loadingAchievements } = useAchievements();
  const { show: showToast } = useToast();
  const prevAchievementsRef = useRef<string[]>([]);

  const [fallbackRecent, setFallbackRecent] = useState<Expense[]>([]);

  useEffect(() => {
    const fetchFallback = async () => {
      try {
        if (stats && Array.isArray(stats.recentExpenses) && stats.recentExpenses.length === 0 && fallbackRecent.length === 0) {
          const res = await fetch('/api/expenses?limit=6');
          if (res.ok) {
            const data = await res.json();
            const arr = Array.isArray(data.expenses) ? data.expenses : (Array.isArray(data) ? data : []);
            setFallbackRecent(arr.slice(0, 6));
          } else {
            setFallbackRecent([]);
          }
        }
      } catch (err) {
        console.error('Error fetching fallback expenses:', err);
        setFallbackRecent([]);
      }
    };
    
    fetchFallback();
  }, [stats?.recentExpenses, fallbackRecent.length]);

  useEffect(() => {
    if (!loadingAchievements && achievements?.length) {
      const currentIds = achievements.map((a: Achievement) => a.id);
      const prev = prevAchievementsRef.current;
      const newOnes = achievements.filter((a: Achievement) => !prev.includes(a.id));
      
      if (newOnes.length > 0) {
        newOnes.forEach((ach: Achievement) => {
          const list = (t?.achievementsList ?? {}) as Record<string, string>;
          const label = list[ach.type] || ach.description || ach.type;
          showToast(label, 'success');
        });
      }
      prevAchievementsRef.current = currentIds;
    }
  }, [achievements, loadingAchievements, language, showToast, t]);

  // Listen for global data-change events (bills/expenses created/updated)
  useEffect(() => {
    const onDataChanged = () => {
      try {
        refetchStats();
      } catch (err) {
        console.error('Error refetching stats on data change:', err);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app:data-changed', onDataChanged as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:data-changed', onDataChanged as EventListener);
      }
    };
  }, [refetchStats]);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  
  const months = [
    { value: 1, label: language.includes('en') ? 'January' : language.includes('es') ? 'Enero' : 'Janeiro' },
    { value: 2, label: language.includes('en') ? 'February' : language.includes('es') ? 'Febrero' : 'Fevereiro' },
    { value: 3, label: language.includes('en') ? 'March' : language.includes('es') ? 'Marzo' : 'Março' },
    { value: 4, label: language.includes('en') ? 'April' : language.includes('es') ? 'Abril' : 'Abril' },
    { value: 5, label: language.includes('en') ? 'May' : language.includes('es') ? 'Mayo' : 'Maio' },
    { value: 6, label: language.includes('en') ? 'June' : language.includes('es') ? 'Junio' : 'Junho' },
    { value: 7, label: language.includes('en') ? 'July' : language.includes('es') ? 'Julio' : 'Julho' },
    { value: 8, label: language.includes('en') ? 'August' : language.includes('es') ? 'Agosto' : 'Agosto' },
    { value: 9, label: language.includes('en') ? 'September' : language.includes('es') ? 'Septiembre' : 'Setembro' },
    { value: 10, label: language.includes('en') ? 'October' : language.includes('es') ? 'Octubre' : 'Outubro' },
    { value: 11, label: language.includes('en') ? 'November' : language.includes('es') ? 'Noviembre' : 'Novembro' },
    { value: 12, label: language.includes('en') ? 'December' : language.includes('es') ? 'Diciembre' : 'Dezembro' }
  ];

  const handleAddExpense = async (expense: { 
    amount: number; 
    description: string; 
    categoryId: string; 
    recurrence: string; 
    date: string 
  }) => {
    try {
      const payload: {
        amount: number;
        description: string;
        categoryId: string;
        date: Date;
        recurring?: boolean;
        recurringType?: 'monthly' | 'weekly' | 'yearly' | 'daily';
      } = {
        amount: expense.amount,
        description: expense.description,
        categoryId: expense.categoryId,
        date: new Date(expense.date)
      };
      
      if (expense.recurrence && expense.recurrence !== 'single') {
        payload.recurring = true;
        
        if (expense.recurrence === 'daily') {
          payload.recurringType = 'daily';
        } else if (expense.recurrence === 'weekly') {
          payload.recurringType = 'weekly';
        } else if (expense.recurrence === 'monthly') {
          payload.recurringType = 'monthly';
        } else if (expense.recurrence === 'yearly') {
          payload.recurringType = 'yearly';
        }
      }
      
      await createExpense(payload);
      refetchStats();
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      showToast(
        language.includes('en') ? 'Error adding expense' : 
        language.includes('es') ? 'Error al agregar gasto' : 
        'Erro ao adicionar despesa', 
        'error'
      );
    }
  };

  const formatCurrency = (value: number) => {
    try {
      return new Intl.NumberFormat(language, { 
        style: 'currency', 
        currency: currency || (language.includes('en') ? 'USD' : language.includes('es') ? 'EUR' : 'BRL')
      }).format(value);
    } catch {
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value);
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleDateString(language);
    } catch {
      return new Date(date).toLocaleDateString();
    }
  };

  const categoriesMap = (t?.categories ?? {}) as CategoryTranslation;

  if (statsLoading || categoriesLoading || locationLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t.loading as string || 'Carregando...'}</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {language.includes('en') ? 'Error loading data' : 
             language.includes('es') ? 'Error al cargar datos' : 
             'Erro ao carregar dados'}
          </p>
        </div>
      </div>
    );
  }

  const noStatsData = (
    stats.totalThisMonth === 0 &&
    stats.totalLastMonth === 0 &&
    stats.dailyAverage === 0 &&
    stats.projectedMonthlyTotal === 0 &&
    (!stats.topCategories || stats.topCategories.length === 0) &&
    (!stats.recentExpenses || stats.recentExpenses.length === 0)
  );

  const displayRecent = (
    Array.isArray(stats.recentExpenses) && stats.recentExpenses.length > 0 
      ? stats.recentExpenses 
      : fallbackRecent
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t.dashboard as string} - {t.appName as string}
        </h1>
        
        {/* Filtro de ano/mês */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Calendar className="text-blue-600" size={20} />
            <span className="text-sm font-medium text-gray-700">
              {language.includes('en') ? 'Period:' : 
               language.includes('es') ? 'Período:' : 
               'Período:'}
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
                {language.includes('en') ? 'Loading...' : 
                 language.includes('es') ? 'Cargando...' : 
                 'Carregando...'}
              </div>
            )}
          </div>
        </div>

        {/* Painel de Conquistas */}
        <div className="bg-white rounded-lg shadow p-4 mb-8 mt-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" /> 
            {t.achievements as string || 'Conquistas'}
          </h2>
          <p className="text-gray-600 text-sm mb-2">
            {t.achievementsDesc as string || 'Ganhe conquistas ao usar o app!'}
          </p>
          {loadingAchievements ? (
            <div className="text-gray-500">{t.loading as string || 'Carregando...'}</div>
          ) : !achievements || achievements.length === 0 ? (
            <div className="text-gray-500">
              {t.noAchievements as string || 'Nenhuma conquista ainda.'}
            </div>
          ) : (
            <ul className="space-y-2">
              {achievements.map((ach: Achievement) => {
                const list = (t?.achievementsList ?? {}) as Record<string, string>;
                const label = list[ach.type] || ach.description || ach.type;
                return (
                  <li key={ach.id} className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {formatDate(ach.awardedAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Painel de Alertas */}
        <div className="mb-6">
          {!alertsLoading && alerts && alerts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="text-yellow-600 mr-2" size={18} />
                <span className="font-semibold text-yellow-800">
                  {language.includes('en') ? 'Alerts' : 
                   language.includes('es') ? 'Alertas' : 
                   'Alertas'}
                </span>
              </div>
              <div className="space-y-2">
                {alerts.map((a: AlertItem, idx) => (
                  <div key={idx} className="text-sm text-yellow-800 flex items-center justify-between bg-white/60 rounded px-3 py-2">
                    {a.type === 'budget' ? (
                      <>
                        <span>
                          {language.includes('en') ? 'Category' : 'Categoria'}: 
                          <strong> {a.categoryName}</strong> — 
                          {language.includes('en') ? ' spent' : ' gasto'} 
                          {Math.round(a.usage * 100)}% 
                          {language.includes('en') ? ' of budget' : ' do orçamento'}
                        </span>
                        <span className={a.level === 'danger' ? 'text-red-600' : a.level === 'warning' ? 'text-yellow-700' : 'text-green-700'}>
                          {a.level === 'danger' ? 
                            (language.includes('en') ? 'Exceeded' : language.includes('es') ? 'Excedido' : 'Estourado') : 
                           a.level === 'warning' ? 
                            (language.includes('en') ? 'Near limit' : language.includes('es') ? 'Casi al límite' : 'Quase no limite') : 
                           'OK'}
                        </span>
                      </>
                    ) : a.type === 'bill' ? (
                      <>
                        <span>
                          💳 <strong>{a.description}</strong> — {formatCurrency(a.amount)} — 
                          {a.isOverdue ? 
                            ` ⚠️ ${language.includes('en') ? 'Overdue' : language.includes('es') ? 'Vencida' : 'Vencida'}` : 
                            ` ${language.includes('en') ? 'Due in' : language.includes('es') ? 'Vence en' : 'Vence em'} ${a.daysUntilDue} ${language.includes('en') ? 'day(s)' : language.includes('es') ? 'día(s)' : 'dia(s)'}`}
                        </span>
                        <span className={a.level === 'danger' ? 'text-red-600 font-bold' : a.level === 'warning' ? 'text-orange-600 font-semibold' : 'text-gray-700'}>
                          {a.isOverdue ? 
                            (language.includes('en') ? 'OVERDUE' : language.includes('es') ? 'VENCIDA' : 'VENCIDA') : 
                            (language.includes('en') ? 'UPCOMING' : language.includes('es') ? 'PRÓXIMA' : 'PRÓXIMA')}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{a.message}</span>
                        <span>
                          {language.includes('en') ? 'Average' : language.includes('es') ? 'Promedio' : 'Média'}: 
                          {formatCurrency(a.dailyAvg)} | 
                          {language.includes('en') ? 'Last day' : language.includes('es') ? 'Último día' : 'Último dia'}: 
                          {formatCurrency(a.lastDayTotal)}
                        </span>
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
            <h3 className="text-lg font-semibold mb-2">
              {t.noExpensesTitle as string || 'Sem despesas neste período'}
            </h3>
            <p className="text-gray-600 mb-4">
              {t.noExpenses as string || 'Nenhuma despesa registrada para o período selecionado.'}
            </p>
            <QuickAddExpense 
              onAddExpense={handleAddExpense} 
              categories={categories} 
              loading={categoriesLoading}
              language={language}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatsCard
                title={t.thisMonthSpending as string || 'Gastos Este Mês'}
                value={formatCurrency(stats.totalThisMonth || 0)}
                icon={TrendingUp}
                trend={stats.percentageChange}
                color="bg-blue-500"
                t={t}
              />
              <StatsCard
                title={t.lastMonthSpending as string || 'Gastos Mês Anterior'}
                value={formatCurrency(stats.totalLastMonth || 0)}
                icon={Calendar}
                color="bg-gray-500"
                t={t}
              />
              <StatsCard
                title={t.dailyAverage as string || 'Média Diária'}
                value={formatCurrency(stats.dailyAverage || 0)}
                icon={Target}
                color="bg-green-500"
                t={t}
              />
              <StatsCard
                title={t.monthlyProjection as string || 'Projeção Mensal'}
                value={formatCurrency(stats.projectedMonthlyTotal || 0)}
                icon={TrendingUp}
                color="bg-purple-500"
                t={t}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t.byCategoryThisMonth as string || 'Despesas por Categoria (Este Mês)'}
                </h3>
                <div className="space-y-4">
                  {stats.topCategories && stats.topCategories.length > 0 ? (
                    stats.topCategories.map(category => (
                      <div key={category.categoryId} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{category.icon}</span>
                          <span className="font-medium">
                            {categoriesMap[category.name] || category.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {formatCurrency(category.amount || 0)}
                          </div>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full" 
                              style={{ 
                                backgroundColor: category.color || '#6B7280', 
                                width: `${Math.min(category.percentage || 0, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {t.noExpenses as string || 'Nenhuma despesa registrada ainda'}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {t.latestExpenses as string || 'Últimas Despesas'}
                </h3>
                <div className="space-y-4">
                  {displayRecent && displayRecent.length > 0 ? (
                    displayRecent.slice(0, 6).map((expense: Expense) => (
                      <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex items-center">
                          <span className="text-xl mr-3">{expense.category_icon || '💰'}</span>
                          <div>
                            <span className="font-medium">{expense.description}</span>
                            <div className="text-sm text-gray-500">
                              {categoriesMap[expense.category_name || ''] || expense.category_name || ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-red-600">
                            {formatCurrency(expense.amount || 0)}
                          </span>
                          <div className="text-xs text-gray-500">
                            {formatDate(expense.date)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      {t.noExpenses as string || 'Nenhuma despesa encontrada'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
        
        <div className="mt-8">
          <QuickAddExpense 
            onAddExpense={handleAddExpense} 
            categories={categories} 
            loading={categoriesLoading}
            language={language}
          />
        </div>
      </div>
    </div>
  );
}