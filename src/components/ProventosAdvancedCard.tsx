'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { PiggyBank, TrendingUp, TrendingDown, Plus, Edit2, Trash2, Briefcase, LineChart as LineChartIcon, Wallet, Gift, Target, AlertCircle, User } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useLocation } from '@/contexts/LocationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';

interface ProventosSource {
  id: string;
  name: string;
  amount: number;
  type: 'salary' | 'freelance' | 'investment' | 'gift' | 'other';
  recurring: boolean;
  memberId?: string;
}

interface ProventosAdvancedCardProps {
  period: { month: number; year: number };
  totalExpenses: number;
  onTotalChange?: (total: number) => void;
}

const SOURCE_ICONS = {
  salary: Briefcase,
  freelance: LineChartIcon,
  investment: TrendingUp,
  gift: Gift,
  other: Wallet
};

const SOURCE_COLORS = {
  salary: 'bg-blue-500',
  freelance: 'bg-purple-500',
  investment: 'bg-green-500',
  gift: 'bg-pink-500',
  other: 'bg-gray-500'
};

const SOURCE_LABELS = {
  salary: 'Salário',
  freelance: 'Freelance',
  investment: 'Investimentos',
  gift: 'Presentes/Bônus',
  other: 'Outros'
};

function getStorageKey(period: { month: number; year: number }) {
  return `proventos_sources_${period.year}-${String(period.month).padStart(2, '0')}`;
}

