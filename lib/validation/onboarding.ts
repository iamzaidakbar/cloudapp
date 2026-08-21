import { z } from "zod";

export const registerSchema = z.object({
  organizationName: z.string().trim().min(2, "Organization name is too short").max(120),
  adminName: z.string().trim().max(120).optional(),
  adminEmail: z.string().min(1, "Email is required").email("Enter a valid email address"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
