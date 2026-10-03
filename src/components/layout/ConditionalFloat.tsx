/**
 * Muestra el botón flotante de WhatsApp excepto en el panel.
 *
 * En /admin el botón tapa los controles; allí no tiene sentido porque el
 * que navega es el staff, no un cliente.
 */
"use client";

import { usePathname } from "next/navigation";

import { WhatsAppFloat } from "./WhatsAppFloat";

type Props = {
  phone: string;
  message: string;
  label: string;
};

export function ConditionalFloat({ phone, message, label }: Props) {
  const pathname = usePathname();
  if (pathname.includes("/admin")) return null;
  return <WhatsAppFloat phone={phone} message={message} label={label} />;
}
