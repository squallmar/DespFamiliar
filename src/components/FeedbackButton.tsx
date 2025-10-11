import { useState } from 'react';

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
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
        body: JSON.stringify({ message, email, page: window.location.pathname })
      });
      if (res.ok) {
        setSuccess(true);
        setMessage('');
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar feedback.');
      }
    } catch {
      setError('Erro ao enviar feedback.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg p-4 flex items-center gap-2 focus:outline-none cursor-pointer"
        onClick={() => setOpen(true)}
        aria-label="Enviar feedback"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8a9 9 0 100-18 9 9 0 000 18zm3-7v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2z" /></svg>
        Feedback
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600" onClick={() => setOpen(false)}>&times;</button>
            <h2 className="text-lg font-bold mb-2">Enviar feedback ou relatar erro</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                className="w-full border rounded p-2 min-h-[80px] focus:ring-2 focus:ring-blue-500"
                placeholder="Descreva o problema ou sugestão..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                required
                minLength={5}
                disabled={loading}
              />
              <input
                className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-500"
                type="email"
                placeholder="Seu email (opcional)"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
              />
              {error && <div className="text-red-600 text-sm">{error}</div>}
              {success && <div className="text-green-600 text-sm">Feedback enviado com sucesso!</div>}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded disabled:opacity-50"
                disabled={loading || !message.trim()}
              >
                {loading ? 'Enviando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
