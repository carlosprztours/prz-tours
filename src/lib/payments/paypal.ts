/**
 * PayPal en el checkout: crear orden y capturarla.
 *
 * Las credenciales se leen de los ajustes del panel (`paypal_client_id`,
 * `paypal_secret`, `paypal_mode`). Mientras no existan, `getPayPalConfig`
 * devuelve null y el botón de PayPal no se muestra: en cuanto las ponga el
 * admin, se activa solo (sin tocar código ni redesplegar).
 */
import "server-only";

import { getSetting } from "@/lib/db/content";

export type PayPalConfig = {
  clientId: string;
  secret: string;
  mode: "sandbox" | "live";
};

export async function getPayPalConfig(): Promise<PayPalConfig | null> {
  const [clientId, secret, mode] = await Promise.all([
    getSetting("paypal_client_id", ""),
    getSetting("paypal_secret", ""),
    getSetting("paypal_mode", "sandbox"),
  ]);
  if (!clientId.trim() || !secret.trim()) return null;
  return { clientId: clientId.trim(), secret: secret.trim(), mode: mode === "live" ? "live" : "sandbox" };
}

/** Base de la API REST según sandbox o vivo. */
function apiBase(mode: "sandbox" | "live"): string {
  return mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

async function getAccessToken(cfg: PayPalConfig): Promise<string> {
  const res = await fetch(`${apiBase(cfg.mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${cfg.clientId}:${cfg.secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!res.ok || !body.access_token) throw new Error("paypal-auth");
  return body.access_token;
}

/** Crea una orden de pago y devuelve el id para que el SDK la abra. */
export async function createPayPalOrder(
  cfg: PayPalConfig,
  opts: { amount: number; currency: string; reference: string; description?: string },
): Promise<{ id: string }> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${apiBase(cfg.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: opts.reference,
          custom_id: opts.reference,
          description: opts.description ?? `Reserva ${opts.reference}`,
          amount: {
            currency_code: opts.currency.toUpperCase(),
            value: opts.amount.toFixed(2),
          },
        },
      ],
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { id?: string };
  if (!res.ok || !body.id) throw new Error("paypal-create");
  return { id: body.id };
}

/** Captura la orden; devuelve el estado ("COMPLETED" si se cobró). */
export async function capturePayPalOrder(
  cfg: PayPalConfig,
  orderId: string,
): Promise<{ status: string }> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${apiBase(cfg.mode)}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = (await res.json().catch(() => ({}))) as { status?: string };
  if (!res.ok || !body.status) throw new Error("paypal-capture");
  return { status: body.status };
}
