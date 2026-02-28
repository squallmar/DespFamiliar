'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';
import ProtectedRoute from '@/components/ProtectedRoute';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle } from 'lucide-react';

// Lista de avatares predefinidos - sem tons de pele para evitar problemas
const AVATARS = [
  // Pessoas básicas
  '👨', '👩', '🧑', '👦', '👧', '👶',
  '👴', '👵', '🧓', '🧔', '🤵', '👰',
  
  // Profissionais
  '👨‍💼', '👩‍💼', '👨‍💻', '👩‍💻', '👨‍🎓', '👩‍🎓',
  '👨‍⚕️', '👩‍⚕️', '👨‍🔧', '👩‍🔧', '👨‍🍳', '👩‍🍳',
  '👨‍🎨', '👩‍🎨', '👨‍🏫', '👩‍🏫', '👨‍🚀', '👩‍🚀',
  
  // Personagens
  '🤴', '👸', '🦸', '🦹', '🧙', '🧚',
  '🧛', '🧝', '🧞', '🧟',
  
  // Animais fofos
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🦉',
  '🦄', '🦋', '🐝', '🐞', '🦇', '🦅',
  
  // Emojis expressivos
  '😀', '😃', '😄', '😁', '😊', '😇',
  '🙂', '🤗', '🤩', '😎', '🤓', '🧐',
  '😌', '😏', '🥳', '🤠', '🥸', '🤡'
];

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar: '👤',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '👤'
      }));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validação de senha
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
  setMessage({ type: 'error', text: t.passwordsDontMatch });
      setLoading(false);
      return;
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setMessage({ type: 'error', text: t.passwordMinLength });
      setLoading(false);
      return;
    }

    try {
      const updateData: {
        name: string;
        email: string;
        avatar: string;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: formData.name,
        email: formData.email,
        avatar: formData.avatar
      };

      // Só inclui senha se o usuário quiser alterar
      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.error);
      }

      setMessage({ type: 'success', text: t.profileUpdated });
      
      // Limpa os campos de senha
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));

      // Atualiza os dados do usuário no contexto
      await refreshUser();

    } catch (error) {
  setMessage({ type: 'error', text: error instanceof Error ? error.message : t.error });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mr-4 text-4xl flex items-center justify-center w-16 h-16">
              {formData.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t.profileTitle}</h1>
              <p className="text-sm text-gray-500">{t.profileSubtitle}</p>
            </div>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t.avatar}</h2>
              <p className="text-sm text-gray-500 mb-4">{t.chooseAvatar}</p>
              {/* Avatar selecionado em destaque */}
              <div className="mb-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">{formData.avatar}</div>
                  <p className="text-sm text-gray-600 font-medium">{t.selectedAvatar}</p>
                </div>
              </div>
              {/* Galeria de avatares */}
              <div className="max-h-80 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar })}
                      className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 cursor-pointer ${
                        formData.avatar === avatar
                          ? 'bg-blue-500 ring-2 ring-blue-600 scale-110 shadow-lg'
                          : 'bg-white hover:bg-blue-50 shadow-sm'
                      }`}
                      title={t.avatar}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Informações Básicas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.basicInfo}</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.fullName}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.email}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Alterar Senha */}
            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.changePassword}</h2>
              <p className="text-sm text-gray-500 mb-4">{t.leaveBlankPassword}</p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.currentPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      id="currentPassword"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.currentPassword}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.newPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.newPassword}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    {t.confirmNewPassword}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t.confirmNewPassword}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                disabled={loading}
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                disabled={loading}
              >
                <Save className="h-5 w-5 mr-2" />
                {loading ? t.saving : t.saveChanges}
              </button>
            </div>
          </form>

          {/* Informações da Conta */}
          <div className="mt-6 pt-6 border-t">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t.accountInfo}</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium">{t.status}:</span>{' '}
                <span className={user.premium ? 'text-yellow-600 font-semibold' : 'text-gray-600'}>
                  {user.premium ? `⭐ ${t.premium}` : t.free}
                </span>
              </p>
              {user.admin && (
                <p>
                  <span className="font-medium">{t.type}:</span>{' '}
                  <span className="text-yellow-600 font-semibold">👑 {t.admin}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
