"use client";

import { useActionState } from "react";

import { testPayPalConfig, type SimpleResult } from "@/lib/admin/misc";
import type { Locale } from "@/types";

export function PayPalTestButton({
  locale,
  es,
  clientId,
  secret,
}: {
  locale: Locale;
  es: boolean;
  clientId: string;
  secret: string;
}) {
  const [testResult, testAction, testPending] = useActionState(
    async (
      _prev: SimpleResult | undefined,
      formData: FormData,
    ): Promise<SimpleResult> => {
      return testPayPalConfig(locale, _prev, formData);
    },
    undefined,
  );

  return (
    <div className="grid gap-1 sm:grid-cols-3">
      <form action={testAction} className="grid gap-1">
        <input type="hidden" name="key" value="paypal_test" />
        <button
          type="submit"
          disabled={testPending || !clientId || !secret}
          className="mt-1 h-9 w-fit rounded-full bg-ocean-700 px-5 text-xs font-bold text-white transition hover:bg-ocean-800 disabled:opacity-50"
        >
          {testPending
            ? es
              ? "Probando…"
              : "Testing…"
            : es
              ? "Probar conexión PayPal"
              : "Test PayPal connection"}
        </button>
        {!clientId || !secret ? (
          <p className="mt-1 text-[10px] text-ink-400">
            {es
              ? "Guarda client id y secreto primero."
              : "Save client id and secret first."}
          </p>
        ) : null}
      </form>
      {testResult && (
        <p
          className={`text-xs mt-2 p-2 rounded ${
            testResult.ok
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {testResult.ok
            ? es
              ? "✓ Conexión con PayPal OK: las credenciales funcionan."
              : "✓ PayPal connection OK: credentials work."
            : es
              ? `✗ ${testResult.error}`
              : `✗ ${testResult.error}`}
        </p>
      )}
    </div>
  );
}
