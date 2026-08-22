import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Organization name is required")
    .max(120, "Name must be at most 120 characters"),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
