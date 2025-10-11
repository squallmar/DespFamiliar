'use client';

import Link from "next/link";
import { BarChart3, Home, Receipt, TrendingUp, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useLocation } from "../contexts/LocationContext";
import translations from "../lib/translations";

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { language, currency, setLanguage, setCurrency, loading } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!user) {
    return null; // Não mostrar navegação se não estiver logado
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t.appName}</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium"
              >
                <Home className="mr-2 h-4 w-4" />
                {t.dashboard}
              </Link>
              <Link
                href="/expenses"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium"
              >
                <Receipt className="mr-2 h-4 w-4" />
                {t.expenses}
              </Link>
              <Link
                href="/projections"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                {t.projections}
              </Link>
              <Link
                href="/reports"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium"
              >
                {t.reports}
              </Link>
            </div>
          </div>
          {/* Seletor de idioma/moeda */}
          <div className="flex items-center space-x-4">
            <div>
              <select
                className="border rounded px-2 py-1 text-sm mr-2"
                value={language}
                onChange={e => setLanguage && setLanguage(e.target.value)}
                disabled={loading}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español (ES)</option>
              </select>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={currency}
                onChange={e => setCurrency && setCurrency(e.target.value)}
                disabled={loading}
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <User className="mr-2 h-4 w-4" />
              <span>{user.name}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t.logout}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}