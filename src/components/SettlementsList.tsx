'use client';

import React from 'react';
import { Share2, TrendingUp, Loader } from 'lucide-react';
import useSWR from 'swr';

export interface Settlement {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  amount: number;
  status: 'pending' | 'settled';
  dueDate?: string;
}

interface SettlementsListProps {
  familyMembers: Array<{ id: string; name: string }>;
  currency: string;
  language: string;
  onSettle?: (from: string, to: string, amount: number) => void;
}

export default function SettlementsList({
  familyMembers,
  currency,
  language,
  onSettle,
}: SettlementsListProps) {
  const { data: settlements = [], isLoading, mutate } = useSWR<Settlement[]>(
    '/api/settlements',
    (url) => fetch(url, { credentials: 'include' }).then((r) => r.json()),
    { revalidateOnFocus: false }
  );

  const handleSettle = async (settlement: Settlement) => {
    try {
      await fetch('/api/settlements/settle', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: settlement.from,
          to: settlement.to,
          amount: settlement.amount,
        }),
      });

      mutate();
      onSettle?.(settlement.from, settlement.to, settlement.amount);
    } catch (error) {
      console.error('Error settling:', error);
    }
  };

  const pendingSettlements = settlements.filter((s) => s.status === 'pending');
  const totalPending = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Share2 className="text-indigo-600" size={24} />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Acertos de Contas</h2>
            <p className="text-sm text-gray-600">Gerencie quem deve para quem</p>
          </div>
        </div>
        {totalPending > 0 && (
          <div className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-bold text-sm">
            Total: {totalPending.toFixed(2)} {currency}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : settlements.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          <Share2 size={40} className="mx-auto text-gray-300 mb-2" />
          <p>Nenhum acerto pendente!</p>
        </div>
      ) : (
        <>
          {/* Pending Settlements */}
          {pendingSettlements.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700">Pendentes ({pendingSettlements.length})</h3>
              {pendingSettlements.map((settlement, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {settlement.fromName}{' '}
                      <span className="text-gray-600">deve para</span> {settlement.toName}
                    </p>
                    <p className="text-sm text-red-700 font-bold">
                      {settlement.amount.toFixed(2)} {currency}
                    </p>
                  </div>

                  <button
                    onClick={() => handleSettle(settlement)}
                    className="px-3 py-1 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition text-sm"
                  >
                    Acertar
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Settled */}
          {settlements.filter((s) => s.status === 'settled').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-700">
                Acertadas ({settlements.filter((s) => s.status === 'settled').length})
              </h3>
              {settlements
                .filter((s) => s.status === 'settled')
                .map((settlement, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg opacity-60"
                  >
                    <div>
                      <p className="text-sm text-gray-600">
                        {settlement.fromName} → {settlement.toName}
                      </p>
                      <p className="font-semibold text-green-700">
                        {settlement.amount.toFixed(2)} {currency}
                      </p>
                    </div>
                    <span className="text-green-700 font-bold">✓ Paga</span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
