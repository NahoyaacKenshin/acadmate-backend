import { Request, Response } from "express";
import { prisma } from "@/lib/prisma";

// Whitelist of tables that PowerSync is allowed to write to.
// Keys must match the :table route param; values must match the Prisma model accessor.
const ALLOWED_TABLES: Record<string, keyof typeof prisma> = {
  tasks: "task",
  subjects: "subject",
};

export class SyncController {
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

      switch (action) {
        case "PUT":
          await delegate.update({ where: { id }, data });
          break;

        case "POST":
          await delegate.create({ data: { id, ...data } });
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
      console.error(`[Sync] ${action} on ${table} (${id}) failed:`, error);
      return res
        .status(500)
        .json({ code: 500, status: "error", message: error.message });
    }
  };
}
