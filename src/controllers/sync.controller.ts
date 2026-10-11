import { Request, Response } from "express";
import { prisma } from "@/lib/prisma";

// Whitelist of tables that PowerSync is allowed to write to.
// Keys must match the local SQLite table names used by PowerSync (as defined in Schema.ts).
// PowerSync sends op.table as-is in the :table route param via uploadData.
// Values must match the Prisma model accessor.
const ALLOWED_TABLES: Record<string, keyof typeof prisma> = {
  Task: "task",
  Subject: "subject",
  ClassSchedule: "classSchedule",
  CalendarEvent: "calendarEvent",
  ExamWeek: "examWeek",
  SemesterRule: "semesterRule",
};

// Strict whitelist of allowed writable columns per Prisma model.
// Any extra/unknown columns (e.g. from local SQLite schema, PowerSync internal tracking,
// or deprecated fields) are discarded before Prisma validation to avoid "Unknown argument" errors.
const ALLOWED_COLUMNS: Record<string, Set<string>> = {
  Subject: new Set(["name", "color", "createdAt", "updatedAt", "userId"]),
  Task: new Set([
    "title",
    "description",
    "dueDate",
    "completed",
    "color",
    "subtasks",
    "createdAt",
    "updatedAt",
    "userId",
    "subjectId",
  ]),
  ClassSchedule: new Set([
    "dayOfWeek",
    "daysOfWeek",
    "startTime",
    "endTime",
    "room",
    "modality",
    "setType",
    "startDate",
    "endDate",
    "createdAt",
    "updatedAt",
    "userId",
    "subjectId",
  ]),
  CalendarEvent: new Set([
    "title",
    "description",
    "startDate",
    "endDate",
    "allDay",
    "location",
    "color",
    "createdAt",
    "updatedAt",
    "userId",
    "subjectId",
  ]),
  ExamWeek: new Set(["title", "startDate", "endDate", "createdAt", "updatedAt", "userId"]),
  SemesterRule: new Set([
    "startDate",
    "endDate",
    "dayOfWeek",
    "setType",
    "label",
    "createdAt",
    "updatedAt",
    "userId",
  ]),
};

export class SyncController {
  /**
   * Helper to ensure date strings are strict 2-digit padded ISO-8601 format for Prisma & Postgres.
   * If the input is empty or invalid, returns null so nullable timestamp columns receive NULL in SQL
   * instead of throwing Prisma validation errors on empty strings ("").
   */
  private ensureIsoDate(val: unknown): string | null {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.length === 0) return null;

      // Match YYYY-M-D or YYYY-MM-DD with optional time and timezone offset
      const ymdMatch = trimmed.match(
        /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?/
      );
      if (ymdMatch) {
        const [, y, m, d, hh = "00", mm = "00", ss = "00", ms = "000", tz] = ymdMatch;
        const padMonth = m.padStart(2, "0");
        const padDay = d.padStart(2, "0");
        const padHour = hh.padStart(2, "0");
        const padMin = mm.padStart(2, "0");
        const padSec = ss.padStart(2, "0");
        const padMs = ms.slice(0, 3).padEnd(3, "0");

        let finalTz = "+08:00"; // Default to Philippine Standard Time
        if (tz) {
          if (tz === "Z") {
            finalTz = "Z";
          } else if (tz.includes(":")) {
            finalTz = tz;
          } else {
            finalTz = `${tz.slice(0, 3)}:${tz.slice(3)}`;
          }
        }

        return `${y}-${padMonth}-${padDay}T${padHour}:${padMin}:${padSec}.${padMs}${finalTz}`;
      }

