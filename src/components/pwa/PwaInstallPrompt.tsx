/**
 * Aviso para instalar la PWA y activar las notificaciones push.
 *
 * Reglas de UX (ver `docs/RUTAS.md`):
 * - Solo aparece a usuarios con sesión (el push necesita `user_id`).
 * - `beforeinstallprompt` se captura lo antes posible. Si el navegador no lo
 *   dispara (ya instalada, iOS, escritorio sin soporte) no se muestra el
 *   botón de instalar; en iOS se da la instrucción manual
 *   (Compartir → Añadir a pantalla de inicio).
 * - `force` lo renderiza siempre: es como "Mi cuenta" lo expone, para que el
 *   cliente pueda instalarlo o activar notificaciones cuando quiera.
 * - Si el usuario lo acepta o lo descarta, no vuelve (`push_prompts`).
 * - Va arriba a la izquierda, NUNCA abajo: abajo a la derecha vive el menú
 *   flotante de WhatsApp y solaparse bloqueaba sus clics (ver test:booking).
 */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

type Labels = {
  title: string;
  body: string;
  install: string;
  notify: string;
  later: string;
  installed: string;
  iosBody: string;
  error: string;
  denied: string;
  subscribed: string;
};

type Props = {
  labels: Labels;
  /** Ya está instalada como app (standalone). */
  alreadyInstalled: boolean;
  /** Ya tiene una suscripción push registrada. */
  alreadySubscribed: boolean;
  /** Renderiza siempre (p. ej. dentro de "Mi cuenta"). */
  force?: boolean;
  /** Variante compacta para incrustar en una página. */
  inline?: boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * "¿Ya está instalada como app?" con `useSyncExternalStore` en vez de un
 * `useState` + `useEffect`: el servidor devuelve siempre `false` (sin
 * desajuste de hidratación) y el cliente se suscribe al media query.
 */
function subscribeDisplayMode(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getDisplayModeSnapshot = () => isStandalone();
const getDisplayModeServerSnapshot = () => false;

/**
 * `false` durante el render del servidor y en la primera hidratación, `true`
 * después. Evita el desajuste de hidratación de cualquier detección que solo
 * exista en el navegador (`PushManager`, iOS, `matchMedia`): el servidor
 * pinta el mismo markup vacío y ya tras hidratar aparece el aviso.
 */
function subscribeNothing() {
  return () => {};
}
function useIsClient() {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

function supportsPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function markPrompt(kind: "install" | "notify", accepted: boolean) {
  try {
    await fetch("/api/push/prompt", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, accepted }),
    });
  } catch {
    /* es cosmético: si falla, se vuelve a mostrar */
  }
}

export function PwaInstallPrompt({
  labels,
  alreadyInstalled,
  alreadySubscribed,
  force = false,
  inline = false,
}: Props) {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [subscribed, setSubscribed] = useState(alreadySubscribed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const standalone = useSyncExternalStore(
    subscribeDisplayMode,
    getDisplayModeSnapshot,
    getDisplayModeServerSnapshot,
  );
  const installed = alreadyInstalled || standalone || justInstalled;

  // 1) Capturar el evento de instalación antes de que el usuario interactúe.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      deferred.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      setJustInstalled(true);
      setCanInstall(false);
      void markPrompt("install", true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const doInstall = useCallback(async () => {
    const evt = deferred.current;
    if (!evt) return;
    setBusy(true);
    try {
      await evt.prompt();
      const choice = await evt.userChoice;
      if (choice.outcome === "accepted") {
        setJustInstalled(true);
        setDismissed(true);
        await markPrompt("install", true);
      } else {
        setDismissed(true);
        await markPrompt("install", false);
      }
    } finally {
      setBusy(false);
      deferred.current = null;
      setCanInstall(false);
    }
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!supportsPush()) {
      setMessage(labels.error);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage(labels.denied);
        return;
      }
      const res = await fetch("/api/push/public-key", { cache: "no-store" });
      if (!res.ok) {
        setMessage(labels.error);
        return;
      }
      const { publicKey } = (await res.json()) as { publicKey: string };

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!saved.ok) {
        setMessage(labels.error);
        return;
      }
      setSubscribed(true);
      setDismissed(true);
      await markPrompt("notify", true);
    } catch {
      setMessage(labels.error);
    } finally {
      setBusy(false);
    }
  }, [labels.denied, labels.error]);

  const isClient = useIsClient();
  const pushSupported = isClient && supportsPush();
  const ios = isClient && isIos();
  const showInstallRow = !installed && (canInstall || (force && !ios));
  const showNotifyRow = !subscribed && pushSupported;
  const anythingToShow = showInstallRow || showNotifyRow;

  if (dismissed && !force) return null;
  if (!anythingToShow) return null;

  const bodyText = ios ? labels.iosBody : labels.body;

  const content = (
    <div className="grid gap-3">
      <div className="min-w-0">
        <p className="font-display text-sm font-extrabold text-ink-900">{labels.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-600">{bodyText}</p>
      </div>

      {(installed || subscribed) && (
        <p className="text-xs font-bold text-green-700">
          {installed ? labels.installed : labels.subscribed}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {showInstallRow && (
          <button
            type="button"
            onClick={doInstall}
            disabled={busy || !canInstall}
            className="h-9 rounded-full bg-ocean-700 px-4 text-xs font-bold text-white transition hover:bg-ocean-800 disabled:opacity-50"
          >
            {labels.install}
          </button>
        )}
        {showNotifyRow && (
          <button
            type="button"
            onClick={enableNotifications}
            disabled={busy}
            className="h-9 rounded-full bg-coral-700 px-4 text-xs font-bold text-white transition hover:bg-coral-800 disabled:opacity-50"
          >
            {labels.notify}
          </button>
        )}
        {!force && (
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              if (!canInstall) void markPrompt("install", false);
            }}
            className="h-9 rounded-full px-3 text-xs font-bold text-ink-500 transition hover:text-ink-800"
          >
            {labels.later}
          </button>
        )}
      </div>

      {message && (
        <p role="status" className="text-xs font-bold text-ink-600">
          {message}
        </p>
      )}
    </div>
  );

  if (inline) {
    return (
      <section className="rounded-2xl border border-ocean-200 bg-ocean-50 p-4">
        {content}
      </section>
    );
  }

  return (
    <aside
      aria-label={labels.title}
      className="fixed inset-x-3 top-20 z-40 mx-auto max-w-md rounded-2xl border border-ocean-200 bg-white p-4 shadow-2xl sm:left-5 sm:right-auto sm:mx-0 sm:w-96"
    >
      {content}
    </aside>
  );
}