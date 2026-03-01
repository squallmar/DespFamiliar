import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle, Clock } from 'lucide-react';

interface AsaasSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
}

interface SubscriptionData {
  qrCodeImage: string;
  qrCodePayload: string;
  expiresAt: string;
  amount: number;
}

const AsaasSubscriptionModal: React.FC<AsaasSubscriptionModalProps> = ({ open, onClose }) => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [requestAttempted, setRequestAttempted] = useState(false);
  const requestLockRef = useRef(false);

  useEffect(() => {
    if (!open) {
      requestLockRef.current = false;
      setRequestAttempted(false);
      setLoading(false);
      setError('');
      setCopied(false);
      setConfirmed(false);
      setSubscriptionData(null);
      return;
    }

    if (!requestAttempted && !subscriptionData && !loading && !requestLockRef.current) {
      requestLockRef.current = true;
      setRequestAttempted(true);
      generateSubscriptionQrCode();
    }
  }, [open, requestAttempted, subscriptionData, loading]);

  const generateSubscriptionQrCode = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/premium/pix-asaas', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao gerar QR Code');
        return;
      }

      setSubscriptionData(data);
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPayload = async () => {
    if (!subscriptionData?.qrCodePayload) return;
    try {
      await navigator.clipboard.writeText(subscriptionData.qrCodePayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Erro ao copiar');
    }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-900 hover:text-gray-700 text-2xl font-bold cursor-pointer bg-white/20 rounded-full w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Assinatura Premium Mensal</h2>
          <p className="text-gray-800 text-sm mt-1">Renovação automática mensal</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          ) : confirmed ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="text-green-500 mb-4" size={48} />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Pagamento enviado!</h3>
              <p className="text-gray-600">Sua assinatura será ativada assim que confirmarmos o pagamento</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 font-bold mb-4">{error}</div>
              <button
                onClick={() => {
                  setError('');
                  generateSubscriptionQrCode();
                }}
                className="px-4 py-2 bg-yellow-500 text-gray-900 rounded-lg font-bold hover:bg-yellow-600 transition cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          ) : subscriptionData ? (
            <>
              {/* QR Code */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 flex items-center justify-center">
                <div className="bg-white p-3 rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${subscriptionData.qrCodeImage}`}
                    alt="QR Code de pagamento"
                    className="w-56 h-56"
                  />
                </div>
              </div>

              {/* Amount and Expiry */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Valor / Mês</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    R$ {subscriptionData.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Recorrente</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center flex flex-col items-center justify-center">
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Clock size={12} /> Renova em
                  </p>
                  <p className="text-sm font-bold text-orange-600">
                    {new Date(subscriptionData.expiresAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 border-t border-gray-300"></div>
                <span className="text-xs text-gray-500 font-semibold">OU</span>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Copy and Paste Code */}
              <div className="mb-4">
                <p className="text-xs text-gray-600 font-semibold mb-2">Código de pagamento (copia e cola):</p>
                <div className="bg-gray-50 p-3 rounded-lg flex gap-2">
                  <code className="flex-1 text-xs text-gray-700 break-all font-mono">
                    {subscriptionData.qrCodePayload}
                  </code>
                  <button
                    onClick={handleCopyPayload}
                    className={`flex-shrink-0 p-2 rounded transition cursor-pointer ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title="Copiar código"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-900 font-semibold mb-2">⚠️ Assinatura Mensal Recorrente:</p>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Cobrança automática de R$ {subscriptionData.amount.toFixed(2)} será renovada todo mês</li>
                  <li>Abra seu app bancário e realize o pagamento do QR Code abaixo</li>
                  <li>Após pagamento, será ativado Premium automático</li>
                  <li>Você pode cancelar a assinatura a qualquer momento</li>
                </ol>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 rounded-lg font-bold hover:from-yellow-500 hover:to-yellow-600 transition shadow-lg hover:shadow-xl cursor-pointer"
              >
                ✓ Confirmei o Pagamento
              </button>

              <p className="text-center text-xs text-gray-500 mt-3">
                Assinatura mensal recorrente. Ativação automática em até 2 minutos após confirmação do pagamento.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AsaasSubscriptionModal;
