'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Target, DollarSign, PiggyBank } from 'lucide-react';
// Utilitário para persistir proventos no localStorage por período
function getProventosKey(range: string) {
  return `proventos_${range}`;
}
import { useLocation } from '@/contexts/LocationContext';
import translations from '@/lib/translations';

type ReportsResponse = {
  totalsByCategory: { categoryId: string; name: string; color: string; icon: string; total: number | string }[];
  dailyTotals: { day: string; total: number | string }[];
  monthlyTotals: { ym: string; total: number | string }[];
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

export default function FinancialProjections() {
  // Time range state must be declared first since it's used in other hooks
  const [timeRange, setTimeRange] = useState('1month');
  
  // Estado de proventos (input do usuário, persiste por período)
  const [proventos, setProventos] = useState<number>(0);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(getProventosKey(timeRange));
      setProventos(saved ? Number(saved) : 0);
    }
  }, [timeRange]);
  
  const handleProventosChange = (val: number) => {
    setProventos(val);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getProventosKey(timeRange), String(val));
    }
  };
  const { language, currency } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const categoriesMap = useMemo(() => (t?.categories ?? {}) as Record<string, string>, [t]);
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);

  // Data state
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [projectedThisMonth, setProjectedThisMonth] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch reports (last 12 months) and stats (this month projection)
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
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar projeções');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Build historical series and forecast
  const { chartData, avgLast3, sumProjectedPeriod } = useMemo(() => {
    if (!reports) return { chartData: [], avgLast3: 0, sumProjectedPeriod: 0 };
    const monthly = [...reports.monthlyTotals].sort((a, b) => (a.ym < b.ym ? -1 : 1));
    const y = monthly.map(m => Number(m.total));
    const labels = monthly.map(m => ymLabel(m.ym, language));
    const hist = labels.map((label, i) => ({ month: label, trend: y[i] }));

    // Regression to forecast next N months
    const n = y.length;
    const { a, b } = linearRegression(y);
    const count = timeRange === '1month' ? 1 : timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
    const lastYm = monthly.length ? monthly[monthly.length - 1].ym : `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const future = Array.from({ length: count }, (_, i) => {
      const x = n + i;
      const val = Math.max(0, a + b * x);
      const ym = addMonths(lastYm, i + 1);
      return { month: ymLabel(ym, language), projected: val };
    });
    const futureValues = future.map(f => f.projected as number);
    const periodSum = futureValues.reduce((acc, v) => acc + v, 0);

    // Merge: past with trend, future with projected
    const data = [...hist, ...future];

    const last3 = y.slice(-3);
    const avg3 = last3.length ? last3.reduce((acc, v) => acc + v, 0) / last3.length : 0;
    return { chartData: data, avgLast3: avg3, sumProjectedPeriod: periodSum };
  }, [reports, timeRange, language]);

  // Pie data from totalsByCategory (current window of reports range)
  const pieData = useMemo(() => {
    if (!reports) return [] as { name: string; value: number; color: string }[];
    const totals = reports.totalsByCategory.map(c => ({ ...c, totalNum: Number(c.total) }));
    const totalSum = totals.reduce((acc, c) => acc + c.totalNum, 0);
    if (totalSum <= 0) return [];
    return totals.map(c => ({
      name: categoriesMap[c.name] || c.name,
      value: (c.totalNum / totalSum) * (sumProjectedPeriod || 0),
      color: c.color,
    }));
  }, [reports, categoriesMap, sumProjectedPeriod]);

  // Cards computations
  const rangeCount = timeRange === '3months' ? 3 : timeRange === '12months' ? 12 : 6;
  const baselineTotal = avgLast3 * rangeCount; // baseline = average last 3 months times range
  const projectedSpendingAmount = sumProjectedPeriod || projectedThisMonth;
  const projectedSpendingChange = baselineTotal > 0 ? ((projectedSpendingAmount - baselineTotal) / baselineTotal) * 100 : 0;
  const expectedSavingsAmount = baselineTotal - projectedSpendingAmount; // positive means saving vs baseline
  const expectedSavingsChange = baselineTotal > 0 ? (expectedSavingsAmount / baselineTotal) * 100 : 0;

  // Saldo = proventos - gastos projetados
  const saldo = proventos - projectedSpendingAmount;
  const saldoNegativo = saldo < 0;
  const saldoAlerta = saldo < 500;

  // Balance calculations (deficit/surplus)
  const balanceAmount = saldo;
  const balanceChange = baselineTotal > 0 ? (saldo / baselineTotal) * 100 : 0;

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

        {/* Card de Proventos */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500">
                <PiggyBank className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Proventos ({periodLabel})</h2>
                <p className="text-gray-500 text-sm">Informe o total de proventos (salário, renda, etc) para o período selecionado.</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 min-w-[220px]">
              <input
                type="number"
                min={0}
                step={1}
                className="border border-gray-300 rounded px-4 py-2 text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full md:w-48 text-right"
                value={proventos}
                onChange={e => handleProventosChange(Number(e.target.value))}
                placeholder="0,00"
                aria-label="Proventos"
              />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-600 text-sm">Saldo:</span>
                <span className={`text-lg font-bold ${saldoNegativo ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(saldo)}</span>
              </div>
              {saldoAlerta && (
                <div className="mt-2 bg-red-100 border border-red-300 text-red-700 rounded px-3 py-2 text-sm font-semibold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Você está gastando demais! Não pode gastar mais hoje. Saldo {formatCurrency(saldo)} será prejudicado seu orçamento.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ProjectionCard
            title={projectedTitle}
            amount={projectedSpendingAmount}
            change={projectedSpendingChange}
            icon={TrendingUp}
            color="bg-blue-500"
          />
          <ProjectionCard
            title={t.expectedSavings}
            amount={expectedSavingsAmount}
            change={expectedSavingsChange}
            icon={DollarSign}
            color="bg-red-500"
          />
          <ProjectionCard
            title={t.targetSavings || 'Meta de Economia'}
            amount={500}
            change={0}
            icon={Target}
            color="bg-green-500"
          />
          <ProjectionCard
            title={t.balance || 'Déficit/Superávit'}
            amount={balanceAmount}
            change={balanceChange}
            icon={Calendar}
            color="bg-orange-500"
          />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Histórico vs Projeção */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{t.historyVsProjection || 'Histórico vs Projeção de Gastos'}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="projected" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name={t.projected || 'Projetado'}
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="trend" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name={t.trendBased || 'Baseado na Tendência'}
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
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
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