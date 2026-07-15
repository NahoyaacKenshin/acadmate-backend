import { Router } from "express";
import { CalendarEventController } from "@/controllers/calendar-event.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  calendarEventIdSchema,
} from "@/schema/calendar-event";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const calendarEventController = new CalendarEventController();
const authMiddleware = new AuthMiddleware();

// All calendar-event routes require authentication
router.use(authMiddleware.execute);

router.get("/", calendarEventController.getAll);
router.post("/", validateSchema(createCalendarEventSchema), calendarEventController.create);
router.put("/:id", validateSchema(updateCalendarEventSchema), calendarEventController.update);
router.delete("/:id", validateSchema(calendarEventIdSchema), calendarEventController.delete);

export default router;
