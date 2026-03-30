'use client';

import React, { useState } from 'react';
import { Share2, Lock, Award, Loader } from 'lucide-react';

export interface SharedExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  participants: Array<{
    memberId: string;
    memberName: string;
    owes: number;
    paid: boolean;
  }>;
  date: string;
  settled: boolean;
}

export interface ExpenseShare {
  sharedExpenseId: string;
  memberId: string;
  memberName: string;
  owesAmount: number;
  paidAmount: number;
  status: 'pending' | 'partial' | 'settled';
}

interface SplitExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyMembers: Array<{ id: string; name: string }>;
  currency: string;
  language: string;
  onSplit?: (data: SharedExpense) => void;
}

export default function SplitExpenseModal({
  isOpen,
  onClose,
  familyMembers,
  currency,
  language,
  onSplit,
}: SplitExpenseModalProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleMemberToggle = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const calculateSplits = (): Record<string, number> => {
    const totalAmount = parseFloat(amount) || 0;
    if (splitType === 'equal') {
      const perPerson = totalAmount / (selectedMembers.length + 1); // +1 for person who paid
      return selectedMembers.reduce(
        (acc, memberId) => ({
          ...acc,
          [memberId]: perPerson,
        }),
        {}
      );
    }
    return customAmounts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const splits = calculateSplits();
      const expenseData: SharedExpense = {
        id: Date.now().toString(),
        description,
        amount: parseFloat(amount) || 0,
        paidBy,
        participants: selectedMembers.map((memberId) => {
          const member = familyMembers.find((m) => m.id === memberId);
          return {
            memberId,
            memberName: member?.name || memberId,
            owes: splits[memberId] || 0,
            paid: false,
          };
        }),
        date: new Date().toISOString(),
        settled: false,
      };

      onSplit?.(expenseData);

      // Reset
      setDescription('');
      setAmount('');
      setPaidBy('');
      setSelectedMembers([]);
      setCustomAmounts({});
      onClose();
    } catch (error) {
      console.error('Error splitting expense:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalAmount = parseFloat(amount) || 0;
  const splits = calculateSplits();
  const splitAmount = totalAmount / (selectedMembers.length + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center gap-2 border-b border-gray-200 p-4 bg-white">
          <Share2 className="text-indigo-600" size={24} />
          <h2 className="text-lg font-bold text-gray-900">Dividir Despesa</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Descrição da Despesa
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Jantar em grupo"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
            />
          </div>

          {/* Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Valor Total
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Quem Pagou?
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Selecione...</option>
                {familyMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Split Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Divisão
            </label>
            <div className="flex gap-2">
              {(['equal', 'custom'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSplitType(type)}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    splitType === type
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type === 'equal' ? 'Igual' : 'Customizada'}
                </button>
              ))}
            </div>
          </div>

          {/* Select Participants */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Dividir com
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {familyMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.id)}
                    onChange={() => handleMemberToggle(member.id)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="flex-1 text-gray-900 font-medium">{member.name}</span>
                  {splitType === 'equal' && selectedMembers.includes(member.id) && (
                    <span className="text-xs font-semibold text-indigo-600">
                      {splitAmount.toFixed(2)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Custom Amounts */}
          {splitType === 'custom' &&
            selectedMembers.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Valores Customizados
                </label>
                <div className="space-y-2">
                  {selectedMembers.map((memberId) => {
                    const member = familyMembers.find((m) => m.id === memberId);
                    return (
                      <div key={memberId} className="flex items-center gap-2">
                        <span className="flex-1 text-sm text-gray-700">{member?.name}</span>
                        <input
                          type="number"
                          value={customAmounts[memberId] || ''}
                          onChange={(e) =>
                            setCustomAmounts({
                              ...customAmounts,
                              [memberId]: parseFloat(e.target.value) || 0,
                            })
                          }
                          placeholder="0.00"
                          step="0.01"
                          className="w-20 px-2 py-1 border border-gray-300 rounded font-medium text-sm focus:outline-none focus:ring-indigo-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Summary */}
          {totalAmount > 0 && selectedMembers.length > 0 && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm font-semibold text-indigo-900 mb-2">Resumo da Divisão:</p>
              <div className="space-y-1 text-xs text-indigo-800">
                <p>
                  {splitType === 'equal'
                    ? `Cada pessoa paga: ${splitAmount.toFixed(2)} ${currency}`
                    : 'Verificando montantes customizados...'}
                </p>
                <p className="text-indigo-700">
                  Total: {totalAmount.toFixed(2)} {currency}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!description || !amount || !paidBy || selectedMembers.length === 0 || isLoading}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader size={18} className="animate-spin" />}
              {isLoading ? 'Dividindo...' : 'Dividir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
