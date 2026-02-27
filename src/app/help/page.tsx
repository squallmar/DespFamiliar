'use client';

import { CircleAlert, Clock, CircleCheck, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';

export default function HelpPage() {
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email, page: '/help' })
      });
      if (res.ok) {
        setSuccess(true);
        setMessage('');
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || t.feedbackError || 'Erro ao enviar feedback.');
      }
    } catch {
      setError(t.feedbackError || 'Erro ao enviar feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>{t.back || 'Voltar'}</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{t.helpLegendTitle || 'Ajuda e Legenda'}</h1>
          <p className="text-gray-600 mt-2">
            {t.helpLegendSubtitle || 'Entenda os sinais, badges e tipos de itens na área de Contas'}
          </p>
        </div>

        {/* Legend Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            {t.legendTitle || 'Legenda de Tipos e Status'}
          </h2>
          
          <div className="space-y-6">
            {/* Tipos de Item */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t.itemTypes || 'Tipos de Item'}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-semibold text-lg">{t.itemTypeBill || 'Conta'}</span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.itemTypeBillDesc || 'Item criado manualmente na área de Contas. Pode ter status Pendente ou Paga.'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-600 font-semibold text-lg">{t.itemTypeExpense || 'Despesa'}</span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.itemTypeExpenseDesc || 'Item vindo automaticamente das Despesas cadastradas para o mês selecionado.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t.paymentStatus || 'Status de Pagamento'}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    <CircleAlert size={12} />
                    {t.statusOverdue || 'Vencida'}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.statusOverdueDesc || 'A data de vencimento já passou e o pagamento não foi registrado.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                    <Clock size={12} />
                    {t.statusDueSoon || 'Vence em Xd'}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.statusDueSoonDesc || 'Faltam poucos dias para o vencimento (menos de 7 dias). Atenção necessária!'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    <Clock size={12} />
                    {t.statusDueLater || 'Vence em Xd'}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.statusDueLaterDesc || 'O vencimento está mais adiante (7 dias ou mais). Situação normal.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    <CircleCheck size={12} />
                    {t.statusPaidLabel || 'Paga'}
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      {t.statusPaidDesc || 'A conta foi marcada como paga. Aparece apenas quando filtrado por status "Todas".'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recorrência */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t.specialIndicators || 'Indicadores Especiais'}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">🔄</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">{t.recurringIndicator || 'Recorrente (Mensal/Semanal/Anual)'}</p>
                    <p className="text-gray-700">
                      {t.recurringIndicatorDesc || 'Despesa que se repete automaticamente. Novas ocorrências são geradas conforme a frequência configurada.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Disponíveis */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">{t.availableActions || 'Ações Disponíveis'}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-white rounded-lg">
                    <CircleCheck size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">{t.actionMarkPaid || 'Marcar como Paga'}</p>
                    <p className="text-gray-700">
                      {t.actionMarkPaidDesc?.split('\n').map((line, i) => (
                        <span key={i}>{line}{i === 0 && <br />}</span>
                      )) || 'Para Contas pendentes: marca como paga.Para Despesas: cria uma Conta e marca como paga automaticamente.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-white rounded-lg">
                    <span className="text-blue-600 font-bold text-lg">+</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">{t.actionConvertBill || 'Converter para Conta (pendente)'}</p>
                    <p className="text-gray-700">
                      {t.actionConvertBillDesc || 'Disponível apenas para Despesas. Cria uma Conta pendente a partir da despesa.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">{t.tipsTitle || '💡 Dicas'}</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• {t.tip1 || 'Use os filtros de mês/ano para visualizar contas de períodos específicos'}</li>
            <li>• {t.tip2 || 'As Despesas aparecem automaticamente no mês configurado - não precisa cadastrar duas vezes'}</li>
            <li>• {t.tip3 || 'Passe o mouse sobre os badges coloridos para ver explicações rápidas'}</li>
            <li>• {t.tip4 || 'Os totais mostrados refletem apenas os itens filtrados na tela'}</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.feedbackTitle || 'Feedback'}</h2>
          <p className="text-gray-600 mb-4">{t.feedbackSubtitle || 'Envie uma sugestão ou relate um erro.'}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              className="w-full border rounded p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500"
              placeholder={t.feedbackPlaceholder || 'Descreva o problema ou sugestão...'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              minLength={5}
              disabled={loading}
            />
            <input
              className="w-full border rounded p-3 focus:ring-2 focus:ring-blue-500"
              type="email"
              placeholder={t.feedbackEmailPlaceholder || 'Seu email (opcional)'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {success && <div className="text-green-600 text-sm">{t.feedbackSuccess || 'Feedback enviado com sucesso!'}</div>}
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              disabled={loading || !message.trim()}
            >
              <Send size={16} />
              {loading ? (t.sendingFeedback || 'Enviando...') : (t.sendFeedback || 'Enviar feedback')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
