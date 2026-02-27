'use client';

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { BarChart3, Home, TrendingUp, LogOut, User, Bell, CreditCard, DollarSign, Users, HelpCircle, Menu, X, Settings, ChevronDown } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useLocation } from "../contexts/LocationContext";
import translations, { resolveLanguage } from "../lib/translations";
import { useNewAchievements } from "../hooks/useNewAchievements";

export default function Navigation() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const pathname = usePathname();
  const { language, currency, setLanguage, setCurrency, loading } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const { newCount } = useNewAchievements();

  const getFirstLast = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    return parts[0];
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

  const navLinks = [
    { href: '/', label: t.dashboard, icon: Home },
    { href: '/bills', label: t.bills || 'Contas', icon: CreditCard },
    { href: '/income', label: t.monthlyIncome || 'Proventos', icon: DollarSign },
    { href: '/family', label: t.familyMembers || 'Família', icon: Users },
    { href: '/projections', label: t.projections, icon: TrendingUp },
    { href: '/reports', label: t.reports, icon: BarChart3 },
    { href: '/achievements', label: t.achievements || 'Conquistas', icon: Bell, badge: newCount },
  ];

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo e menu principal */}
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex-shrink-0 flex items-center group">
              <div className="relative">
                <BarChart3 className="h-9 w-9 text-white transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:bg-white/30 transition-all"></div>
              </div>
              <span className="ml-3 text-xl font-bold text-white tracking-tight">
                {t.appName}
              </span>
            </Link>

            {/* Links desktop */}
            <div className="hidden lg:ml-8 lg:flex lg:space-x-3 lg:mr-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/20 text-white shadow-md'
                        : 'text-blue-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span>{link.label}</span>
                    {link.badge && link.badge > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse shadow-lg">
                        {link.badge}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Botões direita */}
          <div className="flex items-center space-x-3">
            {/* Seletores idioma/moeda */}
            <div className="hidden md:flex items-center space-x-2">
              <select
                className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm backdrop-blur-sm hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                value={language}
                onChange={e => setLanguage && setLanguage(e.target.value)}
                disabled={loading}
                aria-label="Selecionar idioma"
              >
                <option value="pt-BR" className="bg-blue-600">🇧🇷 PT</option>
                <option value="en-US" className="bg-blue-600">🇺🇸 EN</option>
                <option value="es-ES" className="bg-blue-600">🇪🇸 ES</option>
              </select>
              <select
                className="bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm backdrop-blur-sm hover:bg-white/20 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
                value={currency}
                onChange={e => setCurrency && setCurrency(e.target.value)}
                disabled={loading}
                aria-label="Selecionar moeda"
              >
                <option value="BRL" className="bg-blue-600">R$</option>
                <option value="USD" className="bg-blue-600">$</option>
                <option value="EUR" className="bg-blue-600">€</option>
              </select>
            </div>

            {/* Menu do usuário */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-lg transition-all backdrop-blur-sm"
              >
                <span className="text-xl">{user.avatar || '👤'}</span>
                <span className="hidden md:block text-white text-sm font-medium">
                  {getFirstLast(user.name)}
                </span>
                <ChevronDown className={`h-4 w-4 text-white transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="py-1">
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="mr-3 h-4 w-4 text-blue-600" />
                      <span>{t.profile || 'Perfil'}</span>
                    </Link>
                    <Link
                      href="/help"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <HelpCircle className="mr-3 h-4 w-4 text-blue-600" />
                      <span>{t.help || 'Ajuda'}</span>
                    </Link>
                    {user.admin && (
                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <Link
                          href="/admin/users"
                          className="flex items-center px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="mr-3 h-4 w-4 text-amber-600" />
                          <span>Admin: Usuários</span>
                        </Link>
                        <Link
                          href="/admin/feedbacks"
                          className="flex items-center px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="mr-3 h-4 w-4 text-amber-600" />
                          <span>Admin: Feedbacks</span>
                        </Link>
                      </div>
                    )}
                    <div className="border-t border-gray-200 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="mr-3 h-4 w-4 text-red-600" />
                        <span>{t.logout}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Botão menu mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-blue-700 border-t border-blue-500/50">
          <div className="px-4 pt-2 pb-4 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-all ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="flex-1">{link.label}</span>
                  {link.badge && link.badge > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {/* Seletores mobile */}
            <div className="pt-4 mt-4 border-t border-blue-500/50 space-y-3">
              <div>
                <label className="block text-xs text-blue-200 mb-1.5 px-3">Idioma</label>
                <select
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
                  value={language}
                  onChange={e => setLanguage && setLanguage(e.target.value)}
                  disabled={loading}
                >
                  <option value="pt-BR" className="bg-blue-600">🇧🇷 Português</option>
                  <option value="en-US" className="bg-blue-600">🇺🇸 English</option>
                  <option value="es-ES" className="bg-blue-600">🇪🇸 Español</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-200 mb-1.5 px-3">Moeda</label>
                <select
                  className="w-full bg-white/10 text-white border border-white/20 rounded-lg px-3 py-2 text-sm"
                  value={currency}
                  onChange={e => setCurrency && setCurrency(e.target.value)}
                  disabled={loading}
                >
                  <option value="BRL" className="bg-blue-600">R$ - Real</option>
                  <option value="USD" className="bg-blue-600">$ - Dólar</option>
                  <option value="EUR" className="bg-blue-600">€ - Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}