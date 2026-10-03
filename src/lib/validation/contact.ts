/**
 * Validación del formulario de contacto (zod v4).
 */
import * as z from "zod";

export const contactSchema = z.object({
  name: z
    .string({ error: "validation.nameRequired" })
    .trim()
    .min(1, { error: "validation.nameRequired" })
    .max(120, { error: "validation.messageTooLong" }),
  email: z
    .email({ error: "validation.emailInvalid" })
    .trim()
    .toLowerCase()
    .max(254, { error: "validation.messageTooLong" }),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().max(160).optional(),
  message: z
    .string({ error: "validation.messageRequired" })
    .trim()
    .min(10, { error: "validation.messageTooShort" })
    .max(3000, { error: "validation.messageTooLong" }),
});

export type ContactFormData = z.infer<typeof contactSchema>;
