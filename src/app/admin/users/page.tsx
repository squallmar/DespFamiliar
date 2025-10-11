"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import translations from '@/lib/translations';
import { useLocation } from '@/contexts/LocationContext';

interface User {
  id: string;
  name: string;
  email: string;
  admin?: boolean;
  premium?: boolean;
  created_at?: string;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { language } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.admin) return;
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(data.users || []);
        setLoading(false);
      })
      .catch(() => {
        setError("Erro ao carregar usuários");
        setLoading(false);
      });
  }, [user]);

  if (!user?.admin) {
    return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-base font-semibold">{t.registeredUsers || 'Usuários cadastrados'}</span>
        <span className="ml-2 text-gray-400 text-sm font-normal">({users.length})</span>
      </h1>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500"><span className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full"></span>{t.loading || 'Carregando...'}</div>
      ) : error ? (
        <div className="text-red-600 font-semibold">{t.error || error}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t.user || 'Usuário'}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t.email || 'Email'}</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">{t.admin || 'Admin'}</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">{t.premium || 'Premium'}</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">{t.createdAt || 'Criado em'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, idx) => (
                <tr key={u.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-blue-100 text-blue-700 font-bold text-base">
                      {u.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                    </span>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.admin ? (
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold px-3 py-1 rounded shadow uppercase text-xs tracking-widest border border-yellow-700">ADMIN</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {u.premium ? (
                      <span className="bg-gradient-to-r from-blue-400 to-blue-600 text-white font-bold px-3 py-1 rounded shadow uppercase text-xs tracking-widest border border-blue-700">PREMIUM</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
