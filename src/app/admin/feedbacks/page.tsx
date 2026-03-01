"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import AdminNav from '@/components/AdminNav';

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
  const [search, setSearch] = useState('');
  const [pageFilter, setPageFilter] = useState('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1200);
    } catch {
      alert(t.error || 'Erro ao copiar');
    }
  };

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

  const pageOptions = useMemo(() => {
    const uniquePages = Array.from(new Set(feedbacks.map((fb) => fb.page).filter(Boolean) as string[]));
    return uniquePages.sort();
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return feedbacks.filter((fb) => {
      const matchesPage = pageFilter === 'all' || (fb.page || '') === pageFilter;
      const haystack = `${fb.message} ${fb.email || ''} ${fb.page || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || haystack.includes(normalizedSearch);
      return matchesPage && matchesSearch;
    });
  }, [feedbacks, pageFilter, search]);

  if (!user?.admin) {
    return <div className="p-8 text-red-600 font-bold">{t.adminAccessRestricted || 'Acesso restrito ao administrador.'}</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <AdminNav />
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-base font-semibold">{t.feedbacksReceived || 'Feedbacks recebidos'}</span>
        <span className="ml-2 text-gray-400 text-sm font-normal">({filteredFeedbacks.length}/{feedbacks.length})</span>
      </h1>
      {loading ? (
        <div>{t.loading || 'Carregando...'}</div>
      ) : error ? (
        <div className="text-red-600">{t.error || error}</div>
      ) : feedbacks.length === 0 ? (
        <div className="text-gray-500">{t.noFeedbacksYet || 'Nenhum feedback recebido ainda.'}</div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100 flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search || 'Buscar por mensagem, email ou página...'}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">{t.all || 'Todas as páginas'}</option>
              {pageOptions.map((page) => (
                <option key={page} value={page}>{pageMap[page] || page}</option>
              ))}
            </select>
          </div>

          {filteredFeedbacks.length === 0 ? (
            <div className="text-gray-500 bg-white rounded-lg shadow p-6 border border-gray-100">
              {t.noResults || 'Nenhum feedback encontrado com os filtros atuais.'}
            </div>
          ) : filteredFeedbacks.map((fb) => (
            <div key={fb.id} className="bg-white rounded-lg shadow p-4 border border-gray-100">
              {(() => {
                const createdAtLabel = new Date(fb.created_at).toLocaleString();
                const pageLabel = fb.page ? (pageMap[fb.page] || fb.page) : '-';
                const emailLabel = fb.email || '-';
                const fullText = `Data: ${createdAtLabel}\nEmail: ${emailLabel}\nPágina: ${pageLabel}\n\nMensagem:\n${fb.message}`;
                return (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-xs text-gray-400">{new Date(fb.created_at).toLocaleString()}</span>
                {fb.email && <span className="ml-2 text-xs text-blue-600">{fb.email}</span>}
                {fb.page && (
                  <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {pageMap[fb.page] || fb.page}
                  </span>
                )}
                {fb.email && (
                  <button
                    onClick={() => handleCopy(fb.email || '', `${fb.id}:email`)}
                    className="ml-auto px-2 py-1 text-xs rounded border border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                  >
                    {copiedKey === `${fb.id}:email` ? (t.copied || 'Copiado!') : (t.copyEmail || 'Copiar email')}
                  </button>
                )}
                <button
                  onClick={() => handleCopy(fb.message, `${fb.id}:message`)}
                  className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  {copiedKey === `${fb.id}:message` ? (t.copied || 'Copiado!') : (t.copyMessage || 'Copiar mensagem')}
                </button>
                <button
                  onClick={() => handleCopy(fullText, `${fb.id}:all`)}
                  className="px-2 py-1 text-xs rounded border border-indigo-300 text-indigo-700 hover:bg-indigo-50 cursor-pointer"
                >
                  {copiedKey === `${fb.id}:all` ? (t.copied || 'Copiado!') : (t.copyAll || 'Copiar tudo')}
                </button>
              </div>
                );
              })()}
              <div className="text-gray-800 whitespace-pre-line">{fb.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
