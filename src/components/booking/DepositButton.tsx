/**
 * Botón "Pagar anticipo" (componente de cliente).
 *
 * Pide la sesión de Stripe Checkout a nuestra API y redirige. Si Stripe no
 * está configurado o algo falla, muestra el error sin romper la página
 * (la reserva ya existe; el anticipo se puede cobrar por otro medio).
 */
"use client";

import { useState } from "react";

export function DepositButton({
  reference,
  email,
  amount,
  currency,
  labels,
}: {
  reference: string;
  email: string;
  amount: number;
  currency: string;
  labels: {
    pay: string;
    paying: string;
    failed: string;
  };
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pay = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error("checkout");
      window.location.href = data.url;
    } catch {
      setError(labels.failed);
      setPending(false);
    }
  };

  return (
    <span className="grid gap-2">
      <button
        type="button"
        onClick={pay}
        disabled={pending}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ocean-700 px-7 font-display text-base font-bold text-white shadow-lg transition hover:bg-ocean-800 disabled:cursor-wait disabled:opacity-70"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 10h18" />
        </svg>
        {pending ? labels.paying : labels.pay} · ${amount} {currency}
      </button>
      {error && (
        <span className="text-xs font-semibold text-red-600" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
