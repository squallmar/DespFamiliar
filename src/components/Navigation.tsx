'use client';

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { BarChart3, Home, Receipt, TrendingUp, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useLocation } from "../contexts/LocationContext";
import translations from "../lib/translations";

export default function Navigation() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const adminRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora
  useEffect(() => {
    if (!adminOpen) return;
    function handleClick(e: MouseEvent) {
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [adminOpen]);

  // Fecha o menu do usuário ao clicar fora
  useEffect(() => {
    if (!userMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [userMenuOpen]);
  const { user, logout } = useAuth();
  const router = useRouter();
  const { language, currency, setLanguage, setCurrency, loading } = useLocation();
  const t = translations[language as 'pt-BR' | 'en-US' | 'es-ES'] || translations['pt-BR'];

  const getFirstLast = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

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
          <div className="flex min-w-0">
            <div className="flex-shrink-0 flex items-center min-w-[180px]">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{t.appName}</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4 flex-1 min-w-0">
              <Link
                href="/"
                className="text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium truncate max-w-[120px] cursor-pointer"
                style={{minWidth: 0}}
              >
                <Home className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t.dashboard}</span>
              </Link>
              <Link
                href="/expenses"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium truncate max-w-[120px] cursor-pointer"
                style={{minWidth: 0}}
              >
                <Receipt className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t.expenses}</span>
              </Link>
              <Link
                href="/projections"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium truncate max-w-[120px] cursor-pointer"
                style={{minWidth: 0}}
              >
                <TrendingUp className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{t.projections}</span>
              </Link>
              <Link
                href="/reports"
                className="text-gray-500 hover:text-gray-900 inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium truncate max-w-[120px] cursor-pointer"
                style={{minWidth: 0}}
              >
                <span className="truncate">{t.reports}</span>
              </Link>
              {/* ADMIN badge destacado */}
              {/* ...existing code... */}
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
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center hover:bg-gray-100 px-3 py-2 rounded-md transition-colors cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{getFirstLast(user.name)}</span>
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="inline-block mr-2 h-4 w-4" />
                      Meu Perfil
                    </Link>
                  </div>
                )}
              </div>
              {user.admin && (
                <div className="ml-3 relative" ref={adminRef}>
                  <button
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold px-4 py-1 rounded shadow uppercase text-xs tracking-widest border border-yellow-700 cursor-pointer focus:outline-none"
                    onClick={() => setAdminOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={adminOpen}
                  >
                    ADMIN
                  </button>
                  {adminOpen && (
                    <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg border border-yellow-200 z-50">
                      <Link href="/admin/users" className="block px-4 py-2 text-sm text-gray-800 hover:bg-yellow-50 cursor-pointer" onClick={() => setAdminOpen(false)}>
                        Usuários
                      </Link>
                      <Link href="/admin/feedbacks" className="block px-4 py-2 text-sm text-gray-800 hover:bg-yellow-50 cursor-pointer" onClick={() => setAdminOpen(false)}>
                        Feedbacks
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
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