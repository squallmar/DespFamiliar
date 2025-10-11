"use client";
import { useState } from "react";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null); // Para teste

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setToken(null);
    const res = await fetch("/api/auth/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(true);
      setToken(data.token || null); // Mostra token para teste
    } else {
      setError(data.error || "Erro ao solicitar reset");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Recuperar senha</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          className="w-full border rounded p-2"
          placeholder="Seu email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 font-bold">Enviar link de recuperação</button>
      </form>
      {success && <div className="mt-4 text-green-600">Se o email existir, um link de redefinição foi enviado.</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
      {token && (
        <div className="mt-4 text-xs text-gray-500">Token para teste: <span className="font-mono">{token}</span></div>
      )}
    </div>
  );
}
