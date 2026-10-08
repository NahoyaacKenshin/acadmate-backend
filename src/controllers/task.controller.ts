import { Request, Response } from "express";
import multer from "multer";
import { TaskRepository } from "@/repositories/task.repository";
import {
  parseTasksFromFile,
  breakdownTask,
  SupportedMimeType,
  SubjectContext,
} from "@/services/task-parser.service";

const ALLOWED_MIME_TYPES: SupportedMimeType[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE_MB = 10;

export const taskUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype as SupportedMimeType)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type: ${file.mimetype}. Allowed: PDF, DOCX, JPEG, PNG, WEBP, GIF.`
        )
      );
    }
  },
}).any();

export class TaskController {
  private taskRepository: TaskRepository;

  constructor() {
    this.taskRepository = new TaskRepository();
  }

  public getAll = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const tasks = await this.taskRepository.findAllByUserId(userId);
      return res.status(200).json({ code: 200, status: "success", data: tasks });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public getStats = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    try {
      const stats = await this.taskRepository.getStats(userId);
      return res.status(200).json({ code: 200, status: "success", data: stats });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public create = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const { title, description, dueDate, completed, color, subtasks, subjectId } = req.body;
    try {
      if (subjectId) {
        const existingTask = await this.taskRepository.findByTitleAndSubject(userId, title, subjectId);
        if (existingTask) {
          return res.status(400).json({ code: 400, status: "error", message: "Task with same title already exists for this subject" });
        }
      }

      const task = await this.taskRepository.create(userId, { title, description, dueDate, completed, color, subtasks, subjectId });
      return res.status(201).json({ code: 201, status: "success", data: task });
    } catch (error: any) {
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public update = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    const { title, description, dueDate, completed, color, subtasks, subjectId } = req.body;
    try {
      if (title && subjectId) {
        const existingTask = await this.taskRepository.findByTitleAndSubject(userId, title, subjectId);
        if (existingTask && existingTask.id !== id) {
          return res.status(400).json({ code: 400, status: "error", message: "Task with same title already exists for this subject" });
        }
      }

      const task = await this.taskRepository.update(id, userId, { title, description, dueDate, completed, color, subtasks, subjectId });
      return res.status(200).json({ code: 200, status: "success", data: task });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Task not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  public delete = async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (req as any).user?.sub;
    const id = req.params.id as string;
    try {
      await this.taskRepository.delete(id, userId);
      return res.status(200).json({ code: 200, status: "success", message: "Task deleted successfully" });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ code: 404, status: "error", message: "Task not found" });
      }
      return res.status(500).json({ code: 500, status: "error", message: error.message });
    }
  };

  /**
   * POST /api/tasks/scan
   *
   * Accepts a document upload (PDF, DOCX, image) and optional subjects list.
   * Extracts academic tasks with due dates and auto-matches subjects using Gemini AI.
   */
  public scan = async (req: Request, res: Response) => {
    try {
      let buffer: Buffer;
      let mimeType: SupportedMimeType;

      const files = req.files as Express.Multer.File[] | undefined;
      const file = files && files.length > 0 ? files[0] : undefined;

      if (!file) {
        return res.status(400).json({
          code: 400,
          status: "error",
          message: 'No file provided. Please send a file via the "file" field.',
        });
      }

      buffer = file.buffer;
      mimeType = file.mimetype as SupportedMimeType;

      let subjects: SubjectContext[] = [];
      if (req.body?.subjects) {
        if (typeof req.body.subjects === "string") {
          try {
            subjects = JSON.parse(req.body.subjects);
          } catch {}
        } else if (Array.isArray(req.body.subjects)) {
          subjects = req.body.subjects;
        }
      }

      const currentDate = typeof req.body?.currentDate === "string" ? req.body.currentDate : undefined;

      const result = await parseTasksFromFile(buffer, mimeType, subjects, currentDate);
      return res.status(200).json({ code: 200, status: "success", data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";

      if (message.includes("Unsupported file type")) {
        return res.status(415).json({ code: 415, status: "error", message });
      }
      if (message.includes("File too large")) {
        return res.status(413).json({
          code: 413,
          status: "error",
          message: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
        });
      }
      if (
        message.includes("429") ||
        message.toLowerCase().includes("quota") ||
        message.toLowerCase().includes("rate limit")
      ) {
        return res.status(429).json({
          code: 429,
          status: "error",
          message: "AI rate limit reached. Please wait a moment and try again.",
        });
      }
      if (
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("timed out") ||
        message.toLowerCase().includes("deadline exceeded") ||
        message.toLowerCase().includes("504")
      ) {
        return res.status(504).json({
          code: 504,
          status: "error",
          message: "AI task scanning timed out. Please try again with a clearer or smaller document.",
        });
      }
      if (message.includes("[Gemini]") || message.includes("[TaskParser]")) {
        return res.status(503).json({ code: 503, status: "error", message });
      }

      console.error("[TaskController] scan error:", err);
      return res.status(500).json({ code: 500, status: "error", message });
    }
  };

  /**
   * POST /api/tasks/breakdown
   *
   * Accepts task title, description, and dueDate.
   * Generates 3-5 sequential milestone subtasks using Gemini AI.
   */
  public breakdown = async (req: Request, res: Response) => {
    try {
      const { title, description, dueDate } = req.body;

      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return res.status(400).json({
          code: 400,
          status: "error",
          message: "Task title is required for AI breakdown.",
        });
      }

      const result = await breakdownTask(title.trim(), description, dueDate);
      return res.status(200).json({ code: 200, status: "success", data: result });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";

      if (
        message.includes("429") ||
        message.toLowerCase().includes("quota") ||
        message.toLowerCase().includes("rate limit")
      ) {
        return res.status(429).json({
          code: 429,
          status: "error",
          message: "AI rate limit reached. Please wait a moment and try again.",
        });
      }
      if (
        message.toLowerCase().includes("timeout") ||
        message.toLowerCase().includes("timed out") ||
        message.toLowerCase().includes("deadline exceeded") ||
        message.toLowerCase().includes("504")
      ) {
        return res.status(504).json({
          code: 504,
          status: "error",
          message: "AI subtask generation timed out. Please try again.",
        });
      }
      if (message.includes("[Gemini]") || message.includes("[TaskBreakdown]")) {
        return res.status(503).json({ code: 503, status: "error", message });
      }

      console.error("[TaskController] breakdown error:", err);
      return res.status(500).json({ code: 500, status: "error", message });
    }
  };
}
