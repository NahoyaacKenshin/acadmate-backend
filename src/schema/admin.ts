import { z } from "zod";

// ── SemesterRule ──────────────────────────────────────────────────────────────

export const SemesterRuleTypeEnum = z.enum(["SATURDAY_SET_A", "SATURDAY_SET_B"]);

export const createSemesterRuleSchema = z.object({
  date: z.string().datetime({ message: "date must be a valid ISO-8601 datetime string" }),
  ruleType: SemesterRuleTypeEnum,
  label: z.string().max(100).optional(),
});

export const updateSemesterRuleSchema = createSemesterRuleSchema.partial();

// ── ProgramMapping ────────────────────────────────────────────────────────────

export const StudentSetEnum = z.enum(["A", "B"]);

export const createProgramMappingSchema = z.object({
  programName: z.string().min(1).max(50),
  studentSet: StudentSetEnum,
});

export const updateProgramMappingSchema = createProgramMappingSchema.partial();

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateSemesterRuleInput = z.infer<typeof createSemesterRuleSchema>;
export type UpdateSemesterRuleInput = z.infer<typeof updateSemesterRuleSchema>;
export type CreateProgramMappingInput = z.infer<typeof createProgramMappingSchema>;
export type UpdateProgramMappingInput = z.infer<typeof updateProgramMappingSchema>;
