 "use client";
import { PiggyBank } from 'lucide-react';


import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Expense } from '@/types';

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

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function BillsPage() {

  // --- Lógica dos proventos (deve vir após period, totalPending, totalPaid, totalOverdue) ---
  // Esta lógica deve ser inserida após a declaração dos totais, mais abaixo no componente.

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { currency, language } = useLocation();

  const [bills, setBills] = useState<Bill[]>([]);
  const [futureExpenses, setFutureExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'bills' | 'expenses'>('all');
  const [period, setPeriod] = useState<{ month: number; year: number }>({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    categoryId: '',
    status: 'pending' as 'pending' | 'paid',
    paidDate: '',
    recurring: false,
    recurringType: '',
    notes: ''
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills?status=${statusFilter}&month=${period.month}&year=${period.year}`);
      if (response.ok) {
        const data = await response.json();
        setBills(data);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        // O endpoint retorna { categories: [...] }
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBills();
      fetchCategories();
      fetchFutureExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, statusFilter, period]);
  const fetchFutureExpenses = async () => {
    try {
      const response = await fetch(`/api/expenses/future?month=${period.month}&year=${period.year}`);
      if (response.ok) {
        const data = await response.json();
        setFutureExpenses(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching future expenses:', error);
      setFutureExpenses([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.dueDate) return;

    setSubmitting(true);
    try {
      const payload = {
        id: editingBill?.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        categoryId: formData.categoryId || null,
        status: formData.status,
        paidDate: formData.status === 'paid' ? (formData.paidDate || new Date().toISOString()) : null,
        recurring: formData.recurring,
        recurringType: formData.recurring ? formData.recurringType : null,
        notes: formData.notes
      };

      const method = editingBill ? 'PUT' : 'POST';
      const response = await fetch('/api/bills', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchBills();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return;

    try {
      const response = await fetch(`/api/bills?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchBills();
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bill,
          status: 'paid',
          paidDate: new Date().toISOString()
        })
      });

      if (response.ok) {
        await fetchBills();
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Marcar despesa (linha do tipo 'expense') como paga criando uma conta paga correspondente
  type ExpenseRow = Expense & { _type: 'expense'; category_id?: string; recurring_type?: string };
  const handlePayExpense = async (expense: ExpenseRow) => {
    setSubmitting(true);
    try {
      const expenseCategoryId = expense.category_id ?? expense.categoryId ?? null;
      const expenseRecurringType = expense.recurring_type ?? expense.recurringType ?? null;
      // 1) Criar conta com os dados da despesa (inicia como pendente no POST)
      const createRes = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expense.description,
          amount: expense.amount,
          dueDate: String(expense.date),
          categoryId: expenseCategoryId,
          recurring: !!expense.recurring,
          recurringType: expenseRecurringType,
          notes: `orig:expense:${expense.id}`
        })
      });
      if (!createRes.ok) throw new Error('Falha ao criar conta para marcar pagamento');
      const created = await createRes.json();

      // 2) Atualizar para status 'paid'
      const updateRes = await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: created.id,
          description: created.description || expense.description,
          amount: created.amount || expense.amount,
          dueDate: created.due_date || String(expense.date),
          categoryId: created.category_id || expenseCategoryId,
          status: 'paid',
          paidDate: new Date().toISOString(),
          recurring: created.recurring ?? !!expense.recurring,
          recurringType: created.recurring_type || expenseRecurringType,
          notes: created.notes || undefined
        })
      });
      if (!updateRes.ok) throw new Error('Falha ao marcar como paga');

      await fetchBills();
    } catch (err) {
      console.error('Erro ao marcar despesa como paga:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Converter despesa em conta (pendente)
  const handleConvertExpense = async (expense: ExpenseRow) => {
    setSubmitting(true);
    try {
      const categoryId = expense.category_id ?? expense.categoryId ?? null;
      const recurringType = expense.recurring_type ?? expense.recurringType ?? null;
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: expense.description,
          amount: expense.amount,
          dueDate: String(expense.date),
          categoryId,
          recurring: !!expense.recurring,
          recurringType,
          notes: `orig:expense:${expense.id}`
        })
      });
      if (!res.ok) throw new Error('Falha ao converter despesa em conta');
      await fetchBills();
    } catch (err) {
      console.error('Erro ao converter despesa em conta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (bill?: Bill) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        description: bill.description,
        amount: bill.amount.toString(),
        dueDate: new Date(bill.due_date).toISOString().slice(0, 10),
        categoryId: bill.category_id || '',
        status: bill.status,
        paidDate: bill.paid_date ? new Date(bill.paid_date).toISOString().slice(0, 10) : '',
        recurring: bill.recurring || false,
        recurringType: bill.recurring_type || '',
        notes: bill.notes || ''
      });
    } else {
      setEditingBill(null);
      setFormData({
        description: '',
        amount: '',
        dueDate: '',
        categoryId: '',
        status: 'pending',
        paidDate: '',
        recurring: false,
        recurringType: '',
        notes: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBill(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(language);
  };

  const getDaysUntilDue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getBillStatusColor = (bill: Bill) => {
    if (bill.status === 'paid') return 'text-green-600';
    const days = getDaysUntilDue(bill.due_date);
    if (days < 0) return 'text-red-600';
    if (days <= 3) return 'text-orange-600';
    return 'text-gray-600';
  };

  const getBillStatusBadge = (bill: Bill) => {
    if (bill.status === 'paid') {
      return <span title="Conta já paga" className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1"><CheckCircle2 size={12} /> Paga</span>;
    }
    const days = getDaysUntilDue(bill.due_date);
    if (days < 0) {
      return <span title="Conta vencida" className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center gap-1"><AlertCircle size={12} /> Vencida</span>;
    }
    if (days <= 3) {
      return <span title="Conta próxima do vencimento" className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1"><Clock size={12} /> Vence em {days}d</span>;
    }
    return <span title="Conta com vencimento futuro" className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1"><Clock size={12} /> Vence em {days}d</span>;
  };

  // Badge para despesas (sem status de pago, apenas vencimento)
  const getExpenseStatusBadge = (expense: Expense & { _type: 'expense' }) => {
    const days = getDaysUntilDue(String(expense.date));
    if (days < 0) {
      return <span title="Despesa vencida" className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full flex items-center gap-1"><AlertCircle size={12} /> Vencida</span>;
    }
    if (days <= 3) {
      return <span title="Despesa próxima do vencimento" className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full flex items-center gap-1"><Clock size={12} /> Vence em {days}d</span>;
    }
    return <span title="Despesa com vencimento futuro" className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full flex items-center gap-1"><Clock size={12} /> Vence em {days}d</span>;
  };

  const translateRecurring = (value?: string) => {
    if (!value) return null;
    switch (value) {
      case 'monthly': return 'Mensal';
      case 'weekly': return 'Semanal';
      case 'yearly': return 'Anual';
      default: return null;
    }
  };

  // Filtro combinado
  const filteredBills = bills.filter(bill => 
    bill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  // Exclude future expenses that have already been converted to bills
  const convertedExpenseIds = new Set(
    bills
      .filter(bill => bill.notes && bill.notes.startsWith('orig:expense:'))
      .map(bill => bill.notes?.replace('orig:expense:', ''))
  );
  const filteredExpenses = futureExpenses
    .filter(exp => !convertedExpenseIds.has(String(exp.id)))
    .filter(exp => 
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  type CombinedRow = (Bill & { _type: 'bill' }) | (Expense & { _type: 'expense' });
  const isBill = (row: CombinedRow): row is Bill & { _type: 'bill' } => row._type === 'bill';
  const isExpense = (row: CombinedRow): row is Expense & { _type: 'expense' } => row._type === 'expense';
  let combinedRows: CombinedRow[] = [];
  if (typeFilter === 'all') {
    combinedRows = [
      ...filteredBills.map(b => ({ ...b, _type: 'bill' as const })),
      ...filteredExpenses.map(e => ({ ...e, _type: 'expense' as const }))
    ].sort((a, b) => {
      const aDate = isBill(a) ? a.due_date : a.date as unknown as string;
      const bDate = isBill(b) ? b.due_date : b.date as unknown as string;
      return new Date(aDate).getTime() - new Date(bDate).getTime();
    });
  } else if (typeFilter === 'bills') {
    combinedRows = filteredBills.map(b => ({ ...b, _type: 'bill' as const }));
  } else {
    combinedRows = filteredExpenses.map(e => ({ ...e, _type: 'expense' as const }));
  }

  // Totais com base no que está sendo exibido (respeita Type Filter e busca)
  const totals = combinedRows.reduce(
    (acc, row) => {
      if (isBill(row)) {
        if (row.status === 'paid') {
          acc.paid += row.amount;
        } else {
          const days = getDaysUntilDue(row.due_date);
          if (days < 0) acc.overdue += row.amount; else acc.pending += row.amount;
        }
      } else {
        const days = getDaysUntilDue(String(row.date));
        if (days < 0) acc.overdue += row.amount; else acc.pending += row.amount;
      }
      return acc;
    },
    { pending: 0, paid: 0, overdue: 0 }
  );
  const totalPending = totals.pending;
  const totalPaid = totals.paid;
  const totalOverdue = totals.overdue;

  // --- Lógica dos proventos ---
  function getProventosKey(month: number, year: number) {
    return `proventos_${year}_${month}`;
  }
  const [proventos, setProventos] = useState<number>(0);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(getProventosKey(period.month, period.year));
      setProventos(saved ? Number(saved) : 0);
    }
  }, [period.month, period.year]);
  const handleProventosChange = (val: number) => {
    setProventos(val);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getProventosKey(period.month, period.year), String(val));
    }
  };
  // Saldo = proventos - total do mês
  const totalMes = totalPending + totalPaid + totalOverdue;
  const saldo = proventos - totalMes;
  const saldoNegativo = saldo < 0;
  const saldoAlerta = saldo < 500;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Títulos dinâmicos dos cartões de resumo conforme o filtro de tipo
  const titles = (() => {
    if (typeFilter === 'bills') {
      return {
        pending: 'Contas Pendentes',
        paid: 'Contas Pagas',
        overdue: 'Contas Vencidas'
      };
    }
    // Para 'all' e 'expenses', usar linguagem neutra e indicar que Pagas são apenas contas
    return {
      pending: 'Pendentes',
      paid: 'Pagas (contas)',
      overdue: 'Vencidas'
    };
  })();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Card de Proventos */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500">
                <PiggyBank className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 mb-1">Proventos ({new Date(period.year, period.month-1).toLocaleString(language, { month: 'long', year: 'numeric' })})</h2>
                <p className="text-gray-500 text-sm">Informe o total de proventos (salário, renda, etc) para o mês selecionado.</p>
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
                  <span>Você está gastando demais! Não pode gastar mais este mês. Saldo {formatCurrency(saldo)} será prejudicado seu orçamento.</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">💳 Contas a Pagar</h1>
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 cursor-pointer"
          >
            <Plus size={20} /> Nova Conta
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{titles.pending}</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{titles.paid}</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <CheckCircle2 className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{titles.overdue}</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
              </div>
              <AlertCircle className="text-red-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total do Mês</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalPending + totalPaid + totalOverdue)}</p>
                <p className="text-xs text-gray-500 mt-1">{new Date(period.year, period.month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
              </div>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="32" 
                height="32" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-purple-600"
              >
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar contas/despesas..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <select
                value={period.month}
                onChange={e => setPeriod(p => ({ ...p, month: Number(e.target.value) }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mr-2"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString(language, { month: 'long' })}</option>
                ))}
              </select>
              <select
                value={period.year}
                onChange={e => setPeriod(p => ({ ...p, year: Number(e.target.value) }))}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[...Array(5)].map((_, i) => (
                  <option key={i} value={new Date().getFullYear() - 2 + i}>{new Date().getFullYear() - 2 + i}</option>
                ))}
              </select>
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as 'all' | 'bills' | 'expenses')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Contas e Despesas Futuras</option>
              <option value="bills">Só Contas</option>
              <option value="expenses">Só Despesas Futuras</option>
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

        {/* Lista combinada de contas e despesas futuras */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vencimento/Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {combinedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma conta ou despesa futura encontrada
                    </td>
                  </tr>
                ) : (
                  combinedRows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{row.description}</div>
                        {isBill(row) && row.recurring && translateRecurring(row.recurring_type) && (
                          <div className="text-xs text-gray-500">🔄 Recorrente ({translateRecurring(row.recurring_type)})</div>
                        )}
                        {!isBill(row) && row.recurring && translateRecurring(row.recurringType) && (
                          <div className="text-xs text-gray-500">🔄 Recorrente ({translateRecurring(row.recurringType)})</div>
                        )}
                        {isExpense(row) && <div className="text-xs text-blue-500">Despesa</div>}
                        {isBill(row) && <div className="text-xs text-purple-500">Conta</div>}
                      </td>
                      <td className="px-6 py-4">
                        {row.category_name && (
                          <div className="flex items-center gap-2">
                            <span>{row.category_icon}</span>
                            <span className="text-sm">{row.category_name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isBill(row) ? getBillStatusColor(row) : 'text-blue-600'}`}>
                          {formatCurrency(row.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {isBill(row) ? (
                          row.status === 'paid' && row.paid_date
                            ? `Pagamento: ${formatDate(row.paid_date)}`
                            : formatDate(row.due_date)
                        ) : (
                          formatDate(String(row.date))
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isBill(row) ? getBillStatusBadge(row) : getExpenseStatusBadge(row)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isBill(row) && typeFilter !== 'expenses' && row.status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsPaid(row)}
                              disabled={submitting}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              title="Marcar como paga"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {isBill(row) && typeFilter !== 'expenses' && (
                            <button
                              onClick={() => openModal(row)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          {isBill(row) && typeFilter !== 'expenses' && (
                            <button
                              onClick={() => handleDelete(row.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                          {!isBill(row) && typeFilter !== 'bills' && (
                            <button
                              onClick={() => handlePayExpense(row)}
                              disabled={submitting}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              title="Marcar como paga"
                            >
                              <Check size={18} />
                            </button>
                          )}
                          {!isBill(row) && typeFilter !== 'bills' && (
                            <button
                              onClick={() => handleConvertExpense(row)}
                              disabled={submitting}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                              title="Converter para Conta (pendente)"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBill ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                    <select
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Paga</option>
                    </select>
                  </div>
                </div>

                {formData.status === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
                    <input
                      type="date"
                      value={formData.paidDate}
                      onChange={e => setFormData({ ...formData, paidDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.recurring}
                      onChange={e => setFormData({ ...formData, recurring: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Conta recorrente</span>
                  </label>
                </div>

                {formData.recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Recorrência</label>
                    <select
                      value={formData.recurringType}
                      onChange={e => setFormData({ ...formData, recurringType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Salvando...
                      </>
                    ) : (
                      editingBill ? 'Atualizar' : 'Criar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
