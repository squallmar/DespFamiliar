'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Target, DollarSign, Wallet, TrendingDown } from 'lucide-react';

import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';

type ReportsResponse = {
  totalsByCategory: { categoryId: string; name: string; color: string; icon: string; total: number | string }[];
  dailyTotals: { day: string; total: number | string }[];
  monthlyTotals: { ym: string; total: number | string }[];
};

interface IncomeItem {
  id: string;
  month: string;
  amount?: number;
  total?: number;
  notes?: string;
}

// Simple linear regression y = a + b*x
function linearRegression(y: number[]) {
  const n = y.length;
  if (n === 0) return { a: 0, b: 0 };
  const xs = Array.from({ length: n }, (_, i) => i);
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * y[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  const b = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}

function addMonths(ym: string, months: number) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  d.setMonth(d.getMonth() + months);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function ymLabel(ym: string, language: string) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString(language || 'pt-BR', { month: 'short', year: '2-digit' });
}

interface ProjectionCardProps {
  title: string;
  amount: number;
  change: number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

function ProjectionCard({ title, amount, change, icon: Icon, color }: ProjectionCardProps) {
  const { language, currency } = useLocation();
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className={`text-sm font-medium ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
    </div>
  );
}

function SavingsRateCard({ title, rate, icon: Icon, color }: { title: string; rate: number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }) {
  const progressColor = rate >= 20 ? 'bg-green-500' : rate >= 10 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${progressColor}`}
            style={{ width: `${Math.min(Math.abs(rate), 100)}%` }}
          />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{rate.toFixed(1)}%</p>
      <p className="text-xs text-gray-500 mt-2">
        {rate >= 20 ? '✓ Excelente' : rate >= 10 ? '◐ Bom' : '⚠ Precisa melhorar'}
      </p>
    </div>
  );
}

