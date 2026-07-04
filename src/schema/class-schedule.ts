import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const createClassScheduleSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().int().min(0, "dayOfWeek must be 0–6").max(6, "dayOfWeek must be 0–6"),
    startTime: z
      .string()
      .regex(timeRegex, "startTime must be in HH:MM 24-hour format"),
    endTime: z
      .string()
      .regex(timeRegex, "endTime must be in HH:MM 24-hour format"),
    room: z.string().max(100).optional().nullable(),
    modality: z.enum(["F2F", "ONLINE", "HYBRID"]).optional(),
    setType: z.enum(["A", "B", "BOTH"]).optional().nullable(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const updateClassScheduleSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid class schedule ID"),
  }),
  body: z.object({
    dayOfWeek: z.number().int().min(0).max(6).optional(),
    startTime: z.string().regex(timeRegex, "startTime must be in HH:MM 24-hour format").optional(),
    endTime: z.string().regex(timeRegex, "endTime must be in HH:MM 24-hour format").optional(),
    room: z.string().max(100).optional().nullable(),
    modality: z.enum(["F2F", "ONLINE", "HYBRID"]).optional(),
    setType: z.enum(["A", "B", "BOTH"]).optional().nullable(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const classScheduleIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid class schedule ID"),
  }),
});
