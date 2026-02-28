'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Target, DollarSign, Wallet, TrendingDown, Info, RefreshCw } from 'lucide-react';

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

type TrendItem = {
  title: string;
  detail: string;
  dotClass: string;
  textClass: string;
};

type RecommendationItem = {
  title: string;
  detail: string;
  cardClass: string;
  titleClass: string;
  detailClass: string;
};

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
  inverseColor?: boolean;
  tooltip?: string;
}

function ProjectionCard({ title, amount, change, icon: Icon, color, inverseColor = false, tooltip }: ProjectionCardProps) {
  const { language, currency } = useLocation();
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  
  // inverseColor: true para receita, saldo, economia (+ é bom = verde)
  // inverseColor: false para gastos (+ é ruim = vermelho)
  const changeColor = inverseColor 
    ? (change >= 0 ? 'text-green-600' : 'text-red-600')
    : (change >= 0 ? 'text-red-600' : 'text-green-600');
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200 overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
        <div className={`text-sm font-medium ${changeColor}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {tooltip && (
          <div className="relative group">
            <Info size={16} className="text-gray-400 cursor-help hover:text-blue-500 transition" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 w-64 z-[100] shadow-xl whitespace-normal">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
    </div>
  );
}

function SavingsRateCard({ title, rate, icon: Icon, color, tooltip }: { title: string; rate: number; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; tooltip?: string }) {
  const progressColor = rate >= 20 ? 'bg-green-500' : rate >= 10 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200 overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
        {tooltip && (
          <div className="relative group">
            <Info size={16} className="text-gray-400 cursor-help hover:text-blue-500 transition" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 w-64 z-[100] shadow-xl whitespace-normal">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
            </div>
          </div>
        )}
      </div>
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
  
  // Month/Year selection for viewing historical data
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { language, currency } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const categoriesMap = useMemo(() => (t?.categories ?? {}) as Record<string, string>, [t]);
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);

  // Data state
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [selectedPeriodReport, setSelectedPeriodReport] = useState<ReportsResponse | null>(null);
  const [recent3MonthsReport, setRecent3MonthsReport] = useState<ReportsResponse | null>(null);
  const [previous3MonthsReport, setPrevious3MonthsReport] = useState<ReportsResponse | null>(null);
  const [incomeHistory, setIncomeHistory] = useState<IncomeItem[]>([]);
  const [currentIncome, setCurrentIncome] = useState<number>(0);
  const [projectedThisMonth, setProjectedThisMonth] = useState<number>(0);
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports (last 12 months), stats (this month projection), and income data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const formatYmd = (date: Date) => date.toISOString().slice(0, 10);
        
        // Generate date range for selected month
        const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
        const monthEnd = new Date(selectedYear, selectedMonth, 0); // Last day of selected month
        const from = formatYmd(monthStart);
        const to = formatYmd(monthEnd);

        // For recent/previous comparisons, use full 12 months
        const fromDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
        const toDate = today;
        const fullFrom = formatYmd(fromDate);
        const fullTo = formatYmd(toDate);

        const recentStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        const previousStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const previousEnd = new Date(today.getFullYear(), today.getMonth() - 2, 0);

        const [repRes, selectedRes, statsRes, recentRes, previousRes] = await Promise.all([
          fetch(`/api/reports?from=${fullFrom}&to=${fullTo}`, { credentials: 'include' }),
          fetch(`/api/reports?from=${from}&to=${to}`, { credentials: 'include' }),
          fetch(`/api/stats?year=${selectedYear}&month=${selectedMonth}`, { credentials: 'include' }),
          fetch(`/api/reports?from=${formatYmd(recentStart)}&to=${fullTo}`, { credentials: 'include' }),
          fetch(`/api/reports?from=${formatYmd(previousStart)}&to=${formatYmd(previousEnd)}`, { credentials: 'include' }),
        ]);

        const repJson = await repRes.json();
        if (!repRes.ok) throw new Error(repJson.error || 'Falha ao carregar relatórios');
        setReports(repJson as ReportsResponse);

        const selectedJson = await selectedRes.json();
        if (selectedRes.ok) {
          setSelectedPeriodReport(selectedJson as ReportsResponse);
        }

        const statsJson = await statsRes.json();
        if (!statsRes.ok) throw new Error(statsJson.error || 'Falha ao carregar projeção');
        setProjectedThisMonth(Number(statsJson.projectedMonthlyTotal || 0));

        const recentJson = await recentRes.json();
        if (!recentRes.ok) throw new Error(recentJson.error || 'Falha ao carregar tendências recentes');
        setRecent3MonthsReport(recentJson as ReportsResponse);

        const previousJson = await previousRes.json();
        if (!previousRes.ok) throw new Error(previousJson.error || 'Falha ao carregar tendências anteriores');
        setPrevious3MonthsReport(previousJson as ReportsResponse);

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

        // Fetch financial goals
        try {
          const goalsRes = await fetch('/api/goals', { credentials: 'include' });
          const goalsJson = await goalsRes.json();
          if (goalsRes.ok && Array.isArray(goalsJson.items)) {
            setGoals(goalsJson.items);
          } else if (!goalsRes.ok) {
            console.warn('Goals API error:', goalsJson.error);
            setGoals([]); // Fallback to empty array
          }
        } catch (goalsError) {
          console.warn('Failed to fetch goals:', goalsError);
          setGoals([]); // Fallback to empty array, don't fail the entire page
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar projeções');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear, selectedMonth, refreshTrigger]);

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
        trend: y[i],
        projected: undefined // Historical data doesn't have projections
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
        income: projectedIncome,
        expenses: undefined, // Future data is projected, not actual
        trend: val
      };
    });
    const futureValues = future.map(f => f.projected as number);
    const periodSum = futureValues.reduce((acc, v) => acc + v, 0);

    // Merge: past with expenses/income, future with projected expenses/income
    const data = [...hist, ...future];

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

  // Annual projection calculation
  const annualProjection = useMemo(() => {
    const selectedHasPositiveData = (selectedPeriodReport?.totalsByCategory ?? []).some(
      (cat) => Number(cat.total || 0) > 0
    );

    // Prefer selected period data only when it has positive totals, otherwise use historical reports
    const sourceReport = selectedHasPositiveData ? selectedPeriodReport : reports;
    
    if (!sourceReport || !sourceReport.totalsByCategory || sourceReport.totalsByCategory.length === 0) {
      return { recurring: 0, variable: 0, total: 0, byCategory: [] };
    }
    
    console.log('📊 Annual Projection Calculation:', {
      sourceReport: selectedHasPositiveData ? 'selected period' : 'historical',
      totalsByCategory: sourceReport.totalsByCategory.length,
      monthlyTotals: sourceReport.monthlyTotals?.length || 0
    });
    
    // If using selected period, use month's data directly annualized
    // If using historical, calculate monthly average for last 3 months
    let annualTotal = 0;
    let categoryBreakdown: any[] = [];
    
    const hasSelectedPeriodData = selectedHasPositiveData;
    
    if (hasSelectedPeriodData) {
      // Using selected period - categorize the current month's data
      annualTotal = sourceReport!.totalsByCategory!.reduce((sum, cat) => sum + Number(cat.total || 0), 0) * 12;
      categoryBreakdown = sourceReport!.totalsByCategory!
        .map(cat => {
          const monthTotal = Number(cat.total || 0);
          const yearlyProjection = monthTotal * 12;  // Annualize single month
          return {
            name: categoriesMap[cat.name] || cat.name,
            originalName: cat.name,
            monthlyAvg: monthTotal,
            yearlyProjection,
            color: cat.color
          };
        });
    } else {
      // Using historical data - average last 3 months
      const monthlyTotals = reports?.monthlyTotals || [];
      const last3Months = monthlyTotals.slice(-3);
      const avgMonthly = last3Months.length > 0
        ? last3Months.reduce((sum, m) => sum + Number(m.total || 0), 0) / last3Months.length
        : 0;
      
      annualTotal = avgMonthly * 12;
      
      categoryBreakdown = sourceReport!.totalsByCategory!
        .map(cat => {
          const monthlyAvg = Number(cat.total || 0) / Math.max(monthlyTotals.length, 1);
          const yearlyProjection = monthlyAvg * 12;
          return {
            name: categoriesMap[cat.name] || cat.name,
            originalName: cat.name,
            monthlyAvg,
            yearlyProjection,
            color: cat.color
          };
        });
    }
    
    categoryBreakdown = categoryBreakdown
      .filter(c => c.yearlyProjection > 0)
      .sort((a, b) => b.yearlyProjection - a.yearlyProjection);
    
    // Try to identify recurring vs variable expenses
    // Recurring categories typically include: housing, utilities, subscriptions, insurance
    const recurringCategories = ['moradia', 'condomínio', 'aluguel', 'água', 'luz', 'energia', 'internet', 'telefone', 'assinaturas', 'seguros', 'saúde', 'educação'];
    
    const recurring = categoryBreakdown
      .filter(c => recurringCategories.some(rc => c.originalName.toLowerCase().includes(rc)))
      .reduce((sum, c) => sum + c.yearlyProjection, 0);
    
    const variable = Math.max(0, annualTotal - recurring); // Ensure non-negative
    
    console.log('💰 Annual Totals:', {
      total: annualTotal,
      recurring,
      variable,
      categoriesCount: categoryBreakdown.length
    });
    
    return {
      recurring,
      variable,
      total: annualTotal,
      byCategory: categoryBreakdown
    };
  }, [reports, selectedPeriodReport, categoriesMap]);

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

  const periodLabel = timeRange === '1month' ? t.nextMonth : timeRange === '3months' ? t.next3 : timeRange === '6months' ? t.next6 : t.next12;
  const projectedTitle = `${(t.projectedSpending?.split('(')?.[0] || 'Gastos Projetados').trim()} (${periodLabel})`;

  const trendAnalysis = useMemo(() => {
    const toMap = (report: ReportsResponse | null) => {
      const map = new Map<string, { name: string; total: number }>();
      if (!report) return map;
      report.totalsByCategory.forEach((item) => {
        const total = Number(item.total || 0);
        if (total > 0) {
          const normalizedName = categoriesMap[item.name] || item.name;
          map.set(normalizedName, { name: normalizedName, total });
        }
      });
      return map;
    };

    const recentMap = toMap(recent3MonthsReport);
    const previousMap = toMap(previous3MonthsReport);
    const categoryNames = Array.from(new Set([...recentMap.keys(), ...previousMap.keys()]));

    const deltas = categoryNames
      .map((name) => {
        const recent = recentMap.get(name)?.total || 0;
        const previous = previousMap.get(name)?.total || 0;
        const change = previous > 0 ? ((recent - previous) / previous) * 100 : recent > 0 ? 100 : 0;
        return { name, recent, previous, change, absChange: Math.abs(change) };
      })
      .filter((item) => item.recent > 0 || item.previous > 0)
      .sort((a, b) => b.absChange - a.absChange);

    const trends: TrendItem[] = deltas.slice(0, 3).map((item) => {
      if (item.change >= 2) {
        return {
          title: `${t.trendIncreaseIn || 'Increase in'} ${item.name}`,
          detail: `+${item.change.toFixed(1)}% ${t.trendLast3Months || 'in the last 3 months'}`,
          dotClass: 'bg-red-500',
          textClass: 'text-red-600',
        };
      }
      if (item.change <= -2) {
        return {
          title: `${t.trendReductionIn || 'Reduction in'} ${item.name}`,
          detail: `${item.change.toFixed(1)}% ${t.trendLast3Months || 'in the last 3 months'}`,
          dotClass: 'bg-green-500',
          textClass: 'text-green-600',
        };
      }
      return {
        title: `${t.trendStableIn || 'Stable in'} ${item.name}`,
        detail: `${item.change.toFixed(1)}% ${t.trendLast3Months || 'in the last 3 months'}`,
        dotClass: 'bg-yellow-500',
        textClass: 'text-yellow-600',
      };
    });

    const increase = deltas.find((item) => item.change >= 2);
    const reduction = deltas.find((item) => item.change <= -2);
    const volatility = reports?.monthlyTotals?.map((m) => Number(m.total || 0)).filter((v) => v > 0) || [];
    const avgVol = volatility.length ? volatility.reduce((sum, v) => sum + v, 0) / volatility.length : 0;
    const maxVol = volatility.length ? Math.max(...volatility) : 0;
    const seasonalityPct = avgVol > 0 ? ((maxVol - avgVol) / avgVol) * 100 : 0;

    const recommendations: RecommendationItem[] = [
      increase
        ? {
            title: `${t.adjustBudgetFor || 'Adjust Budget for'} ${increase.name}`,
            detail: `${t.considerLimitTo || 'Consider revising the limit to'} ~${formatCurrency((increase.recent / 3) * 1.1)} ${t.perMonth || 'per month'}.`,
            cardClass: 'bg-blue-50',
            titleClass: 'text-blue-800',
            detailClass: 'text-blue-600',
          }
        : {
            title: t.keepCurrentBudget || 'Keep current budget',
            detail: t.noRelevantIncrease || 'No relevant increase by category in recent months.',
            cardClass: 'bg-blue-50',
            titleClass: 'text-blue-800',
            detailClass: 'text-blue-600',
          },
      reduction
        ? {
            title: t.savingOpportunity || 'Saving Opportunity',
            detail: `${t.reductionIn || 'Reduction in'} ${reduction.name} ${t.allowsRedirect || 'allows redirecting around'} ${formatCurrency(Math.max(0, (reduction.previous - reduction.recent) / 3))}/${t.monthShort || 'month'} ${t.toGoals || 'to goals'}.`,
            cardClass: 'bg-green-50',
            titleClass: 'text-green-800',
            detailClass: 'text-green-600',
          }
        : {
            title: t.savingOpportunity || 'Saving Opportunity',
            detail: t.reduceVariableCategories || 'Try reducing variable categories to strengthen your goals.',
            cardClass: 'bg-green-50',
            titleClass: 'text-green-800',
            detailClass: 'text-green-600',
          },
      seasonalityPct > 20
        ? {
            title: t.prepareSeasonality || 'Prepare for Seasonality',
            detail: `${t.yourSpendingVariesUpTo || 'Your spending varies up to'} ${seasonalityPct.toFixed(1)}%; ${t.keepExtraReserve || 'keep an extra reserve in peak months'}.`,
            cardClass: 'bg-yellow-50',
            titleClass: 'text-yellow-800',
            detailClass: 'text-yellow-600',
          }
        : {
            title: t.prepareSeasonality || 'Prepare for Seasonality',
            detail: t.monthlyVariationControlled || 'Monthly variation is controlled; keep current planning with a small reserve.',
            cardClass: 'bg-yellow-50',
            titleClass: 'text-yellow-800',
            detailClass: 'text-yellow-600',
          },
    ];

    const fallbackTrends: TrendItem[] = [
      {
        title: t.increaseFood || 'Aumento em Alimentação',
        detail: t.increaseFoodDetail || '+15% nos últimos 3 meses',
        dotClass: 'bg-red-500',
        textClass: 'text-red-600',
      },
      {
        title: t.reductionTransport || 'Redução em Transporte',
        detail: t.reductionTransportDetail || '-8% com trabalho remoto',
        dotClass: 'bg-green-500',
        textClass: 'text-green-600',
      },
      {
        title: t.seasonalityLeisure || 'Sazonalidade em Lazer',
        detail: t.seasonalityLeisureDetail || 'Picos em dezembro e janeiro',
        dotClass: 'bg-yellow-500',
        textClass: 'text-yellow-600',
      },
    ];

    const hasRealTrendData = trends.length > 0;
    const hasRealRecommendationData = Boolean(increase || reduction || volatility.length > 0);

    return {
      trends: hasRealTrendData ? trends : fallbackTrends,
      recommendations,
      hasRealTrendData,
      hasRealRecommendationData,
    };
  }, [recent3MonthsReport, previous3MonthsReport, reports, categoriesMap, formatCurrency, t]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
        <p className="text-gray-600">{t.loading || 'Carregando projeções...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t.projectionsTitle || 'Projeções Financeiras'}</h1>
          <div className="flex gap-3 items-center">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleDateString(language, { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1month">{t.nextMonth || 'Próximo mês'}</option>
              <option value="3months">{t.next3 || 'Próximos 3 meses'}</option>
              <option value="6months">{t.next6 || 'Próximos 6 meses'}</option>
              <option value="12months">{t.next12 || 'Próximos 12 meses'}</option>
            </select>
            <button
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              disabled={loading}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              title={t.refreshData || 'Atualizar dados'}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Cards de Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8 mt-8 overflow-visible">
          <ProjectionCard
            title={t.totalIncome || 'Receita Total'}
            amount={totalIncome}
            change={0}
            icon={Wallet}
            color="bg-emerald-500"
            inverseColor={true}
            tooltip={t.tooltipTotalIncome || 'Soma de todos os proventos (salário, freelance, rendimentos) registrados no período selecionado.'}
          />
          <ProjectionCard
            title={projectedTitle}
            amount={projectedSpendingAmount}
            change={projectedSpendingChange}
            icon={TrendingDown}
            color="bg-red-500"
            tooltip={t.tooltipProjectedSpending || 'Projeção baseada na média dos gastos dos últimos 3 meses, ajustada pelo período selecionado. Comparada com o período anterior.'}
          />
          <ProjectionCard
            title={t.netBalance || 'Saldo Líquido'}
            amount={balanceAmount}
            change={balanceChange}
            icon={DollarSign}
            color={balanceAmount >= 0 ? "bg-green-500" : "bg-orange-500"}
            inverseColor={true}
            tooltip={t.tooltipNetBalance || 'Diferença entre Receita Total e Gastos Projetados. Mostra quanto você pode economizar ou investir no período.'}
          />
          <SavingsRateCard
            title={t.savingsRateTitle || 'Taxa de Poupança'}
            rate={savingsRate}
            icon={Target}
            color="bg-blue-500"
            tooltip={t.tooltipSavingsRate || 'Percentual do Saldo Líquido em relação à Receita Total: (Saldo Líquido ÷ Receita Total) × 100. Indica a eficiência financeira.'}
          />
          <ProjectionCard
            title={t.expectedSavings}
            amount={expectedSavingsAmount}
            change={expectedSavingsChange}
            icon={Calendar}
            color="bg-purple-500"
            inverseColor={true}
            tooltip={t.tooltipExpectedSavings || 'Economia ou gasto extra previsto comparando com a média histórica dos últimos 3 meses. Valores positivos indicam redução de gastos.'}
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Histórico vs Projeção com Receita */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
            <h3 className="text-lg font-semibold mb-4">{t.incomeVsExpenses || 'Receita vs Despesa'}</h3>
            {chartData.length < 3 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  💡 {t.addMoreDataForBetterCharts || 'Adicione mais despesas em diferentes meses para visualizar melhor as tendências'}
                </p>
              </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ left: 16, right: 16, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval={0}
                />
                <YAxis width={96} tickFormatter={(v) => formatCurrency(Number(v))} />
                <Tooltip 
                  formatter={(value, name) => {
                    const displayName = name === 'income' ? (t.chartIncome || 'Receita') 
                      : name === 'expenses' ? (t.chartExpenses || 'Despesas')
                      : name === 'projected' ? (t.chartProjected || 'Projetado')
                      : (t.chartTrend || 'Tendência');
                    return [formatCurrency(Number(value)), displayName];
                  }}
                  labelFormatter={(label) => `${label}`}
                  cursor={false}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name={t.chartIncome || 'Receita'}
                  dot={{ r: 4 }}
                  activeDot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name={t.chartExpenses || 'Despesas'}
                  dot={{ r: 4 }}
                  activeDot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  name={t.chartProjected || 'Projetado'}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#8884d8" 
                  strokeWidth={1}
                  name={t.chartTrend || 'Tendência'}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Gastos Projetados */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
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
                  activeShape={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} cursor={false} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Análise Detalhada */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tendências */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t.identifiedTrends || 'Tendências Identificadas'}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${trendAnalysis.hasRealTrendData ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {trendAnalysis.hasRealTrendData ? (t.realData || 'Real data') : (t.fallbackData || 'Fallback')}
              </span>
            </div>
            <div className="space-y-4">
              {trendAnalysis.trends.map((trend, index) => (
                <div className="flex items-start space-x-3" key={`${trend.title}-${index}`}>
                  <div className={`w-2 h-2 ${trend.dotClass} rounded-full mt-2`}></div>
                  <div>
                    <p className={`font-medium ${trend.textClass}`}>{trend.title}</p>
                    <p className="text-sm text-gray-600">{trend.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendações */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{t.recommendations || 'Recomendações'}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${trendAnalysis.hasRealRecommendationData ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {trendAnalysis.hasRealRecommendationData ? (t.realData || 'Real data') : (t.fallbackData || 'Fallback')}
              </span>
            </div>
            <div className="space-y-4">
              {trendAnalysis.recommendations.map((rec, index) => (
                <div className={`p-3 rounded-lg ${rec.cardClass}`} key={`${rec.title}-${index}`}>
                  <p className={`font-medium ${rec.titleClass}`}>{rec.title}</p>
                  <p className={`text-sm ${rec.detailClass}`}>{rec.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metas vs Realidade */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200 overflow-visible">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">{t.goalsProgress || 'Progresso das Metas'}</h3>
              <div className="relative group">
                <Info size={16} className="text-gray-400 cursor-help hover:text-blue-500 transition" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 w-64 z-[100] shadow-xl whitespace-normal">
                  {t.goalsProgressTooltip || 'Metas financeiras registradas no sistema com acompanhamento de progresso. Os valores são atualizados conforme as economias vão sendo depositadas.'}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {goals && goals.length > 0 ? (
                goals.map((goal, index) => {
                  const colors = ['blue-600', 'green-600', 'purple-600', 'red-600', 'pink-600', 'indigo-600', 'cyan-600', 'teal-600'];
                  const colorClass = colors[index % colors.length];
                  const progress = Math.min(Math.round(goal.progress_percent || 0), 100);
                  
                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">{goal.name}</span>
                        <span className="text-sm text-gray-600">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${colorClass} h-2 rounded-full transition-all duration-500`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatCurrency(goal.current_amount)} {t.of || 'de'} {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-gray-700 font-medium">{t.noGoalsCreated || 'Nenhuma meta criada ainda'}</p>
                  <p className="text-sm text-gray-500 mt-2">{t.createGoalToTrack || 'Crie uma meta para começar a acompanhar seu progresso'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Annual Projection Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 border border-gray-100 hover:border-blue-200 mb-8 overflow-visible">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold">{t.annualProjectionTitle || 'Projeção Anual'}</h3>
            <div className="relative group">
              <Info size={16} className="text-gray-400 cursor-help hover:text-blue-500 transition" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg p-3 w-64 z-[100] shadow-xl whitespace-normal">
                {t.annualProjectionTooltip || 'Projeção de quanto você gastará em um ano considerando despesas fixas (contas) e variáveis (alimentação, lazer, etc.).'}
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">{t.annualProjectionSubtitle || 'Impacto anual das despesas mensais'}</p>
          
          {/* Annual Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-blue-500 rounded-full">
                  <TrendingDown className="text-white" size={16} />
                </div>
                <p className="text-sm font-medium text-blue-900">{t.recurringExpenses || 'Recorrentes'}</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(annualProjection.recurring)}</p>
              <p className="text-xs text-blue-700 mt-1">{t.perYear || 'por ano'}</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-orange-500 rounded-full">
                  <TrendingUp className="text-white" size={16} />
                </div>
                <p className="text-sm font-medium text-orange-900">{t.variableExpenses || 'Variáveis'}</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(annualProjection.variable)}</p>
              <p className="text-xs text-orange-700 mt-1">{t.perYear || 'por ano'}</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-500 rounded-full">
                  <DollarSign className="text-white" size={16} />
                </div>
                <p className="text-sm font-medium text-purple-900">{t.yearlyTotal || 'Total Anual'}</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatCurrency(annualProjection.total)}</p>
              <p className="text-xs text-purple-700 mt-1">{t.perYear || 'por ano'}</p>
            </div>
          </div>

          {/* Annual Breakdown by Category */}
          <div>
            <h4 className="text-md font-semibold text-gray-700 mb-3">{t.annualByCategory || 'Impacto Anual por Categoria'}</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {annualProjection.byCategory.length > 0 ? (
                annualProjection.byCategory.map((cat, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                    <div className="flex items-center gap-3 flex-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: cat.color || '#6b7280' }}
                      ></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{cat.name}</p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(cat.monthlyAvg)} {t.monthlyAverage || 'média mensal'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(cat.yearlyProjection)}</p>
                      <p className="text-xs text-gray-500">{t.perYear || 'por ano'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-gray-700 font-medium">{t.noExpensesYet || 'Nenhuma despesa cadastrada ainda'}</p>
                  <p className="text-sm text-gray-500 mt-2">{t.noExpenses || 'Adicione despesas para ver a projeção anual'}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
