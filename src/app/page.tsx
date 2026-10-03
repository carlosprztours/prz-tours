/**
 * Raíz sin idioma (`/`): el proxy ya redirige a /es o /en, pero si alguien
 * llega aquí sin pasar por el proxy (o este está desactivado), redirigimos
 * al idioma por defecto en lugar de mostrar una página vacía.
 */
import { redirect } from "next/navigation";

import { defaultLocale } from "@/lib/i18n/config";

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
