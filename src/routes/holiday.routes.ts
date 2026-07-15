import { Router } from "express";
import { HolidayController } from "@/controllers/holiday.controller";
import { AuthMiddleware } from "@/middlewares/auth-middleware";

const router = Router();
const holidayController = new HolidayController();
const authMiddleware = new AuthMiddleware();

// All holiday routes require authentication
router.use(authMiddleware.execute);

router.get("/", holidayController.getByYear);

export default router;
