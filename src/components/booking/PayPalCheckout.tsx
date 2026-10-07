/**
 * Pago de PayPal inline para el formulario de reserva (componente de cliente).
 *
 * La orden YA se creó en el servidor (`/api/paypal/checkout`); este componente
 * solo carga el SDK, dibuja los botones y captura cuando el cliente aprueba.
 * El formulario nunca abandona la página: los datos del cliente se quedan en
 * el formulario hasta que el pago termina.
 */
"use client";

import { useEffect, useRef, useState } from "react";

type PaypalButtonsOpts = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: (err: unknown) => void;
};

type Props = {
  orderId: string;
  clientId: string;
  mode: "sandbox" | "live";
  currency: string;
  labels: {
    title: string;
    hint: string;
    processing: string;
    cancel: string;
    fail: string;
  };
  onPaid: (reference: string) => void;
};

export function PayPalCheckout({ orderId, clientId, mode, currency, labels, onPaid }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scriptId = `paypal-checkout-${clientId}`;
    const render = () => {
      const paypal = (window as unknown as {
        paypal?: { Buttons: (o: PaypalButtonsOpts) => { render: (el: HTMLElement) => void } };
      }).paypal;
      if (!paypal || !containerRef.current) return;
      containerRef.current.innerHTML = "";
      paypal
        .Buttons({
          // La orden ya existe: PayPal la reutiliza (el id se fijó al crearla).
          createOrder: async () => orderId,
          onApprove: async (data) => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/paypal/capture-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderID: data.orderID, reference: "" }),
              });
              const body = (await res.json().catch(() => null)) as
                | { ok?: boolean; reference?: string }
                | null;
              if (res.ok && body?.ok && body.reference) {
                onPaid(body.reference);
                return;
              }
              setBusy(false);
              setError(labels.fail);
            } catch {
              setBusy(false);
              setError(labels.fail);
            }
          },
          onCancel: () => {
            setBusy(false);
            setError(labels.cancel);
          },
          onError: () => {
            setBusy(false);
            setError(labels.fail);
          },
        })
        .render(containerRef.current!);
    };

    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing) {
      render();
      return;
    }

    const host = mode === "sandbox" ? "https://www.sandbox.paypal.com" : "https://www.paypal.com";
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `${host}/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency.toUpperCase())}&disable-funding=card`;
    script.async = true;
    script.onload = render;
    script.onerror = () => setError(labels.fail);
    document.head.appendChild(script);
  }, [orderId, clientId, mode, currency, labels, onPaid]);

  return (
    <div className="rounded-2xl border border-ocean-200 bg-ocean-50 p-5">
      <h4 className="font-display text-base font-bold text-ink-900">{labels.title}</h4>
      <p className="mb-3 mt-1 text-xs text-ink-600">{labels.hint}</p>
      <div ref={containerRef} aria-label={labels.title} />
      {busy && (
        <p className="mt-3 text-sm font-semibold text-ocean-700" role="status">
          {labels.processing}
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}