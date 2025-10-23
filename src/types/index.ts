export interface User {
  id: string;
  name: string;
  email: string;
  premium: boolean;
  admin?: boolean;
  avatar?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  budget?: number;
}

export interface Expense {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  category?: Category;
  date: Date;
  userId: string;
  recurring?: boolean;
  recurringType?: 'monthly' | 'weekly' | 'yearly';
  tags?: string[];
  // Propriedades vindas do JOIN com categories na API
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  category?: Category;
  amount: number;
  period: 'monthly' | 'yearly';
  userId: string;
  createdAt: Date;
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  userId: string;
  completed: boolean;
  createdAt: Date;
}

export interface MonthlyProjection {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  expectedExpenses: number;
  savings: number;
  categoryBreakdown: {
    categoryId: string;
    amount: number;
  }[];
}

export interface ExpenseStatistics {
  totalThisMonth: number;
  totalLastMonth: number;
  percentageChange: number;
  topCategories: {
    categoryId: string;
    amount: number;
    percentage: number;
  }[];
  dailyAverage: number;
  projectedMonthlyTotal: number;
}

// Alertas
export type BudgetAlertLevel = 'ok' | 'warning' | 'danger';

export interface BudgetAlert {
  type: 'budget';
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  usage: number; // 0..1+
  level: BudgetAlertLevel;
}

export interface SpikeAlert {
  type: 'spike';
  message: string;
  lastDayTotal: number;
  dailyAvg: number;
}

export interface BillAlert {
  type: 'bill';
  billId: string;
  description: string;
  amount: number;
  dueDate: string;
  categoryName?: string;
  color?: string;
  icon?: string;
  isOverdue: boolean;
  daysUntilDue: number;
  level: 'ok' | 'warning' | 'danger';
}

export type AlertItem = BudgetAlert | SpikeAlert | BillAlert;

// Relatórios
export interface ReportTotalsByCategory {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  total: number;
}

export interface ReportDailyTotal {
  day: string; // YYYY-MM-DD
  total: number;
}

export interface ReportMonthlyTotal {
  ym: string; // YYYY-MM
  total: number;
}

export interface ReportsResponse {
  totalsByCategory: ReportTotalsByCategory[];
  dailyTotals: ReportDailyTotal[];
  monthlyTotals: ReportMonthlyTotal[];
}