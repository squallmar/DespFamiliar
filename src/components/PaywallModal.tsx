import React from 'react';
import { useLocation } from '@/contexts/LocationContext';
//
interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onClose, onUpgrade }) => {
  const { countryCode, currency, loading } = useLocation();
  if (!open) return null;
  const handlePix = () => {
    window.open('https://api.whatsapp.com/send?phone=SEU_NUMERO_PIX&text=Quero%20assinar%20o%20premium%20por%20R$20%20via%20Pix', '_blank');
  };
  const handleCrypto = () => {
    window.open('https://commerce.coinbase.com/checkout/SEU_LINK_CRIPTO', '_blank');
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-2 text-center text-indigo-700">Desbloqueie o Premium</h2>
        <p className="mb-4 text-center text-gray-700">Acesse exportação PDF/Excel, backup, conquistas, integrações e muito mais!</p>
        <ul className="mb-4 text-gray-600 text-sm list-disc pl-5">
          <li>Exportação PDF, Excel, CSV</li>
          <li>Backup e restauração em 1 clique</li>
          <li>Alertas e conquistas exclusivas</li>
          <li>Projeções e relatórios avançados</li>
          <li>Suporte prioritário</li>
        </ul>
        {/* Exibe apenas Pix se for Brasil, senão Stripe/cripto */}
        {!loading && countryCode === 'BR' ? (
          <button
            onClick={handlePix}
            className="w-full py-3 bg-yellow-400 text-gray-900 rounded font-bold text-lg hover:bg-yellow-500 transition mb-2 cursor-pointer"
          >
            Assinar via Pix (R$20)
          </button>
        ) : !loading && (
          <>
            <button
              onClick={onUpgrade}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white rounded font-bold text-lg hover:from-indigo-700 hover:to-blue-600 transition mb-2 cursor-pointer"
            >
              Assinar Premium (Stripe $15/mês)
            </button>
            <button
              onClick={handleCrypto}
              className="w-full py-3 bg-gray-900 text-white rounded font-bold text-lg hover:bg-gray-800 transition mb-2 cursor-pointer"
            >
              Assinar com Cripto (USD)
            </button>
          </>
        )}
        <p className="text-xs text-gray-400 text-center">Pagamento seguro {countryCode === 'BR' ? 'via Pix' : 'via Stripe ou Cripto'}</p>
      </div>
    </div>
  );
};

export default PaywallModal;
