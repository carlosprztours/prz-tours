/**
 * Elegir cómo pagar una reserva: PayPal online o efectivo en el tour.
 *
 * PayPal se activa solo cuando en el panel se hayan guardado las credenciales
 * (`paypal_client_id`, `paypal_secret`, `paypal_mode`); hasta entonces solo
 * aparece la opción de pagar en efectivo. En ningún caso se reproduce ningún
 * audio ni vídeo: el botón de PayPal aparece cuando el cliente lo pide.
 */
"use client";

import { useEffect, useRef, useState } from "react";

type Config = { enabled: boolean; clientId?: string; mode?: "sandbox" | "live" };

type Props = {
  reference: string;
  currency: string;
  labels: {
    chooseTitle: string;
    paypal: string;
    paypalReady: string;
    paypalFail: string;
    cash: string;
    cashNote: string;
    paid: string;
  };
};

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: unknown) => void;
      }) => { render: (el: HTMLElement) => void };
    };
  }
}

export function PaymentChoice({ reference, currency, labels }: Props) {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cashElegido, setCashElegido] = useState(false);
  const [pagado, setPagado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/paypal/config")
      .then((r) => r.json() as Promise<Config>)
      .then(setCfg)
      .catch(() => setCfg({ enabled: false }));
  }, []);

  useEffect(() => {
    if (!cfg?.enabled || !cfg.clientId || pagado || cashElegido) return;
    if (!containerRef.current) return;

    const clientId = cfg.clientId;
    const scriptId = `paypal-sdk-${clientId}`;

    const render = () => {
      if (!window.paypal || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          createOrder: async () => {
            const res = await fetch("/api/paypal/create-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference }),
            });
            if (!res.ok) throw new Error("create-order");
            const body = (await res.json()) as { id: string };
            return body.id;
          },
          onApprove: async (data) => {
            const res = await fetch("/api/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderID: data.orderID, reference }),
            });
            if (res.ok) setPagado(true);
            else setError(labels.paypalFail);
          },
          onError: () => setError(labels.paypalFail),
        })
        .render(containerRef.current!);
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      render();
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency.toUpperCase())}`;
    script.async = true;
    script.onload = render;
    script.onerror = () => setError(labels.paypalFail);
    document.head.appendChild(script);
  }, [cfg, pagado, cashElegido, reference, currency, labels.paypalFail]);

  if (pagado) {
    return (
      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
        {labels.paid}
      </div>
    );
  }

  if (cashElegido) {
    return (
      <div className="mt-5 rounded-2xl border border-ocean-100 bg-ocean-50 p-4 text-sm text-ink-700">
        {labels.cashNote}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-5 max-w-sm rounded-2xl border border-ocean-100 bg-ocean-50 p-4">
      <p className="mb-3 text-sm font-bold text-ink-900">{labels.chooseTitle}</p>

      {cfg?.enabled ? (
        <div ref={containerRef} aria-label={labels.paypal} />
      ) : (
        <p className="mb-3 text-xs text-ink-600">{labels.paypal}</p>
      )}

      {error && (
        <p className="mb-3 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setCashElegido(true)}
        className="mt-3 h-11 w-full rounded-full border border-ocean-200 bg-white px-4 text-sm font-bold text-ocean-800 transition hover:bg-ocean-50"
      >
        {labels.cash}
      </button>
    </div>
  );
}
