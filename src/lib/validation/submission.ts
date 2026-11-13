import { z } from "zod";

import { REPLACEMENT_CAUSES, SUBMISSION_CONTEXTS, SUBMISSION_REASONS } from "@/types/domain";

/**
 * Member submission payload. Shared by the client form (UX validation) and the
 * server action (trust boundary). The database re-validates everything in
 * process_submission(); keep the limits here in sync with that function.
 */
export const submissionLineSchema = z.object({
  item_id: z.uuid(),
  quantity: z.number().int().min(1).max(500),
  replacement_cause: z.enum(REPLACEMENT_CAUSES).nullable().optional(),
});

export const submissionSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name").max(120),
    reason: z.enum(SUBMISSION_REASONS),
    context: z.enum(SUBMISSION_CONTEXTS),
    callReference: z.string().trim().max(60).optional(),
    notes: z.string().trim().max(1000).optional(),
    lines: z.array(submissionLineSchema).min(1, "Add at least one item").max(50, "Max 50 items per submission"),
  })
  .superRefine((value, ctx) => {
    if (value.reason === "replacement") {
      value.lines.forEach((line, i) => {
        if (!line.replacement_cause) {
          ctx.addIssue({ code: "custom", path: ["lines", i, "replacement_cause"], message: "Pick a reason" });
        }
      });
    }
  });

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const pinSchema = z.string().regex(/^[0-9]{4,12}$/, "PIN must be 4–12 digits");
