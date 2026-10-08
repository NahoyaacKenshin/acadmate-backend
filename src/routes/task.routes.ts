import { Router } from "express";
import { TaskController, taskUploadMiddleware } from "@/controllers/task.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import { createTaskSchema, updateTaskSchema, taskIdSchema } from "@/schema/task";
import { AuthMiddleware } from "@/middlewares/auth-middleware";
import { aiLimiter } from "@/middlewares/rate-limiter";

const router = Router();
const taskController = new TaskController();
const authMiddleware = new AuthMiddleware();

// All task routes require authentication
router.use(authMiddleware.execute);

// AI Task Endpoints
router.post("/scan", aiLimiter, taskUploadMiddleware, taskController.scan);
router.post("/breakdown", taskController.breakdown);

// Standard CRUD
router.get("/stats", taskController.getStats);
router.get("/", taskController.getAll);
router.post("/", validateSchema(createTaskSchema), taskController.create);
router.put("/:id", validateSchema(updateTaskSchema), taskController.update);
router.delete("/:id", validateSchema(taskIdSchema), taskController.delete);

export default router;
