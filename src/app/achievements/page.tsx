'use client';

import { useState, useMemo } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useExpenses } from '@/hooks/useData';
import translations from '@/lib/translations';
import { useLocation } from '@/contexts/LocationContext';
import { Trophy, Star, Award, CheckCircle2, FileText, Flame, BarChart3, UserCheck, ShieldCheck, Repeat } from 'lucide-react';

export default function AchievementsPage() {
  const { achievements, isLoading } = useAchievements();
  const { expenses } = useExpenses();
  const { language } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'];
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all'); // all, 30d, 90d, year

  type Ach = { id: string; type: string; description: string; awarded_at: string };
  const filtered = useMemo(() => {
    const cutoff = (() => {
      const now = new Date();
      if (period === '30d') return new Date(now.getTime() - 30 * 86400000);
      if (period === '90d') return new Date(now.getTime() - 90 * 86400000);
      if (period === 'year') return new Date(now.getFullYear(), 0, 1);
      return null;
    })();
  return (achievements || []).filter((a: Ach) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (cutoff) {
        const awarded = new Date(a.awarded_at);
        if (awarded < cutoff) return false;
      }
      return true;
    });
  }, [achievements, typeFilter, period]);

  const types = useMemo(() => {
    const list = t?.achievementsList as Record<string, string> | undefined;
    const entries = list ? Object.entries(list) : [];
    const filteredEntries = entries.filter(([key]) => key !== 'all');
    const allLabel = list?.all || (language==='en-US'?'All achievements': language==='es-ES'?'Todos los logros':'Todas as conquistas');
    return [{ key: 'all', label: allLabel }, ...filteredEntries.map(([key, label]) => ({ key, label }))];
  }, [t, language]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-yellow-700">
          <Trophy className="w-7 h-7 text-yellow-500" /> {t?.achievements || 'Conquistas'}
        </h1>
        <p className="text-lg text-gray-700 mb-6 font-medium">{t?.achievementsDesc || 'Ganhe conquistas ao usar o app!'}</p>
        <div className="flex flex-wrap gap-3 mb-4">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border rounded">
            {types.map(ti => <option key={ti.key} value={ti.key}>{ti.label}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="px-3 py-2 border rounded">
            <option value="all">{language==='en-US'?'All time': language==='es-ES'?'Todo el tiempo':'Todo o período'}</option>
            <option value="30d">{language==='en-US'?'Last 30 days': language==='es-ES'?'Últimos 30 días':'Últimos 30 dias'}</option>
            <option value="90d">{language==='en-US'?'Last 90 days': language==='es-ES'?'Últimos 90 días':'Últimos 90 dias'}</option>
            <option value="year">{language==='en-US'?'This year': language==='es-ES'?'Este año':'Este ano'}</option>
          </select>
        </div>
        {isLoading ? (
          <div className="text-gray-500">{t?.loading || 'Carregando...'}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-500">{t?.noAchievements || 'Nenhuma conquista ainda.'}</div>
        ) : (
            <ul className="space-y-3">
              {filtered.map((a: Ach) => {
                // Mapa de ícones por tipo de conquista
                const iconMap: Record<string, React.ReactNode> = {
                  'first_expense': <Star className="w-5 h-5 text-blue-500" />,
                  'ten_expenses': <Award className="w-5 h-5 text-green-500" />,
                  'hundred_expenses': <Award className="w-5 h-5 text-green-700" />,
                  'first_recurring': <Repeat className="w-5 h-5 text-purple-500" />,
                  'all_categories': <BarChart3 className="w-5 h-5 text-pink-500" />,
                  'saved_month': <ShieldCheck className="w-5 h-5 text-teal-500" />,
                  'under_budget': <CheckCircle2 className="w-5 h-5 text-green-600" />,
                  'goal_achieved': <UserCheck className="w-5 h-5 text-orange-500" />,
                  'first_export': <FileText className="w-5 h-5 text-gray-500" />,
                  'continuous_use': <Flame className="w-5 h-5 text-red-500" />,
                };
                const icon = iconMap[a.type] || <Trophy className="w-5 h-5 text-yellow-500" />;

                // Progresso para conquistas de múltiplos passos
                let progressBar = null;
                if (a.type === 'ten_expenses' || a.type === 'hundred_expenses') {
                  const goal = a.type === 'ten_expenses' ? 10 : 100;
                  const current = expenses.length;
                  const percent = Math.min(100, Math.round((current / goal) * 100));
                  progressBar = (
                    <div className="flex flex-col min-w-[90px] items-end">
                      <div className="w-20 h-2 bg-gray-200 rounded-full mb-1">
                        <div
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{current}/{goal} ({percent}%)</span>
                    </div>
                  );
                }

                return (
                  <li key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    {icon}
                    <div className="flex-1">
                      <div className="font-medium">{(t?.achievementsList as Record<string,string> | undefined)?.[a.type] || a.description}</div>
                      <div className="text-xs text-gray-500">{new Date(a.awarded_at).toLocaleString(language)}</div>
                    </div>
                    {progressBar}
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{a.type}</span>
                  </li>
                );
              })}
            </ul>
        )}
      </div>
    </div>
  );
}
