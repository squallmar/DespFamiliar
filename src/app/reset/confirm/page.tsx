import { Suspense } from "react";
import ResetConfirmForm from "./reset-confirm-form";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <ResetConfirmForm />
    </Suspense>
  );
}
