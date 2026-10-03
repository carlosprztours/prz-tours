/**
 * Botón de eliminar genérico del panel (componente de cliente).
 *
 * Recibe la Server Action a ejecutar. Pide confirmación antes de borrar.
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  locale: string;
  id: number;
  action: (
    locale: string,
    id: number,
  ) => Promise<{ ok: boolean; error?: string }>;
  confirmMessage: string;
  label: string;
};

export function DeleteButton({ locale, id, action, confirmMessage, label }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(confirmMessage)) return;
        startTransition(async () => {
          const res = await action(locale, id);
          if (!res.ok) alert(res.error ?? "?");
          router.refresh();
        });
      }}
      className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
