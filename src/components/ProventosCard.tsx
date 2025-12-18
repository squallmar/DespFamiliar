"use client";

import React, { useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from '@/contexts/LocationContext';

type Props = {
  period?: { month: number; year: number };
  totalMonth?: number;
};

function parseBRL(value: string) {
  const cleaned = (value || '').replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  return Number(cleaned) / 100;
}

function formatBRLFromNumber(n: number) {
  try {
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch {
    return String(n);
  }
}

function formatBRLInput(text: string) {
  const digits = (text || '').replace(/\D/g, '');
  const number = Number(digits || '0') / 100;
  return formatBRLFromNumber(number);
}

export default function ProventosCard({ period, totalMonth = 0 }: Props) {
  const { user } = useAuth();
  const { language } = useLocation();
  const month = period?.month ?? new Date().getMonth() + 1;
  const year = period?.year ?? new Date().getFullYear();
  const getKey = (m: number, y: number) => `proventos_${y}_${m}`;

  const [salario, setSalario] = useState('');
  const [extra, setExtra] = useState('');
  const [outros, setOutros] = useState('');
  const [loading, setLoading] = useState(false);

  const total = parseBRL(salario) + parseBRL(extra) + parseBRL(outros);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const key = getKey(month, year);
      try {
        if (user && user.id) {
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
          const json = await res.json();
          if (res.ok && json.items && json.items.length > 0) {
            const item = json.items[0];
            const amount = Number(item.amount) || 0;
            // try to read notes as detail list
            let salarioVal = '';
            let extraVal = '';
            let outrosVal = '';
            try {
              const notes = item.notes ? JSON.parse(item.notes) : null;
              if (notes?.items && Array.isArray(notes.items)) {
                salarioVal = notes.items[0]?.amount ? formatBRLFromNumber(Number(notes.items[0].amount)) : '';
                extraVal = notes.items[1]?.amount ? formatBRLFromNumber(Number(notes.items[1].amount)) : '';
                outrosVal = notes.items[2]?.amount ? formatBRLFromNumber(Number(notes.items[2].amount)) : '';
              }
            } catch (e) {
              // ignore
            }
            // if no detailed values, set total into salario field
            if (!salarioVal && !extraVal && !outrosVal) salarioVal = formatBRLFromNumber(amount);
            setSalario(salarioVal);
            setExtra(extraVal);
            setOutros(outrosVal);
            setLoading(false);
            return;
          }
        }
        const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const amount = Number(parsed?.amount ?? 0) || 0;
            const items = parsed?.items ?? [];
            if (items.length >= 3) {
              setSalario(formatBRLFromNumber(Number(items[0].amount || 0)));
              setExtra(formatBRLFromNumber(Number(items[1].amount || 0)));
              setOutros(formatBRLFromNumber(Number(items[2].amount || 0)));
            } else {
              setSalario(formatBRLFromNumber(amount));
            }
          } catch {
            // fallback
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month, year, user]);

  const save = async () => {
    const key = getKey(month, year);
    const items = [
      { label: 'Salário', amount: parseBRL(salario) },
      { label: 'Renda Extra', amount: parseBRL(extra) },
      { label: 'Outros', amount: parseBRL(outros) }
    ];
    const payload = { amount: total, notes: JSON.stringify({ items }) };
    try {
      if (user && user.id) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.items && json.items.length > 0) {
          const id = json.items[0].id;
          await fetch('/api/incomes', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, month: monthKey, amount: payload.amount, notes: payload.notes }) });
        } else {
          await fetch('/api/incomes', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: monthKey, amount: payload.amount, notes: payload.notes }) });
        }
      } else {
        window.localStorage.setItem(key, JSON.stringify({ amount: payload.amount, items }));
      }
      alert('Proventos salvos.');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar proventos.');
    }
  };

  const clear = async () => {
    const key = getKey(month, year);
    try {
      if (user && user.id) {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const res = await fetch(`/api/incomes?month=${monthKey}`, { credentials: 'include' });
        const json = await res.json();
        if (res.ok && json.items && json.items.length > 0) {
          const id = json.items[0].id;
          await fetch(`/api/incomes?id=${id}`, { method: 'DELETE', credentials: 'include' });
        }
      }
      window.localStorage.removeItem(key);
      setSalario('');
      setExtra('');
      setOutros('');
      alert('Proventos removidos.');
    } catch (e) {
      console.error(e);
      alert('Erro ao limpar proventos.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <div className="p-6 space-y-6 w-full">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-full bg-emerald-500">
          <PiggyBank className="text-white" size={28} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-800">Proventos – {new Date(year, month-1).toLocaleString(language, { month: 'long', year: 'numeric' })}</h2>
          <p className="text-sm text-gray-500">Informe seus rendimentos separadamente.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputBRL label="Salário" value={salario} onChange={setSalario} />
        <InputBRL label="Renda Extra" value={extra} onChange={setExtra} />
        <InputBRL label="Outros" value={outros} onChange={setOutros} />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-gray-600 font-medium">Total de Proventos</span>
        <span className="text-2xl font-bold text-emerald-600">{formatBRLFromNumber(total)}</span>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => { setSalario(''); setExtra(''); setOutros(''); }} className="px-4 py-2 rounded-lg border">Limpar</button>
        <button onClick={() => save()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold">Salvar</button>
      </div>
        </div>
      </div>
    </div>
  );
}

function InputBRL({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(formatBRLInput(e.target.value))}
        placeholder="R$ 0,00"
        className="w-full text-right border rounded-lg px-4 py-2 font-semibold focus:ring-2 focus:ring-emerald-400"
      />
    </div>
  );
}
