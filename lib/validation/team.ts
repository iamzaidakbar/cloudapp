import { z } from "zod";

export const addTeamMemberSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  name: z.string().trim().max(120).optional(),
  role: z.enum(["TENANT_ADMIN", "TENANT_MEMBER"]),
});

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
