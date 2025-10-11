
'use client';

import { useMemo, useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import type { ReportsResponse, BudgetAlert, SpikeAlert } from '@/types';
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
  alerts: (BudgetAlert | SpikeAlert)[];
};

// ...existing code...

export default function ReportsPage() {
  // Função para importar extrato bancário
  const handleImportBank = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  // Função para backup
  const handleBackup = async () => {
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
  const currency = useMemo(() => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }), []);

  type PieDatum = { name: string; total: number; color: string; categoryId: string };
  type SeriesDatum = { [key: string]: number | string };

  const pieData = useMemo<PieDatum[]>(() => {
    if (!data) return [];
    return data.totalsByCategory
      .filter((c) => Number(c.total) > 0)
      .map((c) => ({ name: c.name, total: Number(c.total), color: c.color, categoryId: c.categoryId }));
  }, [data]);

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

  // ...existing code...


  // ...existing code...
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

  return (
    <ProtectedRoute>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Relatórios</h1>

          <div className="bg-white rounded-lg shadow p-4 mb-6">
            {/* Painel de Resumo */}
            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">Resumo do Período
                <select
                  className="ml-2 border rounded px-2 py-1 text-base"
                  value={summaryPeriod}
                  onChange={e => setSummaryPeriod(e.target.value as 'week' | 'month')}
                  disabled={summaryLoading}
                >
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                </select>
              </h2>
              {summaryLoading && <div className="text-gray-600 flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Carregando resumo...</div>}
              {summaryError && <div className="text-red-600">{summaryError}</div>}
              {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-indigo-50 rounded p-4 flex flex-col items-center">
                    <div className="text-2xl font-bold text-indigo-700">{currency.format(Number(summary.total))}</div>
                    <div className="text-sm text-gray-700">Total de despesas</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(summary.from).toLocaleDateString('pt-BR')} a {new Date(summary.to).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="bg-green-50 rounded p-4">
                    <div className="font-semibold text-green-700 mb-1">Top Categorias</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {summary.topCategories.length === 0 && <li>Nenhuma categoria</li>}
                      {summary.topCategories.map((cat) => (
                        <li key={cat.name} className="flex items-center gap-2">
                          <span>{cat.icon}</span> <span>{cat.name}</span> <span className="ml-auto font-bold">{currency.format(Number(cat.total))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-yellow-50 rounded p-4">
                    <div className="font-semibold text-yellow-700 mb-1">Alertas</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {summary.alerts.length === 0 && <li>Nenhum alerta</li>}
                      {summary.alerts.map((alert, i) => (
                        <li key={i} className="flex items-center gap-2">
                          {alert.type === 'budget' && <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: alert.color }}></span>}
                          <span>{alert.type === 'budget' ? `${alert.categoryName}: ${Math.round(alert.usage*100)}% do orçamento (${currency.format(alert.spent)} / ${currency.format(alert.budget)})` : alert.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
                {/* Fim do Painel de Resumo */}
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">De</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Até</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border rounded px-3 py-2"
                />
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
                  Importar Extrato Bancário (CSV)
                </label>
                <button
                  onClick={handleBackup}
                  disabled={downloading}
                  className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-900 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Exportando...</>) : 'Backup (JSON)'}
                </button>
                <label className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-700 disabled:opacity-50 flex items-center cursor-pointer" style={{ cursor: 'pointer' }}>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleRestore}
                    className="hidden"
                    disabled={downloading}
                  />
                  Restaurar Backup
                </label>
                <button
                  onClick={() => handleDownload('csv')}
                  disabled={downloading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Exportando...</>) : 'Exportar CSV'}
                </button>
                <button
                  onClick={() => handleDownload('excel')}
                  disabled={downloading}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Exportando...</>) : 'Exportar Excel'}
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={downloading}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 flex items-center cursor-pointer"
                  style={{ cursor: 'pointer' }}
                >
                  {downloading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Exportando...</>) : 'Exportar PDF'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            {loading && (
              <div className="flex items-center text-gray-600"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Carregando gráficos...</div>
            )}
            {error && (
              <div className="text-red-600">{error}</div>
            )}
            {data && (
              <div className="space-y-10">
                <div>
                  <h3 className="font-semibold mb-3">Despesas por Categoria</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieDataForChart}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ name, value }) => `${name}: ${currency.format(Number(value))}`}
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.categoryId} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => currency.format(Number(value))} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {data.totalsByCategory.map((c) => (
                        <li key={c.categoryId} className="flex justify-between">
                          <span className="flex items-center gap-2"><span style={{ backgroundColor: c.color }} className="inline-block w-3 h-3 rounded" />{c.icon} {c.name}</span>
                          <span>{currency.format(Number(c.total))}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Evolução Diária</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyDataForChart} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tickFormatter={(d: string) => new Date(d).toLocaleDateString('pt-BR')} minTickGap={24} />
                        <YAxis tickFormatter={(v) => currency.format(Number(v))} width={80} />
                        <Tooltip labelFormatter={(d) => new Date(String(d)).toLocaleDateString('pt-BR')} formatter={(v: number) => currency.format(Number(v))} />
                        <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Totais Mensais</h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyDataForChart} margin={{ left: 8, right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ym" />
                        <YAxis tickFormatter={(v) => currency.format(Number(v))} width={80} />
                        <Tooltip formatter={(v: number) => currency.format(Number(v))} />
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
    </ProtectedRoute>
  );
}
