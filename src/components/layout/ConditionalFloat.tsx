/**
 * Muestra el menú flotante de WhatsApp excepto en el panel.
 *
 * En /admin el botón tapa los controles; allí no tiene sentido porque el
 * que navega es el staff, no un cliente.
 */
"use client";

import { usePathname } from "next/navigation";

import type { Dictionary } from "@/lib/i18n";
import { WhatsAppMenu } from "./WhatsAppMenu";

type Props = {
  phone: string;
  texts: Dictionary["whatsapp"];
};

export function ConditionalFloat({ phone, texts }: Props) {
  const pathname = usePathname();
  if (pathname.includes("/admin")) return null;
  return <WhatsAppMenu phone={phone} texts={texts} />;
}
