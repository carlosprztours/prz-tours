/**
 * Validación del formulario público de reserva (zod v4).
 *
 * Estos esquemas se usan en el servidor (Server Action). El cliente hace una
 * validación ligera con atributos HTML (required, type, min) para dar
 * feedback inmediato; la validación real y definitiva es esta.
 */
import * as z from "zod";

const nameSchema = z
  .string({ error: "validation.nameRequired" })
  .trim()
  .min(1, { error: "validation.nameRequired" })
  .max(120, { error: "validation.messageTooLong" });

const emailSchema = z
  .email({ error: "validation.emailInvalid" })
  .trim()
  .toLowerCase()
  .max(254, { error: "validation.messageTooLong" });

const phoneSchema = z
  .string({ error: "validation.phoneRequired" })
  .trim()
  .min(1, { error: "validation.phoneRequired" })
  .max(40, { error: "validation.messageTooLong" })
  .refine((v) => /^[+()\-.\s\d]{6,40}$/.test(v), {
    error: "validation.phoneInvalid",
  });

/** Fecha opcional en formato YYYY-MM-DD, no anterior a hoy. */
const dateSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), {
    error: "validation.dateInvalid",
  })
  .refine(
    (v) => {
      if (!v) return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(`${v}T00:00:00`) >= today;
    },
    { error: "validation.dateInvalid" },
  );

export const bookingSchema = z.object({
  kind: z.enum(["tour", "transfer", "custom"]).default("tour"),
  tourId: z.coerce.number().int().positive().optional(),
  tourSlug: z.string().trim().max(120).optional(),
  transferRouteId: z.coerce.number().int().positive().optional(),
  promoCode: z.string().trim().max(30).optional(),
  customerName: nameSchema,
  customerEmail: emailSchema,
  customerPhone: phoneSchema,
  customerCountry: z.string().trim().max(80).optional(),
  guests: z.coerce.number().int().min(1).max(60),
  bookedFor: dateSchema,
  pickupTime: z.string().trim().max(20).optional(),
  hotel: z.string().trim().max(160).optional(),
  airport: z.string().trim().max(40).optional(),
  cruisePort: z.string().trim().max(80).optional(),
  meetingPoint: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
}).refine(
  (d) => d.kind === "transfer" || d.guests >= 2,
  { error: "validation.guestsRange", path: ["guests"] },
);

export type BookingFormData = z.infer<typeof bookingSchema>;

/** Convierte FormData a un objeto plano apto para el esquema. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && value.trim() !== "") out[key] = value;
  }
  return out;
}
