"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';

interface Feedback {
  id: string;
  user_id?: string;
  email?: string;
  message: string;
  page?: string;
  created_at: string;
}

export default function AdminFeedbacksPage() {
  const { user } = useAuth();
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.admin) return;
    fetch("/api/admin/feedbacks")
      .then((res) => res.json())
      .then((data) => {
        setFeedbacks(data.feedbacks || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t.errorLoadingFeedbacks || "Erro ao carregar feedbacks");
        setLoading(false);
      });
  }, [user]);

  if (!user?.admin) {
    return <div className="p-8 text-red-600 font-bold">{t.adminAccessRestricted || 'Acesso restrito ao administrador.'}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-base font-semibold">{t.feedbacksReceived || 'Feedbacks recebidos'}</span>
        <span className="ml-2 text-gray-400 text-sm font-normal">({feedbacks.length})</span>
      </h1>
      {loading ? (
        <div>{t.loading || 'Carregando...'}</div>
      ) : error ? (
        <div className="text-red-600">{t.error || error}</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-gray-500">{t.noFeedbacksYet || 'Nenhum feedback recebido ainda.'}</div>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{new Date(fb.created_at).toLocaleString()}</span>
                {fb.email && <span className="ml-2 text-xs text-blue-600">{fb.email}</span>}
                {fb.page && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {(() => {
                      const pageMap: Record<string, string> = {
                        '/profile': t.pageProfile || 'Perfil',
                        '/': t.pageDashboard || 'Dashboard',
                        '/expenses': t.pageExpenses || 'Despesas',
                        '/projections': t.pageProjections || 'Projeções',
                        '/reports': t.pageReports || 'Relatórios',
                        '/login': t.pageLogin || 'Login',
                        '/register': t.pageRegister || 'Cadastro',
                        '/reset': t.pageReset || 'Recuperação de senha',
                        '/admin/users': t.pageAdminUsers || 'Admin: Usuários',
                        '/admin/feedbacks': t.pageAdminFeedbacks || 'Admin: Feedbacks',
                      };
                      return pageMap[fb.page] || fb.page;
                    })()}
                  </span>
                )}
              </div>
              <div className="text-gray-800 whitespace-pre-line">{fb.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
