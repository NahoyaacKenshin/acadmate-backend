import { Router } from "express";
import { AuthMiddleware } from "@/middlewares/auth-middleware";
import { AdminMiddleware } from "@/middlewares/admin-middleware";
import { AdminController } from "@/controllers/admin.controller";
import { validateSchema } from "@/middlewares/validate-schema";
import {
  createSemesterRuleSchema,
  updateSemesterRuleSchema,
  createProgramMappingSchema,
  updateProgramMappingSchema,
} from "@/schema/admin";

const router = Router();
const auth = new AuthMiddleware();
const adminAuth = new AdminMiddleware();
const controller = new AdminController();

// Auth middleware for all routes
router.use(auth.execute);

// ── Public/Student Accessible Reads (Auth required, no admin role required) ──────
router.get("/semester-rules", controller.listSemesterRules);
router.get("/program-mappings", controller.listProgramMappings);

// ── Admin-Only Endpoints (Both Auth + Admin Role required) ───────────────────
router.use(adminAuth.execute);

router.get("/analytics", controller.getAnalytics);

router.post("/semester-rules", validateSchema(createSemesterRuleSchema), controller.createSemesterRule);
router.put("/semester-rules/:id", validateSchema(updateSemesterRuleSchema), controller.updateSemesterRule);
router.delete("/semester-rules/:id", controller.deleteSemesterRule);

router.post("/program-mappings", validateSchema(createProgramMappingSchema), controller.createProgramMapping);
router.put("/program-mappings/:id", validateSchema(updateProgramMappingSchema), controller.updateProgramMapping);
router.delete("/program-mappings/:id", controller.deleteProgramMapping);

export default router;
