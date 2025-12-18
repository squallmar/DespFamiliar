
'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useLocation } from '@/contexts/LocationContext';
import { useTranslation } from '@/lib/translations';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import PaywallModal from '@/components/PaywallModal';
import type { ReportsResponse, AlertItem } from '@/types';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';

type SummaryResponse = {
  period: 'week' | 'month';
  from: string;
  to: string;
  total: number;
  topCategories: { name: string; icon: string; total: number }[];
  daily: { day: string; total: number }[];
  alerts: AlertItem[];
};

// ...existing code...

export default function ReportsPage() {
  const { currency, language, loading: locationLoading } = useLocation();
  const { t } = useTranslation(language);
  const { achievements, isLoading: loadingAchievements } = useAchievements();
  let { user } = useAuth();
  // Admin é sempre premium
  if (user && user.admin && !user.premium) {
    user = { ...user, premium: true };
  }
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  // Função para abrir paywall se não for premium
  const requirePremium = (action: () => void) => {
    if (user && user.premium) {
      action();
    } else {
      setPaywallOpen(true);
    }
  };

  // Upgrade Stripe
  const handleUpgrade = async () => {
    const res = await fetch('/api/premium/checkout', { method: 'POST' });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Erro ao iniciar checkout');
    }
  };

  const handleOpenCoupon = () => setCouponOpen(true);

  const handleRedeemCoupon = async () => {
    if (!couponCode) return;
    try {
      setRedeeming(true);
      const res = await fetch('/api/premium/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: couponCode.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao resgatar cupom');
      alert('Cupom aplicado! Você é premium por 1 ano.');
      setCouponOpen(false);
      setCouponCode('');
      // refresh auth
      await fetch('/api/auth/me', { credentials: 'include' });
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro');
    } finally {
      setRedeeming(false);
    }
  };

  // Pix manual
  const handlePix = () => {
    window.open('https://api.whatsapp.com/send?phone=SEU_NUMERO_PIX&text=Quero%20assinar%20o%20premium%20por%20R$20%20via%20Pix', '_blank');
  };
  // Função para importar extrato bancário
  const handleImportBank = async (e: React.ChangeEvent<HTMLInputElement>) => {
    requirePremium(async () => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setDownloading(true);
        const text = await file.text();
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'text/csv' },
          credentials: 'include',
          body: text,
        });
        if (!res.ok) throw new Error('Falha ao importar extrato');
        alert('Extrato importado com sucesso!');
        window.location.reload();
      } catch {
        alert('Erro ao importar extrato');
      } finally {
        setDownloading(false);
      }
    });
  };

  // Função para backup
  const handleBackup = async () => {
    requirePremium(async () => {
      try {
        setDownloading(true);
        const res = await fetch('/api/backup', { credentials: 'include' });
        if (!res.ok) throw new Error('Falha ao exportar backup');
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `backup-despesas-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(a.href);
      } catch {
        alert('Erro ao exportar backup');
      } finally {
        setDownloading(false);
      }
    });
  };

  // Função para restaurar backup
  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setDownloading(true);
      const text = await file.text();
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: text,
      });
      if (!res.ok) throw new Error('Falha ao importar backup');
      alert('Backup restaurado com sucesso!');
      window.location.reload();
    } catch {
      alert('Erro ao importar backup');
    } finally {
      setDownloading(false);
    }
  };
  // Resumo (deve estar dentro do componente)
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month'>('month');
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setSummaryLoading(true);
        setSummaryError(null);
        const params = new URLSearchParams({ period: summaryPeriod });
        const res = await fetch(`/api/reports/summary?${params.toString()}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Falha ao carregar resumo');
        setSummary(json);
      } catch (e) {
        setSummaryError(e instanceof Error ? e.message : 'Erro desconhecido');
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [summaryPeriod]);

  // ...restante do componente ReportsPage...
  const [from, setFrom] = useState<string>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0,10));
  const [downloading, setDownloading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportsResponse | null>(null);

  // Proventos (renda) local state (saved to localStorage per-user+month)
  const getCurrentMonthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`;
  const [proventosMonth, setProventosMonth] = useState<string>(() => getCurrentMonthKey(new Date()));
  const [proventosInput, setProventosInput] = useState<string>('');
  const [proventosValue, setProventosValue] = useState<number>(0);
  const [proventosSource, setProventosSource] = useState<string>('Salário');
  const [proventosNotes, setProventosNotes] = useState<string>('');
  const [proventosRecurring, setProventosRecurring] = useState<boolean>(false);
  const [proventosRecurringType, setProventosRecurringType] = useState<'monthly'|'yearly'|'none'>('monthly');

  const loadProventos = (monthKey?: string) => {
    try {
      // Prefer server-stored incomes if user is authenticated
      const keyMonth = monthKey || proventosMonth;
      if (user && user.id) {
        fetch(`/api/incomes?month=${keyMonth}`, { credentials: 'include' })
          .then(res => res.json())
          .then(json => {
            if (json.items && json.items.length > 0) {
              const item = json.items[0];
              const amount = Number(item.amount) || 0;
              setProventosValue(amount);
              setProventosInput(String(amount));
              setProventosSource(item.source || 'Salário');
              setProventosNotes(item.notes || '');
              setProventosRecurring(Boolean(item.recurring));
              setProventosRecurringType(item.recurring_type || 'monthly');
            } else {
              // fallback to localStorage
              const userId = user.id || 'anon';
              const key = `proventos:${userId}:${keyMonth}`;
              const raw = localStorage.getItem(key);
              if (raw) {
                try {
                  const parsed = JSON.parse(raw);
                  const num = Number(parsed.amount ?? parsed);
                  setProventosValue(Number.isFinite(num) ? num : 0);
                  setProventosInput(String(num || ''));
                  setProventosSource(parsed.source || 'Salário');
                  setProventosNotes(parsed.notes || '');
                  setProventosRecurring(Boolean(parsed.recurring));
                  setProventosRecurringType(parsed.recurring_type || 'monthly');
                } catch {
                  const num = Number(raw);
                  setProventosValue(Number.isFinite(num) ? num : 0);
                  setProventosInput(String(num));
                  setProventosSource('Salário');
                  setProventosNotes('');
                  setProventosRecurring(false);
                  setProventosRecurringType('monthly');
                }
              } else {
                setProventosValue(0);
                setProventosInput('');
                setProventosSource('Salário');
                setProventosNotes('');
                setProventosRecurring(false);
                setProventosRecurringType('monthly');
              }
            }
          })
          .catch(() => {
            setProventosValue(0);
            setProventosInput('');
            setProventosSource('Salário');
            setProventosNotes('');
            setProventosRecurring(false);
            setProventosRecurringType('monthly');
          });
        return;
      }
      // Anonymous: use localStorage
      const userId = user?.id || 'anon';
      const key = `proventos:${userId}:${keyMonth}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const num = Number(raw);
        setProventosValue(Number.isFinite(num) ? num : 0);
        setProventosInput(String(num));
      } else {
        setProventosValue(0);
        setProventosInput('');
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') loadProventos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proventosMonth, user]);

  const saveProventos = (value: number, monthKey = proventosMonth) => {
    try {
      if (user && user.id) {
        // Try to POST or PUT via API
        (async () => {
          try {
            // check existing
            const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
            const json = await res.json();
            if (res.ok && json.items && json.items.length > 0) {
              const item = json.items[0];
              const putRes = await fetch('/api/incomes', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: item.id, month: monthKey, amount: value, source: proventosSource, notes: proventosNotes, recurring: proventosRecurring, recurring_type: proventosRecurringType }) });
              if (!putRes.ok) throw new Error('Erro ao atualizar proventos');
            } else {
              const postRes = await fetch('/api/incomes', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: monthKey, amount: value, source: proventosSource, notes: proventosNotes, recurring: proventosRecurring, recurring_type: proventosRecurringType }) });
              if (!postRes.ok) throw new Error('Erro ao criar proventos');
            }
            setProventosValue(value);
            setProventosInput(String(value));
            alert('Proventos salvos.');
          } catch (e) {
            alert(e instanceof Error ? e.message : 'Erro ao salvar no servidor');
          }
        })();
        return;
      }
      // fallback local
      const userId = user?.id || 'anon';
      const key = `proventos:${userId}:${monthKey}`;
      const payload = { amount: value, source: proventosSource, notes: proventosNotes, recurring: proventosRecurring, recurring_type: proventosRecurringType };
      localStorage.setItem(key, JSON.stringify(payload));
      setProventosValue(value);
      setProventosInput(String(value));
      alert('Proventos salvos.');
    } catch (e) {
      alert('Erro ao salvar proventos.');
    }
  };

  const clearProventos = (monthKey = proventosMonth) => {
    try {
      if (user && user.id) {
        // delete from server if exists
        (async () => {
          try {
            const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
            const json = await res.json();
            if (res.ok && json.items && json.items.length > 0) {
              const id = json.items[0].id;
              await fetch(`/api/incomes?id=${id}`, { method: 'DELETE', credentials: 'include' });
            }
            // also clear local fallback
            const userId = user.id || 'anon';
            const key = `proventos:${userId}:${monthKey}`;
            localStorage.removeItem(key);
            setProventosValue(0);
            setProventosInput('');
            alert('Proventos removidos.');
          } catch {
            alert('Erro ao remover proventos.');
          }
        })();
        return;
      }
      const userId = user?.id || 'anon';
      const key = `proventos:${userId}:${monthKey}`;
      localStorage.removeItem(key);
      setProventosValue(0);
      setProventosInput('');
      alert('Proventos removidos.');
    } catch {
      // ignore
    }
  };

  // Fetch history for last 6 months for sparkline
  const [incomeHistory, setIncomeHistory] = useState<{ month: string; total: number }[]>([]);
  useEffect(() => {
    if (!user || !user.id) return;
    (async () => {
      try {
        const res = await fetch('/api/incomes', { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.history) {
          // history comes ordered desc; take last 6 and reverse for chart
          const rows = json.history.map((r: any) => ({ month: r.month, total: Number(r.total) }));
          const last6 = rows.slice(0, 12).reverse();
          setIncomeHistory(last6);
        }
      } catch (e) {
        // ignore
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  // Helper para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language, { style: 'currency', currency }).format(value);
  };
  // Helper para formatar data
  const formatDate = (date: string | Date) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    // Garantir que o language seja válido, senão usar en-US como fallback
    const locale = language && language.length > 0 ? language : 'en-US';
    return new Date(date).toLocaleDateString(locale, options);
  };
  
  // Helper para obter placeholder de data baseado no idioma
  const getDatePlaceholder = () => {
    switch (language) {
      case 'en-US':
        return 'MM/DD/YYYY';
      case 'es-ES':
        return 'DD/MM/YYYY';
      case 'pt-BR':
      default:
        return 'DD/MM/AAAA';
    }
  };

  // Helper para traduzir nomes de categorias
  const translateCategory = useCallback((categoryName: string) => {
    return t(`categories.${categoryName}`, categoryName);
  }, [t]);  type PieDatum = { name: string; total: number; color: string; categoryId: string };
  type SeriesDatum = { [key: string]: number | string };

  const pieData = useMemo<PieDatum[]>(() => {
    if (!data) return [];
    return data.totalsByCategory
      .filter((c) => Number(c.total) > 0)
      .map((c) => ({ name: translateCategory(c.name), total: Number(c.total), color: c.color, categoryId: c.categoryId }));
  }, [data, translateCategory]);

  const pieDataForChart = useMemo<SeriesDatum[]>(() => pieData as unknown as SeriesDatum[], [pieData]);

  const dailyData = useMemo(() => {
    if (!data) return [] as { day: string; total: number }[];
    return data.dailyTotals.map((d) => ({ day: d.day, total: Number(d.total) }));
  }, [data]);
  const dailyDataForChart = useMemo<SeriesDatum[]>(() => dailyData as unknown as SeriesDatum[], [dailyData]);

  const monthlyData = useMemo(() => {
    if (!data) return [] as { ym: string; total: number }[];
    return data.monthlyTotals.map((m) => ({ ym: m.ym, total: Number(m.total) }));
  }, [data]);
  const monthlyDataForChart = useMemo<SeriesDatum[]>(() => monthlyData as unknown as SeriesDatum[], [monthlyData]);


  // ...existing code...

  const handleDownload = async (type: 'csv' | 'excel' | 'pdf') => {
    requirePremium(async () => {
      try {
        setDownloading(true);
        const params = new URLSearchParams({ from, to, type });
        const url = `/api/export?${params.toString()}`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Falha ao exportar');
        }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = `export-despesas-${from}_a_${to}.${type === 'excel' ? 'xlsx' : type}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(a.href);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : 'Erro desconhecido ao exportar');
      } finally {
        setDownloading(false);
      }
    });
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({ from, to });
        const res = await fetch(`/api/reports?${params.toString()}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || 'Falha ao carregar relatórios');
        }
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [from, to]);

  if (locationLoading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>{t('loadingLocation')}</span>
        </div>
      </div>
    );
  }
  return (
    <ProtectedRoute>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('reportsTitle')}</h1>



          <div className="bg-white rounded-lg shadow p-4 mb-6">
            {/* Painel de Resumo */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">{t('summaryPeriod')}
                <select
                  className="ml-2 border rounded px-2 py-1 text-base"
                  value={summaryPeriod}
                  onChange={e => setSummaryPeriod(e.target.value as 'week' | 'month')}
                  disabled={summaryLoading}
                >
                  <option value="week">{t('week')}</option>
                  <option value="month">{t('month')}</option>
                </select>
              </h2>
              {summaryLoading && <div className="text-gray-600 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('loadingSummary')}</div>}
              {summaryError && <div className="text-red-600">{summaryError}</div>}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 rounded p-4 flex flex-col items-center">
                    <div className="text-2xl font-bold text-indigo-700">{formatCurrency(Number(summary.total))}</div>
                    <div className="text-sm text-gray-700">{t('totalExpenses')}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(summary.from)} {t('dateTo')} {formatDate(summary.to)}</div>
                  </div>
                  <div className="bg-green-50 rounded p-4">
                    <div className="font-semibold text-green-700 mb-1">{t('topCategories')}</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {summary.topCategories.length === 0 && <li>{t('noCategories')}</li>}
                      {summary.topCategories.map((cat) => (
                        <li key={cat.name} className="flex items-center gap-2">
                          <span>{cat.icon}</span> <span>{translateCategory(cat.name)}</span> <span className="ml-auto font-bold">{formatCurrency(Number(cat.total))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-yellow-50 rounded p-4">
                    <div className="font-semibold text-yellow-700 mb-1">{t('alertsSection')}</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {summary.alerts.length === 0 && <li>{t('noAlerts')}</li>}

                      {/* Remove duplicate bill alerts by unique key */}
                      {(() => {
                        const seen = new Set();

                        return summary.alerts
                          .filter(alert => {
                            if (alert.type !== 'bill') return true;
                            const key = `${alert.description}|${alert.amount}|${alert.dueDate}|${alert.level}`;
                            if (seen.has(key)) return false;
                            seen.add(key);
                            return true;
                          })
                          .map((alert, i) => (
                            <li key={i} className="flex items-center gap-2">

                              {/* Indicador de cor para alertas de orçamento */}
                              {alert.type === 'budget' && (
                                <span
                                  className="inline-block w-3 h-3 rounded"
                                  style={{ backgroundColor: alert.color }}
                                ></span>
                              )}

                              <span>
                                {/* 🔵 Alertas de orçamento (budget) */}
                                {alert.type === 'budget' &&
                                  `${alert.categoryName}: ${Math.round(alert.usage * 100)}% ${t('budgetUsage')}
                                  (${formatCurrency(alert.spent)} / ${formatCurrency(alert.budget)})`
                                }

                                {/* 🟣 Alertas de gasto incomum (spike) */}
                                {alert.type === 'spike' && alert.message}

                                {/* 🟡 Alertas de contas (bill) */}
                                {alert.type === 'bill' &&
                                  `${alert.description} — ${formatCurrency(alert.amount)}
                                  — ${t('due')}: ${formatDate(alert.dueDate)}`
                                }
                              </span>
                            </li>
                          ));
                      })()}
                    </ul>
                  </div>

                </div>
              )}
              {/* Conquistas exclusivas premium */}
              {user?.premium && (
                <div className="mt-6 bg-white rounded-lg shadow p-4">
                  <h2 className="text-lg font-bold mb-2 text-indigo-700">{t('exclusiveAchievements')}</h2>
                  {loadingAchievements ? (
                    <div className="text-gray-600 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('loadingAchievements')}</div>
                  ) : achievements.length === 0 ? (
                    <div className="text-gray-500">{t('noAchievementsYet')}</div>
                  ) : (
                    <ul className="space-y-2">
                      {achievements.map((ach: { id: string; description: string; awarded_at: string }) => (
                        <li key={ach.id} className="flex items-center gap-2">
                          <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="font-semibold">{ach.description}</span>
                          <span className="text-xs text-gray-400 ml-auto">{formatDate(ach.awarded_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
                {/* Fim do Painel de Resumo */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('from')}
                  <span className="text-xs text-gray-400 ml-1">({getDatePlaceholder()})</span>
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {t('dateFormatNote')}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  {t('to')}
                  <span className="text-xs text-gray-400 ml-1">({getDatePlaceholder()})</span>
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {t('dateFormatNote')}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <label className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-800 disabled:opacity-50 flex items-center cursor-pointer" style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleImportBank}
                    className="hidden"
                    disabled={downloading}
                  />
                  {t('importBankStatement')}
                </label>
                <button
                  onClick={handleBackup}
                  disabled={downloading}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-900 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('exporting')}</>) : t('backupJSON')}
                </button>
                <label className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center cursor-pointer" style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleRestore}
                    className="hidden"
                    disabled={downloading}
                  />
                  {t('restoreBackup')}
                </label>
                <button
                  onClick={() => handleDownload('csv')}
                  disabled={downloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('exporting')}</>) : t('exportCSV')}
                </button>
                <button
                  onClick={() => handleDownload('excel')}
                  disabled={downloading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('exporting')}</>) : t('exportExcel')}
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('exporting')}</>) : t('exportPDFButton')}
                </button>
                <button
                  onClick={handleOpenCoupon}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  Usar Cupom
                </button>
                {/* Botão Pix premium */}
                <button
                  onClick={handlePix}
                  className="px-4 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {t('subscribePixButton')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            {loading && (
              <div className="flex items-center text-gray-600"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>{t('loadingCharts')}</div>
            )}
            {error && (
              <div className="text-red-600">{error}</div>
            )}
            {data && (
              <div className="space-y-10">
                <div>
                  <h3 className="font-semibold mb-3">{t('expensesByCategory')}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                          <Pie
                            data={pieDataForChart}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            labelLine
                          >
                            {pieData.map((entry, idx) => (
                              <Cell key={`${entry.categoryId || entry.name}-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {data.totalsByCategory.map((c, idx) => (
                        <li key={c.categoryId || c.name + c.icon || idx} className="flex justify-between">
                          <span className="flex items-center gap-2"><span style={{ backgroundColor: c.color }} className="inline-block w-3 h-3 rounded" />{c.icon} {translateCategory(c.name)}</span>
                          <span>{formatCurrency(Number(c.total))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">{t('dailyEvolution')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyDataForChart} margin={{ left: 16, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tickFormatter={(d: string) => new Date(d).toLocaleDateString(language || 'en-US')} minTickGap={24} />
                        <YAxis tickFormatter={(v) => formatCurrency(Number(v))} width={100} />
                        <Tooltip labelFormatter={(d) => new Date(String(d)).toLocaleDateString(language || 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })} formatter={(v: number) => formatCurrency(Number(v))} />
                        <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">{t('monthlyTotals')}</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyDataForChart} margin={{ left: 16, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ym" />
                        <YAxis tickFormatter={(v) => formatCurrency(Number(v))} width={100} />
                        <Tooltip formatter={(v: number) => formatCurrency(Number(v))} />
                        <Bar dataKey="total" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} onUpgrade={handleUpgrade} />
      {/* Cupom modal */}
      {couponOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Resgatar Cupom</h3>
              <button onClick={() => setCouponOpen(false)} className="text-gray-500">✕</button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Insira o código do cupom fornecido pelo administrador para ativar 1 ano de Premium.</p>
            <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" placeholder="Código do cupom" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCouponOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
              <button onClick={handleRedeemCoupon} disabled={redeeming} className="px-4 py-2 bg-indigo-600 text-white rounded">{redeeming ? 'Resgatando...' : 'Resgatar'}</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