export default function FinancialProjections() {
  // Time range state must be declared first since it's used in other hooks
  const [timeRange, setTimeRange] = useState('1month');
  

  const { language, currency } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const categoriesMap = useMemo(() => (t?.categories ?? {}) as Record<string, string>, [t]);
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);

  // Data state
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [incomeHistory, setIncomeHistory] = useState<IncomeItem[]>([]);
  const [currentIncome, setCurrentIncome] = useState<number>(0);
  const [projectedThisMonth, setProjectedThisMonth] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports (last 12 months), stats (this month projection), and income data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const fromDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        const toDate = today;
        const from = fromDate.toISOString().slice(0, 10);
        const to = toDate.toISOString().slice(0, 10);
        const repRes = await fetch(`/api/reports?from=${from}&to=${to}`, { credentials: 'include' });
        const repJson = await repRes.json();
        if (!repRes.ok) throw new Error(repJson.error || 'Falha ao carregar relatórios');
        setReports(repJson as ReportsResponse);

        const statsRes = await fetch('/api/stats', { credentials: 'include' });
        const statsJson = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsJson.error || 'Falha ao carregar projeção');
        setProjectedThisMonth(Number(statsJson.projectedMonthlyTotal || 0));

        // Fetch income data for the last 12 months
        const incomeRes = await fetch('/api/incomes', { credentials: 'include' });
        const incomeJson = await incomeRes.json();
        if (incomeRes.ok && Array.isArray(incomeJson.history)) {
          setIncomeHistory(incomeJson.history);
          
          // Get current month income
          const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          const currentMonthIncome = incomeJson.history.find((item: IncomeItem) => item.month === currentMonthKey);
          const currentAmount = currentMonthIncome ? Number(currentMonthIncome.total ?? currentMonthIncome.amount) : 0;
          setCurrentIncome(currentAmount || 0);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar projeções');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build historical series and forecast with income data
  const { chartData, avgLast3, sumProjectedPeriod, incomeByMonth } = useMemo(() => {
    if (!reports) return { chartData: [], avgLast3: 0, sumProjectedPeriod: 0, incomeByMonth: new Map<string, number>() };
    
    // Map income history by month key
    const incomeMap = new Map<string, number>();
    incomeHistory.forEach(item => {
      incomeMap.set(item.month, Number(item.total ?? item.amount) || 0);
    });
    
    const monthly = [...reports.monthlyTotals].sort((a, b) => (a.ym < b.ym ? -1 : 1));
    const y = monthly.map(m => Number(m.total));
    const labels = monthly.map(m => ymLabel(m.ym, language));
    const hist = labels.map((label, i) => {
      const ym = monthly[i].ym;
      return {
        month: label,
        ym,
        expenses: y[i],
        income: incomeMap.get(ym) || 0,
        trend: y[i]
      };
    });

    // Regression to forecast next N months (expenses)
    const n = y.length;
    const { a, b } = linearRegression(y);
    const count = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
    const lastYm = monthly.length ? monthly[monthly.length - 1].ym : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    
    // Calculate average income from history, or use current income as default
    const incomeValues = Array.from(incomeMap.values()).filter(v => v > 0);
    const avgIncome = incomeValues.length > 0 
      ? incomeValues.reduce((sum, v) => sum + v, 0) / incomeValues.length 
      : currentIncome;
    
    const future = Array.from({ length: count }, (_, i) => {
      const x = n + i;
      const val = Math.max(0, a + b * x);
      const ym = addMonths(lastYm, i + 1);
      // Use historical income if available, otherwise use average or current income
      const projectedIncome = incomeMap.get(ym) || avgIncome || 0;
      return {
        month: ymLabel(ym, language),
        ym,
        projected: val,
        income: projectedIncome
      };
    });
    const futureValues = future.map(f => f.projected as number);
    const periodSum = futureValues.reduce((acc, v) => acc + v, 0);

    // Merge: past with expenses/income, future with projected expenses/income
    const data = [
      ...hist,
      ...future.map(f => ({ month: f.month, expenses: f.projected, income: f.income, trend: f.projected }))
    ];

    const last3 = y.slice(-3);
    const avg3 = last3.length ? last3.reduce((acc, v) => acc + v, 0) / last3.length : 0;
    return { chartData: data, avgLast3: avg3, sumProjectedPeriod: periodSum, incomeByMonth: incomeMap };
  }, [reports, incomeHistory, timeRange, language, currentIncome]);

  // Pie data from totalsByCategory (current window of reports range)
  const pieData = useMemo(() => {
    if (!reports) return [] as { name: string; value: number; color: string }[];
    const totals = reports.totalsByCategory.map(c => ({ ...c, totalNum: Number(c.total) }));
    const totalSum = totals.reduce((acc, c) => acc + c.totalNum, 0);
    if (totalSum <= 0) return [];
    return totals
      .map(c => ({
        name: categoriesMap[c.name] || c.name,
        value: (c.totalNum / totalSum) * (sumProjectedPeriod || 0),
        color: c.color,
      }))
      .filter(c => c.value > 0); // Filtrar apenas categorias com valor > 0
  }, [reports, categoriesMap, sumProjectedPeriod]);

  // Cards computations
  const rangeCount = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
  const baselineTotal = avgLast3 * rangeCount; // baseline = average last 3 months times range
  const projectedSpendingAmount = sumProjectedPeriod || projectedThisMonth;
  const projectedSpendingChange = baselineTotal > 0 ? ((projectedSpendingAmount - baselineTotal) / baselineTotal) * 100 : 0;
  const expectedSavingsAmount = baselineTotal - projectedSpendingAmount; // positive means saving vs baseline
  const expectedSavingsChange = baselineTotal > 0 ? (expectedSavingsAmount / baselineTotal) * 100 : 0;

  // Income and balance calculations
  const totalIncome = currentIncome || 0;
  const netBalance = totalIncome - projectedSpendingAmount;
  const savingsRate = totalIncome > 0 ? (netBalance / totalIncome) * 100 : 0;
  const netBalanceChange = totalIncome > 0 ? ((netBalance - (totalIncome - baselineTotal)) / (totalIncome - baselineTotal)) * 100 : 0;

  // Balance calculations (difference vs baseline)
  const balanceAmount = netBalance;
  const balanceChange = netBalanceChange;

  const periodLabel = timeRange === '1month' ? 'Próximo mês' : timeRange === '3months' ? t.next3 : timeRange === '6months' ? t.next6 : t.next12;
  const projectedTitle = `${(t.projectedSpending?.split('(')?.[0] || 'Gastos Projetados').trim()} (${periodLabel})`;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600">{t.loading || 'Carregando projeções...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t.projectionsTitle}</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="1month">Próximo mês</option>
            <option value="3months">{t.next3}</option>
            <option value="6months">{t.next6}</option>
            <option value="12months">{t.next12}</option>
          </select>
        </div>

        {/* Cards de Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <ProjectionCard
            title="Receita Total"
            amount={totalIncome}
            change={0}
            icon={Wallet}
            color="bg-emerald-500"
          />
          <ProjectionCard
            title={projectedTitle}
            amount={projectedSpendingAmount}
            change={projectedSpendingChange}
            icon={TrendingDown}
            color="bg-red-500"
          />
          <ProjectionCard
            title="Saldo Líquido"
            amount={balanceAmount}
            change={balanceChange}
            icon={DollarSign}
            color={balanceAmount >= 0 ? "bg-green-500" : "bg-orange-500"}
          />
          <SavingsRateCard
            title="Taxa de Poupança"
            rate={savingsRate}
            icon={Target}
            color="bg-blue-500"
          />
          <ProjectionCard
            title={t.expectedSavings}
            amount={expectedSavingsAmount}
            change={expectedSavingsChange}
            icon={Calendar}
            color="bg-purple-500"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Histórico vs Projeção com Receita */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.historyVsProjection || 'Receita vs Despesa'}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis width={96} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Receita"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Despesas"
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#8884d8" 
                  strokeWidth={1}
                  name={t.trendBased || 'Tendência'}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Gastos Projetados */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.projectedByCategory || 'Distribuição Projetada por Categoria'}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) => 
                    percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Análise Detalhada */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tendências */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.identifiedTrends || 'Tendências Identificadas'}</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-red-600">{t.increaseFood || 'Aumento em Alimentação'}</p>
                  <p className="text-sm text-gray-600">{t.increaseFoodDetail || '+15% nos últimos 3 meses'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-green-600">{t.reductionTransport || 'Redução em Transporte'}</p>
                  <p className="text-sm text-gray-600">{t.reductionTransportDetail || '-8% com trabalho remoto'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-yellow-600">{t.seasonalityLeisure || 'Sazonalidade em Lazer'}</p>
                  <p className="text-sm text-gray-600">{t.seasonalityLeisureDetail || 'Picos em dezembro e janeiro'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendações */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.recommendations || 'Recomendações'}</h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">{t.adjustFoodBudget || 'Ajustar Orçamento de Alimentação'}</p>
                <p className="text-sm text-blue-600">{t.adjustFoodBudgetDetail || 'Considere aumentar o limite para R$ 650'}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-green-800">{t.savingOpportunity || 'Oportunidade de Economia'}</p>
                <p className="text-sm text-green-600">{t.savingOpportunityDetail || 'Redirecione economia de transporte para metas'}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="font-medium text-yellow-800">{t.prepareSeasonality || 'Preparar para Sazonalidade'}</p>
                <p className="text-sm text-yellow-600">{t.prepareSeasonalityDetail || 'Reserve R$ 200 extras para dezembro'}</p>
              </div>
            </div>
          </div>

          {/* Metas vs Realidade */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.goalsProgress || 'Progresso das Metas'}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{t.goalEmergency || 'Emergência'}</span>
                  <span className="text-sm text-gray-600">65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(3250)} {t.of || 'de'} {formatCurrency(5000)}</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{t.goalTrip || 'Viagem'}</span>
                  <span className="text-sm text-gray-600">32%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(960)} {t.of || 'de'} {formatCurrency(3000)}</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">{t.goalNewHome || 'Casa Nova'}</span>
                  <span className="text-sm text-gray-600">18%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(9000)} {t.of || 'de'} {formatCurrency(50000)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}