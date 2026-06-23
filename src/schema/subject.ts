import { z } from "zod";

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color code").optional(),
  }),
});

export const updateSubjectSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid subject ID"),
  }),
  body: z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
    color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color code").optional(),
  }),
});

export const subjectIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid subject ID"),
  }),
});
