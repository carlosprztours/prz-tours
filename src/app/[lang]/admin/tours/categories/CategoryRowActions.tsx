/**
 * Acciones de una categoría: activar/desactivar y eliminar.
 */
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { deleteTourCategory, toggleTourCategory } from "@/lib/admin/categories";

type Props = {
  locale: string;
  id: number;
  active: boolean;
  labels: {
    activate: string;
    deactivate: string;
    remove: string;
    confirmRemove: string;
    failed: string;
  };
};

export function CategoryRowActions({ locale, id, active, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) alert(labels.failed);
      router.refresh();
    });
  };

  const btn =
    "rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50";

  return (
    <span className="flex flex-wrap gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => toggleTourCategory(locale, id, !active))}
        className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
      >
        {active ? labels.deactivate : labels.activate}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm(labels.confirmRemove)) run(() => deleteTourCategory(locale, id));
        }}
        className={`${btn} bg-red-100 text-red-700 hover:bg-red-200`}
      >
        {labels.remove}
      </button>
    </span>
  );
}