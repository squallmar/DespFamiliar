import FinancialProjections from '@/components/FinancialProjections';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function ProjectionsPage() {
  return (
    <ProtectedRoute>
      <FinancialProjections />
    </ProtectedRoute>
  );
}