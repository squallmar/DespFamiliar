"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import translations from '@/lib/translations';
import { useLocation } from '@/contexts/LocationContext';
import { Trash2, X, Check } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  admin?: boolean;
  premium?: boolean;
  avatar?: string;
  created_at?: string;
  achievements_count?: number;
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { language } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<User | null>(null);

  const loadUsers = () => {
    if (!user?.admin) return;
    setLoading(true);
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
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleToggleStatus = async (userId: string, field: 'admin' | 'premium', currentValue: boolean) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, field, value: !currentValue })
      });

      if (!response.ok) throw new Error('Erro ao atualizar status');
      
      loadUsers();
    } catch {
      alert('Erro ao atualizar status do usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Erro ao excluir usuário');
      
      setShowDeleteModal(null);
      loadUsers();
    } catch {
      alert('Erro ao excluir usuário');
    }
  };

  if (!user?.admin) {
    return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-base font-semibold">
          {t.registeredUsers || 'Usuários cadastrados'}
        </span>
        <span className="relative ml-2 flex items-center" style={{height: '2.5rem'}}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-60"></span>
          <span className="inline-flex items-center justify-center px-2 py-1 text-sm font-bold leading-none text-blue-800 bg-blue-200 rounded-full border border-blue-400 shadow relative z-10">
            {users.length}
          </span>
        </span>
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
                <th className="px-4 py-3 text-center font-semibold text-gray-700">{t.achievements || 'Conquistas'}</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, idx) => (
                <tr key={u.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <span className="text-3xl">
                      {u.avatar || '👤'}
                    </span>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(u.id, 'admin', !!u.admin)}
                      className={`px-3 py-1 rounded shadow uppercase text-xs tracking-widest font-bold transition-all cursor-pointer ${
                        u.admin 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border border-yellow-700 hover:from-yellow-500 hover:to-yellow-700'
                          : 'bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300'
                      }`}
                    >
                      {u.admin ? 'ADMIN' : 'USER'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleStatus(u.id, 'premium', !!u.premium)}
                      className={`px-3 py-1 rounded shadow uppercase text-xs tracking-widest font-bold transition-all cursor-pointer ${
                        u.premium 
                          ? 'bg-gradient-to-r from-blue-400 to-blue-600 text-white border border-blue-700 hover:from-blue-500 hover:to-blue-700'
                          : 'bg-gray-200 text-gray-600 border border-gray-300 hover:bg-gray-300'
                      }`}
                    >
                      {u.premium ? 'PREMIUM' : 'FREE'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleString() : "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center justify-center min-w-10 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300 text-xs font-semibold">
                      {u.achievements_count ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setShowDeleteModal(u)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Excluir usuário"
                        disabled={u.id === user.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-3 rounded-full mr-3">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Excluir Usuário</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o usuário <strong>{showDeleteModal.name}</strong>? 
              Esta ação não pode ser desfeita e todos os dados do usuário serão permanentemente removidos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUser(showDeleteModal.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
              >
                <Check className="h-4 w-4 inline mr-2" />
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
