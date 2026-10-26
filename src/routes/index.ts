import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import subjectRoutes from "@/routes/subject.routes";
import taskRoutes from "@/routes/task.routes";
import syncRoutes from "@/routes/sync.routes";
import classScheduleRoutes from "@/routes/class-schedule.routes";
import calendarEventRoutes from "@/routes/calendar-event.routes";
import holidayRoutes from "@/routes/holiday.routes";
import scheduleParserRoutes from "@/routes/schedule-parser.routes";
import notebookRoutes from "@/routes/notebook.routes";
import { verifyGeminiKey } from "@/utils/gemini";

const router = Router();

// Auth Endpoints
router.use("/auth", authRoutes);

// Subject Endpoints
router.use("/subjects", subjectRoutes);

// Task Endpoints
router.use("/tasks", taskRoutes);

// Class Schedule Endpoints
router.use("/class-schedules", classScheduleRoutes);

// Calendar Event Endpoints
router.use("/events", calendarEventRoutes);

// Holiday Endpoints
router.use("/holidays", holidayRoutes);

// PowerSync Write-Path Sync Endpoints
router.use("/sync", syncRoutes);

// AI Schedule Parser Endpoint
router.use("/schedule-parser", scheduleParserRoutes);

// AI Notebook Endpoints
router.use("/notebooks", notebookRoutes);

// AI BYOK Key Verification Endpoint
router.post("/ai/verify-key", async (req, res) => {
  const { apiKey } = req.body;
  const result = await verifyGeminiKey(apiKey);
  if (result.valid) {
    res.status(200).json({ status: "success", valid: true, message: "Gemini API key is verified and active!" });
  } else {
    res.status(400).json({ status: "error", valid: false, message: result.error });
  }
});

export default router;

