import { Router } from "express";
import { AuthMiddleware } from "@/middlewares/auth-middleware";
import {
  ScheduleParserController,
  uploadMiddleware,
} from "@/controllers/schedule-parser.controller";

const router = Router();
const auth = new AuthMiddleware();
const controller = new ScheduleParserController();

/**
 * POST /api/schedule-parser/parse
 *
 * Parses an uploaded schedule document (PDF, DOCX, image) or plain text
 * and returns structured ClassSchedule, CalendarEvent, and ExamWeek data.
 *
 * Protected: requires a valid Bearer token.
 */
router.post(
  "/parse",
  auth.execute,
  uploadMiddleware,
  controller.parse
);

export default router;
