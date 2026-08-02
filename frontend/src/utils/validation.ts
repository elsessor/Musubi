import { z } from "zod";

const emailSchema = z
  .string()
  .min(1, "Email is required.")
  .email("Please enter a valid email address.");

const universityEmailSchema = emailSchema.refine(
  (email) => email.toLowerCase().endsWith(".edu.ph"),
  "Please use your university email address ending in .edu.ph."
);

const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean()
});

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required.").min(2, "Please enter your full name."),
    email: universityEmailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password."),
    terms: z.boolean().refine((value) => value, "You must accept the terms and conditions.")
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
