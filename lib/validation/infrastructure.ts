import { z } from "zod";

export const infrastructureQuerySchema = z.object({
  service: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  environment: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
});
