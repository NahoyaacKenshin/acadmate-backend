import { Router } from "express";
import { TaskController } from "@/controllers/task.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import { createTaskSchema, updateTaskSchema, taskIdSchema } from "@/schema/task";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const taskController = new TaskController();
const authMiddleware = new AuthMiddleware();

// All task routes require authentication
router.use(authMiddleware.execute);

router.get("/", taskController.getAll);
router.post("/", validateSchema(createTaskSchema), taskController.create);
router.put("/:id", validateSchema(updateTaskSchema), taskController.update);
router.delete("/:id", validateSchema(taskIdSchema), taskController.delete);

export default router;
