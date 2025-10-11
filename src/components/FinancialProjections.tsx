'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';
import translations from '@/lib/translations';

const projectionData = [
  { month: 'Dec 24', projected: 2650, trend: 2580 },
  { month: 'Jan 25', projected: 2580, trend: 2620 },
  { month: 'Feb 25', projected: 2720, trend: 2680 },
  { month: 'Mar 25', projected: 2600, trend: 2640 },
  { month: 'Apr 25', projected: 2750, trend: 2710 },
  { month: 'May 25', projected: 2680, trend: 2690 },
];

const categoryData = [
  { name: 'Alimentação', value: 580, color: '#FF6B6B' },
  { name: 'Transporte', value: 420, color: '#4ECDC4' },
  { name: 'Moradia', value: 650, color: '#45B7D1' },
  { name: 'Saúde', value: 280, color: '#96CEB4' },
  { name: 'Lazer', value: 320, color: '#FF9FF3' },
  { name: 'Outros', value: 200, color: '#5F27CD' },
];

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
  const [timeRange, setTimeRange] = useState('6months');
  const { language, currency } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const categoriesMap = (t?.categories ?? {}) as Record<string, string>;
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);

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
            <option value="3months">{t.next3}</option>
            <option value="6months">{t.next6}</option>
            <option value="12months">{t.next12}</option>
          </select>
        </div>

        {/* Cards de Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ProjectionCard
            title={t.projectedSpending}
            amount={2650}
            change={8.2}
            icon={TrendingUp}
            color="bg-blue-500"
          />
          <ProjectionCard
            title={t.expectedSavings}
            amount={-150}
            change={-65.0}
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
            amount={-150}
            change={-250.0}
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
              <LineChart data={projectionData}>
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
                  data={categoryData.map(c => ({ ...c, name: categoriesMap[c.name] || c.name }))}
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
                  {categoryData.map((entry, index) => (
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