/**
 * Ajustes del sitio: edita valores existentes o agrega claves nuevas.
 *
 * Las claves controlan teléfono, WhatsApp, email, dirección, horario, etc.
 * (ver `settings` en el seed). Cambiar una clave aquí cambia el sitio.
 */
import { notFound } from "next/navigation";

import { deleteSetting, listSettings, saveSetting } from "@/lib/admin/misc";
import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";

function SettingRow({
  locale,
  settingKey,
  value,
  es,
}: {
  locale: string;
  settingKey: string;
  value: string;
  es: boolean;
}) {
  const save = async (formData: FormData): Promise<void> => {
    "use server";
    await saveSetting(locale, undefined, formData);
  };
  return (
    <form
      action={save}
      className="grid gap-2 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-[220px_1fr_auto] sm:items-center"
    >
      <div>
        <input type="hidden" name="key" value={settingKey} />
        <p className="font-mono text-sm font-bold text-ink-900">{settingKey}</p>
      </div>
      <input
        name="value"
        defaultValue={value}
        aria-label={settingKey}
        className="h-10 rounded-xl border border-sand-200 px-3 text-sm text-ink-900 outline-none focus:border-ocean-500"
      />
      <span className="flex gap-2">
        <button
          type="submit"
          className="h-10 rounded-full bg-ocean-700 px-5 text-sm font-bold text-white transition hover:bg-ocean-800"
        >
          {es ? "Guardar" : "Save"}
        </button>
        <button
          type="submit"
          formAction={async (): Promise<void> => {
            "use server";
            await deleteSetting(locale, settingKey);
          }}
          className="h-10 rounded-full bg-red-100 px-4 text-sm font-bold text-red-700 transition hover:bg-red-200"
          title={es ? "Eliminar" : "Delete"}
        >
          ✕
        </button>
      </span>
    </form>
  );
}

function NewSettingForm({ locale, es }: { locale: string; es: boolean }) {
  const save = async (formData: FormData): Promise<void> => {
    "use server";
    await saveSetting(locale, undefined, formData);
  };
  return (
    <form
      action={save}
      className="grid gap-2 rounded-2xl border border-dashed border-sand-300 bg-white p-4 sm:grid-cols-[220px_1fr_auto] sm:items-center"
    >
      <input
        name="key"
        required
        pattern="[a-z0-9_]+"
        placeholder={es ? "nueva_clave" : "new_key"}
        aria-label={es ? "Clave" : "Key"}
        className="h-10 rounded-xl border border-sand-200 px-3 font-mono text-sm text-ink-900 outline-none focus:border-ocean-500"
      />
      <input
        name="value"
        required
        placeholder={es ? "Valor…" : "Value…"}
        aria-label={es ? "Valor" : "Value"}
        className="h-10 rounded-xl border border-sand-200 px-3 text-sm text-ink-900 outline-none focus:border-ocean-500"
      />
      <button
        type="submit"
        className="h-10 rounded-full bg-coral-700 px-5 text-sm font-bold text-white transition hover:bg-coral-800"
      >
        {es ? "Agregar" : "Add"}
      </button>
    </form>
  );
}

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const es = locale === "es";

  const settings = await listSettings(locale);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {es ? "Ajustes" : "Settings"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          {es
            ? "Teléfono, WhatsApp, correo, dirección y textos globales del sitio."
            : "Phone, WhatsApp, email, address and global site texts."}
        </p>
        <p className="mt-2 rounded-xl bg-ocean-50 p-3 text-xs text-ink-600">
          {es
            ? "Pagos con PayPal: cuando ya guardes estas claves en «Nuevo ajuste», el botón de PayPal se activará en la reserva sin tocar nada más: paypal_client_id, paypal_secret y paypal_mode (sandbox o live). Mientras no existan, solo se ofrece pagar en efectivo en el tour. Stripe sigue montada pero deshabilitada hasta que la quieras activar."
            : "PayPal payments: once you save these keys under “New setting”, the PayPal button turns on in the booking without touching anything else: paypal_client_id, paypal_secret, and paypal_mode (sandbox or live). Until then only cash-on-tour is offered. Stripe is still wired up but disabled until you want it."}
        </p>
      </div>

      <PayPalSection locale={locale} es={es} settings={settings} />

      {settings.map((s) => (
        <SettingRow key={s.key} locale={locale} settingKey={s.key} value={s.value} es={es} />
      ))}

      <h2 className="mt-2 font-display text-lg font-bold text-ink-900">
        {es ? "Nuevo ajuste" : "New setting"}
      </h2>
      <NewSettingForm locale={locale} es={es} />
    </div>
  );
}

