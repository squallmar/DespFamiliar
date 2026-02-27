'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import { PlusCircle, TrendingUp, TrendingDown, Target, Calendar, Loader2, AlertTriangle, Info } from 'lucide-react';
import { useCategories, useExpenses, useStats, useAlerts } from '@/hooks/useData';
import { AlertItem, Expense } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';
import FamilyMemberSelector from './FamilyMemberSelector';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';

interface QuickAddExpenseProps {
  onAddExpense: (expense: { amount: number; description: string; categoryId: string; recurrence: string; date: string; spentBy?: string; paidBy?: string }) => Promise<void>;
  categories: Array<{ id: string; name: string; color: string; icon: string }>;
  loading?: boolean;
  language: string;
  familyMembers?: Array<any>;
}

interface CategoryTranslation {
  [key: string]: string;
}

interface TranslationsType {
  [key: string]: {
    [key: string]: string | CategoryTranslation | Record<string, string>;
  };
}

function QuickAddExpense({ onAddExpense, categories, loading, language, familyMembers = [] }: QuickAddExpenseProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [recurrence, setRecurrence] = useState('single');
  const [spentBy, setSpentBy] = useState<string | undefined>();
  const [paidBy, setPaidBy] = useState<string | undefined>();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [submitting, setSubmitting] = useState(false);
  
  const langKey = resolveLanguage(language);
  const t = (translations as Record<string, any>)[langKey] || translations['pt-BR'];
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
        date,
        spentBy,
        paidBy
      });
      setAmount('');
      setDescription('');
      setCategoryId('');
      setRecurrence('single');
      setSpentBy(undefined);
      setPaidBy(undefined);
      setDate(new Date().toISOString().slice(0, 10));
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 mb-8 border border-gray-100">
      <h3 className="text-2xl font-bold mb-6 flex items-center text-gray-900">
        <div className="bg-blue-100 p-2 rounded-lg mr-3">
          <PlusCircle className="text-blue-600" size={24} />
        </div>
        {t.quickAdd as string}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">{t.amount as string || 'Valor'}</label>
            <input
              type="number"
              placeholder={t.value as string}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              step="0.01"
              min="0.01"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">{t.description as string || 'Descrição'}</label>
            <input
              type="text"
              placeholder={t.description as string}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              disabled={submitting}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">{t.date as string || 'Data'}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              disabled={submitting}
              required
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">{t.category as string || 'Categoria'}</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
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
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">{t.type as string || 'Tipo'}</label>
            <select
              value={recurrence}
              onChange={e => setRecurrence(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              disabled={submitting}
            >
              <option value="single">{t.singleExpense as string || 'Despesa única'}</option>
              <option value="monthly">{t.monthlyExpense as string || 'Mensal'}</option>
              <option value="weekly">{t.weeklyExpense as string || 'Semanal'}</option>
              <option value="daily">{t.dailyExpense as string || 'Diária'}</option>
            </select>
          </div>
        </div>
        {familyMembers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <FamilyMemberSelector
              members={familyMembers}
              value={spentBy}
              onChange={setSpentBy}
              label={t.spentBy as string || 'Quem Gastou'}
              optional={true}
              optionalText={t.optional as string || '(Opcional)'}
              nobodyText={t.nobodySpecific as string || 'Ninguém específico'}
            />
            <FamilyMemberSelector
              members={familyMembers}
              value={paidBy}
              onChange={setPaidBy}
              label={t.paidBy as string || 'Quem Pagou'}
              optional={true}
              optionalText={t.optional as string || '(Opcional)'}
              nobodyText={t.nobodySpecific as string || 'Ninguém específico'}
            />
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || loading || !amount || !description || !categoryId || !date}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transition duration-200"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {t.adding as string || 'Adicionando...'}
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-5 w-5" />
              {t.add as string || 'Adicionar'}
            </>
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
  t,
  tooltip 
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  color: string;
  t: TranslationsType[keyof TranslationsType];
  tooltip?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 relative group">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
            {tooltip && (
              <>
                <Info size={16} className="text-gray-400 cursor-help hover:text-blue-500 transition" />
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 w-48 z-50 shadow-lg">
                  {tooltip}
                  <div className="absolute top-full left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </>
            )}
          </div>
          <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mt-2">{value}</p>
          {trend !== undefined && (
            <div className={`flex items-center mt-3 ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
              {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span className="ml-1 text-sm font-medium">
                {Math.abs(trend).toFixed(1)}% {t.vsLastMonth as string}
              </span>
            </div>
          )}
        </div>
        <div className={`p-4 rounded-2xl ${color} shadow-lg`}>
          <Icon className="text-white" size={28} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currency, language, loading: locationLoading } = useLocation();
  const langKey = resolveLanguage(language);
  const t = (translations as Record<string, any>)[langKey] || translations['pt-BR'];
  const { categories, loading: categoriesLoading } = useCategories();
  const { createExpense } = useExpenses();
  const { members: familyMembers } = useFamilyMembers();
  
  // Monitor achievements and show notifications
  useAchievementNotifications();
  
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  
  const { stats, loading: statsLoading, refetch: refetchStats } = useStats(selectedYear, selectedMonth);
  const { alerts, loading: alertsLoading } = useAlerts();
  const { show: showToast } = useToast();

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

  // Filter bills from alerts for upcoming bills section
  const upcomingBills = useMemo(() => {
    return alerts.filter((alert: AlertItem) => alert.type === 'bill');
  }, [alerts]);

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
    date: string;
    spentBy?: string;
    paidBy?: string;
  }) => {
    try {
      const payload: {
        amount: number;
        description: string;
        categoryId: string;
        date: Date;
        recurring?: boolean;
        recurringType?: 'monthly' | 'weekly' | 'yearly';
        spentBy?: string;
        paidBy?: string;
      } = {
        amount: expense.amount,
        description: expense.description,
        categoryId: expense.categoryId,
        date: new Date(expense.date)
      };
      
      if (expense.spentBy) {
        payload.spentBy = expense.spentBy;
      }
      
      if (expense.paidBy) {
        payload.paidBy = expense.paidBy;
      }
      
      if (expense.recurrence && expense.recurrence !== 'single') {
        payload.recurring = true;
        
        if (expense.recurrence === 'daily') {
          // API does not support 'daily' recurringType; map to 'monthly' as a sensible default
          payload.recurringType = 'monthly';
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
    <div className="p-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen relative">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            {t.dashboard as string}
          </h1>
        </div>
        
        {/* Filtro de ano/mês */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 border border-gray-100">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="text-blue-600" size={20} />
            </div>
            <span className="text-base font-semibold text-gray-800">
              {language.includes('en') ? 'Period:' : 
               language.includes('es') ? 'Período:' : 
               'Período:'}
            </span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {statsLoading && (
              <div className="flex items-center text-sm text-gray-500 ml-auto">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {language.includes('en') ? 'Loading...' : 
                 language.includes('es') ? 'Cargando...' : 
                 'Carregando...'}
              </div>
            )}
          </div>
        </div>

        {/* Próximas contas a vencer */}
        {upcomingBills.length > 0 && (
          <div className="mt-8 mb-8 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
            <div className="flex gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock text-orange-600 flex-shrink-0" aria-hidden="true">
                <path d="M12 6v6l4 2"></path>
                <circle cx="12" cy="12" r="10"></circle>
              </svg>
              <div className="flex-1">
                <h3 className="font-bold text-orange-800 mb-2">
                  📅 {language.includes('en') ? 'Upcoming bills (next 7 days)' : language.includes('es') ? 'Próximas cuentas (próximos 7 días)' : 'Próximas contas a vencer (até 7 dias)'}
                </h3>
                <ul className="text-orange-700 text-sm space-y-1">
                  {upcomingBills.map((bill: any) => (
                    <li key={bill.billId}>
                      • {bill.description} - {formatCurrency(bill.amount)} 
                      {bill.isOverdue 
                        ? ` (${language.includes('en') ? 'overdue' : language.includes('es') ? 'atrasada' : 'atrasada'})`
                        : ` (${language.includes('en') ? `due in ${bill.daysUntilDue} ${bill.daysUntilDue === 1 ? 'day' : 'days'}` : language.includes('es') ? `vence en ${bill.daysUntilDue} ${bill.daysUntilDue === 1 ? 'día' : 'días'}` : `vence em ${bill.daysUntilDue} ${bill.daysUntilDue === 1 ? 'dia' : 'dias'}`})`
                      }
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {noStatsData ? (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 mt-8 text-center">
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
              familyMembers={familyMembers}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
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
                tooltip="Inclui todas as despesas (recorrentes e não recorrentes) divididas pelos dias transcorridos do mês"
              />
              <StatsCard
                title={t.monthlyProjection as string || 'Projeção Mensal'}
                value={formatCurrency(stats.projectedMonthlyTotal || 0)}
                icon={TrendingUp}
                color="bg-purple-500"
                t={t}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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
                    displayRecent.slice(0, 6).map((expense: Expense) => {
                      const spender = familyMembers.find(m => m.id === expense.spentBy);
                      const payer = familyMembers.find(m => m.id === expense.paidBy);
                      
                      return (
                        <div key={expense.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <div className="flex items-center flex-1">
                            <span className="text-xl mr-3">{expense.category_icon || '💰'}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{expense.description}</span>
                                {spender && (
                                  <span className="text-sm text-gray-600 flex items-center gap-1">
                                    <span className="text-base">{spender.avatar || '👤'}</span>
                                    <span>{spender.name}</span>
                                  </span>
                                )}
                              </div>
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
                      );
                    })
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
            familyMembers={familyMembers}
          />
        </div>
      </div>
    </div>
  );
}