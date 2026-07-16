/**
 * Schedule Parser Controller
 *
 * POST /api/schedule-parser/parse
 *
 * Accepts a multipart/form-data request with either:
 *   - `file`  field: a PDF, DOCX, or image file
 * Returns a structured JSON payload:
 *   { classSchedules, calendarEvents, examWeeks }
 *
 * The frontend (FE2) is responsible for writing these arrays to
 * local SQLite via powerSync.execute() after user confirmation.
 */

import { Request, Response } from "express";
import multer from "multer";
import {
  parseScheduleFromFile,
  SupportedMimeType,
} from "@/services/schedule-parser.service";

// ── Multer Setup (memory storage — no files saved to disk) ───────────────────

const ALLOWED_MIME_TYPES: SupportedMimeType[] = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE_MB = 10;

export const uploadMiddleware = multer({
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
}).single("file");

// ── Controller ────────────────────────────────────────────────────────────────

export class ScheduleParserController {
  /**
   * POST /api/schedule-parser/parse
   *
   * Accepts a file upload (PDF/DOCX/image). Parses the content with Gemini AI and returns structured data.
   */
  parse = async (req: Request, res: Response): Promise<void> => {
    try {
      let buffer: Buffer;
      let mimeType: SupportedMimeType;

      if (req.file) {
        // ── File upload path ────────────────────────────────────────────────
        buffer = req.file.buffer;
        mimeType = req.file.mimetype as SupportedMimeType;
      } else {
        res.status(400).json({
          status: "error",
          message: 'No file provided. Please send a file via the "file" field.',
        });
        return;
      }

      const result = await parseScheduleFromFile(buffer, mimeType);

      res.status(200).json({
        status: "success",
        data: result,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";

      // Handle multer file size / type errors
      if (message.includes("Unsupported file type")) {
        res.status(415).json({ status: "error", message });
        return;
      }
      if (message.includes("File too large")) {
        res.status(413).json({
          status: "error",
          message: `File exceeds the ${MAX_FILE_SIZE_MB}MB limit.`,
        });
        return;
      }
      // Handle Gemini exhausted / parse failures
      if (
        message.includes("[Gemini]") ||
        message.includes("[ScheduleParser]")
      ) {
        res.status(503).json({ status: "error", message });
        return;
      }

      console.error("[ScheduleParserController] Unexpected error:", err);
      res.status(500).json({ status: "error", message });
    }
  };
}
