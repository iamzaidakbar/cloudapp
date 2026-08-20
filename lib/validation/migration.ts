import { z } from "zod";

export const createMigrationPlanSchema = z.object({
  comparisonItemIds: z.array(z.string().min(1)).min(1, "Select at least one resource to migrate"),
});
