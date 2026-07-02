import { Router } from "express";
import { SyncController } from "@/controllers/sync.controller";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const syncController = new SyncController();
const authMiddleware = new AuthMiddleware();

// All sync routes require authentication
router.use(authMiddleware.execute);

// POST /api/sync/:table  — PowerSync uploadData write-path
router.post("/:table", syncController.upload);

export default router;
