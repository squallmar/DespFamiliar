"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocation } from '@/contexts/LocationContext';
import translations, { resolveLanguage } from '@/lib/translations';

export default function ResetConfirmForm() {
  const { language } = useLocation();
  const langKey = resolveLanguage(language);
  const t = translations[langKey] || translations['pt-BR'];
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
      setError(t.invalidToken || "Token inválido");
      return;
    }

    if (password !== confirm) {
      setError(t.passwordsDoNotMatch || "As senhas não coincidem");
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
      setError(data.error || t.resetPasswordError || "Erro ao redefinir senha");
    }
  };

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">{t.setNewPassword || 'Definir nova senha'}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder={t.newPasswordPlaceholder || "Nova senha"}
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />

        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder={t.confirmNewPasswordPlaceholder || "Confirme a nova senha"}
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />

        <button type="submit" className="w-full bg-blue-600 text-white rounded p-2 font-bold">
          {t.resetPassword || 'Redefinir senha'}
        </button>
      </form>

      {success && (
        <div className="mt-4 text-green-600">
          {t.passwordResetSuccess || 'Senha redefinida com sucesso! Redirecionando...'}
        </div>
      )}

      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
