import { redirect } from 'next/navigation';

export default function ExpensesRedirectPage() {
  // Redireciona toda a rota de Despesas para a nova página unificada de Contas
  redirect('/bills');
}