'use client';

import { useMemo, useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Plus, 
  Edit2, 
  Trash2, 
  Check,
  Loader2,
  DollarSign,
  Search
} from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  status: 'pending' | 'paid';
  paid_date?: string;
  recurring?: boolean;
  recurring_type?: string;
  notes?: string;
  created_at: string;
}


interface BillsManagerProps {
  onOpenModal: (bill?: Bill) => void;
  bills: Bill[];
  loading: boolean;
  onDelete: (id: string) => Promise<void>;
  onMarkAsPaid: (bill: Bill) => Promise<void>;
  period: { month: number; year: number };
  onPeriodChange: (period: { month: number; year: number }) => void;
}

interface BillStats {
  pending: number;
  paid: number;
  overdue: number;
}

function BilledCard({ 
  title, 
  amount, 
  icon: Icon, 
  color, 
  subtitle,
  trend 
}: { 
  title: string; 
  amount: number; 
  icon: React.ComponentType<{ size?: number; className?: string }>; 
  color: string; 
  subtitle?: string;
  trend?: number;
}) {
  const { language, currency } = useLocation();
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="text-white" size={24} />
        </div>
        {trend !== undefined && (
          <div className={`text-sm font-medium ${trend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </div>
        )}
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function BillsManager({
  onOpenModal,
  bills,
  loading,
  onDelete,
  onMarkAsPaid,
  period,
  onPeriodChange
}: BillsManagerProps) {
  const { language, currency } = useLocation();
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [submitting, setSubmitting] = useState(false);

  // Próximas contas a vencer
  const upcomingBills = useMemo(() => {
    const now = new Date();
    const filtered = bills
      .filter(b => b.status === 'pending')
      .map(b => ({
        ...b,
        daysUntilDue: Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }))
      .filter(b => b.daysUntilDue <= 7 && b.daysUntilDue >= 0)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    return filtered;
  }, [bills]);

  // Contas vencidas
  const overdueBills = useMemo(() => {
    const now = new Date();
    return bills.filter(b => {
      if (b.status === 'paid') return false;
      const daysUntilDue = Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue < 0;
    });
  }, [bills]);

  // Estatísticas
  const stats = useMemo(() => {
    const now = new Date();
    return bills.reduce((acc, bill) => {
      if (bill.status === 'paid') {
        acc.paid += bill.amount;
      } else {
        const daysUntilDue = Math.ceil((new Date(bill.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) {
          acc.overdue += bill.amount;
        } else {
          acc.pending += bill.amount;
        }
      }
      return acc;
    }, { pending: 0, paid: 0, overdue: 0 } as BillStats);
  }, [bills]);

  // Gráfico de distribuição por categoria
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, { name: string; total: number; color: string; }> = {};
    
    bills.forEach(bill => {
      const key = bill.category_id || 'uncategorized';
      if (!categoryTotals[key]) {
        categoryTotals[key] = {
          name: bill.category_name || 'Sem categoria',
          total: 0,
          color: bill.category_color || '#999999'
        };
      }
      categoryTotals[key].total += bill.amount;
    });

    return Object.values(categoryTotals)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [bills]);

  // Gráfico de tendência mensal
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { pending: number; paid: number; overdue: number; }> = {};
    
    bills.forEach(bill => {
      const date = new Date(bill.status === 'paid' ? bill.paid_date || bill.due_date : bill.due_date);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[key]) {
        months[key] = { pending: 0, paid: 0, overdue: 0 };
      }
      
      if (bill.status === 'paid') {
        months[key].paid += bill.amount;
      } else {
        const now = new Date();
        const daysUntilDue = Math.ceil((new Date(bill.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 0) {
          months[key].overdue += bill.amount;
        } else {
          months[key].pending += bill.amount;
        }
      }
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Últimos 6 meses
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString(language, { month: 'short', year: '2-digit' }),
        ...data
      }));
  }, [bills, language]);

  // Filtro de contas
  const filteredBills = useMemo(() => {
    let filtered = bills.filter(bill =>
      bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (statusFilter === 'paid') {
      filtered = filtered.filter(b => b.status === 'paid');
    } else if (statusFilter === 'pending') {
      filtered = filtered.filter(b => b.status === 'pending');
      const now = new Date();
      filtered = filtered.filter(b => {
        const daysUntilDue = Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue >= 0;
      });
    } else if (statusFilter === 'overdue') {
      filtered = filtered.filter(b => b.status === 'pending');
      const now = new Date();
      filtered = filtered.filter(b => {
        const daysUntilDue = Math.ceil((new Date(b.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilDue < 0;
      });
    }

    return filtered;
  }, [bills, searchTerm, statusFilter]);

  const handleMarkAsPaidClick = async (bill: Bill) => {
    setSubmitting(true);
    try {
      await onMarkAsPaid(bill);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;
    setSubmitting(true);
    try {
      await onDelete(id);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-600 flex items-center gap-2">
          <Loader2 className="animate-spin" /> Carregando contas...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">💳 Contas a Pagar</h1>
          <button
            onClick={() => onOpenModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus size={20} /> Nova Conta
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <BilledCard
            title="Pendentes"
            amount={stats.pending}
            icon={Clock}
            color="bg-blue-500"
            subtitle={`${bills.filter(b => b.status === 'pending' && {
              daysUntilDue: Math.ceil((new Date(b.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
            }.daysUntilDue >= 0).length} contas`}
          />
          <BilledCard
            title="Pagas"
            amount={stats.paid}
            icon={CheckCircle2}
            color="bg-green-500"
            subtitle={`${bills.filter(b => b.status === 'paid').length} contas`}
          />
          <BilledCard
            title="Vencidas"
            amount={stats.overdue}
            icon={AlertCircle}
            color="bg-red-500"
            subtitle={`${overdueBills.length} contas`}
          />
          <BilledCard
            title="Total"
            amount={stats.pending + stats.paid + stats.overdue}
            icon={DollarSign}
            color="bg-purple-500"
            subtitle={`${bills.length} contas`}
          />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar contas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <select
              value={period.month}
              onChange={e => onPeriodChange({ ...period, month: Number(e.target.value) })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString(language, { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={period.year}
              onChange={e => onPeriodChange({ ...period, year: Number(e.target.value) })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[...Array(5)].map((_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'pending' | 'paid' | 'overdue')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Pagas</option>
              <option value="overdue">Vencidas</option>
            </select>
          </div>
        </div>

        {/* Tabela de contas */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  filteredBills.map(bill => {
                    const now = new Date();
                    const daysUntilDue = Math.ceil((new Date(bill.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isOverdue = daysUntilDue < 0 && bill.status === 'pending';

                    return (
                      <tr
                        key={bill.id}
                        className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{bill.description}</div>
                          {bill.recurring && (
                            <div className="text-xs text-gray-500">🔄 Recorrente</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {bill.category_name && (
                            <div className="flex items-center gap-2">
                              <span>{bill.category_icon}</span>
                              <span className="text-sm">{bill.category_name}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatCurrency(bill.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <div>{new Date(bill.due_date).toLocaleDateString(language)}</div>
                          {bill.status === 'paid' && bill.paid_date && (
                            <div className="text-xs text-gray-500">Pagamento: {new Date(bill.paid_date).toLocaleDateString(language)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {bill.status === 'paid' ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1 w-fit">
                              <CheckCircle2 size={12} /> Paga
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center gap-1 w-fit">
                              <AlertCircle size={12} /> Vencida
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1 w-fit">
                              <Clock size={12} /> Vence em {daysUntilDue}d
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {bill.status === 'pending' && (
                              <button
                                onClick={() => handleMarkAsPaidClick(bill)}
                                disabled={submitting}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Marcar como paga"
                              >
                                <Check size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => onOpenModal(bill)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(bill.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alerta de contas vencidas */}
        {overdueBills.length > 0 && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-red-800 mb-2">⚠️ Você tem {overdueBills.length} conta(s) vencida(s)!</h3>
                <ul className="text-red-700 text-sm space-y-1">
                  {overdueBills.slice(0, 3).map(bill => (
                    <li key={bill.id}>• {bill.description} - {formatCurrency(bill.amount)}</li>
                  ))}
                  {overdueBills.length > 3 && <li>• ... e mais {overdueBills.length - 3}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Próximas a vencer */}
        {upcomingBills.length > 0 && (
          <div className="mt-8 bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg">
            <div className="flex gap-3">
              <Clock className="text-orange-600 flex-shrink-0" size={24} />
              <div>
                <h3 className="font-bold text-orange-800 mb-2">📅 Próximas contas a vencer (até 7 dias)</h3>
                <ul className="text-orange-700 text-sm space-y-1">
                  {upcomingBills.map(bill => (
                    <li key={bill.id}>
                      • {bill.description} - {formatCurrency(bill.amount)} (vence em {bill.daysUntilDue} dia{bill.daysUntilDue !== 1 ? 's' : ''})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Tendência mensal */}
          {monthlyTrend.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Tendência Mensal de Contas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyTrend} margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis width={96} tickFormatter={(v) => formatCurrency(Number(v))} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Legend />
                  <Bar dataKey="pending" fill="#84cc16" name="Pendentes" />
                  <Bar dataKey="paid" fill="#22c55e" name="Pagas" />
                  <Bar dataKey="overdue" fill="#ef4444" name="Vencidas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Distribuição por categoria */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Distribuição por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
