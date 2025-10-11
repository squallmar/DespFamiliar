"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError("Token inválido");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setError(data.error || "Erro ao redefinir senha");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Definir nova senha</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Nova senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Confirme a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 font-bold">Redefinir senha</button>
      </form>
      {success && <div className="mt-4 text-green-600">Senha redefinida com sucesso! Redirecionando...</div>}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