export default function ProventosAdvancedCard({ period, totalExpenses, onTotalChange }: ProventosAdvancedCardProps) {
  const { language, currency } = useLocation();
  const { user } = useAuth();
  const { members: familyMembers } = useFamilyMembers();
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  const monthKey = `${period.year}-${String(period.month).padStart(2, '0')}`;

  const [sources, setSources] = useState<ProventosSource[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSource, setEditingSource] = useState<ProventosSource | null>(null);
  const [incomeId, setIncomeId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    type: 'salary' as ProventosSource['type'],
    recurring: false,
    memberId: ''
  });
  const [showHistory, setShowHistory] = useState(false);
  const didInitRef = useRef(false);

  const parseSourcesFromNotes = (notes?: string | null): ProventosSource[] | null => {
    if (!notes) return null;
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed?.sources)) {
        return parsed.sources as ProventosSource[];
      }
      if (Array.isArray(parsed?.items)) {
        const items = parsed.items as Array<{ label?: string; amount?: number }>;
        return items.map((item, idx) => {
          const rawLabel = (item.label || '').toLowerCase();
          let type: ProventosSource['type'] = 'other';
          if (rawLabel.includes('sal')) type = 'salary';
          else if (rawLabel.includes('extra') || rawLabel.includes('free')) type = 'freelance';
          else if (rawLabel.includes('invest')) type = 'investment';
          else if (rawLabel.includes('pres') || rawLabel.includes('bonus')) type = 'gift';

          return {
            id: `import-${idx}`,
            name: item.label || SOURCE_LABELS[type],
            amount: Number(item.amount) || 0,
            type,
            recurring: false
          };
        });
      }
    } catch {
      return null;
    }

    return null;
  };

  // Carregar fontes do servidor (se logado) e fallback para localStorage
  useEffect(() => {
    const load = async () => {
      setIncomeId(null);
      if (user?.id) {
        try {
          const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
          const json = await res.json();
          if (res.ok && Array.isArray(json.items) && json.items.length > 0) {
            const item = json.items[0];
            const parsedSources = parseSourcesFromNotes(item.notes);
            if (parsedSources && parsedSources.length > 0) {
              setSources(parsedSources);
            } else if (Number(item.amount) > 0) {
              setSources([{
                id: 'income-total',
                name: 'Renda',
                amount: Number(item.amount),
                type: 'salary',
                recurring: false
              }]);
            } else {
              setSources([]);
            }
            setIncomeId(item.id);
            didInitRef.current = true;
            return;
          }
        } catch (e) {
          console.error('Erro ao carregar proventos:', e);
        }
      }

      if (typeof window !== 'undefined') {
        const key = getStorageKey(period);
        const saved = window.localStorage.getItem(key);
        if (saved) {
          try {
            setSources(JSON.parse(saved));
          } catch {
            setSources([]);
          }
        } else {
          setSources([]);
        }
      }
      didInitRef.current = true;
    };

    load();
  }, [period, user?.id, monthKey]);

  // Salvar fontes no localStorage e no servidor quando logado
  useEffect(() => {
    if (!didInitRef.current) return;

    if (typeof window !== 'undefined' && sources.length >= 0) {
      const key = getStorageKey(period);
      window.localStorage.setItem(key, JSON.stringify(sources));

      // Notificar mudanca do total
      const total = sources.reduce((sum, s) => sum + s.amount, 0);
      onTotalChange?.(total);
    }

    const persist = async () => {
      if (!user?.id) return;
      try {
        const total = sources.reduce((sum, s) => sum + s.amount, 0);
        const notes = JSON.stringify({ sources });
        if (incomeId) {
          await fetch('/api/incomes', {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: incomeId, month: monthKey, amount: total, notes })
          });
        } else {
          const res = await fetch('/api/incomes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: monthKey, amount: total, notes })
          });
          const json = await res.json();
          if (res.ok && json?.item?.id) {
            setIncomeId(json.item.id);
          }
        }
      } catch (e) {
        console.error('Erro ao salvar proventos:', e);
      }
    };

    persist();
  }, [sources, period, onTotalChange, user?.id, incomeId, monthKey]);

  // Histórico dos últimos 6 meses
  const history = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(period.year, period.month - 1 - i, 1);
      const m = date.getMonth() + 1;
      const y = date.getFullYear();
      const key = getStorageKey({ month: m, year: y });
      const saved = window.localStorage.getItem(key);
      
      let total = 0;
      if (saved) {
        try {
          const data: ProventosSource[] = JSON.parse(saved);
          total = data.reduce((sum, s) => sum + s.amount, 0);
        } catch {
          total = 0;
        }
      }
      
      months.push({
        month: date.toLocaleDateString(language, { month: 'short', year: '2-digit' }),
        value: total
      });
    }
    
    return months;
  }, [period, language]);

  const totalProventos = useMemo(() => 
    sources.reduce((sum, s) => sum + s.amount, 0), 
    [sources]
  );

  const saldo = totalProventos - totalExpenses;
  const savingsRate = totalProventos > 0 ? (saldo / totalProventos) * 100 : 0;
  const isDeficit = saldo < 0;

  // Comparação com mês anterior
  const previousMonthTotal = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    
    const prevMonth = period.month === 1 ? 12 : period.month - 1;
    const prevYear = period.month === 1 ? period.year - 1 : period.year;
    const key = getStorageKey({ month: prevMonth, year: prevYear });
    const saved = window.localStorage.getItem(key);
    
    if (saved) {
      try {
        const data: ProventosSource[] = JSON.parse(saved);
        return data.reduce((sum, s) => sum + s.amount, 0);
      } catch {
        return 0;
      }
    }
    return 0;
  }, [period]);

  const percentChange = previousMonthTotal > 0 
    ? ((totalProventos - previousMonthTotal) / previousMonthTotal) * 100 
    : 0;

  const handleAddSource = () => {
    if (!formData.name || !formData.amount) return;

    const newSource: ProventosSource = {
      id: Date.now().toString(),
      name: formData.name,
      amount: parseFloat(formData.amount),
      type: formData.type,
      recurring: formData.recurring,
      memberId: formData.memberId || undefined
    };

    if (editingSource) {
      setSources(sources.map(s => s.id === editingSource.id ? { ...newSource, id: editingSource.id } : s));
      setEditingSource(null);
    } else {
      setSources([...sources, newSource]);
    }

    setFormData({ name: '', amount: '', type: 'salary', recurring: false, memberId: '' });
    setShowAddForm(false);
  };

  const handleEditSource = (source: ProventosSource) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      amount: source.amount.toString(),
      type: source.type,
      recurring: source.recurring,
      memberId: source.memberId || ''
    });
    setShowAddForm(true);
  };

  const handleDeleteSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const cancelEdit = () => {
    setEditingSource(null);
    setFormData({ name: '', amount: '', type: 'salary', recurring: false, memberId: '' });
    setShowAddForm(false);
  };

  // Dados para o gráfico de comparação
  const comparisonData = useMemo(() => {
    const byType: Record<string, number> = {};
    sources.forEach(s => {
      byType[s.type] = (byType[s.type] || 0) + s.amount;
    });
    
    return Object.entries(byType).map(([type, amount]) => ({
      name: SOURCE_LABELS[type as keyof typeof SOURCE_LABELS],
      value: amount
    }));
  }, [sources]);

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg shadow-lg p-6 border-2 border-emerald-200">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-emerald-500 shadow-lg">
            <PiggyBank className="text-white" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Proventos do Mês</h2>
            <p className="text-gray-600 text-sm">
              {new Date(period.year, period.month - 1).toLocaleDateString(language, { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-sm font-medium text-gray-700"
        >
          {showHistory ? 'Ocultar' : 'Ver'} Histórico
        </button>
      </div>

      {/* Resumo Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total de Proventos */}
        <div className="bg-white rounded-lg p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total de Proventos</span>
            {percentChange !== 0 && (
              <span className={`flex items-center text-xs font-semibold ${percentChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {percentChange > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(percentChange).toFixed(1)}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalProventos)}</p>
          {previousMonthTotal > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Mês anterior: {formatCurrency(previousMonthTotal)}
            </p>
          )}
        </div>

        {/* Saldo */}
        <div className={`bg-white rounded-lg p-5 shadow-md ${isDeficit ? 'ring-2 ring-red-400' : ''}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Saldo</span>
            {isDeficit && (
              <span className="text-xs font-semibold text-red-600 bg-red-100 px-2 py-1 rounded">
                DÉFICIT
              </span>
            )}
          </div>
          <p className={`text-3xl font-bold ${isDeficit ? 'text-red-600' : 'text-green-600'}`}>
            {formatCurrency(saldo)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Despesas: {formatCurrency(totalExpenses)}
          </p>
        </div>

        {/* Taxa de Poupança */}
        <div className="bg-white rounded-lg p-5 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Taxa de Poupança</span>
            <Target size={16} className="text-gray-400" />
          </div>
          <p className={`text-3xl font-bold ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
            {savingsRate.toFixed(1)}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className={`h-2 rounded-full transition-all ${savingsRate >= 20 ? 'bg-green-500' : savingsRate >= 10 ? 'bg-yellow-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {savingsRate >= 20 ? '🎉 Excelente!' : savingsRate >= 10 ? '👍 Bom' : '⚠️ Precisa melhorar'}
          </p>
        </div>
      </div>

      {/* Alertas e Sugestões */}
      {(isDeficit || savingsRate < 10) && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-red-600 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-800 mb-1">Atenção!</h3>
              {isDeficit && (
                <p className="text-sm text-red-700 mb-2">
                  Suas despesas estão <strong>{formatCurrency(Math.abs(saldo))}</strong> acima dos seus proventos. 
                  É necessário reduzir gastos ou aumentar renda.
                </p>
              )}
              {!isDeficit && savingsRate < 10 && (
                <p className="text-sm text-red-700 mb-2">
                  Sua taxa de poupança está muito baixa. Tente economizar pelo menos 10-20% da sua renda.
                </p>
              )}
              <div className="text-sm text-red-600 space-y-1">
                <p>💡 <strong>Dica:</strong> Revise suas despesas não essenciais</p>
                <p>💡 <strong>Meta:</strong> Tente economizar {formatCurrency(totalProventos * 0.2)} este mês (20%)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {savingsRate >= 20 && !isDeficit && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
          <div className="flex items-start gap-3">
            <div className="text-green-600 mt-1">🎉</div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-1">Parabéns!</h3>
              <p className="text-sm text-green-700">
                Você está economizando {formatCurrency(saldo)} este mês, o que representa {savingsRate.toFixed(1)}% 
                dos seus proventos. Continue assim!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Histórico Visual */}
      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-white rounded-lg p-5 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">Histórico de Proventos (6 meses)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Proventos']} />
              <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Lista de Fontes */}
      <div className="bg-white rounded-lg p-5 shadow-md mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Fontes de Renda</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>

        {/* Formulário de Adicionar/Editar */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Salário Principal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ProventosSource['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                >
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">De quem é a renda?</label>
                <select
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                >
                  <option value="">Selecione um membro (opcional)</option>
                  {familyMembers.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.recurring}
                    onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                    className="w-4 h-4 text-emerald-500 rounded focus:ring-2 focus:ring-emerald-400"
                  />
                  <span className="text-sm text-gray-700">Receita recorrente</span>
                </label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddSource}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors text-sm font-medium"
              >
                {editingSource ? 'Atualizar' : 'Adicionar'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista de Fontes */}
        {sources.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <PiggyBank size={48} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhuma fonte de renda adicionada</p>
            <p className="text-xs mt-1">Clique em &quot;Adicionar&quot; para começar</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source) => {
              const Icon = SOURCE_ICONS[source.type];
              const colorClass = SOURCE_COLORS[source.type];
              const member = source.memberId ? familyMembers.find(m => m.id === source.memberId) : null;
              
              return (
                <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="text-white" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800">{source.name}</p>
                        {member && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <User size={12} />
                            {member.name}
                          </span>
                        )}
                        {source.recurring && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Recorrente</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{SOURCE_LABELS[source.type]}</p>
                    </div>
                    <p className="font-bold text-gray-900">{formatCurrency(source.amount)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleEditSource(source)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(source.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gráfico de Distribuição por Tipo */}
      {comparisonData.length > 0 && (
        <div className="bg-white rounded-lg p-5 shadow-md">
          <h3 className="font-semibold text-gray-800 mb-4">Distribuição por Tipo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={comparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatCurrency(v)} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Valor']} />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
