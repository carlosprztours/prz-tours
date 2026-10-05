/**
 * Acciones por fila de usuario: activar/desactivar, promover, eliminar
 * (componente de cliente).
 */
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteUser,
  promoteCustomer,
  setStaffRole,
  setUserActive,
} from "@/lib/admin/users";
import { isSuperAdminEmail } from "@/lib/admin/roles";
import type { User } from "@/types";

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

  return (
    <span className="flex flex-wrap gap-1.5">
      {user.role === "customer" ? (
        <button
          disabled={pending || isMe || protectedUser}
          onClick={() => run(() => promoteCustomer(locale, user.id, "editor"))}
          className={`${btn} bg-coral-700 text-white hover:bg-coral-800`}
        >
          {labels.promote}
        </button>
      ) : (
        <>
          <button
            disabled={pending || isMe || protectedUser}
            onClick={() =>
              run(() =>
                setStaffRole(
                  locale,
                  user.id,
                  user.role === "admin"
                    ? "editor"
                    : user.role === "editor"
                      ? "photographer"
                      : "admin",
                ),
              )
            }
            className={`${btn} bg-ocean-100 text-ocean-800 hover:bg-ocean-200`}
          >
            {user.role === "admin"
              ? labels.makeEditor
              : user.role === "editor"
                ? labels.makePhotographer
                : labels.makeAdmin}
          </button>
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
        </>
      )}
    </span>
  );
}
