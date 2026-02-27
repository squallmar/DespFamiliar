import React from 'react';
import type { FamilyMember } from '@/types';

interface FamilyMemberSelectorProps {
  members: FamilyMember[];
  value: string | undefined;
  onChange: (memberId: string | undefined) => void;
  label: string;
  optional?: boolean;
  className?: string;
}

export default function FamilyMemberSelector({
  members,
  value,
  onChange,
  label,
  optional = true,
  className = ''
}: FamilyMemberSelectorProps) {
  const selected = members.find(m => m.id === value);

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {optional && <span className="text-gray-400 ml-1">(Opcional)</span>}
      </label>
      <div className="flex items-center gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
        >
          <option value="">Ninguém específico</option>
          {members.map(member => (
            <option key={member.id} value={member.id}>
              {member.avatar} {member.name}
            </option>
          ))}
        </select>
        {selected && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
            style={{ backgroundColor: selected.color }}
            title={selected.name}
          >
            {selected.avatar}
          </div>
        )}
      </div>
    </div>
  );
}
