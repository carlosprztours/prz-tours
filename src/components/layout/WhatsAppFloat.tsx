/**
 * Botón flotante de WhatsApp (Server Component, sin JS).
 *
 * Aparece en todas las páginas públicas abajo a la derecha.
 */
import { whatsappLink } from "@/lib/notify/whatsapp";

type Props = {
  phone: string;
  message: string;
  label: string;
};

export function WhatsAppFloat({ phone, message, label }: Props) {
  return (
    <a
      href={whatsappLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-xl shadow-black/20 transition hover:scale-105 hover:bg-[#1fb857]"
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 0 1 12 4zm-3.2 3.5c-.2 0-.5 0-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7c.1.2 1.9 3 4.7 4 .6.3 1.1.4 1.5.6.6.2 1.2.1 1.6-.2.5-.3 1-1.3 1.1-1.7.1-.4.1-.8 0-.9l-.3-.2-1.9-.9c-.2-.1-.4 0-.6.2l-.8 1c-.1.2-.3.2-.5.1a7.5 7.5 0 0 1-2.2-1.3 8.2 8.2 0 0 1-1.5-1.9c-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.4.1-.6L9.4 6c-.1-.3-.4-.5-.6-.5z" />
      </svg>
    </a>
  );
}
