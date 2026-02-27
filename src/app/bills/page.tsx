"use client";

import { useEffect, useState } from 'react';
import BillsManager from '@/components/BillsManager';
import FamilyMemberSelector from '@/components/FamilyMemberSelector';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useFamilyMembers } from '@/hooks/useFamilyMembers';
import { Loader2, X } from 'lucide-react';

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  status: 'pending' | 'paid';
  paid_date?: string;
  recurring?: boolean;
  recurring_type?: string;
  notes?: string;
  spent_by?: string;
  paid_by?: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export default function BillsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { members: familyMembers } = useFamilyMembers();

  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<{ month: number; year: number }>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    dueDate: '',
    categoryId: '',
    status: 'pending' as 'pending' | 'paid',
    paidDate: '',
    recurring: false,
    recurringType: '',
    notes: '',
    spentBy: undefined as string | undefined,
    paidBy: undefined as string | undefined
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills?month=${period.month}&year=${period.year}`);
      if (response.ok) {
        const data = await response.json();
        setBills(data);
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data.categories) ? data.categories : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBills();
      fetchCategories();
    }
  }, [user, period]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.dueDate) return;

    setSubmitting(true);
    try {
      const payload = {
        id: editingBill?.id,
        description: formData.description,
        amount: parseFloat(formData.amount),
        dueDate: formData.dueDate,
        categoryId: formData.categoryId || null,
        status: formData.status,
        paidDate: formData.status === 'paid' ? (formData.paidDate || new Date().toISOString()) : null,
        recurring: formData.recurring,
        recurringType: formData.recurring ? formData.recurringType : null,
        notes: formData.notes,
        spentBy: formData.spentBy || null,
        paidBy: formData.paidBy || null
      };

      const method = editingBill ? 'PUT' : 'POST';
      const response = await fetch('/api/bills', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchBills();
        closeModal();
      }
    } catch (error) {
      console.error('Error saving bill:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/bills?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchBills();
      }
    } catch (error) {
      console.error('Error deleting bill:', error);
    }
  };

  const handleMarkAsPaid = async (bill: Bill) => {
    try {
      const response = await fetch('/api/bills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bill.id,
          description: bill.description,
          amount: bill.amount,
          dueDate: bill.due_date,
          categoryId: bill.category_id,
          status: 'paid',
          paidDate: new Date().toISOString(),
          recurring: bill.recurring,
          recurringType: bill.recurring_type,
          notes: bill.notes
        })
      });

      if (response.ok) {
        await fetchBills();
      }
    } catch (error) {
      console.error('Error marking bill as paid:', error);
    }
  };

  const openModal = (bill?: Bill) => {
    if (bill) {
      setEditingBill(bill);
      setFormData({
        description: bill.description,
        amount: bill.amount.toString(),
        dueDate: new Date(bill.due_date).toISOString().slice(0, 10),
        categoryId: bill.category_id || '',
        status: bill.status,
        paidDate: bill.paid_date ? new Date(bill.paid_date).toISOString().slice(0, 10) : '',
        recurring: bill.recurring || false,
        recurringType: bill.recurring_type || '',
        notes: bill.notes || '',
        spentBy: bill.spent_by,
        paidBy: bill.paid_by
      });
    } else {
      setEditingBill(null);
      setFormData({
        description: '',
        amount: '',
        dueDate: '',
        categoryId: '',
        status: 'pending',
        paidDate: '',
        recurring: false,
        recurringType: '',
        notes: '',
        spentBy: undefined,
        paidBy: undefined
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBill(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calcular total de despesas do mês
  const totalExpenses = bills.reduce((sum, bill) => sum + bill.amount, 0);

  return (
    <>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Gerenciador de Contas */}
          <BillsManager
            onOpenModal={openModal}
            bills={bills}
            loading={loading}
            onDelete={handleDelete}
            onMarkAsPaid={handleMarkAsPaid}
            period={period}
            onPeriodChange={setPeriod}
            familyMembers={familyMembers}
          />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingBill ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vencimento *</label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                    <select
                      value={formData.categoryId}
                      onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sem categoria</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={e => setFormData({ ...formData, status: e.target.value as 'pending' | 'paid' })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Paga</option>
                    </select>
                  </div>
                </div>

                {formData.status === 'paid' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Data de Pagamento</label>
                    <input
                      type="date"
                      value={formData.paidDate}
                      onChange={e => setFormData({ ...formData, paidDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.recurring}
                      onChange={e => setFormData({ ...formData, recurring: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Conta recorrente</span>
                  </label>
                </div>

                {formData.recurring && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Recorrência</label>
                    <select
                      value={formData.recurringType}
                      onChange={e => setFormData({ ...formData, recurringType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione</option>
                      <option value="monthly">Mensal</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {familyMembers.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <FamilyMemberSelector
                      members={familyMembers}
                      value={formData.spentBy}
                      onChange={(value) => setFormData({ ...formData, spentBy: value })}
                      label="Quem Gastou"
                      optional={true}
                    />
                    <FamilyMemberSelector
                      members={familyMembers}
                      value={formData.paidBy}
                      onChange={(value) => setFormData({ ...formData, paidBy: value })}
                      label="Quem Pagou"
                      optional={true}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Salvando...
                      </>
                    ) : (
                      editingBill ? 'Atualizar' : 'Criar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
