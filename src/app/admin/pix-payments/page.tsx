'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Check, X, Clock, CheckCircle } from 'lucide-react';
import AdminNav from '@/components/AdminNav';

type PixPayment = {
  id: number;
  user_id: string;
  user_email: string;
  user_name: string;
  amount: number;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  created_at: string;
  confirmed_at: string | null;
  asaas_payment_id: string | null;
};

export default function AdminPixPaymentsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [payments, setPayments] = useState<PixPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('pending');

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/pix-payments?filter=${filter}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!user.admin) {
      router.push('/');
      return;
    }
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, filter]);

  const handleApprove = async (paymentId: number, userId: string) => {
    try {
      const res = await fetch('/api/admin/approve-pix', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, userId }),
      });

      if (res.ok) {
        alert('✅ Premium ativado com sucesso!');
        fetchPayments();
      } else {
        alert('❌ Erro ao aprovar pagamento');
      }
    } catch (error) {
      console.error('Erro ao aprovar:', error);
      alert('❌ Erro ao aprovar pagamento');
    }
  };

  const handleReject = async (paymentId: number) => {
    try {
      const res = await fetch('/api/admin/reject-pix', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      });

      if (res.ok) {
        alert('❌ Pagamento rejeitado');
        fetchPayments();
      }
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
    }
  };

  if (!user || !user.admin) {
    return <div className="p-8">Acesso negado</div>;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <AdminNav />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Pagamentos Premium - Admin</h1>
          <button
            onClick={() => router.push('/admin/users')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition cursor-pointer"
          >
            Voltar para Usuários
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Assinaturas mensais Asaas
          </span>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } cursor-pointer`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } cursor-pointer`}
          >
            Pendentes ({payments.filter(p => p.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg font-semibold transition ${
              filter === 'confirmed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } cursor-pointer`}
          >
            Confirmados
          </button>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">Carregando...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum pagamento encontrado
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {payment.user_name || 'Sem nome'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payment.user_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {`R$ ${Number(payment.amount).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                          <Clock size={14} />
                          Pendente
                        </span>
                      )}
                      {payment.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle size={14} />
                          Confirmado
                        </span>
                      )}
                      {payment.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <X size={14} />
                          Cancelado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(payment.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(Number(payment.id), payment.user_id)}
                            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition cursor-pointer"
                            title="Aprovar"
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleReject(Number(payment.id))}
                            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition cursor-pointer"
                            title="Rejeitar"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
