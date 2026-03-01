import React, { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { useTranslation } from '@/lib/translations';
import { Check, X, Crown, Lock, Zap } from 'lucide-react';
import AsaasSubscriptionModal from './AsaasSubscriptionModal';

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ open, onClose, onUpgrade }) => {
  const { countryCode, loading, language } = useLocation();
  const { t } = useTranslation(language);
  const [asaasModalOpen, setAsaasModalOpen] = useState(false);
  
  if (!open) return null;

  const features = [
    { name: 'exportPDF', free: false, premium: true },
    { name: 'exportExcel', free: false, premium: true },
    { name: 'backup', free: false, premium: true },
    { name: 'alerts', free: true, premium: true },
    { name: 'advancedReports', free: false, premium: true },
    { name: 'prioritySupport', free: false, premium: true },
    { name: 'unlimitedExpenses', free: false, premium: true },
    { name: 'familyMembers', free: true, premium: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full relative my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 rounded-t-2xl relative">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-white hover:text-gray-200 text-2xl font-bold cursor-pointer bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Crown className="text-yellow-300" size={40} />
            <h2 className="text-4xl font-bold text-white">{t('premiumTitle') || 'Upgrade to Premium'}</h2>
          </div>
          <p className="text-center text-indigo-100 text-lg">{t('premiumDesc') || 'Desbloqueie todo o potencial do seu controle financeiro'}</p>
        </div>

        <div className="p-8">
          {/* Comparison Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Free Plan */}
            <div className="border-2 border-gray-200 rounded-xl p-6 bg-gray-50">
              <div className="text-center mb-6">
                <Lock className="mx-auto text-gray-400 mb-2" size={32} />
                <h3 className="text-2xl font-bold text-gray-700">Grátis</h3>
                <p className="text-gray-500 text-sm">Funcionalidades básicas</p>
              </div>
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2">
                    {feature.free ? (
                      <Check size={18} className="text-green-500 flex-shrink-0" />
                    ) : (
                      <X size={18} className="text-red-400 flex-shrink-0" />
                    )}
                    <span className={feature.free ? 'text-gray-700' : 'text-gray-400 line-through'}>
                      {t(feature.name)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium Plan */}
            <div className="border-4 border-indigo-500 rounded-xl p-6 bg-gradient-to-br from-indigo-50 to-purple-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1">
                <Zap size={14} />
                POPULAR
              </div>
              <div className="text-center mb-6 mt-4">
                <Crown className="mx-auto text-indigo-600 mb-2" size={40} />
                <h3 className="text-3xl font-bold text-indigo-700">Premium</h3>
                <div className="mt-2">
                  <span className="text-4xl font-extrabold text-indigo-600">
                    {countryCode === 'BR' ? 'R$ 20' : '$15'}
                  </span>
                  <span className="text-gray-600">/mês</span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {features.map((feature) => (
                  <li key={feature.name} className="flex items-center gap-2">
                    <Check size={18} className="text-indigo-600 flex-shrink-0" />
                    <span className="text-gray-800 font-medium">{t(feature.name)}</span>
                  </li>
                ))}
              </ul>

              {/* Payment Buttons */}
              <div className="space-y-3">
                {!loading && (
                  <>
                    <button
                      onClick={() => setAsaasModalOpen(true)}
                      className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg font-bold text-lg hover:from-yellow-500 hover:to-yellow-600 transition shadow-lg hover:shadow-xl cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-6 h-6" viewBox="0 0 512 512" fill="currentColor">
                        <path d="M242.4 292.5C247.8 287.1 257.1 287.1 262.5 292.5L339.5 369.5C353.7 383.7 372.6 391.5 392.6 391.5H407.7L310.6 488.6C280.3 518.1 231.1 518.1 200.8 488.6L103.3 391.2H112.6C132.6 391.2 151.5 383.4 165.7 369.2L242.4 292.5zM262.5 218.9C257.1 224.3 247.8 224.3 242.4 218.9L165.7 142.2C151.5 127.1 132.6 120.2 112.6 120.2H103.3L200.7 22.8C231.1-7.6 280.3-7.6 310.6 22.8L407.8 119.9H392.6C372.6 119.9 353.7 127.7 339.5 141.9L262.5 218.9zM112.6 142.7C126.4 142.7 139.1 148.3 149.7 158.1L226.4 234.8C233.6 241.1 243 245.6 252.5 245.6C261.9 245.6 271.3 241.1 278.5 234.8L355.5 157.8C365.3 148.1 378.8 142.5 392.6 142.5H430.3L488.6 200.8C518.9 231.1 518.9 280.3 488.6 310.6L430.3 368.9H392.6C378.8 368.9 365.3 363.3 355.5 353.5L278.5 276.5C264.6 262.6 240.3 262.6 226.4 276.6L149.7 353.2C139.1 363 126.4 368.6 112.6 368.6H80.78L22.76 310.6C-7.59 280.3-7.59 231.1 22.76 200.8L80.78 142.7H112.6z"/>
                      </svg>
                      {t('subscribePix') || 'Assinar Premium Mensal'}
                    </button>

                    {countryCode !== 'BR' && (
                      <>
                        <button
                          onClick={onUpgrade}
                          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl cursor-pointer"
                        >
                          {t('subscribeStripe') || 'Assinar com Cartão'}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-8 text-sm text-gray-500 border-t pt-6">
            <div className="flex items-center gap-2">
              <Lock size={16} />
              <span>{t('securePayment') || 'Pagamento 100% seguro'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} />
              <span>Acesso imediato</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={16} />
              <span>Cancele quando quiser</span>
            </div>
          </div>
        </div>
      </div>
      <AsaasSubscriptionModal open={asaasModalOpen} onClose={() => setAsaasModalOpen(false)} />
    </div>
  );
};

export default PaywallModal;
