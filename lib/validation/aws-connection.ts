import { z } from "zod";

const IAM_ROLE_ARN_PATTERN = /^arn:aws:iam::\d{12}:role\/[A-Za-z0-9+=,.@_/-]+$/;

export const roleArnSchema = z.object({
  roleArn: z
    .string()
    .trim()
    .regex(IAM_ROLE_ARN_PATTERN, "Enter a valid IAM role ARN (arn:aws:iam::123456789012:role/YourRole)"),
});

export type RoleArnInput = z.infer<typeof roleArnSchema>;
