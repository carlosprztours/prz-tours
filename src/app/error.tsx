/**
 * Límite de error global (último recurso).
 */
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="max-w-md text-center">
          <p style={{ fontSize: 48, fontWeight: 800 }}>500</p>
          <h1>Algo salió mal · Something went wrong</h1>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              height: 44,
              padding: "0 24px",
              borderRadius: 999,
              background: "#0e7490",
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Reintentar · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
