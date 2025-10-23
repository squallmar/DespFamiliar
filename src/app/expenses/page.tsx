'use client';

import { useState } from 'react';
import { useExpenses, useCategories } from '@/hooks/useData';
import { useLocation } from '@/contexts/LocationContext';
import translations from '@/lib/translations';
import { Expense } from '@/types';
import { Edit, Trash2, Plus, Search, Filter, Loader2 } from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';

type ExpenseInput = Omit<Partial<Expense>, 'date'> & { date?: string | Date };

interface ExpenseFormProps {
  expense?: Expense;
  categories: Array<{ id: string; name: string; icon: string }>;
  onSave: (expense: ExpenseInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function ExpenseForm({ expense, categories, onSave, onCancel, loading }: ExpenseFormProps) {
  const toYMD = (d: Date | string) => {
    const dt = typeof d === 'string' ? new Date(d) : d;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const [formData, setFormData] = useState({
    amount: expense?.amount?.toString() || '',
    description: expense?.description || '',
    categoryId: expense?.categoryId || '',
    date: expense?.date ? toYMD(expense.date as unknown as Date) : toYMD(new Date()),
    recurring: expense?.recurring || false,
    recurringType: expense?.recurringType || 'monthly'
  });
  const { language } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const categoriesMap = (t?.categories ?? {}) as Record<string, string>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description || !formData.categoryId) {
      console.error('Campos faltando:', { 
        amount: formData.amount, 
        description: formData.description, 
        categoryId: formData.categoryId 
      });
      return;
    }

    await onSave({
      ...expense,
      amount: parseFloat(formData.amount),
      description: formData.description,
      categoryId: formData.categoryId,
      date: formData.date, // envia YYYY-MM-DD para evitar fuso
      recurring: formData.recurring,
      recurringType: formData.recurring ? formData.recurringType as 'monthly' | 'weekly' | 'yearly' : undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {expense ? t.editExpense : t.newExpense}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.value}</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.description}</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            >
              <option value="">{t.category}</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {categoriesMap[cat.name] || cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t.date}</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.recurring}
              onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
              className="mr-2"
              disabled={loading}
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">{t.recurring}</label>
          </div>
          {formData.recurring && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.recurrenceType}</label>
              <select
                value={formData.recurringType}
                onChange={(e) => setFormData({ ...formData, recurringType: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
                <option value="yearly">{t.yearly}</option>
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 cursor-pointer"
              disabled={loading}
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || !formData.description || !formData.categoryId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.saving || 'Salvando...'}
                </>
              ) : (
                t.save
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  // Seletor de período (mês/ano) - precisa vir antes do useExpenses
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const { expenses, loading, error, createExpense, updateExpense, deleteExpense, refetch } = useExpenses(selectedYear, selectedMonth);
  const { categories, loading: categoriesLoading } = useCategories();
  const { language, currency } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const categoriesMap = (t?.categories ?? {}) as Record<string, string>;
  const formatCurrency = (value: number) => new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || expense.categoryId === filterCategory;
    return matchesSearch && matchesCategory;
  }).slice().reverse();

  // Agrupar despesas por categoria
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const categoryName = expense.category_name || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = {
        expenses: [],
        total: 0,
        icon: expense.category_icon || '📦',
        color: expense.category_color || '#5F27CD'
      };
    }
    acc[categoryName].expenses.push(expense);
    acc[categoryName].total += expense.amount;
    return acc;
  }, {} as Record<string, { expenses: typeof filteredExpenses; total: number; icon: string; color: string }>);

  const handleSave = async (expenseData: ExpenseInput) => {
    setActionLoading(true);
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, expenseData);
      } else {
        await createExpense({
          amount: expenseData.amount!,
          description: expenseData.description!,
          categoryId: expenseData.categoryId!,
          date: expenseData.date!,
          recurring: expenseData.recurring,
          recurringType: expenseData.recurringType
        });
      }
      setEditingExpense(null);
      setShowForm(false);
      refetch(selectedYear, selectedMonth);
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t.confirmDeleteExpense)) {
      setActionLoading(true);
      try {
        await deleteExpense(id);
        refetch(selectedYear, selectedMonth);
      } catch (error) {
        console.error('Erro ao excluir despesa:', error);
      } finally {
        setActionLoading(false);
      }
    }
  };

  if (loading || categoriesLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t.loadingExpenses}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{t.error}: {error}</p>
          <button 
            onClick={() => refetch(selectedYear, selectedMonth)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
          >
            {t.tryAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">{t.manageExpenses}</h1>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t.newExpense}
            </button>
          </div>

          {/* Seletor de Período */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex gap-4 items-center flex-wrap">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar text-blue-600" aria-hidden="true"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path></svg>
              <span className="text-sm font-medium text-gray-700">Período:</span>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t.allCategories}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {categoriesMap[cat.name] || cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="groupByCategory"
                  checked={groupByCategory}
                  onChange={(e) => setGroupByCategory(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="groupByCategory" className="text-sm font-medium text-gray-700 cursor-pointer">
                  {language === 'en-US' ? 'Group by category' : language === 'es-ES' ? 'Agrupar por categoría' : 'Agrupar por categoria'}
                </label>
              </div>
            </div>
          </div>

        {/* Lista de Despesas */}
        <div className="bg-white rounded-lg shadow-md">
          {filteredExpenses.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">{expenses.length === 0 ? t.noExpensesYet : t.noExpensesFilters}</p>
            </div>
          ) : groupByCategory ? (
            // Visualização agrupada por categoria
            <div className="p-6 space-y-6">
              {Object.entries(groupedExpenses).map(([categoryName, { expenses: categoryExpenses, total, icon }]) => (
                <div key={categoryName} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-b">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icon}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {categoriesMap[categoryName] || categoryName}
                      </h3>
                      <span className="text-sm text-gray-500">({categoryExpenses.length})</span>
                    </div>
                    <div className="text-lg font-bold text-red-600">
                      {formatCurrency(total)}
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {categoryExpenses.map((expense) => (
                      <div key={expense.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{expense.description}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-4 mt-1">
                            <span>{new Date(expense.date).toLocaleDateString(language)}</span>
                            {expense.recurring && (
                              <span className="text-blue-600">
                                {t.recurring}
                                {(typeof expense.recurringType === 'string' && ['weekly','monthly','yearly'].includes(expense.recurringType))
                                  ? ` (${t[expense.recurringType as 'weekly'|'monthly'|'yearly']})` : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingExpense(expense);
                                setShowForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 cursor-pointer"
                              disabled={actionLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="p-4 text-center bg-blue-50 border-b border-blue-100 text-blue-800 text-sm">
                {t.groupByCategorySuggestion}
              </div>
              {/* Visualização em tabela normal */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.description}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.category}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.value}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.date}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t.actions}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredExpenses.map((expense) => (
                      <tr key={expense.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{expense.description}</div>
                            {expense.recurring && (
                              <div className="text-xs text-blue-600">
                                {t.recurring}
                                {(typeof expense.recurringType === 'string' && ['weekly','monthly','yearly'].includes(expense.recurringType))
                                  ? ` (${t[expense.recurringType as 'weekly'|'monthly'|'yearly']})` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">{expense.category_icon}</span>
                            <span className="text-sm text-gray-900">{categoriesMap[expense.category_name || ''] || expense.category_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-red-600">{formatCurrency(expense.amount)}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(expense.date).toLocaleDateString(language)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setEditingExpense(expense);
                                setShowForm(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 cursor-pointer"
                              disabled={actionLoading}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-600 hover:text-red-900 cursor-pointer"
                              disabled={actionLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal do Formulário */}
        {showForm && (
          <ExpenseForm
            expense={editingExpense || undefined}
            categories={categories}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingExpense(null);
            }}
            loading={actionLoading}
          />
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}