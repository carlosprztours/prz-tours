/**
 * Teléfonos con código de país (E.164).
 *
 * El número de WhatsApp es donde se confirma la reserva, así que se exige
 * con código de país (`+1809…`). `PhoneInput` (ui) lo captura con selector
 * de país y estas funciones lo validan en el servidor (reservas y perfil).
 */

export type CountryDial = { code: string; label: string; flag: string };

/** País primero = valor por defecto (Rep. Dominicana). */
export const COUNTRY_DIALS: CountryDial[] = [
  { code: "+1", label: "Rep. Dominicana", flag: "🇩🇴" },
  { code: "+1", label: "EE. UU.", flag: "🇺🇸" },
  { code: "+1", label: "Canadá", flag: "🇨🇦" },
  { code: "+1", label: "Puerto Rico", flag: "🇵🇷" },
  { code: "+1", label: "Jamaica", flag: "🇯🇲" },
  { code: "+52", label: "México", flag: "🇲🇽" },
  { code: "+57", label: "Colombia", flag: "🇨🇴" },
  { code: "+58", label: "Venezuela", flag: "🇻🇪" },
  { code: "+54", label: "Argentina", flag: "🇦🇷" },
  { code: "+56", label: "Chile", flag: "🇨🇱" },
  { code: "+51", label: "Perú", flag: "🇵🇪" },
  { code: "+55", label: "Brasil", flag: "🇧🇷" },
  { code: "+507", label: "Panamá", flag: "🇵🇦" },
  { code: "+506", label: "Costa Rica", flag: "🇨🇷" },
  { code: "+53", label: "Cuba", flag: "🇨🇺" },
  { code: "+509", label: "Haití", flag: "🇭🇹" },
  { code: "+34", label: "España", flag: "🇪🇸" },
  { code: "+44", label: "Reino Unido", flag: "🇬🇧" },
  { code: "+33", label: "Francia", flag: "🇫🇷" },
  { code: "+49", label: "Alemania", flag: "🇩🇪" },
  { code: "+39", label: "Italia", flag: "🇮🇹" },
  { code: "+351", label: "Portugal", flag: "🇵🇹" },
  { code: "+31", label: "Países Bajos", flag: "🇳🇱" },
  { code: "+41", label: "Suiza", flag: "🇨🇭" },
  { code: "+7", label: "Rusia", flag: "🇷🇺" },
  { code: "+380", label: "Ucrania", flag: "🇺🇦" },
  { code: "+48", label: "Polonia", flag: "🇵🇱" },
];

/** `"+1 809-000 0000"` → `"+18090000000"`. */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  return `+${digits.replace(/^0+/, "")}`;
}

/** E.164 estricto: `+` + 8–15 dígitos sin ceros iniciales. */
export function isValidPhone(raw: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(normalizePhone(raw));
}

/** Separa un valor guardado en código + número local. */
export function splitPhone(value: string | undefined): {
  dial: string;
  number: string;
} {
  const cleaned = normalizePhone(value ?? "");
  const digits = cleaned.replace("+", "");
  // Código más largo primero para `+1` vs `+1876`-style (aquí todos ≤4).
  const dials = [...new Set(COUNTRY_DIALS.map((c) => c.code))].sort(
    (a, b) => b.length - a.length,
  );
  for (const dial of dials) {
    if (digits.startsWith(dial.slice(1))) {
      return { dial, number: digits.slice(dial.length - 1) };
    }
  }
  return { dial: COUNTRY_DIALS[0].code, number: digits };
}
