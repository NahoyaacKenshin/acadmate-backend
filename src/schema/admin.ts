import { z } from "zod";

// ── SemesterRule ──────────────────────────────────────────────────────────────

export const StudentSetEnum = z.enum(["A", "B"]);

export const createSemesterRuleSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "startDate must be in YYYY-MM-DD format (e.g. 2026-07-25)" }),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "endDate must be in YYYY-MM-DD format" })
      .optional()
      .nullable(),
    dayOfWeek: z.number().int().min(0).max(6),
    setType: StudentSetEnum,
    label: z.string().max(100).optional().nullable(),
  }),
});

export const updateSemesterRuleSchema = z.object({
  body: z.object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "startDate must be in YYYY-MM-DD format" })
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "endDate must be in YYYY-MM-DD format" })
      .optional()
      .nullable(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    setType: StudentSetEnum.optional(),
    label: z.string().max(100).optional().nullable(),
  }),
});

// ── ProgramMapping ────────────────────────────────────────────────────────────

export const createProgramMappingSchema = z.object({
  body: z.object({
    programName: z.string().min(1).max(50),
    studentSet: StudentSetEnum,
  }),
});

export const updateProgramMappingSchema = z.object({
  body: z.object({
    programName: z.string().min(1).max(50).optional(),
    studentSet: StudentSetEnum.optional(),
  }),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateSemesterRuleInput = z.infer<typeof createSemesterRuleSchema>;
export type UpdateSemesterRuleInput = z.infer<typeof updateSemesterRuleSchema>;
export type CreateProgramMappingInput = z.infer<typeof createProgramMappingSchema>;
export type UpdateProgramMappingInput = z.infer<typeof updateProgramMappingSchema>;
