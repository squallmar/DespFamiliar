'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Target, DollarSign } from 'lucide-react';

const projectionData = [
  { month: 'Dez 24', projetado: 2650, tendencia: 2580 },
  { month: 'Jan 25', projetado: 2580, tendencia: 2620 },
  { month: 'Fev 25', projetado: 2720, tendencia: 2680 },
  { month: 'Mar 25', projetado: 2600, tendencia: 2640 },
  { month: 'Abr 25', projetado: 2750, tendencia: 2710 },
  { month: 'Mai 25', projetado: 2680, tendencia: 2690 },
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
      <p className="text-2xl font-bold text-gray-900">R$ {amount.toFixed(2)}</p>
    </div>
  );
}

export default function FinancialProjections() {
  const [timeRange, setTimeRange] = useState('6months');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Projeções Financeiras</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="3months">Próximos 3 meses</option>
            <option value="6months">Próximos 6 meses</option>
            <option value="12months">Próximo ano</option>
          </select>
        </div>

        {/* Cards de Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <ProjectionCard
            title="Gastos Projetados (Próximo Mês)"
            amount={2650}
            change={8.2}
            icon={TrendingUp}
            color="bg-blue-500"
          />
          <ProjectionCard
            title="Economia Esperada"
            amount={-150}
            change={-65.0}
            icon={DollarSign}
            color="bg-red-500"
          />
          <ProjectionCard
            title="Meta de Economia"
            amount={500}
            change={0}
            icon={Target}
            color="bg-green-500"
          />
          <ProjectionCard
            title="Déficit/Superávit"
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
            <h3 className="text-lg font-semibold mb-4">Histórico vs Projeção de Gastos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`R$ ${value}`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="projetado" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  name="Projetado"
                  strokeDasharray="5 5"
                />
                <Line 
                  type="monotone" 
                  dataKey="tendencia" 
                  stroke="#82ca9d" 
                  strokeWidth={2}
                  name="Baseado na Tendência"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição de Gastos Projetados */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Distribuição Projetada por Categoria</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
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
                <Tooltip formatter={(value) => [`R$ ${value}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Análise Detalhada */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tendências */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Tendências Identificadas</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-red-600">Aumento em Alimentação</p>
                  <p className="text-sm text-gray-600">+15% nos últimos 3 meses</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-green-600">Redução em Transporte</p>
                  <p className="text-sm text-gray-600">-8% com trabalho remoto</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-yellow-600">Sazonalidade em Lazer</p>
                  <p className="text-sm text-gray-600">Picos em dezembro e janeiro</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recomendações */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Recomendações</h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-medium text-blue-800">Ajustar Orçamento de Alimentação</p>
                <p className="text-sm text-blue-600">Considere aumentar o limite para R$ 650</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="font-medium text-green-800">Oportunidade de Economia</p>
                <p className="text-sm text-green-600">Redirecione economia de transporte para metas</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="font-medium text-yellow-800">Preparar para Sazonalidade</p>
                <p className="text-sm text-yellow-600">Reserve R$ 200 extras para dezembro</p>
              </div>
            </div>
          </div>

          {/* Metas vs Realidade */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Progresso das Metas</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Emergência</span>
                  <span className="text-sm text-gray-600">65%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">R$ 3.250 de R$ 5.000</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Viagem</span>
                  <span className="text-sm text-gray-600">32%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '32%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">R$ 960 de R$ 3.000</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Casa Nova</span>
                  <span className="text-sm text-gray-600">18%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '18%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">R$ 9.000 de R$ 50.000</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}