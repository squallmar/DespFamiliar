'use client';

import React, { useState } from 'react';
import { X, Zap, Lightbulb } from 'lucide-react';

export interface CreateGoalData {
  name: string;
  targetAmount: number;
  deadline: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  icon?: string;
  notes?: string;
}

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGoalData) => void;
  language: string;
  currency: string;
  categories?: string[];
}

const GOAL_ICONS = ['🎯', '💰', '🏡', '🚗', '✈️', '📚', '💻', '🎓', '⌚', '👗'];
const GOAL_CATEGORIES = ['Viagem', 'Casa', 'Carro', 'Educação', 'Saúde', 'Lazer', 'Investimento'];

export default function CreateGoalModal({
  isOpen,
  onClose,
  onSubmit,
  language,
  currency,
  categories: customCategories,
}: CreateGoalModalProps) {
  const [formData, setFormData] = useState<CreateGoalData>({
    name: '',
    targetAmount: 0,
    deadline: '',
    priority: 'medium',
    category: '',
    icon: GOAL_ICONS[0],
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = customCategories || GOAL_CATEGORIES;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome da meta é obrigatório';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Insira um valor maior que zero';
    }

    if (!formData.deadline) {
      newErrors.deadline = 'Data limite é obrigatória';
    }

    const deadlineDate = new Date(formData.deadline);
    if (deadlineDate < new Date()) {
      newErrors.deadline = 'A data deve ser no futuro';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        name: '',
        targetAmount: 0,
        deadline: '',
        priority: 'medium',
        category: '',
        icon: GOAL_ICONS[0],
        notes: '',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md mx-4 rounded-lg bg-white shadow-lg max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 p-4 bg-white">
          <div className="flex items-center gap-2">
            <Zap className="text-indigo-600" size={20} />
            <h2 className="text-lg font-bold text-gray-900">Nova Meta</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Icon Selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ícone da Meta
            </label>
            <div className="grid grid-cols-5 gap-2">
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`text-2xl p-2 rounded-lg transition ${
                    formData.icon === icon
                      ? 'bg-indigo-600 scale-110'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nome da Meta *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Comprar carro"
              className={`w-full px-3 py-2 border rounded-lg font-medium ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-indigo-500`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          {/* Target Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Valor Alvo * ({currency})
            </label>
            <input
              type="number"
              value={formData.targetAmount || ''}
              onChange={(e) =>
                setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })
              }
              placeholder="0.00"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-lg font-medium ${
                errors.targetAmount ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-indigo-500`}
            />
            {errors.targetAmount && (
              <p className="text-xs text-red-600 mt-1">{errors.targetAmount}</p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Data Limite * (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg font-medium ${
                errors.deadline ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-indigo-500`}
            />
            {errors.deadline && <p className="text-xs text-red-600 mt-1">{errors.deadline}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500"
            >
              <option value="">Selecione uma categoria</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prioridade
            </label>
            <div className="flex gap-2">
              {(['low', 'medium', 'high'] as const).map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`flex-1 py-2 rounded-lg font-semibold transition ${
                    formData.priority === priority
                      ? {
                          low: 'bg-blue-600 text-white',
                          medium: 'bg-yellow-600 text-white',
                          high: 'bg-red-600 text-white',
                        }[priority]
                      : {
                          low: 'bg-blue-50 text-blue-700 border border-blue-200',
                          medium: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
                          high: 'bg-red-50 text-red-700 border border-red-200',
                        }[priority]
                  }`}
                >
                  {priority === 'low' ? 'Baixa' : priority === 'medium' ? 'Média' : 'Alta'}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Adicione detalhes sobre sua meta..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-medium focus:outline-none focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Helper */}
          <div className="flex items-start gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Lightbulb size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Defina metas desafiadoras mas realistas. Você precisará economizar aproximadamente{' '}
              <strong>
                {(formData.targetAmount / 12).toFixed(2)} {currency}/mês
              </strong>{' '}
              para atingir sua meta em um ano.
            </p>
          </div>

          {/* Footer */}
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
              className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
            >
              Criar Meta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
