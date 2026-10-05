/**
 * Validación de login y registro (zod v4).
 */
import * as z from "zod";

export const loginSchema = z.object({
  email: z.email({ error: "invalid" }).trim().toLowerCase().max(254),
  password: z.string({ error: "required" }).min(1, { error: "required" }),
  next: z.string().trim().max(200).optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z.string({ error: "required" }).trim().min(2).max(120),
  email: z.email({ error: "invalid" }).trim().toLowerCase().max(254),
  password: z
    .string({ error: "required" })
    .min(8, { error: "tooShort" })
    .max(128, { error: "tooLong" }),
  next: z.string().trim().max(200).optional(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
