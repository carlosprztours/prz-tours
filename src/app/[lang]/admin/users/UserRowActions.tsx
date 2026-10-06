/**
 * Acciones por fila de usuario: cambiar rol con un desplegable claro,
 * activar/desactivar y eliminar (componente de cliente).
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteUser,
  setStaffRole,
  setUserActive,
} from "@/lib/admin/users";
import { isSuperAdminEmail } from "@/lib/admin/roles";
import type { User, UserRole } from "@/types";

type Props = {
  locale: string;
  user: User;
  isMe: boolean;
  labels: {
    activate: string;
    deactivate: string;
    promote: string;
    makeEditor: string;
    makePhotographer: string;
    makeAdmin: string;
    remove: string;
    confirmRemove: string;
    done: string;
    failed: string;
  };
};

export function UserRowActions({ locale, user, isMe, labels }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const protectedUser = isSuperAdminEmail(user.email);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) alert(`${labels.failed} (${res.error})`);
      router.refresh();
    });
  };

  const btn =
    "rounded-full px-3 py-1.5 text-xs font-bold transition disabled:opacity-50";

  const cambiable = !isMe && !protectedUser && !pending;

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {/* Siempre un desplegable para elegir el rol, nada de botones que ciclen. */}
      <label className="flex items-center gap-1 rounded-full border border-sand-200 bg-white px-2 py-1">
        <span className="text-[11px] font-bold text-ink-500">Rol</span>
        <select
          value={user.role}
          disabled={!cambiable}
          onChange={(e) =>
            run(() => setStaffRole(locale, user.id, e.target.value as UserRole))
          }
          className="bg-transparent text-xs font-bold text-ocean-800 outline-none disabled:opacity-50"
          aria-label={`Rol de ${user.name}`}
        >
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="photographer">Fotógrafo</option>
          <option value="customer">Cliente</option>
        </select>
      </label>

      <button
        disabled={pending || isMe || protectedUser}
        onClick={() => run(() => setUserActive(locale, user.id, user.is_active !== 1))}
        className={`${btn} bg-slate-100 text-slate-700 hover:bg-slate-200`}
      >
        {user.is_active === 1 ? labels.deactivate : labels.activate}
      </button>
      <button
        disabled={pending || isMe || protectedUser}
        onClick={() => {
          if (confirm(labels.confirmRemove)) run(() => deleteUser(locale, user.id));
        }}
        className={`${btn} bg-red-100 text-red-700 hover:bg-red-200`}
      >
        {labels.remove}
      </button>
    </span>
  );
}
