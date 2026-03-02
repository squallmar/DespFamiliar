'use client';

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/translations';

interface InstallmentExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: InstallmentExpenseData) => Promise<void>;
  language: string;
  currency: string;
  categories: Array<{ id: string; name: string; icon: string; color: string }>;
}

export interface InstallmentExpenseData {
  description: string;
  categoryId: string;
  totalAmount: number;
  installments: number;
  startDate: string;
  recurring: string;
  notes?: string;
}

export default function InstallmentExpenseModal({
  open,
  onClose,
  onSubmit,
  language,
  currency,
  categories,
}: InstallmentExpenseModalProps) {
  const { t } = useTranslation(language);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [installments, setInstallments] = useState('12');
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !categoryId || !totalAmount || !installments) {
      alert(t('fillAllFields') || 'Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        description,
        categoryId,
        totalAmount: parseFloat(totalAmount),
        installments: parseInt(installments),
        startDate,
        recurring: `installment-${installments}`,
        notes,
      });

      // Reset form
      setDescription('');
      setCategoryId('');
      setTotalAmount('');
      setInstallments('12');
      setStartDate(new Date().toISOString().split('T')[0]);
      setNotes('');

      onClose();
    } catch (error) {
      console.error('Erro ao criar despesa parcelada:', error);
      alert('Erro ao criar despesa parcelada');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const monthlyAmount = totalAmount
    ? (parseFloat(totalAmount) / parseInt(installments)).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg text-gray-900">Nova Despesa Parcelada</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descrição *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="ex: Compra da TV"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Categoria *
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Total Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Valor Total ({currency}) *
            </label>
            <input
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Installments */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Número de Parcelas *
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[3, 6, 12, 24, 36].map((num) => (
                <option key={num} value={num}>
                  {num}x de {monthlyAmount}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Data da Primeira Parcela *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas adicionais (opcional)"
              rows={3}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Summary */}
          {totalAmount && installments && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Resumo:</strong> {installments}x de {monthlyAmount}{' '}
                {currency}
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Primeira parcela em{' '}
                {new Date(startDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar Parcelado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
