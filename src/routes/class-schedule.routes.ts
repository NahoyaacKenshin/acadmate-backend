import { Router } from "express";
import { ClassScheduleController } from "@/controllers/class-schedule.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import {
  createClassScheduleSchema,
  updateClassScheduleSchema,
  classScheduleIdSchema,
} from "@/schema/class-schedule";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const classScheduleController = new ClassScheduleController();
const authMiddleware = new AuthMiddleware();

// All class-schedule routes require authentication
router.use(authMiddleware.execute);

router.get("/", classScheduleController.getAll);
router.post("/", validateSchema(createClassScheduleSchema), classScheduleController.create);
router.put("/:id", validateSchema(updateClassScheduleSchema), classScheduleController.update);
router.delete("/:id", validateSchema(classScheduleIdSchema), classScheduleController.delete);

export default router;
