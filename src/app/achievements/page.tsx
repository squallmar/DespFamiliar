'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { useExpenses } from '@/hooks/useData';
import translations, { resolveLanguage } from '@/lib/translations';
import { useLocation } from '@/contexts/LocationContext';
import { Trophy, Star, Award, CheckCircle2, FileText, Flame, BarChart3, UserCheck, ShieldCheck, Repeat } from 'lucide-react';
import { useNewAchievements } from '@/hooks/useNewAchievements';

export default function AchievementsPage() {
  const { achievements, isLoading } = useAchievements();
  const { expenses } = useExpenses();
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey];
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [period, setPeriod] = useState<string>('all'); // all, 30d, 90d, year
  const { markAllAsSeen } = useNewAchievements();

  // Mark all achievements as seen when page loads
  useEffect(() => {
    markAllAsSeen();
  }, [markAllAsSeen]);

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

  // Estatísticas
  const totalAchievements = achievements?.length || 0;
  const recentAchievements = achievements?.slice(0, 3).length || 0;
  const completePercentage = achievements ? Math.round((totalAchievements / 10) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Título */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-blue-600" />
            {t?.achievements || 'Conquistas'}
          </h1>
          <p className="text-gray-600 mt-2">{t?.achievementsDesc || 'Ganhe conquistas ao usar o app!'}</p>
        </div>

        {/* Cards de Estatísticas - mais compactos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium">{t?.achievementTotal || 'Total'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalAchievements}</p>
              </div>
              <Trophy className="w-10 h-10 text-blue-500 opacity-15" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium">{t?.achievementProgress || 'Progresso'}</p>
                <div className="mt-1">
                  <p className="text-2xl font-bold text-gray-900">{completePercentage}%</p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${completePercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <Star className="w-10 h-10 text-indigo-500 opacity-15" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs font-medium">{t?.achievementRecent || 'Recentes'}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{recentAchievements}</p>
              </div>
              <Award className="w-10 h-10 text-green-500 opacity-15" />
            </div>
          </div>
        </div>

        {/* Filtros - mais compactos */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t?.achievementType || 'Tipo'}</label>
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                {types.map(ti => <option key={ti.key} value={ti.key}>{ti.label}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">{t?.achievementPeriod || 'Período'}</label>
              <select 
                value={period} 
                onChange={e => setPeriod(e.target.value)} 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">{t?.achievementAllTime || 'Todo o período'}</option>
                <option value="30d">{t?.achievementLast30 || 'Últimos 30 dias'}</option>
                <option value="90d">{t?.achievementLast90 || 'Últimos 90 dias'}</option>
                <option value="year">{t?.achievementThisYear || 'Este ano'}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Conquistas */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin inline-block w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
            <p className="text-gray-600 text-sm">{t?.loading || 'Carregando...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">{t?.noAchievements || 'Nenhuma conquista ainda.'}</p>
            <p className="text-gray-500 text-xs mt-1">{t?.startTrackingExpenses || 'Comece a registrar despesas para ganhar conquistas!'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((a: Ach, index: number) => {
              // Mapa de ícones por tipo de conquista
              const iconMap: Record<string, React.ReactNode> = {
                'first_expense': <Star className="w-6 h-6 text-blue-500" />,
                'ten_expenses': <Award className="w-6 h-6 text-green-500" />,
                'hundred_expenses': <Award className="w-6 h-6 text-green-700" />,
                'first_recurring': <Repeat className="w-6 h-6 text-purple-500" />,
                'all_categories': <BarChart3 className="w-6 h-6 text-pink-500" />,
                'saved_month': <ShieldCheck className="w-6 h-6 text-teal-500" />,
                'under_budget': <CheckCircle2 className="w-6 h-6 text-green-600" />,
                'goal_achieved': <UserCheck className="w-6 h-6 text-orange-500" />,
                'first_export': <FileText className="w-6 h-6 text-gray-500" />,
                'continuous_use': <Flame className="w-6 h-6 text-red-500" />,
              };
              const icon = iconMap[a.type] || <Trophy className="w-6 h-6 text-blue-500" />;

              // Cores de background por tipo - mais sutis
              const bgColorMap: Record<string, string> = {
                'first_expense': 'bg-blue-50 border-blue-200',
                'ten_expenses': 'bg-green-50 border-green-200',
                'hundred_expenses': 'bg-green-50 border-green-200',
                'first_recurring': 'bg-purple-50 border-purple-200',
                'all_categories': 'bg-pink-50 border-pink-200',
                'saved_month': 'bg-teal-50 border-teal-200',
                'under_budget': 'bg-emerald-50 border-emerald-200',
                'goal_achieved': 'bg-orange-50 border-orange-200',
                'first_export': 'bg-gray-50 border-gray-200',
                'continuous_use': 'bg-red-50 border-red-200',
              };
              const bgColor = bgColorMap[a.type] || 'bg-blue-50 border-blue-200';

              // Progresso para conquistas de múltiplos passos
              let progressBar = null;
              if (a.type === 'ten_expenses' || a.type === 'hundred_expenses') {
                const goal = a.type === 'ten_expenses' ? 10 : 100;
                const current = expenses.length;
                const percent = Math.min(100, Math.round((current / goal) * 100));
                progressBar = (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-gray-600">Progresso</span>
                      <span className="text-xs font-bold text-gray-700">{current}/{goal}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={a.id} 
                  className={`${bgColor} rounded-lg shadow hover:shadow-md transition-all duration-200 p-4 border hover:border-opacity-100 border-opacity-50 animate-fadeIn`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div className="bg-white rounded-md p-2 shadow-sm flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                        {(t?.achievementsList as Record<string,string> | undefined)?.[a.type] || a.description}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(a.awarded_at).toLocaleDateString(language, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {progressBar}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }
      `}</style>
    </div>
  );
}
