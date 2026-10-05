/**
 * Guardián de imágenes (componente de cliente, se monta una vez).
 *
 * Bloquea el menú contextual ("Guardar imagen") y el arrastre sobre
 * cualquier `<img>` del sitio, incluido el mantener presionado en móvil.
 * Complementa el CSS (`-webkit-touch-callout: none`). Es disuasorio:
 * no evita capturas de pantalla.
 */
"use client";

import { useEffect } from "react";

export function ImageGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("img")) {
        e.preventDefault();
      }
    };
    const onDragStart = (e: DragEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("img")) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
