/**
 * Códigos promocionales: validación y descuento.
 *
 * Un código puede ser porcentaje (`percent`, p. ej. 10 = −10 %) o monto
 * fijo (`amount`, p. ej. 15 = −$15, nunca baja de 0). Se valida vigencia
 * por fechas y límite de usos.
 */
import "server-only";

import { execute, queryOne } from "./client";
import type { PromoCode } from "@/types";

export async function getPromoByCode(code: string): Promise<PromoCode | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  return queryOne<PromoCode>(
    `SELECT * FROM promo_codes WHERE code = ? COLLATE NOCASE`,
    normalized,
  );
}

export type PromoCheck =
  | { ok: true; promo: PromoCode; discount: number }
  | { ok: false; error: "inactive" | "expired" | "exhausted" | "not-found" };

/** Valida un código contra un total. No consume el uso (eso es al reservar). */
export async function checkPromo(
  code: string | undefined,
  total: number,
): Promise<PromoCheck> {
  if (!code || !code.trim()) {
    return { ok: false, error: "not-found" };
  }
  const promo = await getPromoByCode(code);
  if (!promo || promo.is_active !== 1) return { ok: false, error: "inactive" };

  const today = new Date().toISOString().slice(0, 10);
  if (promo.valid_from && today < promo.valid_from) return { ok: false, error: "expired" };
  if (promo.valid_to && today > promo.valid_to) return { ok: false, error: "expired" };
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { ok: false, error: "exhausted" };
  }

  const discount =
    promo.kind === "percent"
      ? Math.round(((total * promo.value) / 100) * 100) / 100
      : Math.min(promo.value, total);
  return { ok: true, promo, discount };
}

/** Consume un uso del código (al crear la reserva). */
export async function consumePromoUse(promoId: number): Promise<void> {
  await execute(
    `UPDATE promo_codes SET used_count = used_count + 1, updated_at = datetime('now')
     WHERE id = ?`,
    promoId,
  );
}
