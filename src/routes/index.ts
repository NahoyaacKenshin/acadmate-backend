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
// import aiRoutes from "@/routes/ai.routes";

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

// AI Notebook Endpoints (Week 5)
router.use("/notebooks", notebookRoutes);

// AI Chat Endpoints (future)
// router.use("/ai", aiRoutes);

export default router;