      // Fallback for other standard formats
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      return null;
    }
    return null;
  }

  /**
   * Cleans and coerces incoming SQLite/PowerSync payload before handing to Prisma:
   * 1. Strips unknown columns to prevent Prisma "Unknown argument" crashes.
   * 2. Coerces SQLite 0/1 integers to booleans.
   * 3. Sanitizes timestamps (and turns empty strings into null).
   * 4. Coerces empty string foreign keys ("subjectId") to null.
   * 5. Normalizes Enums (modality, setType) to valid uppercase variants.
   * 6. Coerces integer fields (dayOfWeek).
   */
  private sanitizeData(table: string, data: Record<string, unknown>): Record<string, unknown> {
    const allowed = ALLOWED_COLUMNS[table];
    const sanitized: Record<string, any> = {};

    for (const [key, val] of Object.entries(data)) {
      if (key === "id") continue;
      if (!allowed || allowed.has(key)) {
        sanitized[key] = val;
      }
    }

    // Coerce empty foreign keys to null
    if ("subjectId" in sanitized) {
      if (!sanitized.subjectId || (typeof sanitized.subjectId === "string" && sanitized.subjectId.trim() === "")) {
        sanitized.subjectId = null;
      }
    }

    // Coerce empty userId strings so fallback or auth can populate it
    if ("userId" in sanitized) {
      if (!sanitized.userId || (typeof sanitized.userId === "string" && sanitized.userId.trim() === "")) {
        delete sanitized.userId;
      }
    }

    if (table === "Task") {
      if ("completed" in sanitized) {
        const c = sanitized.completed;
        sanitized.completed = c === 1 || c === "1" || c === true || c === "true";
      }
      if ("dueDate" in sanitized) sanitized.dueDate = this.ensureIsoDate(sanitized.dueDate);
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
      if ("subtasks" in sanitized) {
        if (typeof sanitized.subtasks === "string") {
          try {
            sanitized.subtasks = JSON.parse(sanitized.subtasks);
          } catch {
            sanitized.subtasks = [];
          }
        }
        if (!Array.isArray(sanitized.subtasks)) {
          sanitized.subtasks = [];
        }
      }
    }

    if (table === "CalendarEvent") {
      if ("allDay" in sanitized) {
        const c = sanitized.allDay;
        sanitized.allDay = c === 1 || c === "1" || c === true || c === "true";
      }
      if ("startDate" in sanitized) sanitized.startDate = this.ensureIsoDate(sanitized.startDate);
      if ("endDate" in sanitized) sanitized.endDate = this.ensureIsoDate(sanitized.endDate);
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
    }

    if (table === "ClassSchedule") {
      if ("dayOfWeek" in sanitized && typeof sanitized.dayOfWeek === "string") {
        sanitized.dayOfWeek = parseInt(sanitized.dayOfWeek, 10) || 0;
      }
      if ("daysOfWeek" in sanitized && Array.isArray(sanitized.daysOfWeek)) {
        sanitized.daysOfWeek = JSON.stringify(sanitized.daysOfWeek);
      }
      if ("modality" in sanitized && typeof sanitized.modality === "string") {
        const upper = sanitized.modality.toUpperCase();
        sanitized.modality = ["F2F", "ONLINE", "HYBRID"].includes(upper) ? upper : "F2F";
      }
      if ("setType" in sanitized) {
        if (!sanitized.setType || (typeof sanitized.setType === "string" && sanitized.setType.trim() === "")) {
          sanitized.setType = null;
        } else if (typeof sanitized.setType === "string") {
          const upper = sanitized.setType.toUpperCase();
          sanitized.setType = ["A", "B", "BOTH"].includes(upper) ? upper : null;
        }
      }
      if ("startDate" in sanitized) sanitized.startDate = this.ensureIsoDate(sanitized.startDate);
      if ("endDate" in sanitized) sanitized.endDate = this.ensureIsoDate(sanitized.endDate);
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
    }

    if (table === "ExamWeek") {
      if ("startDate" in sanitized) sanitized.startDate = this.ensureIsoDate(sanitized.startDate);
      if ("endDate" in sanitized) sanitized.endDate = this.ensureIsoDate(sanitized.endDate);
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
    }

    if (table === "SemesterRule") {
      if ("dayOfWeek" in sanitized && typeof sanitized.dayOfWeek === "string") {
        sanitized.dayOfWeek = parseInt(sanitized.dayOfWeek, 10) || 0;
      }
      if ("setType" in sanitized && typeof sanitized.setType === "string") {
        const upper = sanitized.setType.toUpperCase();
        sanitized.setType = upper === "B" ? "B" : "A";
      }
      if ("startDate" in sanitized) sanitized.startDate = this.ensureIsoDate(sanitized.startDate);
      if ("endDate" in sanitized) sanitized.endDate = this.ensureIsoDate(sanitized.endDate);
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
    }

    if (table === "Subject") {
      if ("createdAt" in sanitized) sanitized.createdAt = this.ensureIsoDate(sanitized.createdAt);
      if ("updatedAt" in sanitized) sanitized.updatedAt = this.ensureIsoDate(sanitized.updatedAt);
    }

    return sanitized;
  }

  private getFallbackCreate(
    table: string,
    id: string,
    sanitized: Record<string, unknown>,
    authUserId?: string
  ): Record<string, unknown> {
    const fallback: Record<string, any> = {
      id,
      ...sanitized,
    };

    if (!fallback.userId && authUserId) {
      fallback.userId = authUserId;
    }

    if (table === "Task") {
      fallback.title = fallback.title || "Untitled Task";
      fallback.completed = fallback.completed ?? false;
    } else if (table === "ExamWeek") {
      fallback.title = fallback.title || "Exam Week";
      fallback.startDate = fallback.startDate || new Date().toISOString();
      fallback.endDate = fallback.endDate || new Date().toISOString();
    } else if (table === "CalendarEvent") {
      fallback.title = fallback.title || "Untitled Event";
      fallback.startDate = fallback.startDate || new Date().toISOString();
    } else if (table === "ClassSchedule") {
      fallback.dayOfWeek = fallback.dayOfWeek ?? 1;
      fallback.startTime = fallback.startTime || "08:00";
      fallback.endTime = fallback.endTime || "09:00";
    } else if (table === "Subject") {
      fallback.name = fallback.name || "Untitled Subject";
    } else if (table === "SemesterRule") {
      fallback.startDate = fallback.startDate || new Date().toISOString();
      fallback.dayOfWeek = fallback.dayOfWeek ?? 1;
      fallback.setType = fallback.setType || "A";
    }

    return fallback;
  }

  /**
   * POST /api/sync/:table
   *
   * Body shape (sent automatically by the PowerSync SDK uploadData):
   * {
   *   "action": "PUT" | "POST" | "DELETE",
   *   "id": "<uuid>",
   *   "data": { ... }   // present for PUT and POST
   * }
   */
  public upload = async (req: Request, res: Response) => {
    const table = req.params.table as string;
    const { action, id, data } = req.body;

    // 1. Validate table name against the whitelist
    const model = ALLOWED_TABLES[table];
    if (!model) {
      return res
        .status(400)
        .json({ code: 400, status: "error", message: `Unknown table: ${table}` });
    }

    // 2. Validate required fields
    if (!action || !id) {
      return res
        .status(400)
        .json({ code: 400, status: "error", message: "Missing required fields: action, id" });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delegate = (prisma as any)[model];
      const sanitized = this.sanitizeData(table, data ?? {});
      const authUserId = (req as any).user?.sub;
      if (!sanitized.userId && authUserId) {
        sanitized.userId = authUserId;
      }

      switch (action) {
        case "PUT": {
          // Attempt standard update first: avoids requiring non-nullable create fields
          // when updating existing records in Postgres.
          try {
            await delegate.update({
              where: { id },
              data: sanitized,
            });
          } catch (updateError: any) {
            if (updateError.code === "P2025") {
              const createData = this.getFallbackCreate(table, id, sanitized, authUserId);
              await delegate.upsert({
                where: { id },
                update: sanitized,
                create: createData,
              });
            } else {
              throw updateError;
            }
          }
          break;
        }

        case "PATCH": {
          try {
            await delegate.update({
              where: { id },
              data: sanitized,
            });
          } catch (updateError: any) {
            // P2025: Record to update not found (offline created or out-of-order sync)
            if (updateError.code === "P2025") {
              const fallbackCreate = this.getFallbackCreate(table, id, sanitized, authUserId);
              await delegate.upsert({
                where: { id },
                update: sanitized,
                create: fallbackCreate,
              });
            } else {
              throw updateError;
            }
          }
          break;
        }

        case "POST": {
          // If record already exists (e.g. duplicate sync / replay), update instead of throwing P2002
          try {
            await delegate.create({ data: { id, ...sanitized } });
          } catch (createError: any) {
            if (createError.code === "P2002") {
              await delegate.update({
                where: { id },
                data: sanitized,
              });
            } else {
              throw createError;
            }
          }
          break;
        }

        case "DELETE":
          await delegate.delete({ where: { id } });
          break;

        default:
          return res
            .status(400)
            .json({ code: 400, status: "error", message: `Unsupported action: ${action}` });
      }

      return res.status(200).json({ code: 200, status: "success" });
    } catch (error: any) {
      if (error.code === "P2025" && action === "DELETE") {
        console.warn(`[Sync] DELETE on ${table} (${id}) ignored: Record not found (P2025)`);
        return res
          .status(200)
          .json({ code: 200, status: "success", message: "Ignored, record not found" });
      }
      console.error(`[Sync] ${action} on ${table} (${id}) failed:`, error);
      return res
        .status(500)
        .json({ code: 500, status: "error", message: error.message });
    }
  };
}
