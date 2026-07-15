import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import subjectRoutes from "@/routes/subject.routes";
import taskRoutes from "@/routes/task.routes";
import syncRoutes from "@/routes/sync.routes";
import classScheduleRoutes from "@/routes/class-schedule.routes";
import calendarEventRoutes from "@/routes/calendar-event.routes";
import holidayRoutes from "@/routes/holiday.routes";
// import knowledgeBaseRoutes from "@/routes/knowledgebase.routes";
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

// Knowledge Base Endpoints
// router.use("/knowledgebase", knowledgeBaseRoutes);

// AI Endpoints
// router.use("/ai", aiRoutes);

export default router;