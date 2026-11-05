"use client";

import { useActionState, useEffect, useState } from "react";
import QRCode from "qrcode";

export const operationButton = "rounded-xl bg-ocean-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50";

type Result = { ok: boolean; token?: string };

export function OperationForm({ action, label, lang, children, scan = false }: {
  action: (form: FormData) => Promise<Result>;
  label: string;
  lang: string;
  children?: React.ReactNode;
  scan?: boolean;
}) {
  const es = lang === "es";
  const [result, submit, pending] = useActionState(
    async (_: Result | null, form: FormData) => action(form), null,
  );
  const [code, setCode] = useState("");
  const [image, setImage] = useState<{ token: string; src: string } | null>(null);

  useEffect(() => {
    if (!scan) return;
    function readCode() {
      const hash = location.hash.slice(1);
      if (hash) setCode(hash);
    }
    window.addEventListener("hashchange", readCode);
    const timer = window.setTimeout(readCode, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("hashchange", readCode);
    };
  }, [scan]);

  const token = result?.token;
  useEffect(() => {
    if (!token) return;
    let active = true;
    const url = new URL(`/${lang}/admin/qr`, location.origin);
    url.hash = token;
    void QRCode.toDataURL(url.href, { width: 240, margin: 4 }).then((src) => {
      if (active) setImage({ token, src });
    }).catch(() => {});
    return () => { active = false; };
  }, [lang, token]);

  return (
    <form action={submit} className="grid justify-items-start gap-2">
      {children}
      {scan && (
        <label className="grid gap-1 text-sm font-semibold">
          {es ? "Código o enlace QR" : "QR code or link"}
          <input name="token" value={code} onChange={(event) => setCode(event.target.value)}
            required maxLength={240} autoComplete="off" className="w-full rounded-xl border px-3 py-2" />
        </label>
      )}
      <button type="submit" disabled={pending} className={operationButton}>{label}</button>
      {result && <p role="status" className="text-sm">{result.ok
        ? (es ? "Guardado." : "Saved.")
        : (es ? "No se aplicó. Revisa permisos, estado, horario o código y vuelve a cargar." : "No change. Check permissions, status, time or code and reload.")}</p>}
      {token && (
        <div className="max-w-full text-sm">
          {image?.token === token && (
            // eslint-disable-next-line @next/next/no-img-element -- QR generated locally as a data URL.
            <img src={image.src} alt={es ? "Código QR del servicio" : "Service QR code"} width={240} height={240} />
          )}
          <p className="break-all font-mono">{token}</p>
          <p>{es ? "Guarda este código ahora. Para mostrar otro, genera uno nuevo." : "Save this code now. Generate a new one to display another code."}</p>
        </div>
      )}
    </form>
  );
}