/** Campos concretos de PayPal junto a la lista de ajustes. */
function PayPalSection({
  locale,
  es,
  settings,
}: {
  locale: string;
  es: boolean;
  settings: { key: string; value: string }[];
}) {
  const get = (k: string) => settings.find((s) => s.key === k)?.value ?? "";
  const clientId = get("paypal_client_id");
  const secret = get("paypal_secret");
  const mode = get("paypal_mode") || "sandbox";

  return (
    <div className="mt-4 grid gap-4 rounded-2xl border-2 border-ocean-100 bg-ocean-50/50 p-5">
      <h2 className="font-display text-lg font-extrabold text-ink-900">
        {es ? "Pagos con PayPal" : "PayPal payments"}
      </h2>
      <p className="text-xs text-ink-600">
        {es
          ? "Guarda aquí tus credenciales. En cuanto estén las tres, el botón de PayPal se activará en la reserva (usa modo sandbox para probar)."
          : "Save your credentials here. As soon as all three are set, the PayPal button turns on in the booking (use sandbox mode to test)."}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <PayPalField locale={locale} k="paypal_client_id" label="Client ID" value={get("paypal_client_id")} es={es} />
        <PayPalField locale={locale} k="paypal_secret" label={es ? "Secreto" : "Secret"} value="" placeholder={es ? "pega tu secreto (no se muestra)" : "paste your secret (not shown)"} type="password" es={es} />
        <form action={async (formData: FormData) => {
          "use server";
          await saveSetting(locale, undefined, formData);
        }} className="grid gap-1">
          <input type="hidden" name="key" value="paypal_mode" />
          <label className="text-xs font-bold text-ink-500">{es ? "Modo" : "Mode"}</label>
          <select
            name="value"
            defaultValue={mode}
            className="h-10 rounded-xl border border-sand-200 px-3 text-sm text-ink-900 outline-none focus:border-ocean-500"
          >
            <option value="sandbox">Sandbox (prueba)</option>
            <option value="live">Live (real)</option>
          </select>
          <button
            type="submit"
            className="mt-1 h-9 w-fit rounded-full bg-ocean-700 px-5 text-xs font-bold text-white transition hover:bg-ocean-800"
          >
            {es ? "Guardar" : "Save"}
          </button>
        </form>
      </div>
      <p className="text-[11px] text-ink-400">
        {es
          ? `Actual: client id ${clientId ? "✓" : "—"} · secreto ${secret ? "✓" : "—"} · modo ${mode}`
          : `Current: client id ${clientId ? "✓" : "—"} · secret ${secret ? "✓" : "—"} · mode ${mode}`}
      </p>
    </div>
  );
}

function PayPalField({
  locale,
  k,
  label,
  value,
  type = "text",
  placeholder,
  es,
}: {
  locale: string;
  k: string;
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  es: boolean;
}) {
  return (
    <form
      action={async (formData: FormData) => {
        "use server";
        await saveSetting(locale, undefined, formData);
      }}
      className="grid gap-1"
    >
      <input type="hidden" name="key" value={k} />
      <label className="text-xs font-bold text-ink-500">{label}</label>
      <input
        name="value"
        defaultValue={value}
        placeholder={placeholder ?? ""}
        type={type}
        className="h-10 rounded-xl border border-sand-200 px-3 font-mono text-sm text-ink-900 outline-none focus:border-ocean-500"
      />
      <button
        type="submit"
        className="mt-1 h-9 w-fit rounded-full bg-ocean-700 px-5 text-xs font-bold text-white transition hover:bg-ocean-800"
      >
        {es ? "Guardar" : "Save"}
      </button>
    </form>
  );
}
