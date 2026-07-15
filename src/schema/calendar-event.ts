import { z } from "zod";

export const createCalendarEventSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().optional().nullable(),
    startDate: z.string().datetime("startDate must be a valid ISO 8601 datetime"),
    endDate: z.string().datetime("endDate must be a valid ISO 8601 datetime").optional().nullable(),
    allDay: z.boolean().optional(),
    location: z.string().max(300).optional().nullable(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color code")
      .optional()
      .nullable(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const updateCalendarEventSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID"),
  }),
  body: z.object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long").optional(),
    description: z.string().optional().nullable(),
    startDate: z
      .string()
      .datetime("startDate must be a valid ISO 8601 datetime")
      .optional(),
    endDate: z
      .string()
      .datetime("endDate must be a valid ISO 8601 datetime")
      .optional()
      .nullable(),
    allDay: z.boolean().optional(),
    location: z.string().max(300).optional().nullable(),
    color: z
      .string()
      .regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color code")
      .optional()
      .nullable(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const calendarEventIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid event ID"),
  }),
});
