'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, MessageSquare, CreditCard } from 'lucide-react';

const links = [
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/feedbacks', label: 'Feedbacks', icon: MessageSquare },
  { href: '/admin/pix-payments', label: 'Pagamentos', icon: CreditCard },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-4 z-30 bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 p-2 mb-6">
      <nav className="flex flex-wrap gap-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
