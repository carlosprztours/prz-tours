/**
 * Botón de envío con estado pendiente (componente de cliente).
 *
 * Usa `useFormStatus` para deshabilitarse y mostrar "buscando" mientras el
 * formulario del servidor responde. Evita dobles envíos.
 */
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 rounded-full bg-ocean-700 font-display text-base font-bold text-white transition hover:bg-ocean-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
