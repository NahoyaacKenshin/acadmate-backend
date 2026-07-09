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
};

export class SyncController {
  /**
   * PowerSync sends SQLite integer 0/1 for booleans; coerce them for Prisma.
   * Also strips `id` from data since it is provided separately via `where` or `create`.
   */
  private sanitizeData(table: string, data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    // Remove the id field from data — it's provided as a separate arg
    delete sanitized.id;
    if (table === "Task") {
      if ("completed" in sanitized) {
        const c = sanitized.completed;
        sanitized.completed = c === 1 || c === '1' || c === true || c === 'true';
      }
    }
    if (table === "CalendarEvent") {
      if ("allDay" in sanitized) {
        const c = sanitized.allDay;
        sanitized.allDay = c === 1 || c === '1' || c === true || c === 'true';
      }
    }
    return sanitized;
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

      switch (action) {
        case "PUT":
          await delegate.upsert({
            where: { id },
            update: sanitized,
            create: { id, ...sanitized }
          });
          break;

        case "PATCH":
          await delegate.update({
            where: { id },
            data: sanitized
          });
          break;

        case "POST":
          await delegate.create({ data: { id, ...sanitized } });
          break;

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
      if (error.code === 'P2025') {
        console.warn(`[Sync] ${action} on ${table} (${id}) ignored: Record not found (P2025)`);
        return res.status(200).json({ code: 200, status: "success", message: "Ignored, record not found" });
      }
      console.error(`[Sync] ${action} on ${table} (${id}) failed:`, error);
      return res
        .status(500)
        .json({ code: 500, status: "error", message: error.message });
    }
  };
}
