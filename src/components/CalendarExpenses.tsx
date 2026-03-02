'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DayExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  icon: string;
  color: string;
}

interface CalendarExpensesProps {
  expenses: Array<DayExpense & { date: string }>;
  onDateClick?: (date: string) => void;
  onExpenseClick?: (expense: DayExpense & { date: string }) => void;
  language: string;
  currency: string;
}

export default function CalendarExpenses({
  expenses,
  onDateClick,
  onExpenseClick,
  language,
  currency,
}: CalendarExpensesProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthName = new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(
    currentDate
  );

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const expensesByDate = useMemo(() => {
    const map: Record<string, (DayExpense & { date: string })[]> = {};
    expenses.forEach((expense) => {
      const dateKey = expense.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(expense);
    });
    return map;
  }, [expenses]);

  const getDayTotal = (dateKey: string) => {
    return expensesByDate[dateKey]?.reduce((sum, e) => sum + e.amount, 0) || 0;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  // Days from previous month
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), -i);
    const dateKey = prevDate.toISOString().split('T')[0];
    days.push({ date: dateKey, isCurrentMonth: false, dayNum: prevDate.getDate() });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dateKey = date.toISOString().split('T')[0];
    days.push({ date: dateKey, isCurrentMonth: true, dayNum: i });
  }

  // Days from next month
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const nextDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i);
    const dateKey = nextDate.toISOString().split('T')[0];
    days.push({ date: dateKey, isCurrentMonth: false, dayNum: i });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg text-gray-900 capitalize">{monthName}</h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(({ date, isCurrentMonth, dayNum }) => {
          const dayExpenses = expensesByDate[date] || [];
          const dayTotal = getDayTotal(date);
          const hasExpenses = dayExpenses.length > 0;

          return (
            <div
              key={date}
              className={`aspect-square flex flex-col p-1 rounded-lg border cursor-pointer transition ${
                isCurrentMonth
                  ? 'bg-white border-gray-200 hover:border-indigo-400'
                  : 'bg-gray-50 border-gray-100 opacity-50'
              } ${hasExpenses ? 'ring-2 ring-indigo-200' : ''}`}
              onClick={() => onDateClick?.(date)}
            >
              <span className="text-xs font-semibold text-gray-600">{dayNum}</span>

              {hasExpenses && (
                <div className="flex-1 flex flex-col gap-0.5 text-[10px] overflow-hidden">
                  {dayExpenses.slice(0, 2).map((exp) => (
                    <button
                      key={exp.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenseClick?.(exp);
                      }}
                      className={`text-left px-1 py-0.5 rounded text-white truncate hover:opacity-80 transition bg-opacity-70`}
                      style={{ backgroundColor: exp.color }}
                      title={exp.description}
                    >
                      {exp.icon} {formatCurrency(exp.amount)}
                    </button>
                  ))}
                  {dayExpenses.length > 2 && (
                    <div className="text-gray-500 text-[9px] px-1">
                      +{dayExpenses.length - 2} mais
                    </div>
                  )}
                </div>
              )}

              {/* Day total */}
              {hasExpenses && (
                <div className="text-[10px] font-bold text-indigo-600 mt-auto">
                  {formatCurrency(dayTotal)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
