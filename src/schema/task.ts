import { z } from "zod";

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().or(z.date().optional()),
    completed: z.boolean().optional(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid task ID"),
  }),
  body: z.object({
    title: z.string().min(1, "Title is required").max(200, "Title is too long").optional(),
    description: z.string().optional().nullable(),
    dueDate: z.string().datetime().optional().nullable().or(z.date().optional().nullable()),
    completed: z.boolean().optional(),
    subjectId: z.string().uuid("Invalid subject ID").optional().nullable(),
  }),
});

export const taskIdSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid task ID"),
  }),
});
