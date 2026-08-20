import { z } from "zod";

const severityValues = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const findingTypeValues = [
  "PUBLIC_S3_BUCKET",
  "UNENCRYPTED_EBS_VOLUME",
  "UNATTACHED_EBS_VOLUME",
  "UNDERUTILIZED_EC2_INSTANCE",
  "OVER_PROVISIONED_EC2_INSTANCE",
  "MISSING_TAGS",
] as const;

function csvEnum<T extends readonly [string, ...string[]]>(values: T) {
  return z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter((v): v is T[number] => (values as readonly string[]).includes(v)) : undefined));
}

export const findingsQuerySchema = z.object({
  severity: csvEnum(severityValues),
  type: csvEnum(findingTypeValues),
});
