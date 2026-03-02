import React from 'react';
import { useTranslation } from '@/lib/translations';
import { Clock, Copy, Trash2 } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  date: string;
  spentBy?: string;
}

interface RecentExpensesWidgetProps {
  expenses: Expense[];
  onDuplicate?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
  limit?: number;
  language: string;
  currency: string;
}

export default function RecentExpensesWidget({
  expenses,
  onDuplicate,
  onDelete,
  limit = 5,
  language,
  currency,
}: RecentExpensesWidgetProps) {
  const { t } = useTranslation(language);
  const recent = expenses.slice(0, limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={20} className="text-indigo-600" />
        <h3 className="font-bold text-lg text-gray-800">Adicionadas Recentemente</h3>
      </div>

      {recent.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">Nenhuma despesa recente</p>
      ) : (
        <div className="space-y-2">
          {recent.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">{expense.categoryIcon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(expense.date)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900">
                  {formatCurrency(expense.amount)}
                </span>
                <div className="flex gap-1">
                  {onDuplicate && (
                    <button
                      onClick={() => onDuplicate(expense)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition"
                      title="Duplicar"
                    >
                      <Copy size={14} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(expense.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition"
                      title="Deletar"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
