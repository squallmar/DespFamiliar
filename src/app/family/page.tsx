'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import { useTranslation } from '@/lib/translations';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react';

interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  color: string;
  relation?: string;
  notes?: string;
}

export default function FamilyMembersPage() {
  const { user } = useAuth();
  const { language } = useLocation();
  const { t } = useTranslation(language);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    avatar: '👤',
    color: '#6366F1',
    relation: '',
    notes: ''
  });

  const AVATARS = ['👤', '👨', '👩', '👦', '👧', '🧑', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱'];
  const COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#14B8A6'];
  const RELATIONS = ['Pai', 'Mãe', 'Filho', 'Filha', 'Cônjuge', 'Avó', 'Avô', 'Outro'];

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/family-members', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch members');
      const { members } = await res.json();
      setMembers(members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch('/api/family-members', {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to save member');
      
      await fetchMembers();
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', avatar: '👤', color: '#6366F1', relation: '', notes: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar membro');
    }
  };

  const handleEdit = (member: FamilyMember) => {
    setFormData(member);
    setEditingId(member.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    try {
      const res = await fetch(`/api/family-members?id=${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete member');
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover membro');
    }
  };

  return (
    <ProtectedRoute>
      <div className="p-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                👨‍👩‍👧‍👦 Membros Familiares
              </h1>
              <p className="text-lg text-gray-600">Gerencie os membros da sua família e rastreie quem gasta o quê</p>
            </div>
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setFormData({ name: '', avatar: '👤', color: '#6366F1', relation: '', notes: '' });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
            >
              <Plus className="w-5 h-5" /> Novo Membro
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {showForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6">{editingId ? 'Editar Membro' : 'Novo Membro'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Nome do membro"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Parentesco</label>
                    <select
                      value={formData.relation}
                      onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                      className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Selecionar...</option>
                      {RELATIONS.map(rel => (
                        <option key={rel} value={rel}>{rel}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Avatar</label>
                    <div className="flex flex-wrap gap-2">
                      {AVATARS.map(avatar => (
                        <button
                          key={avatar}
                          type="button"
                          onClick={() => setFormData({ ...formData, avatar })}
                          className={`text-3xl p-2 rounded-lg ${
                            formData.avatar === avatar ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'bg-gray-100'
                          } hover:bg-gray-200 transition`}
                        >
                          {avatar}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-2">Cor</label>
                    <div className="flex flex-wrap gap-2">
                      {COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-10 h-10 rounded-lg ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Observações (opcional)"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setFormData({ name: '', avatar: '👤', color: '#6366F1', relation: '', notes: '' });
                    }}
                    className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
                  >
                    {editingId ? 'Atualizar' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : members.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
              <p className="text-lg text-gray-500 mb-4">Nenhum membro cadastrado</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Adicionar primeiro membro
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map(member => (
                <div
                  key={member.id}
                  className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="text-4xl p-3 rounded-lg"
                        style={{ backgroundColor: member.color + '20' }}
                      >
                        {member.avatar}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900">{member.name}</h3>
                        {member.relation && <p className="text-sm text-gray-500">{member.relation}</p>}
                      </div>
                    </div>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: member.color }}
                      title="Cor identificadora"
                    />
                  </div>

                  {member.notes && (
                    <p className="text-sm text-gray-600 mb-4 italic">"{member.notes}"</p>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(member)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold transition"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold transition"
                      title="Remover"
                    >
                      <Trash2 className="w-4 h-4" /> Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
