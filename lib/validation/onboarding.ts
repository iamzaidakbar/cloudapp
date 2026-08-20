import { z } from "zod";

export const tenantSchema = z.object({
  name: z.string().trim().min(2, "Organization name is too short").max(120),
});

export type TenantInput = z.infer<typeof tenantSchema>;
