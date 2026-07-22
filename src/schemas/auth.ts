import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);
const password = z
  .string()
  .min(12, "Password must contain at least 12 characters.")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const registrationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email,
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+27|0)[6-8][0-9]{8}$/, "Enter a valid South African phone number.")
      .optional()
      .or(z.literal("")),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({ email });

export const passwordResetSchema = z
  .object({
    email,
    token: z.string().min(32).max(256),
    password,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
