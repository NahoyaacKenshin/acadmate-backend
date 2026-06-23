import { Router } from "express";
import authRoutes from "@/routes/auth.routes";
import subjectRoutes from "@/routes/subject.routes";
import taskRoutes from "@/routes/task.routes";
// import knowledgeBaseRoutes from "@/routes/knowledgebase.routes";
// import aiRoutes from "@/routes/ai.routes";

const router = Router();

// Auth Endpoints
router.use("/auth", authRoutes);

// Subject Endpoints
router.use("/subjects", subjectRoutes);

// Task Endpoints
router.use("/tasks", taskRoutes);

// Knowledge Base Endpoints
// router.use("/knowledgebase", knowledgeBaseRoutes);

// AI Endpoints
// router.use("/ai", aiRoutes);

export default router;