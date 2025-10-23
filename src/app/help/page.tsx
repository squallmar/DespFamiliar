'use client';

import { CircleAlert, Clock, CircleCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft size={20} />
            <span>Voltar</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Ajuda e Legenda</h1>
          <p className="text-gray-600 mt-2">
            Entenda os sinais, badges e tipos de itens na área de Contas
          </p>
        </div>

        {/* Legend Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Legenda de Tipos e Status
          </h2>
          
          <div className="space-y-6">
            {/* Tipos de Item */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Tipos de Item</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-semibold text-lg">Conta</span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      Item criado manualmente na área de Contas. Pode ter status Pendente ou Paga.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-600 font-semibold text-lg">Despesa</span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      Item vindo automaticamente das Despesas cadastradas para o mês selecionado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Status de Pagamento</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                    <CircleAlert size={12} />
                    Vencida
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      A data de vencimento já passou e o pagamento não foi registrado.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                    <Clock size={12} />
                    Vence em Xd
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      Faltam poucos dias para o vencimento (menos de 7 dias). Atenção necessária!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    <Clock size={12} />
                    Vence em Xd
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      O vencimento está mais adiante (7 dias ou mais). Situação normal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                    <CircleCheck size={12} />
                    Paga
                  </span>
                  <div className="flex-1">
                    <p className="text-gray-700">
                      A conta foi marcada como paga. Aparece apenas quando filtrado por status &quot;Todas&quot;.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recorrência */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Indicadores Especiais</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">🔄</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">Recorrente (Mensal/Semanal/Anual)</p>
                    <p className="text-gray-700">
                      Despesa que se repete automaticamente. Novas ocorrências são geradas conforme a frequência configurada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Ações Disponíveis */}
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-3">Ações Disponíveis</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-white rounded-lg">
                    <CircleCheck size={18} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">Marcar como Paga</p>
                    <p className="text-gray-700">
                      Para Contas pendentes: marca como paga.<br />
                      Para Despesas: cria uma Conta e marca como paga automaticamente.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-white rounded-lg">
                    <span className="text-blue-600 font-bold text-lg">+</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-1">Converter para Conta (pendente)</p>
                    <p className="text-gray-700">
                      Disponível apenas para Despesas. Cria uma Conta pendente a partir da despesa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tips Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Dicas</h3>
          <ul className="space-y-2 text-blue-800">
            <li>• Use os filtros de mês/ano para visualizar contas de períodos específicos</li>
            <li>• As Despesas aparecem automaticamente no mês configurado - não precisa cadastrar duas vezes</li>
            <li>• Passe o mouse sobre os badges coloridos para ver explicações rápidas</li>
            <li>• Os totais mostrados refletem apenas os itens filtrados na tela</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
