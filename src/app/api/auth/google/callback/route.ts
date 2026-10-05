/**
 * GET /api/auth/google/callback — vuelta de Google tras autorizar.
 *
 * Verifica el `state`, cambia el código por el perfil y busca o crea al
 * usuario:
 * - Si existe cuenta con ese `google_id` → entra con su rol actual.
 * - Si existe cuenta con ese email (creada con contraseña) → la vincula
 *   (`google_id`) y entra con su rol actual.
 * - Si no existe → crea un `customer` nuevo y entra a /account.
 */
import { NextResponse, type NextRequest } from "next/server";

import { logActivity } from "@/lib/admin/activity";
import { createSession } from "@/lib/auth/session";
import {
  exchangeGoogleCode,
  fetchGoogleProfile,
  getGoogleClient,
  publicOrigin,
} from "@/lib/auth/google";
import { execute, queryOne } from "@/lib/db/client";
import { defaultLocale, isLocale } from "@/lib/i18n/config";
import type { Locale, UserWithSecret } from "@/types";

function fail(url: URL, origin: string, locale: Locale): NextResponse {
  // Sin mensaje específico a propósito: el login muestra "inválido".
  return NextResponse.redirect(new URL(`/${locale}/login`, origin));
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = publicOrigin(request);
  const locale: Locale = defaultLocale;

  let saved: { state?: string; locale?: string; next?: string; inviteRef?: string } = {};
  try {
    saved = JSON.parse(request.cookies.get("prz_oauth_state")?.value ?? "{}");
  } catch {
    return fail(url, origin, locale);
  }
  const loc: Locale = isLocale(saved.locale ?? "") ? (saved.locale as Locale) : defaultLocale;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !saved.state || state !== saved.state) {
    return fail(url, origin, loc);
  }
  const next =
    typeof saved.next === "string" &&
    saved.next.startsWith(`/${loc}/`) &&
    !saved.next.includes("..")
      ? saved.next
      : undefined;

  const client = await getGoogleClient();
  if (!client) return fail(url, origin, loc);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const token = await exchangeGoogleCode(client.id, client.secret, code, redirectUri);
  if (!token) return fail(url, origin, loc);
  const profile = await fetchGoogleProfile(token);
  if (!profile) return fail(url, origin, loc);

  // 1) ¿Cuenta ya vinculada a este Google?
  // 2) ¿Cuenta con este email (contraseña) para vincular?
  // 3) Crear customer nuevo.
  let isNew = false;
  let user = await queryOne<UserWithSecret>(
    `SELECT id, email, name, role, phone, locale, is_active, password_hash, created_at, updated_at
     FROM users WHERE google_id = ?`,
    profile.sub,
  );
  if (!user) {
    const byEmail = await queryOne<UserWithSecret>(
      `SELECT id, email, name, role, phone, locale, is_active, password_hash, created_at, updated_at
       FROM users WHERE email = ?`,
      profile.email,
    );
    if (byEmail) {
      await execute(`UPDATE users SET google_id = ? WHERE id = ?`, profile.sub, byEmail.id);
      user = byEmail;
    } else {
      const unusableHash = `google-oauth$${crypto.randomUUID()}`;
      const inserted = await execute(
        `INSERT INTO users (email, name, password_hash, role, locale, google_id)
         VALUES (?, ?, ?, 'customer', ?, ?)`,
        profile.email,
        profile.name,
        unusableHash,
        loc,
        profile.sub,
      );
      const id = Number(inserted.meta.last_row_id);
      if (!Number.isInteger(id) || id <= 0) return fail(url, origin, loc);
      isNew = true;
      user = await queryOne<UserWithSecret>(
        `SELECT id, email, name, role, phone, locale, is_active, password_hash, created_at, updated_at
         FROM users WHERE id = ?`,
        id,
      );
    }
  }

  if (!user || user.is_active !== 1) return fail(url, origin, loc);

  // Fidelidad: código propio + cupón si es cuenta nueva referida.
  try {
    const {
      findUserByInviteCode,
      getOrCreateInviteCode,
      issueCoupon,
    } = await import("@/lib/db/loyalty");
    await getOrCreateInviteCode(user.id);
    if (isNew && typeof saved.inviteRef === "string" && saved.inviteRef) {
      const inviterId = await findUserByInviteCode(saved.inviteRef);
      if (inviterId && inviterId !== user.id) {
        await execute(`UPDATE users SET referred_by = ? WHERE id = ?`, inviterId, user.id);
        await issueCoupon({ userId: user.id, reason: "invite", locale: loc });
      }
    }
  } catch (err) {
    console.error("[google] loyalty error:", err);
  }

  await createSession(user.id, user.role);
  logActivity("login-google", user.email, user.id, user.email).catch(() => {});

  const dest =
    next ??
    (user.role === "customer" ? `/${loc}/account` : `/${loc}/admin`);
  const res = NextResponse.redirect(new URL(dest, origin));
  res.cookies.delete("prz_oauth_state");
  return res;
}
