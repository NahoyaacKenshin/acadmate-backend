/**
 * Admin Controller
 *
 * All routes require: AuthMiddleware + AdminMiddleware.
 *
 * SemesterRule endpoints:
 *   GET    /api/admin/semester-rules          — list all rules
 *   POST   /api/admin/semester-rules          — create a rule
 *   PUT    /api/admin/semester-rules/:id      — update a rule
 *   DELETE /api/admin/semester-rules/:id      — delete a rule
 *
 * ProgramMapping endpoints:
 *   GET    /api/admin/program-mappings        — list all mappings
 *   POST   /api/admin/program-mappings        — create a mapping
 *   PUT    /api/admin/program-mappings/:id    — update a mapping
 *   DELETE /api/admin/program-mappings/:id    — delete a mapping
 *
 * Analytics endpoints:
 *   GET    /api/admin/analytics               — comprehensive system analytics
 */

import { Request, Response } from "express";
import { prisma } from "@/lib/prisma";
import {
  createSemesterRuleSchema,
  updateSemesterRuleSchema,
  createProgramMappingSchema,
  updateProgramMappingSchema,
} from "@/schema/admin";

export class AdminController {
  // ── SemesterRule ────────────────────────────────────────────────────────────

  /** GET /api/admin/semester-rules */
  listSemesterRules = async (_req: Request, res: Response): Promise<void> => {
    try {
      const rules = await prisma.semesterRule.findMany({
        orderBy: { startDate: "asc" },
      });
      res.status(200).json({ status: "success", data: rules });
    } catch (err) {
      this.handleError(res, err, "listSemesterRules");
    }
  };

  /** POST /api/admin/semester-rules */
  createSemesterRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate, dayOfWeek, setType, label } = req.body;
      const rule = await prisma.semesterRule.create({
        data: {
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          dayOfWeek: Number(dayOfWeek),
          setType,
          label: label || null,
        },
      });
      res.status(201).json({ status: "success", data: rule });
    } catch (err) {
      this.handleError(res, err, "createSemesterRule");
    }
  };

  /** PUT /api/admin/semester-rules/:id */
  updateSemesterRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { startDate, endDate, dayOfWeek, setType, label } = req.body;
      const rule = await prisma.semesterRule.update({
        where: { id },
        data: {
          ...(startDate ? { startDate: new Date(startDate) } : {}),
          ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
          ...(dayOfWeek !== undefined ? { dayOfWeek: Number(dayOfWeek) } : {}),
          ...(setType ? { setType } : {}),
          ...(label !== undefined ? { label: label || null } : {}),
        },
      });
      res.status(200).json({ status: "success", data: rule });
    } catch (err) {
      this.handleError(res, err, "updateSemesterRule");
    }
  };

  /** DELETE /api/admin/semester-rules/:id */
  deleteSemesterRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await prisma.semesterRule.delete({ where: { id } });
      res.status(200).json({ status: "success", message: "Semester rule deleted" });
    } catch (err) {
      this.handleError(res, err, "deleteSemesterRule");
    }
  };

  // ── ProgramMapping ──────────────────────────────────────────────────────────

  /** GET /api/admin/program-mappings */
  listProgramMappings = async (_req: Request, res: Response): Promise<void> => {
    try {
      const mappings = await prisma.programMapping.findMany({
        orderBy: { programName: "asc" },
      });
      res.status(200).json({ status: "success", data: mappings });
    } catch (err) {
      this.handleError(res, err, "listProgramMappings");
    }
  };

  /** POST /api/admin/program-mappings */
  createProgramMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { programName, studentSet } = req.body;
      const mapping = await prisma.programMapping.create({
        data: { programName, studentSet },
      });
      res.status(201).json({ status: "success", data: mapping });
    } catch (err) {
      this.handleError(res, err, "createProgramMapping");
    }
  };

  /** PUT /api/admin/program-mappings/:id */
  updateProgramMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      const { programName, studentSet } = req.body;
      const mapping = await prisma.programMapping.update({
        where: { id },
        data: {
          ...(programName ? { programName } : {}),
          ...(studentSet ? { studentSet } : {}),
        },
      });
      res.status(200).json({ status: "success", data: mapping });
    } catch (err) {
      this.handleError(res, err, "updateProgramMapping");
    }
  };

  /** DELETE /api/admin/program-mappings/:id */
  deleteProgramMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id as string;
      await prisma.programMapping.delete({ where: { id } });
      res.status(200).json({ status: "success", message: "Program mapping deleted" });
    } catch (err) {
      this.handleError(res, err, "deleteProgramMapping");
    }
  };

  // ── Analytics ───────────────────────────────────────────────────────────────

  /** GET /api/admin/analytics */
  getAnalytics = async (_req: Request, res: Response): Promise<void> => {
    try {
      const [
        totalUsers,
        totalAdmins,
        totalStudents,
        totalTasks,
        completedTasks,
        totalSubjects,
        totalClassSchedules,
        totalCalendarEvents,
        totalExamWeeks,
        totalSemesterRules,
        totalProgramMappings,
        usersByProgram,
        recentUsers,
      ] = await Promise.all([
        // User counts
        prisma.user.count(),
        prisma.user.count({ where: { role: "ADMIN" } }),
        prisma.user.count({ where: { role: "USER" } }),

        // Task stats
        prisma.task.count(),
        prisma.task.count({ where: { completed: true } }),

        // Content stats
        prisma.subject.count(),
        prisma.classSchedule.count(),
        prisma.calendarEvent.count(),
        prisma.examWeek.count(),

        // Admin config stats
        prisma.semesterRule.count(),
        prisma.programMapping.count(),

        // Program distribution: count users who have subjects per program mapping
        // (approximated by class schedules grouped if needed — simple count here)
        prisma.programMapping.findMany({
          select: { programName: true, studentSet: true },
          orderBy: { programName: "asc" },
        }),

        // 5 most recent registered users
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        }),
      ]);

      res.status(200).json({
        status: "success",
        data: {
          users: {
            total: totalUsers,
            admins: totalAdmins,
            students: totalStudents,
          },
          tasks: {
            total: totalTasks,
            completed: completedTasks,
            pending: totalTasks - completedTasks,
            completionRate:
              totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          },
          content: {
            subjects: totalSubjects,
            classSchedules: totalClassSchedules,
            calendarEvents: totalCalendarEvents,
            examWeeks: totalExamWeeks,
          },
          adminConfig: {
            semesterRules: totalSemesterRules,
            programMappings: totalProgramMappings,
          },
          programDistribution: usersByProgram,
          recentUsers,
        },
      });
    } catch (err) {
      this.handleError(res, err, "getAnalytics");
    }
  };

  // ── Error Helper ─────────────────────────────────────────────────────────────

  private handleError(res: Response, err: unknown, context: string): void {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    console.error(`[AdminController.${context}]`, err);

    if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
      const zodErr = err as unknown as { errors: { path: (string | number)[]; message: string }[] };
      const details = zodErr.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      res.status(400).json({ status: "error", message: `Validation failed: ${details}` });
      return;
    }
    if (message.includes("Record to update not found") || message.includes("Record to delete not found")) {
      res.status(404).json({ status: "error", message: "Record not found" });
      return;
    }
    if (message.includes("Unique constraint")) {
      res.status(409).json({ status: "error", message: "A record with that value already exists" });
      return;
    }

    res.status(500).json({ status: "error", message });
  }
}
